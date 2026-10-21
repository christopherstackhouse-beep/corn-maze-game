import {createClient} from '@libsql/client';
import {api} from './leaderboard.mjs';
import worker from './leaderboard.mjs';
import {libsqlDatabase} from './libsql-adapter.mjs';
let cached=null;
function environment(){
 const url=process.env.TURSO_DATABASE_URL,authToken=process.env.TURSO_AUTH_TOKEN;
 if(!url||!authToken)return {};
 if(!cached||cached.url!==url||cached.authToken!==authToken){
  if(!/^libsql:\/\/|^https:\/\//.test(url))throw Error('Use a persistent remote Turso database URL in Vercel.');
  cached={url,authToken,DB:libsqlDatabase(createClient({url,authToken}))};
 }
 return {DB:cached.DB,RATE_LIMIT_SALT:process.env.RATE_LIMIT_SALT,ALLOWED_ORIGINS:process.env.ALLOWED_ORIGINS||''};
}
export async function handleWebRequest(request,env=environment()){
 if(new URL(request.url).pathname==='/api/cleanup'){
  const secret=process.env.CRON_SECRET;
  if(!secret||request.headers.get('authorization')!==`Bearer ${secret}`)return Response.json({error:'Unauthorized'},{status:401});
  if(request.method!=='GET')return Response.json({error:'Method not allowed'},{status:405});
  if(!env.DB)return Response.json({error:'Shared leaderboard is not connected yet.'},{status:503});
  await worker.scheduled({},env);return Response.json({ok:true},{headers:{'Cache-Control':'no-store'}});
 }
 return api(request,env);
}
// Standard Node request/response handler for the Vercel /api directory.
export function createVercelHandler(getEnvironment=environment){return async function handler(req,res){
 try{
  const headers=new Headers();for(const [key,value]of Object.entries(req.headers||{}))if(value!==undefined)headers.set(key,Array.isArray(value)?value.join(', '):String(value));
  // Ignore incoming Cloudflare IP headers; use the address Vercel sets instead.
  headers.delete('cf-connecting-ip');const ip=headers.get('x-vercel-forwarded-for')||headers.get('x-forwarded-for')||req.socket?.remoteAddress;
  if(ip)headers.set('cf-connecting-ip',ip.split(',')[0].trim());
  const host=headers.get('host')||'localhost:3000',protocol=process.env.VERCEL?'https':'http';
  const method=req.method||'GET';let body;
  if(!['GET','HEAD'].includes(method)){
   if(req.body!==undefined)body=typeof req.body==='string'||Buffer.isBuffer(req.body)?req.body:JSON.stringify(req.body);
   else{const chunks=[];let size=0;for await(const chunk of req){size+=Buffer.byteLength(chunk);if(size>2048){res.statusCode=413;res.end(JSON.stringify({error:'Request too large.'}));return}chunks.push(Buffer.from(chunk))}body=Buffer.concat(chunks)}
  }
  const response=await handleWebRequest(new Request(new URL(req.url,`${protocol}://${host}`),{method,headers,body}),getEnvironment());
  res.statusCode=response.status;response.headers.forEach((value,key)=>res.setHeader(key,value));res.end(Buffer.from(await response.arrayBuffer()));
 }catch(error){console.error('Leaderboard service failed:',error.message);res.statusCode=503;res.setHeader('Content-Type','application/json');res.setHeader('Cache-Control','no-store');res.end(JSON.stringify({error:'The leaderboard is temporarily unavailable. Please try again.'}))}
}
}
export default createVercelHandler();
