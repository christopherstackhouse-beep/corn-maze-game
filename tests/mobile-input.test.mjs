import {test} from 'node:test';
import assert from 'node:assert/strict';
import {game} from './helpers/game.mjs';

function started(options={touch:true,width:812,height:375}) {
 const g=game(options);
 g.run('audioInit=()=>{};lesterReady=guestsReady=true;reset()');
 return g;
}
function tap(g,id,pointerId=10){g.pointer(id,'pointerdown',pointerId);g.pointer(id,'pointerup',pointerId)}
function held(g) {
 g.pointer('touchJoystick','pointerdown',1,64,0);
 g.pointer('touchSprint','pointerdown',2);
 assert.equal(g.run('touchControls.forward'),1);
 assert.equal(g.run('touchControls.sprint'),true);
}
function neutral(g) {
 assert.equal(g.run('touchControls.forward'),0);
 assert.equal(g.run('touchControls.strafe'),0);
 assert.equal(g.run('touchControls.sprint'),false);
}

test('touch movement, horizontal look, sprint and fire operate with independent pointers',()=>{
 const g=started();
 assert.equal(g.nodes.game.lockRequests,0);
 assert.equal(g.nodes.touchControls.hidden,false);
 held(g);
 const angle=g.run('player.a');
 g.pointer('touchLook','pointerdown',3,300,160);
 assert.equal(g.run('player.a'),angle); // Touch down does not move the camera.
 g.pointer('touchLook','pointermove',3,340,180);
 assert(Math.abs(g.run('player.a')-angle-40*0.0035)<1e-9);
 assert.equal(g.run('touchControls.forward'),1);
 tap(g,'touchFire',4);
 assert.equal(g.run('ammo'),2);
 assert.equal(g.run('touchControls.sprint'),true);
 assert.equal(g.run('touchControls.forward'),1);
 const turned=g.run('player.a');
 g.pointer('touchLook','pointerup',3,340,180);
 assert.equal(g.run('player.a'),turned);
 g.pointer('touchJoystick','pointerup',1,64,0);
 g.pointer('touchSprint','pointerup',2);
 neutral(g);
});

test('joystick preserves analog magnitude, clamps diagonal speed and ignores a second owner',()=>{
 const g=started();
 g.run('canMove=()=>true;updateLester=()=>{};updateGuests=()=>{};updateAlien=()=>{}');
 g.pointer('touchJoystick','pointerdown',1,64,32);
 const f=g.run('touchControls.forward');assert(f>0&&f<1);
 const x=g.run('player.x'),y=g.run('player.y');g.run('update(.1)');
 assert(Math.abs(Math.hypot(g.run('player.x')-x,g.run('player.y')-y)-f*1.7*.1)<1e-9);
 g.pointer('touchJoystick','pointerdown',2,128,64);
 assert.equal(g.run('touchControls.forward'),f);
 g.pointer('touchJoystick','pointermove',1,164,-36);
 assert(Math.abs(g.run('Math.hypot(touchControls.forward,touchControls.strafe)')-1)<1e-9);
 g.pointer('touchJoystick','pointercancel',1);
 neutral(g);
});

test('action taps call shared game actions, do not turn/fire unintentionally, and cancel drags',()=>{
 const g=started();
 const angle=g.run('player.a');
 tap(g,'touchFlashlight');assert.equal(g.run('light'),false);
 tap(g,'touchMinimap');assert.equal(g.run('mapOpen'),false);
 tap(g,'touchGiveMap');assert.match(g.nodes.toast.textContent,/nearby guest/);
 tap(g,'touchReload');assert.equal(g.run('reloading'),0); // Full launcher.
 assert.equal(g.run('ammo'),3);assert.equal(g.run('player.a'),angle);
 g.pointer('touchFire','pointerdown',11);
 g.pointer('touchFire','pointermove',11,280,250);
 g.pointer('touchFire','pointerup',11,250,250);assert.equal(g.run('ammo'),3);
 g.pointer('touchFire','pointerdown',12);
 g.pointer('touchFire','pointercancel',12);
 g.pointer('touchFire','pointerup',12);assert.equal(g.run('ammo'),3);
 tap(g,'touchFire');tap(g,'touchReload');assert.equal(g.run('reloading'),2);
 g.nodes.game.events.mousedown({button:0,sourceCapabilities:{firesTouchEvents:true}});
 assert.equal(g.run('ammo'),2);assert.equal(g.nodes.game.lockRequests,0);
});

test('pause, focus loss, hidden tabs, cancellation and capture loss clear held input',()=>{
 for(const trigger of ['pause','blur','visibility','cancel','capture']) {
  const g=started();held(g);
  if(trigger==='pause')tap(g,'touchPause',5);
  if(trigger==='blur')g.windowEvents.blur();
  if(trigger==='visibility'){g.document.hidden=true;g.emit('visibilitychange')}
  if(trigger==='cancel'){g.pointer('touchJoystick','pointercancel',1);g.pointer('touchSprint','pointercancel',2)}
  if(trigger==='capture'){g.nodes.touchJoystick.releasePointerCapture(1);g.nodes.touchSprint.releasePointerCapture(2)}
  neutral(g);
  if(['pause','blur','visibility'].includes(trigger)) {
   assert.equal(g.run('playing'),false);assert.equal(g.nodes.touchControls.hidden,true);
   g.run('resume()');neutral(g);
   g.pointer('touchJoystick','pointermove',1,64,0);neutral(g);
  }
 }
});

test('portrait requires rotation, pauses an active run, clears holds and never auto-resumes',()=>{
 const g=started();held(g);
 g.window.innerWidth=375;g.window.innerHeight=812;g.windowEvents.resize();
 neutral(g);assert.equal(g.run('playing'),false);assert.equal(g.nodes.rotatePrompt.hidden,false);
 g.run('resume()');assert.equal(g.run('playing'),false);
 g.window.innerWidth=812;g.window.innerHeight=375;g.windowEvents.resize();
 assert.equal(g.nodes.rotatePrompt.hidden,true);assert.equal(g.run('playing'),false);
 g.run('resume()');assert.equal(g.run('playing'),true);assert.equal(g.nodes.game.lockRequests,0);
 const portrait=started({touch:true,width:375,height:812});
 assert.equal(portrait.run('playing'),false);assert.equal(portrait.nodes.rotatePrompt.hidden,false);
});

test('capture, defeat, guest attack and alien cinematics hide/reset controls and preserve results',()=>{
 for(const scene of ['capture','defeat','attack','extract','video']) {
  const g=started();held(g);
  if(scene==='capture')g.run('beginLesterCapture()');
  if(scene==='defeat')g.run('beginLesterDefeat()');
  if(scene==='attack')g.run('attackTime=.001');
  if(scene==='extract')g.run('helpAlien()');
  if(scene==='video')g.run("alienScene='burn';startAlienVideo()");
  g.run('touchControls.sync()');neutral(g);assert.equal(g.nodes.touchControls.hidden,true);
  tap(g,'touchFire');assert.equal(g.run('ammo'),3);
  if(scene==='capture') {
   g.run('updateLesterCapture(6)');assert.equal(g.run('finished'),true);
   assert.equal(g.nodes.endTitle.textContent,'The tickling ends here.');assert.equal(g.nodes.scoreEntry.hidden,false);
  }
  if(scene==='defeat') {
   g.run('updateLesterDefeat(7)');assert.equal(g.run('finished'),true);
   assert.equal(g.nodes.endTitle.textContent,'Lester got the last laugh.');
  }
  if(scene==='extract') {
   g.run('updateAlien(EXTRACTION_DURATION);touchControls.sync()');assert.equal(g.nodes.touchControls.hidden,false);neutral(g);
  }
  if(scene==='video') {
   g.nodes.alienFilmVideo.events.ended();assert.equal(g.run('finished'),true);
   assert.equal(g.nodes.endTag.textContent,'CLOSE ENCOUNTER: TERMINATED');
  }
 }
});

test('desktop movement, mouse aim, clicks, shortcuts and pointer-lock pause remain usable',()=>{
 const g=started({touch:false,width:640,height:360});
 assert.equal(g.nodes.touchControls.hidden,true);assert.equal(g.nodes.game.lockRequests,1);
 g.document.pointerLockElement=g.nodes.game;
 const event=code=>({code,target:{closest:()=>false},preventDefault(){}});
 g.windowEvents.keydown(event('KeyW'));g.windowEvents.keydown(event('ShiftLeft'));
 assert.equal(g.run('keys.KeyW&&keys.ShiftLeft'),true);
 g.run('canMove=()=>true;updateLester=()=>{};updateGuests=()=>{};updateAlien=()=>{}');
 const x=g.run('player.x'),y=g.run('player.y');g.run('update(.1)');
 assert(Math.abs(Math.hypot(g.run('player.x')-x,g.run('player.y')-y)-.28)<1e-9);
 const angle=g.run('player.a');g.emit('mousemove',{movementX:10});assert(Math.abs(g.run('player.a')-angle-.024)<1e-9);
 g.nodes.game.events.mousedown({button:2,preventDefault(){}});assert.equal(g.run('ammo'),3);
 g.nodes.game.events.mousedown({button:0});assert.equal(g.run('ammo'),2);
 g.windowEvents.keydown(event('KeyR'));assert.equal(g.run('reloading'),2);
 g.windowEvents.keydown(event('KeyF'));assert.equal(g.run('light'),false);
 g.windowEvents.keydown(event('KeyM'));assert.equal(g.run('mapOpen'),false);
 g.document.pointerLockElement=null;g.emit('pointerlockchange');
 assert.equal(g.run('playing'),false);assert.equal(g.run('keys.KeyW'),false);
});

test('hybrid devices switch on actual touch/mouse use; touch ignores pointer-lock loss',()=>{
 const g=started({touch:false,width:1024,height:768});
 g.pointer('game','pointerdown',1,100,100,'touch');assert.equal(g.run('touchControls.enabled'),true);
 g.emit('pointerlockchange');assert.equal(g.run('playing'),true);
 held(g);
 g.pointer('game','pointerdown',9,100,100,'mouse');assert.equal(g.run('touchControls.enabled'),false);neutral(g);
 assert.equal(g.nodes.touchControls.hidden,true);
 g.nodes.game.events.mousedown({button:0});assert.equal(g.nodes.game.lockRequests,2);
});


test('held sprint survives release of another sprint pointer; aim sensitivity has one setting',()=>{
 const g=started();
 g.pointer('touchSprint','pointerdown',1);g.pointer('touchSprint','pointerdown',2);
 g.pointer('touchSprint','pointerup',1);assert.equal(g.run('touchControls.sprint'),true);
 g.pointer('touchSprint','pointercancel',2);assert.equal(g.run('touchControls.sprint'),false);
 g.run('MOBILE_INPUT_CONFIG.lookSensitivity=.01');
 const angle=g.run('player.a');g.pointer('touchLook','pointerdown',3,300,160);
 g.pointer('touchLook','pointermove',3,320,160);assert(Math.abs(g.run('player.a')-angle-.2)<1e-9);
 g.pointer('touchJoystick','pointerdown',4,64,62);neutral(g);
});

test('map touch button delivers ordinary guest goodwill and alien extraction through existing actions',()=>{
 const g=started();
 g.run('nerve=50;aimedTarget=()=>({guest:guests[0],d:1})');tap(g,'touchGiveMap');
 assert.equal(g.run('nerve'),53);assert.equal(g.run('guests[0].hasMap'),true);assert.equal(g.run('ammo'),3);
 g.run('aimedTarget=()=>({alien:true,d:1})');tap(g,'touchGiveMap');
 assert.equal(g.run('nerve'),100);assert.equal(g.run('alienScene'),'extract');assert.equal(g.nodes.touchControls.hidden,true);
});

test('touch net reuses the existing Lester capture and alien hostility paths',()=>{
 const capture=started();
 capture.run('encounter=3;aimedTarget=()=>({d:1});alien.state="idle"');tap(capture,'touchFire');
 assert.equal(capture.run('captureTime'),0);assert.equal(capture.run('ammo'),2);
 assert.equal(capture.nodes.touchControls.hidden,true);capture.run('updateLesterCapture(6)');
 assert.equal(capture.nodes.scoreEntry.hidden,false);
 const alien=started();alien.run('aimedTarget=()=>({alien:true,d:1})');tap(alien,'touchFire');
 assert.equal(alien.run('alien.state'),'angry');assert.equal(alien.run('ammo'),2);
});

test('leaderboard/menu transitions and Escape clear touch input without affecting score entry',()=>{
 const g=started();held(g);
 g.nodes.leaderboard.hidden=false;g.run('touchControls.sync()');neutral(g);
 assert.equal(g.nodes.touchControls.hidden,true);
 g.nodes.leaderboard.hidden=true;g.run('touchControls.sync()');held(g);
 g.windowEvents.keydown({code:'Escape',target:{closest:()=>false}});
 assert.equal(g.run('playing'),false);neutral(g);
});
