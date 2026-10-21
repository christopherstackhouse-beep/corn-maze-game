import {test} from 'node:test';
import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
import {readFileSync,mkdtempSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import worker from '../server/leaderboard.mjs';
function database(file=':memory:',migrate=true){
 const sql=new DatabaseSync(file);if(migrate)sql.exec(readFileSync(new URL('../migrations/0001_leaderboard.sql',import.meta.url),'utf8'));
 const DB={prepare(query){const statement=sql.prepare(query);let values=[];return {bind(...v){values=v;return this},async first(){return statement.get(...values)||null},async all(){return {results:statement.all(...values)}},async run(){return statement.run(...values)}}},async batch(statements){sql.exec('BEGIN');try{const results=[];for(const s of statements)results.push(await s.run());sql.exec('COMMIT');return results}catch(e){sql.exec('ROLLBACK');throw e}}};
 return {sql,DB};
}
async function call(env,path,body,headers={}){const request=new Request('https://game.example'+path,{method:body===undefined?'GET':'POST',headers:{...(body===undefined?{}:{'Content-Type':'application/json'}),...headers},body:body===undefined?undefined:JSON.stringify(body)});const response=await worker.fetch(request,env);return {status:response.status,headers:response.headers,data:await response.json()}}
async function started(env){const r=await call(env,'/api/runs',{});assert.equal(r.status,201);return r.data.runId}
async function submit(env,sql,name,time,goodwill,runId){runId??=await started(env);sql.prepare('UPDATE runs SET started_at=? WHERE id=?').run(Date.now()-180000,runId);return call(env,'/api/scores',{runId,name,elapsedSeconds:time,goodwill})}
test('shared scores persist, rank by seconds then goodwill, and retries are idempotent',async()=>{
 const dir=mkdtempSync(join(tmpdir(),'lester-scores-')),file=join(dir,'scores.sqlite');let db=database(file),env={DB:db.DB};
 try{
  assert.deepEqual((await call(env,'/api/leaderboard')).data,{entries:[],total:0});
  await submit(env,db.sql,'Slower',91,100);await submit(env,db.sql,'Fast',61,55);const best=await submit(env,db.sql,'Better goodwill',61,99);assert.equal(best.data.entry.rank,1);
  const payload={runId:db.sql.prepare('SELECT run_id FROM scores WHERE id=?').get(best.data.entry.id).run_id,name:'Better goodwill',elapsedSeconds:61,goodwill:99};
  const duplicates=await Promise.all([call(env,'/api/scores',payload),call(env,'/api/scores',payload)]);assert(duplicates.every(r=>r.status===201));
  assert.equal((await call(env,'/api/scores',{...payload,name:'Different'})).status,409);
  db.sql.close();db=database(file,false);env={DB:db.DB};
  const rows=(await call(env,'/api/leaderboard')).data;assert.equal(rows.total,3);assert.deepEqual(rows.entries.map(r=>r.name),['Better goodwill','Fast','Slower']);assert.deepEqual(rows.entries.map(r=>r.rank),[1,2,3]);
 }finally{db.sql.close();rmSync(dir,{recursive:true,force:true})}
});
test('invalid, expired, fabricated and oversized submissions cannot enter the board',async()=>{
 const {DB,sql}=database(),env={DB};try{
  const runId=await started(env),valid={runId,name:'Dale',elapsedSeconds:1,goodwill:100};
  for(const change of [{name:'<script>alert(1)</script>'},{elapsedSeconds:0},{elapsedSeconds:1.2},{goodwill:101},{goodwill:-1},{goodwill:'100'},{runId:crypto.randomUUID()},{elapsedSeconds:9999}])assert((await call(env,'/api/scores',{...valid,...change})).status>=400);
  sql.prepare('UPDATE runs SET expires_at=? WHERE id=?').run(Date.now()-1,runId);assert.equal((await call(env,'/api/scores',valid)).status,409);
  assert.equal((await call(env,'/api/scores',{...valid,name:'A'.repeat(3000)})).status,413);assert.equal((await call(env,'/api/leaderboard')).data.total,0);
 }finally{sql.close()}
});
test('cross-origin GitHub Pages access is allowlisted and errors are explicit',async()=>{
 const {DB,sql}=database(),env={DB,ALLOWED_ORIGINS:'https://owner.github.io'};try{
  const allowed=await call(env,'/api/leaderboard',undefined,{Origin:'https://owner.github.io'});assert.equal(allowed.status,200);assert.equal(allowed.headers.get('Access-Control-Allow-Origin'),'https://owner.github.io');
  assert.equal((await call(env,'/api/leaderboard',undefined,{Origin:'https://unrelated.example'})).status,403);
  const options=await worker.fetch(new Request('https://game.example/api/scores',{method:'OPTIONS',headers:{Origin:'https://owner.github.io'}}),env);assert.equal(options.status,204);
  assert.equal((await call({},'/api/leaderboard')).status,503);
 }finally{sql.close()}
});
test('anonymous rate limits and cleanup leave permanent scores intact',async()=>{
 const {DB,sql}=database(),env={DB,RATE_LIMIT_SALT:'test-only-salt'};try{
  await submit(env,sql,'Permanent',70,90);
  for(let i=0;i<40;i++)assert.equal((await call(env,'/api/runs',{}, {'CF-Connecting-IP':'192.0.2.1'})).status,201);
  assert.equal((await call(env,'/api/runs',{}, {'CF-Connecting-IP':'192.0.2.1'})).status,429);
  sql.prepare('UPDATE runs SET expires_at=0').run();sql.prepare('UPDATE request_limits SET expires_at=0').run();await worker.scheduled({},env);
  assert.equal(sql.prepare('SELECT COUNT(*) AS n FROM runs').get().n,1);assert.equal((await call(env,'/api/leaderboard')).data.total,1);assert.equal(sql.prepare('SELECT COUNT(*) AS n FROM request_limits').get().n,0);
 }finally{sql.close()}
});
