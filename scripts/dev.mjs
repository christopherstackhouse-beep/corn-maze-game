import {spawn} from 'node:child_process';
// The preview supervisor adds generic web-server flags. Wrangler uses --ip.
const args=process.argv.slice(2),portIndex=args.indexOf('--port');
const port=portIndex>=0?args[portIndex+1]:process.env.PORT||'4173';
const child=spawn(process.execPath,['node_modules/wrangler/bin/wrangler.js','dev','--ip','0.0.0.0','--port',port],{stdio:'inherit'});
for(const signal of ['SIGTERM','SIGINT'])process.on(signal,()=>child.kill(signal));
child.on('exit',code=>process.exit(code??1));
