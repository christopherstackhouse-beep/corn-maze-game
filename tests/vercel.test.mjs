import {test} from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {createClient} from '@libsql/client';
import {migrate} from '../scripts/setup-turso.mjs';
import {libsqlDatabase} from '../server/libsql-adapter.mjs';
import {createVercelHandler} from '../server/vercel.mjs';
function call(handler,path,body){
 return new Promise((resolve,reject)=>{
  const headers={};
  const req={url:path,method:body===undefined?'GET':'POST',headers:{host:'game.example','content-type':'application/json','x-vercel-forwarded-for':'192.0.2.11'},body};
  const res={statusCode:200,setHeader(k,v){headers[k]=v},end(value){resolve({status:this.statusCode,headers,data:JSON.parse(String(value))})}};
  handler(req,res).catch(reject);
 });
}
test('Vercel Node routes persist and rank scores through the actual libSQL driver',async()=>{
 const dir=await mkdtemp(join(tmpdir(),'lester-vercel-'));const url='file:'+join(dir,'scores.db');let client=createClient({url});
 try{
  await migrate(client);await migrate(client);
  let handler=createVercelHandler(()=>({DB:libsqlDatabase(client),RATE_LIMIT_SALT:'test-salt'}));
  assert.equal((await call(handler,'/api/leaderboard')).data.total,0);
  for(const [name,elapsedSeconds,goodwill] of [['Slow',90,100],['Fast',60,50],['Winner',60,90]]){
   const start=await call(handler,'/api/runs',{});assert.equal(start.status,201);
   const runId=start.data.runId;
   await client.execute({sql:'UPDATE runs SET started_at=? WHERE id=?',args:[Date.now()-120000,runId]});
   const score={runId,name,elapsedSeconds,goodwill};
   assert.equal((await call(handler,'/api/scores',score)).status,201);
   assert.equal((await call(handler,'/api/scores',score)).status,201);
   assert.equal((await call(handler,'/api/scores',{...score,name:'Changed'})).status,409);
  }
  await migrate(client);client.close();client=createClient({url});
  const board=await call(handler,'/api/leaderboard');
  assert.equal(board.status,200);assert.equal(board.data.total,3);
  assert.deepEqual(board.data.entries.map(x=>x.name),['Winner','Fast','Slow']);
  assert.equal(board.headers['cache-control'],'no-store');
  await client.execute('UPDATE runs SET expires_at=0');
  process.env.CRON_SECRET='test-cron-secret';
  const {handleWebRequest}=await import('../server/vercel.mjs');
  assert.equal((await handleWebRequest(new Request('https://game.example/api/cleanup'),{DB:libsqlDatabase(client)})).status,401);
  assert.equal((await handleWebRequest(new Request('https://game.example/api/cleanup',{headers:{authorization:'Bearer test-cron-secret'}}),{DB:libsqlDatabase(client)})).status,200);
  assert.equal((await call(handler,'/api/leaderboard')).data.total,3);
 }finally{delete process.env.CRON_SECRET;client.close();await rm(dir,{recursive:true,force:true})}
});
test('Vercel returns an explicit service status when a database has not been connected',async()=>{
 const response=await call(createVercelHandler(()=>({})),'/api/leaderboard');assert.equal(response.status,503);assert(response.data.error);
});
