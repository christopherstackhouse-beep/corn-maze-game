import {createClient} from '@libsql/client';
import {readFile,readdir} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {pathToFileURL} from 'node:url';
import {resolve} from 'node:path';
export async function migrate(client){
 const tx=await client.transaction('write');
 try{
  await tx.execute('CREATE TABLE IF NOT EXISTS app_migrations (name TEXT PRIMARY KEY, checksum TEXT NOT NULL)');
  const files=(await readdir(new URL('../migrations/',import.meta.url))).filter(f=>f.endsWith('.sql')).sort();
  for(const name of files){
   const source=await readFile(new URL('../migrations/'+name,import.meta.url),'utf8'),checksum=createHash('sha256').update(source).digest('hex');
   const existing=await tx.execute({sql:'SELECT checksum FROM app_migrations WHERE name=?',args:[name]});
   if(existing.rows.length){if(existing.rows[0].checksum!==checksum)throw Error('Previously applied migration changed: '+name);continue}
   const statements=source.replace(/^\s*--.*$/gm,'').split(';').map(s=>s.trim()).filter(Boolean);
   for(const sql of statements)await tx.execute(sql);
   await tx.execute({sql:'INSERT INTO app_migrations(name,checksum) VALUES (?,?)',args:[name,checksum]});
  }
  await tx.commit();
 }catch(error){await tx.rollback();throw error}finally{tx.close()}
}
export async function setupFromEnvironment(){
 const url=process.env.TURSO_DATABASE_URL,authToken=process.env.TURSO_AUTH_TOKEN;
 if(!url||!authToken)throw Error('Set TURSO_DATABASE_URL and TURSO_AUTH_TOKEN first.');
 if(!/^libsql:\/\/|^https:\/\//.test(url))throw Error('Production scores require a persistent remote database URL.');
 const client=createClient({url,authToken});try{await migrate(client)}finally{client.close()}
}
if(process.argv[1]&&import.meta.url===pathToFileURL(resolve(process.argv[1])).href){await setupFromEnvironment();console.log('Leaderboard schema is ready. Existing scores were preserved.')}
