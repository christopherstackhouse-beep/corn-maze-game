import {writeFileSync} from 'node:fs';
const value=process.env.LEADERBOARD_API_URL||process.argv[2]||'';
if(value){const url=new URL(value);if(url.protocol!=='https:'||url.origin!==value)throw Error('Use the deployed HTTPS Worker origin, without a path or trailing slash.');}
writeFileSync('dist/leaderboard-config.js','// Shared leaderboard API origin. Empty uses this game host.\nwindow.LESTER_LEADERBOARD_API = '+JSON.stringify(value)+';\n');
