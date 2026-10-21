// Deploy as a Cloudflare Worker with a persistent D1 binding named DB.
const MAX_RUN_MS=24*60*60*1000,WINDOW_MS=10*60*1000;
class HttpError extends Error{constructor(status,message){super(message);this.status=status}}
function json(data,status=200,headers={}){return new Response(JSON.stringify(data),{status,headers:{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store',...headers}})}
async function bodyJSON(request){
 if(!request.headers.get('content-type')?.toLowerCase().startsWith('application/json'))throw new HttpError(415,'Send JSON.');
 const reader=request.body?.getReader();if(!reader)throw new HttpError(400,'Missing request body.');
 let size=0,chunks=[];while(true){const {done,value}=await reader.read();if(done)break;size+=value.byteLength;if(size>2048){await reader.cancel();throw new HttpError(413,'Request too large.')}chunks.push(value)}
 const bytes=new Uint8Array(size);let offset=0;for(const c of chunks){bytes.set(c,offset);offset+=c.length}
 try{return JSON.parse(new TextDecoder().decode(bytes))}catch{throw new HttpError(400,'Invalid JSON.')}
}
export function validateScore(data){
 if(!data||typeof data!=='object')throw new HttpError(400,'Invalid score.');
 const name=typeof data.name==='string'?data.name.normalize('NFKC').trim().replace(/\s+/gu,' '):'';
 if(!/^[\p{L}\p{N} ._'!?-]{1,16}$/u.test(name))throw new HttpError(400,'Use 1–16 letters, numbers, spaces, or simple punctuation for your name.');
 if(typeof data.runId!=='string'||!/^[-a-f0-9]{36}$/i.test(data.runId))throw new HttpError(400,'Start a new run before submitting.');
 if(!Number.isInteger(data.elapsedSeconds)||data.elapsedSeconds<1||data.elapsedSeconds>86400)throw new HttpError(400,'Invalid capture time.');
 if(!Number.isInteger(data.goodwill)||data.goodwill<0||data.goodwill>100)throw new HttpError(400,'Invalid Guest Goodwill.');
 return {name,runId:data.runId,elapsedSeconds:data.elapsedSeconds,goodwill:data.goodwill};
}
async function limit(request,env,path,now){
 // The raw address is never stored. Production must supply a private hashing salt.
 const ip=request.headers.get('CF-Connecting-IP');if(!ip)return;
 if(!env.RATE_LIMIT_SALT)throw new HttpError(503,'Leaderboard configuration is incomplete.');
 const window=Math.floor(now/WINDOW_MS),hash=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(`${env.RATE_LIMIT_SALT}|${ip}|${window}|${path}`));
 const bucket=Array.from(new Uint8Array(hash),v=>v.toString(16).padStart(2,'0')).join('');
 const result=await env.DB.prepare('INSERT INTO request_limits(bucket,hits,expires_at) VALUES (?,1,?) ON CONFLICT(bucket) DO UPDATE SET hits=hits+1 RETURNING hits').bind(bucket,(window+1)*WINDOW_MS).first();
 if(result.hits>(path==='/api/runs'?40:20))throw new HttpError(429,'Too many attempts. Please try again in a few minutes.');
}
async function rankOf(db,row){
 const result=await db.prepare(`SELECT 1+COUNT(*) AS rank FROM scores WHERE elapsed_seconds < ? OR (elapsed_seconds = ? AND goodwill > ?) OR (elapsed_seconds = ? AND goodwill = ? AND (submitted_at < ? OR (submitted_at = ? AND id < ?)))`).bind(row.elapsed_seconds,row.elapsed_seconds,row.goodwill,row.elapsed_seconds,row.goodwill,row.submitted_at,row.submitted_at,row.id).first();return result.rank;
}
const entry=(row,rank)=>({id:row.id,rank,name:row.name,elapsedSeconds:row.elapsed_seconds,goodwill:row.goodwill});
export async function api(request,env){
 const url=new URL(request.url),path=url.pathname,origin=request.headers.get('Origin');
 const allowed=new Set([url.origin,...(env.ALLOWED_ORIGINS||'').split(',').map(s=>s.trim()).filter(Boolean)]);
 const cors=origin&&allowed.has(origin)?{'Access-Control-Allow-Origin':origin,'Vary':'Origin'}:{};
 if(origin&&!allowed.has(origin))return json({error:'This game origin is not allowed.'},403);
 const respond=(data,status=200)=>json(data,status,cors);
 if(request.method==='OPTIONS')return new Response(null,{status:204,headers:{...cors,'Access-Control-Allow-Methods':'GET, POST, OPTIONS','Access-Control-Allow-Headers':'Content-Type','Access-Control-Max-Age':'600'}});
 try{
  if(!env.DB)throw new HttpError(503,'Shared leaderboard is not connected yet.');
  if(path==='/api/leaderboard'){
   if(request.method!=='GET')throw new HttpError(405,'Method not allowed.');
   const {results}=await env.DB.prepare('SELECT id,name,elapsed_seconds,goodwill FROM scores ORDER BY elapsed_seconds ASC,goodwill DESC,submitted_at ASC,id ASC LIMIT 25').all();
   const total=await env.DB.prepare('SELECT COUNT(*) AS total FROM scores').first();
   return respond({entries:results.map((row,i)=>entry(row,i+1)),total:total.total});
  }
  if(!['/api/runs','/api/scores'].includes(path))throw new HttpError(404,'Not found.');
  if(request.method!=='POST')throw new HttpError(405,'Method not allowed.');
  const now=Date.now();await limit(request,env,path,now);
  if(path==='/api/runs'){
   const id=crypto.randomUUID();await env.DB.prepare('INSERT INTO runs(id,started_at,expires_at) VALUES (?,?,?)').bind(id,now,now+MAX_RUN_MS).run();
   return respond({runId:id},201);
  }
  const data=validateScore(await bodyJSON(request));
  let row=await env.DB.prepare('SELECT * FROM scores WHERE run_id=?').bind(data.runId).first();
  if(!row){
   const run=await env.DB.prepare('SELECT started_at,expires_at FROM runs WHERE id=?').bind(data.runId).first();
   if(!run||run.expires_at<now)throw new HttpError(409,'This run expired. Please start a new game.');
   if(data.elapsedSeconds*1000>now-run.started_at+2000)throw new HttpError(400,'Capture time does not match this run.');
   // Unique run_id prevents two concurrent submissions from creating two scores.
   await env.DB.prepare('INSERT INTO scores(id,run_id,name,elapsed_seconds,goodwill,submitted_at) VALUES (?,?,?,?,?,?) ON CONFLICT(run_id) DO NOTHING').bind(crypto.randomUUID(),data.runId,data.name,data.elapsedSeconds,data.goodwill,now).run();
   row=await env.DB.prepare('SELECT * FROM scores WHERE run_id=?').bind(data.runId).first();
  }
  if(row.name!==data.name||row.elapsed_seconds!==data.elapsedSeconds||row.goodwill!==data.goodwill)throw new HttpError(409,'A score has already been saved for this run.');
  return respond({entry:entry(row,await rankOf(env.DB,row))},201);
 }catch(error){if(!(error instanceof HttpError))console.error('Leaderboard request failed:',error.message);return respond({error:error instanceof HttpError?error.message:'The leaderboard is temporarily unavailable. Please try again.'},error.status||503)}
}
export default {
 async fetch(request,env){if(new URL(request.url).pathname.startsWith('/api/'))return api(request,env);return env.ASSETS?env.ASSETS.fetch(request):new Response('Not found',{status:404})},
 async scheduled(_event,env){
  // Keep submitted scores indefinitely. Discard only expired anonymous run records.
  const now=Date.now();await env.DB.batch([
   env.DB.prepare('DELETE FROM runs WHERE expires_at < ? AND NOT EXISTS (SELECT 1 FROM scores WHERE scores.run_id=runs.id)').bind(now),
   env.DB.prepare('DELETE FROM request_limits WHERE expires_at < ?').bind(now)
  ]);
 }
};
