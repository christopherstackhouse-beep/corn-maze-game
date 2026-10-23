import {test} from 'node:test';
import assert from 'node:assert/strict';
import {game} from './helpers/game.mjs';

function victory(options={}) {
 const g=game(options);
 g.run('ArcadeLeaderboard.beginRun();ArcadeLeaderboard.tick(154000);ArcadeLeaderboard.capture(85);ArcadeLeaderboard.victory()');
 return g;
}
const response=(data,ok=true)=>({ok,json:async()=>data});
const tick=()=>new Promise(resolve=>setImmediate(resolve));

test('share controls appear only for victory; results freeze before sharing and reset next round',()=>{
 const g=game();assert.equal(g.nodes.captureShare.hidden,true);
 g.run('lesterReady=guestsReady=true;audioInit=()=>{};reset();finish(false,true)');
 assert.equal(g.nodes.captureShare.hidden,true);
 g.run('reset();ArcadeLeaderboard.tick(154000);ArcadeLeaderboard.capture(85);ArcadeLeaderboard.tick(99999);finish(true)');
 assert.equal(g.nodes.captureShare.hidden,false);
 assert.equal(g.nodes.captureSummary.textContent,'CAPTURE TIME 2:34 · GUEST GOODWILL 85%');
 g.run('reset()');assert.equal(g.nodes.captureShare.hidden,true);
 g.run("alienScene='burn';finishAlienVideo()");assert.equal(g.nodes.captureShare.hidden,true);
});

test('unsaved native share invokes directly, uses frozen results and a clean game URL',async()=>{
 const payloads=[];
 const g=victory({url:'https://user:password@preview.example/game/?token=private&rank=1#run-token',navigator:{share:data=>{payloads.push(data);return Promise.resolve()}}});
 const posts=g.requests.filter(r=>r.path==='/api/scores').length;
 const pending=g.nodes.shareCapture.onclick();
 assert.equal(payloads.length,1); // Called before awaiting, inside the original click.
 assert.equal(payloads[0].title,'Lester After Dark');
 assert.match(payloads[0].text,/2:34 with 85% Guest Goodwill/);
 assert.match(payloads[0].text,/Think you can beat me/);
 assert.doesNotMatch(payloads[0].text,/ranked|private|run-token|password/);
 assert.equal(payloads[0].url,'https://preview.example/game/?leaderboard=1');
 await pending;assert.equal(g.nodes.shareStatus.textContent,'Share completed.');
 assert.equal(g.requests.filter(r=>r.path==='/api/scores').length,posts);
});

test('canonical URL is optional, sanitized, and rejects non-HTTP or invalid settings',async()=>{
 for(const [setting,expected] of [
  ['https://game.example/maze/?dev=1#secret','https://game.example/maze/?leaderboard=1'],
  ['https://user:secret@game.example/?key=private','https://game.example/?leaderboard=1'],
  ['javascript:alert(1)','https://preview.example/?leaderboard=1'],
  ['not a URL','https://preview.example/?leaderboard=1'],
  ['', 'https://preview.example/?leaderboard=1']
 ]) {
  const payloads=[];const g=victory({url:'https://preview.example/?bypass=secret',shareGameURL:setting,navigator:{share:data=>{payloads.push(data);return Promise.resolve()}}});
  await g.nodes.shareCapture.onclick();assert.equal(payloads[0].url,expected);
 }
});

test('only a confirmed current score response adds a rank; saving never starts sharing',async()=>{
 const payloads=[];let resolveScore;
 const g=victory({navigator:{share:data=>{payloads.push(data);return Promise.resolve()}},fetchResponse:(path)=>path==='/api/runs'?response({runId:'private-run-token'}):path==='/api/scores'?new Promise(resolve=>{resolveScore=resolve}):response({entries:[],total:0})});
 g.nodes.arcadeName.value='PLAYER';const submission=g.nodes.scoreEntry.events.submit({preventDefault(){}});await tick();
 await g.nodes.shareCapture.onclick();assert.doesNotMatch(payloads[0].text,/ranked/);
 resolveScore(response({entry:{id:'saved',name:'PLAYER',rank:7,elapsedSeconds:155,goodwill:84}}));await submission;
 assert.equal(payloads.length,1);assert.equal(g.nodes.leaderboard.hidden,false);
 g.nodes.leaderboardClose.onclick();assert.equal(g.nodes.captureShare.hidden,false);
 await g.nodes.shareCapture.onclick();assert.match(payloads[1].text,/2:35 with 84%/);assert.match(payloads[1].text,/saved capture ranked #7/);
 assert.doesNotMatch(JSON.stringify(payloads[1]),/private-run-token|PLAYER/);
});

test('failed and malformed-rank score submissions cannot invent a rank',async()=>{
 for(const rank of [0,-1,'1',null]) {
  const payloads=[];const g=victory({navigator:{share:data=>{payloads.push(data);return Promise.resolve()}},fetchResponse:path=>path==='/api/runs'?response({runId:'token'}):path==='/api/scores'?response({entry:{id:'saved',elapsedSeconds:154,goodwill:85,rank}}):response({entries:[],total:0})});
  g.nodes.arcadeName.value='PLAYER';await g.nodes.scoreEntry.events.submit({preventDefault(){}});
  await g.nodes.shareCapture.onclick();assert.doesNotMatch(payloads[0].text,/ranked/);
 }
 const payloads=[];const failed=victory({navigator:{share:data=>{payloads.push(data);return Promise.resolve()}},fetchResponse:path=>path==='/api/runs'?response({runId:'token'}):response({error:'Unavailable'},false)});
 failed.nodes.arcadeName.value='PLAYER';await failed.nodes.scoreEntry.events.submit({preventDefault(){}});
 await failed.nodes.shareCapture.onclick();assert.doesNotMatch(payloads[0].text,/ranked/);
});

test('native cancellation is quiet; other failures offer an intentional copy fallback',async()=>{
 for(const name of ['AbortError','NotAllowedError','TypeError']) {
  let copies=0;const g=victory({navigator:{share:()=>Promise.reject(Object.assign(Error('Not shared'),{name})),clipboard:{writeText:()=>{copies++;return Promise.resolve()}}}});
  await g.nodes.shareCapture.onclick();assert.equal(copies,0);assert.equal(g.nodes.shareCapture.disabled,false);
  if(name==='AbortError')assert.equal(g.nodes.shareStatus.textContent,'');
  else assert.match(g.nodes.shareStatus.textContent,/Use Copy Challenge/);
 }
});

test('an outstanding share prevents duplicate dialogs and cannot overwrite a later round',async()=>{
 let complete,calls=0;
 const g=victory({navigator:{share:()=>{calls++;return new Promise(resolve=>{complete=resolve})}}});
 const operation=g.nodes.shareCapture.onclick();await g.nodes.shareCapture.onclick();await g.nodes.copyCapture.onclick();
 assert.equal(calls,1);assert.equal(g.nodes.shareCapture.disabled,true);
 g.run('ArcadeLeaderboard.beginRun();ArcadeLeaderboard.capture(50);ArcadeLeaderboard.victory()');
 assert.equal(g.nodes.shareCapture.disabled,true);complete();await operation;
 assert.equal(g.nodes.shareStatus.textContent,'');assert.equal(g.nodes.shareCapture.disabled,false);
});

test('unsupported native share and explicit copy use Clipboard API with honest confirmation',async()=>{
 for(const action of ['shareCapture','copyCapture']) {
  const copied=[];const g=victory({navigator:{clipboard:{writeText:text=>{copied.push(text);return Promise.resolve()}}}});
  await g.nodes[action].onclick();assert.equal(copied.length,1);
  assert.match(copied[0],/2:34 with 85% Guest Goodwill/);
  assert.match(copied[0],/Play here: https:\/\/game.example\/\?leaderboard=1/);
  assert.match(g.nodes.shareStatus.textContent,/Challenge copied!/);
 }
});

test('legacy copy fallback is checked and failed copy exposes selectable challenge text',async()=>{
 for(const works of [true,false]) {
  const g=victory({execCopy:()=>works,navigator:{clipboard:{writeText:()=>Promise.reject(Error('Denied'))}}});
  await g.nodes.copyCapture.onclick();
  if(works){assert.match(g.nodes.shareStatus.textContent,/Challenge copied!/);assert.equal(g.nodes.shareManual.hidden,true)}
  else {
   assert.doesNotMatch(g.nodes.shareStatus.textContent,/Challenge copied!/);
   assert.match(g.nodes.shareStatus.textContent,/copy it manually/);assert.equal(g.nodes.shareManual.hidden,false);
   assert.equal(g.nodes.shareManualText.selected,true);assert.match(g.nodes.shareManualText.value,/Lester After Dark/);
  }
 }
});

test('direct leaderboard link loads existing interface without run creation or starting gameplay',async()=>{
 const g=game({url:'https://game.example/?leaderboard=1&rank=1'});await tick();
 assert.equal(g.nodes.leaderboard.hidden,false);assert.equal(g.run('started'),false);assert.equal(g.run('playing'),false);
 assert.equal(g.requests.length,1);assert.equal(g.requests[0].path,'/api/leaderboard');
 assert.equal(g.nodes.captureShare.hidden,true);
 g.nodes.leaderboardClose.onclick();assert.equal(g.nodes.leaderboard.hidden,true);assert.equal(g.nodes.menu.hidden,false);
 assert.equal(g.document.activeElement,g.nodes.start);
 g.run('lesterReady=guestsReady=true;audioInit=()=>{}');g.nodes.start.onclick();assert.equal(g.run('playing'),true);
});

test('unavailable leaderboard data is explicit and can be closed; other query values do not open it',async()=>{
 const g=game({url:'https://game.example/?leaderboard=1',fetchResponse:()=>response({error:'Shared scores unavailable'},false)});await tick();
 assert.match(g.nodes.leaderboardStatus.textContent,/Shared scores unavailable/);
 g.nodes.leaderboardClose.onclick();assert.equal(g.nodes.leaderboard.hidden,true);
 for(const value of ['', '?leaderboard=0','?leaderboard=other']) {
  const normal=game({url:'https://game.example/'+value});assert.equal(normal.nodes.leaderboard.hidden,true);assert.equal(normal.requests.length,0);
 }
});


test('a late score response from a previous round cannot add rank to a new capture',async()=>{
 let resolveScore;const payloads=[];
 const g=victory({navigator:{share:data=>{payloads.push(data);return Promise.resolve()}},fetchResponse:path=>path==='/api/runs'?response({runId:'token'}):path==='/api/scores'?new Promise(resolve=>{resolveScore=resolve}):response({entries:[],total:0})});
 g.nodes.arcadeName.value='PLAYER';const submission=g.nodes.scoreEntry.events.submit({preventDefault(){}});await tick();
 g.run('ArcadeLeaderboard.beginRun();ArcadeLeaderboard.tick(60000);ArcadeLeaderboard.capture(90);ArcadeLeaderboard.victory()');
 resolveScore(response({entry:{id:'old',elapsedSeconds:154,goodwill:85,rank:2}}));await submission;
 await g.nodes.shareCapture.onclick();assert.match(payloads[0].text,/1:00 with 90%/);assert.doesNotMatch(payloads[0].text,/ranked/);
});
