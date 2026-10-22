import {test} from 'node:test';
import assert from 'node:assert/strict';
import {game} from './helpers/game.mjs';

// Model both rejected and unresolved browser resumes, and Safari's interrupted state.
function audioGame(plan=['running'],options={touch:true,width:812,height:375}) {
 const contexts=[],events=[];
 const parameter=()=>({value:0,setValueAtTime(){},exponentialRampToValueAtTime(){},setTargetAtTime(){}});
 class AudioContext {
  constructor(){this.state='suspended';this.sampleRate=12;this.currentTime=0;this.destination={};this.listeners=[];this.plan=[...plan];this.resumeCalls=0;this.sourceStarts=0;this.pending=[];contexts.push(this);events.push('context')}
  addEventListener(type,cb){if(type==='statechange')this.listeners.push(cb)}
  setState(state){this.state=state;for(const cb of this.listeners)cb()}
  resume(){
   this.resumeCalls++;events.push('resume');
   const result=this.plan.shift()||'running';
   if(result==='throw')throw Error('Resume not allowed');
   if(result==='reject')return Promise.reject(Error('Resume not allowed'));
   if(result==='pending')return new Promise(resolve=>this.pending.push(resolve));
   if(result==='running')this.setState('running');
   return Promise.resolve();
  }
  node(){return {connect(){},disconnect(){},start:()=>{this.sourceStarts++},stop(){},gain:parameter(),frequency:parameter(),threshold:parameter(),knee:parameter(),ratio:parameter(),Q:parameter(),pan:parameter(),playbackRate:parameter()}}
  createGain(){events.push('graph');return this.node()}
  createDynamicsCompressor(){return this.node()}
  createOscillator(){return this.node()}
  createBiquadFilter(){return this.node()}
  createBufferSource(){return this.node()}
  createStereoPanner(){return this.node()}
  createBuffer(_channels,length){return {getChannelData:()=>new Float32Array(length)}}
 }
 const g=game({...options,AudioContext});
 g.run('lesterReady=guestsReady=true');
 return {...g,contexts,audioEvents:events};
}
const settled=async()=>{await Promise.resolve();await Promise.resolve()};

test('start tap activates the context before graph construction, using one sound graph',async()=>{
 const g=audioGame();assert.equal(g.contexts.length,0);assert.equal(g.nodes.audioEnable.hidden,true);
 g.nodes.start.onclick();
 assert.equal(g.contexts[0].state,'running');assert.equal(g.run('playing'),true);
 assert.deepEqual(g.audioEvents.slice(0,3),['context','resume','graph']);
 assert.equal(g.contexts.length,1);assert.equal(g.contexts[0].resumeCalls,1);
 const starts=g.contexts[0].sourceStarts;
 g.run('audioInit();audioInit()');await settled();
 assert.equal(g.contexts[0].sourceStarts,starts);assert.equal(g.contexts[0].resumeCalls,1);
 assert.equal(g.nodes.audioEnable.hidden,true);
});

test('a fulfilled resume that leaves audio suspended still requires manual activation',async()=>{
 const g=audioGame(['suspended','running']);g.nodes.start.onclick();await settled();
 assert.equal(g.contexts[0].state,'suspended');assert.equal(g.nodes.audioEnable.hidden,false);
 g.nodes.audioEnable.onclick();await settled();
 assert.equal(g.contexts[0].state,'running');assert.equal(g.nodes.audioEnable.hidden,true);
 assert.equal(g.contexts.length,1);
});

test('rejected and synchronous failed resumes are handled and can be retried',async()=>{
 for(const failure of ['reject','throw']) {
  const g=audioGame([failure,failure]);g.nodes.start.onclick();await settled();
  assert.equal(g.contexts[0].state,'suspended');assert.equal(g.nodes.audioEnable.hidden,false);
  g.contexts[0].plan=['running'];g.nodes.audioEnable.onclick();await settled();
  assert.equal(g.contexts[0].state,'running');assert.equal(g.nodes.audioEnable.hidden,true);
  assert.equal(g.contexts.length,1);assert(g.contexts[0].sourceStarts<=4);
 }
});

test('a later gesture can recover a pending resume without duplicating contexts or loops',async()=>{
 const g=audioGame(['pending','running']);g.nodes.start.onclick();
 assert.equal(g.contexts[0].resumeCalls,1);assert.equal(g.nodes.audioEnable.hidden,false);
 const starts=g.contexts[0].sourceStarts;g.nodes.audioEnable.onclick();await settled();
 assert.equal(g.contexts[0].resumeCalls,2);assert.equal(g.contexts[0].state,'running');
 for(const resolve of g.contexts[0].pending)resolve();await settled();
 assert.equal(g.contexts.length,1);assert.equal(g.contexts[0].sourceStarts,starts);
 assert.equal(g.nodes.audioEnable.hidden,true);
});

test('pause/resume and orientation recovery reuse and reactivate interrupted audio',async()=>{
 const g=audioGame();g.nodes.start.onclick();const context=g.contexts[0];
 const starts=context.sourceStarts;
 g.run('pauseGame()');context.setState('interrupted');assert.equal(g.nodes.audioEnable.hidden,false);
 g.nodes.resume.onclick();await settled();assert.equal(context.state,'running');assert.equal(g.run('playing'),true);
 g.window.innerWidth=375;g.window.innerHeight=812;g.windowEvents.resize();
 assert.equal(g.run('playing'),false);context.setState('suspended');
 g.window.innerWidth=812;g.window.innerHeight=375;g.windowEvents.resize();
 assert.equal(g.run('playing'),false);g.nodes.resume.onclick();await settled();
 assert.equal(context.state,'running');assert.equal(g.contexts.length,1);assert.equal(context.sourceStarts,starts);
});

test('hidden-tab/focus recovery waits for interaction and does not restart gameplay itself',async()=>{
 const g=audioGame();g.nodes.start.onclick();const context=g.contexts[0];
 g.document.hidden=true;g.emit('visibilitychange');context.setState('suspended');
 assert.equal(g.run('playing'),false);assert.equal(g.nodes.audioEnable.hidden,true);
 const attempts=context.resumeCalls;g.document.hidden=false;g.emit('visibilitychange');g.windowEvents.focus();
 assert.equal(g.nodes.audioEnable.hidden,false);assert.equal(context.resumeCalls,attempts);
 g.nodes.resume.onclick();await settled();assert.equal(context.state,'running');assert.equal(g.run('playing'),true);
});

test('mute preference and toggle label survive interruptions and explicit resume',async()=>{
 const g=audioGame();g.nodes.start.onclick();g.nodes.sound.onclick();
 assert.equal(g.run('muted'),true);assert.equal(g.run('master.gain.value'),0);assert.equal(g.nodes.sound.textContent,'SOUND OFF');
 g.contexts[0].setState('interrupted');assert.equal(g.nodes.audioEnable.hidden,true);
 const attempts=g.contexts[0].resumeCalls;
 g.emit('pointerup',{target:{closest:()=>false}});assert.equal(g.contexts[0].resumeCalls,attempts);
 g.run('pauseGame()');g.nodes.resume.onclick();await settled();
 assert.equal(g.run('muted'),true);assert.equal(g.run('master.gain.value'),0);assert.equal(g.nodes.sound.textContent,'SOUND OFF');
 g.contexts[0].setState('suspended');g.nodes.sound.onclick();await settled();
 assert.equal(g.contexts[0].state,'running');assert.equal(g.run('master.gain.value'),.65);
 assert.equal(g.nodes.sound.textContent,'SOUND ON');assert.equal(g.nodes.alienFilmVideo.muted,false);
});

test('fresh gameplay touches retry activation without waiting for a synthetic click',async()=>{
 const g=audioGame(['reject','running']);g.nodes.start.onclick();await settled();
 g.emit('pointerup',{target:{closest:()=>false}});await settled();
 assert.equal(g.contexts[0].state,'running');assert.equal(g.nodes.audioEnable.hidden,true);
});

test('desktop start, pause and resume preserve pointer lock and running audio',async()=>{
 const g=audioGame(['running'],{touch:false});g.nodes.start.onclick();await settled();
 assert.equal(g.nodes.game.lockRequests,1);assert.equal(g.contexts[0].state,'running');
 g.run('pauseGame()');g.nodes.resume.onclick();await settled();
 assert.equal(g.nodes.game.lockRequests,2);assert.equal(g.contexts.length,1);assert.equal(g.contexts[0].resumeCalls,1);
});


test('suspended audio does not queue stale effects or dialogue before recovery',async()=>{
 const g=audioGame(['suspended']);g.nodes.start.onclick();await settled();
 const starts=g.contexts[0].sourceStarts;
 g.run(`soundscape.laughBuffers.escape={duration:1};soundscape.laughBuffers.distant1={duration:1};
  soundscape.play('launch');soundscape.playGuestVoice('escape');soundscape.escapeTaunt();
  soundscape.laugh(false,1,0);soundscape.tick(.3,true,100,10,true);tone(220,.2);`);
 assert.equal(g.contexts[0].sourceStarts,starts);
 g.run('window.stoppedLaughs=0;soundscape.active=true;soundscape.laughSources.add({stop(){window.stoppedLaughs++}});soundscape.tick(.1,false,100,10)');
 assert.equal(g.window.stoppedLaughs,1);assert.equal(g.run('soundscape.laughSources.size'),0);
 g.contexts[0].plan=['running'];g.nodes.audioEnable.onclick();await settled();
 g.run("soundscape.play('launch')");assert(g.contexts[0].sourceStarts>starts);
});
