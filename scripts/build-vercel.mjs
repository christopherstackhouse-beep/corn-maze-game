import {access,readFile} from 'node:fs/promises';
import {setupFromEnvironment} from './setup-turso.mjs';
for(const file of ['dist/index.html','dist/game.js','dist/alien.js','dist/alien-reference.png','dist/alien-walk-sheet.png','dist/alien-extraction-ship.png','dist/alien-incineration.mp4','dist/lester.png','dist/lester-crying.png','dist/net-launcher.png','dist/corn-stalks.png','dist/leaderboard-config.js'])await access(file);
const config=await readFile('dist/leaderboard-config.js','utf8');if(!config.includes("window.LESTER_LEADERBOARD_API = ''"))throw Error('The Vercel export must use its own /api routes. Reset dist/leaderboard-config.js to an empty API origin.');
if(process.env.TURSO_DATABASE_URL||process.env.TURSO_AUTH_TOKEN){
 if(!process.env.RATE_LIMIT_SALT)throw Error('Set RATE_LIMIT_SALT before deploying the shared leaderboard.');
 await setupFromEnvironment();console.log('Persistent leaderboard schema is ready.');
}else console.warn('Game assets are ready. Shared scores need TURSO_DATABASE_URL, TURSO_AUTH_TOKEN, and RATE_LIMIT_SALT in Vercel settings.');
console.log('Static game and Vercel API source are ready.');
