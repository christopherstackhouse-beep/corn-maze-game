import {readFileSync,writeFileSync} from 'node:fs';
const id=process.env.CLOUDFLARE_D1_DATABASE_ID||process.argv[2];
if(!id||!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id))throw Error('Set CLOUDFLARE_D1_DATABASE_ID to the real D1 database UUID.');
const config=JSON.parse(readFileSync('wrangler.json','utf8'));config.d1_databases[0].database_id=id;
if(process.env.LEADERBOARD_ALLOWED_ORIGINS!==undefined)config.vars.ALLOWED_ORIGINS=process.env.LEADERBOARD_ALLOWED_ORIGINS;
for(const origin of config.vars.ALLOWED_ORIGINS.split(',').map(s=>s.trim()).filter(Boolean)){
 const url=new URL(origin);if(url.protocol!=='https:'||url.origin!==origin)throw Error('Allowed origins must be HTTPS origins without a path or trailing slash.');
}
writeFileSync('wrangler.json',JSON.stringify(config,null,2)+'\n');
