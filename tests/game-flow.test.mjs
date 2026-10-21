import {test} from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFileSync} from 'node:fs';
function game(){
 const gradient={addColorStop(){}};const draw=new Proxy({createLinearGradient:()=>gradient,createRadialGradient:()=>gradient},{get:(o,k)=>k in o?o[k]:()=>{}});
 const nodes={},events={},windowEvents={},requests=[];
 function node(){return {style:{},hidden:true,textContent:'',value:'',events:{},width:320,height:560,playCount:0,pauseCount:0,getContext:()=>draw,addEventListener(type,cb){this.events[type]=cb},pause(){this.pauseCount++},play(){this.playCount++;return Promise.resolve()},focus(){},replaceChildren(){},appendChild(){},requestPointerLock:()=>Promise.resolve()}}
 const document={activeElement:null,getElementById:id=>nodes[id]??=node(),createElement:node,querySelector:node,querySelectorAll:()=>[],addEventListener(type,cb){(events[type]??=[]).push(cb)},exitPointerLock(){}};
 const env={console,Math,Set,Map,Image:class{naturalWidth=1024;naturalHeight=1536},document,window:{innerWidth:1280,innerHeight:800,addEventListener:(type,cb)=>windowEvents[type]=cb},requestAnimationFrame(){},setInterval(){return 1},clearInterval(){},localStorage:{getItem:()=>'',setItem(){}},AbortSignal,fetch:async(path,options)=>{requests.push({path,options});return {ok:true,json:async()=>path==='/api/runs'?{runId:crypto.randomUUID()}:path==='/api/scores'?{entry:{id:'saved',rank:1,elapsedSeconds:12,goodwill:77}}:{entries:[],total:0}}}};
 vm.createContext(env);for(const f of ['sound','guest-art','guests','lester-ai','maze-layers','capture','defeat','alien','leaderboard','game'])vm.runInContext(readFileSync(new URL('../dist/'+f+'.js',import.meta.url),'utf8'),env);for(const cb of events.DOMContentLoaded||[])cb();
 return {run:s=>vm.runInContext(s,env),nodes,windowEvents,requests};
}
test('capture time and goodwill freeze at the net hit, before victory animation',async()=>{
 const g=game();g.run('ArcadeLeaderboard.beginRun();ArcadeLeaderboard.tick(12850);ArcadeLeaderboard.capture(77);ArcadeLeaderboard.tick(99000);ArcadeLeaderboard.capture(1);ArcadeLeaderboard.victory();');
 assert.equal(g.nodes.captureSummary.textContent,'CAPTURE TIME 0:12 · GUEST GOODWILL 77%');g.nodes.arcadeName.value='ARCADE TEST';await g.nodes.scoreEntry.events.submit({preventDefault(){}});
 const sent=JSON.parse(g.requests.find(r=>r.path==='/api/scores').options.body);assert.equal(sent.elapsedSeconds,12);assert.equal(sent.goodwill,77);assert.equal(g.nodes.scoreMessage.textContent,'Score saved! You are #1.');
});
test('alien defeat waits for the video to end and supports pause/resume and mute',()=>{
 const g=game();g.run("generateMaze();spawnGuests();resetAlien();alienScene='burn';playing=true;startAlienVideo();updateAlien(60)");assert.equal(g.run('finished'),false);assert.equal(g.nodes.alienFilm.hidden,false);
 const plays=g.nodes.alienFilmVideo.playCount;g.windowEvents.blur();assert.equal(g.run('playing'),false);assert(g.nodes.alienFilmVideo.pauseCount>0);g.run('resume()');assert.equal(g.nodes.alienFilmVideo.playCount,plays+1);
 g.nodes.sound.onclick();assert.equal(g.nodes.alienFilmVideo.muted,true);
 g.nodes.alienFilmVideo.events.ended();assert.equal(g.run('finished'),true);assert.equal(g.nodes.alienFilm.hidden,true);assert.equal(g.nodes.endTag.textContent,'CLOSE ENCOUNTER: TERMINATED');assert.equal(g.nodes.endTitle.textContent,'You are now locally sourced ash.');assert.equal(g.nodes.endText.textContent,'The alien caught you. Its ship incinerated you from orbit. Next time, try offering a map.');
});
test('map extraction has continuous stages, restores goodwill, and returns to the maze',()=>{
 const g=game();g.run('generateMaze();spawnGuests();resetAlien();nerve=12;helpAlien()');assert.equal(g.run('nerve'),100);
 let previousLift=0;
 for(const t of [0,.5,1.2,2.5,3.5,4.5,5.8,6.5,7.5,8.1]){g.run(`alienClock=${t};drawAlienScene()`);const pose=g.run(`extractionPose(${t})`);assert(Number.isFinite(pose.opacity));assert(pose.lift>=previousLift);previousLift=pose.lift;}
 g.run('alienClock=0;updateAlien(EXTRACTION_DURATION-.1)');assert.equal(g.run('alienScene'),'extract');g.run('updateAlien(.2)');assert.equal(g.run('alienScene'),null);assert.equal(g.run('alien.state'),'gone');assert.equal(g.run('finished'),false);assert.equal(g.nodes.hud.hidden,false);
});
