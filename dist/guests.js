// Guests are original fictional visitors, with captions and optional browser voices.
let revolt=false,chaseTime=0,attackTime=0,attackDone=false,attacker=null,hostileSprites=[];
let guests=[],guestSprites=[],nettedSprites=[],guestsReady=false,guestLoadError=false,complaints=0,guestTalkIn=2,captionTime=0,wasGuestPlaying=false;
const guestTypes=[
 {name:'Dale · self-appointed navigator',lines:['I know exactly where we are. We are in corn.','Those giggles in the distance make me nervous','I think I’m in danger'],caught:["Hey! That hurts!"]},
 {name:'Bev · snack enthusiast',lines:['I brought popcorn. Is that rude to the corn?','Something smells ummm interesting?','I think someone touched me in here and I didn’t like it very much!'],caught:["I'm not into this, sicko!"]},
 {name:'Gary · very impressed tourist',lines:['Do you know Myles? Myles Smith?','I wanted to meet an owner of this establishment, but not like that!'],caught:["I didn't sign up for this shit, pervert!"]},
 {name:'Nina · regretting the group outing',lines:['What kind of maze is this? I’m uncomfortable.','Who is that nasty man tickling guests?'],caught:["I'm telling Mee Mees about this!"]},
 {name:'Milo · junior maze expert',lines:['Get me out of here!',"That man keeps chasing me!!","Gross... I found someone's messy diaper on the ground!"],caught:["Stop that!"]},
 {name:'Poppy · suspicious of vegetables',lines:['Some man giggled and asked if I have a stuncle??','He offered me a cream filled donut and ran away!','What is a pumpkintitzy?'],caught:["Hey! I don't like this game!"]}
];
function loadGuests(){
 guestSprites=[];nettedSprites=[];hostileSprites=[];
 for(let type=0;type<6;type++){
  for(const [list,state] of [[guestSprites,{}],[nettedSprites,{netted:true}],[hostileSprites,{hostile:true}]]){
   const sprite=makeGuestCanvas();paintBlockGuest(sprite,type,0,state);list.push(sprite);
  }
 }
 guestsReady=true;guestLoadError=false;refreshStart();
}
function spawnGuests(){
 revolt=false;chaseTime=attackTime=0;attackDone=false;attacker=null;$('chaseBanner').hidden=true;guests=[];complaints=0;guestTalkIn=2;captionTime=0;$('dialogue').hidden=true;
 let cells=[];for(let y=1;y<N-1;y++)for(let x=1;x<N-1;x++)if(!wall(x,y)&&Math.hypot(x+.5-player.x,y+.5-player.y)>2.5)cells.push({x:x+.5,y:y+.5});
 cells.sort((a,b)=>Math.hypot(a.x-player.x,a.y-player.y)-Math.hypot(b.x-player.x,b.y-player.y));
 for(let i=0;i<22&&cells.length;i++){let index=i<2?Math.min(i*6,cells.length-1):Math.floor(Math.random()*cells.length),pos=cells.splice(index,1)[0];guests.push({...pos,type:i%6,target:null,previous:null,wait:Math.random()*2,netted:0,line:0,phase:i*1.37,speakingUntil:0,hasMap:false,tickled:false,tickleSeconds:0,tickleLoss:0})}
 $('complaints').textContent='GUEST COMPLAINTS 0 / 3';
}
function guestSay(g,caught=false){
 soundscape?.stopGuestVoice();window.speechSynthesis?.cancel();
 for(const other of guests)other.speakingUntil=0;g.speakingUntil=time+5.5;
 const type=guestTypes[g.type],lines=caught?type.caught:type.lines,line=lines[g.line++%lines.length];
 $('dialogueName').textContent=type.name;$('dialogueText').textContent='“'+line+'”';$('dialogue').hidden=false;captionTime=5.5;
 if(g.type===0&&!caught){
  const clip=['dale01','dale02','dale03'][guestTypes[0].lines.indexOf(line)];
  const duration=muted?2.52:(soundscape?.playGuestVoice(clip)||2.52);
  captionTime=duration+.4;g.speakingUntil=time+duration;return;
 }
 if(g.type===1&&!caught){
  const clip=['bev01','bev02','bev03'][guestTypes[1].lines.indexOf(line)];
  const duration=muted?3.12:(soundscape?.playGuestVoice(clip)||3.12);
  captionTime=duration+.4;g.speakingUntil=time+duration;return;
 }
 if(g.type===2){
  const index=guestTypes[2].lines.indexOf(line),clip=caught?'garyNetted':['gary01','gary02'][index],fallback=caught?3.024:[3.12,3.792][index];
  const duration=muted?fallback:(soundscape?.playGuestVoice(clip)||fallback);
  captionTime=duration+.4;g.speakingUntil=time+duration;return;
 }
 if(g.type===3&&!caught){
  const clip=['nina01','nina02'][guestTypes[3].lines.indexOf(line)];
  const duration=muted?3.024:(soundscape?.playGuestVoice(clip)||3.024);
  captionTime=duration+.4;g.speakingUntil=time+duration;return;
 }
 if(g.type===4&&!caught){
  const index=guestTypes[4].lines.indexOf(line),clip=['milo01','milo02','milo03'][index],fallback=[2.424,2.424,3.504][index];
  const duration=muted?fallback:(soundscape?.playGuestVoice(clip)||fallback);
  captionTime=duration+.4;g.speakingUntil=time+duration;return;
 }
 if(g.type===5&&!caught){
  const clip=['poppy01','poppy02','poppy03'][guestTypes[5].lines.indexOf(line)];
  const duration=muted?3.024:(soundscape?.playGuestVoice(clip)||3.024);
  captionTime=duration+.4;g.speakingUntil=time+duration;return;
 }

}
function captureGuest(g){
 if(revolt){g.netted=1;notice('The net only slows them down. RUN!');return}
 if(g.netted>0){notice('Already tangled. Give the guest a moment!');return}
 g.netted=5;g.target=null;complaints++;nerve=Math.max(0,nerve-25);sfx('empty');guestSay(g,true);guestTalkIn=8;
 $('complaints').textContent=`GUEST COMPLAINTS ${complaints} / 3`;
 notice('WRONG PERSON! −25 Guest Goodwill · Guest complaint filed');
 if(complaints>=3){beginRevolt()}
 else if(nerve<=0){finish(false)}
}
function updateGuests(dt){
 if(revolt){updateRevolt(dt);return}
 if(captionTime>0){captionTime-=dt;if(captionTime<=0)$('dialogue').hidden=true}guestTalkIn-=dt;
 for(const g of guests){
  if(g.tickled&&!revolt)continue;
  if(g.netted>0){g.netted=Math.max(0,g.netted-dt);continue}g.wait-=dt;if(g.wait>0)continue;
  if(!g.target){let options=[];for(const [dx,dy]of [[1,0],[-1,0],[0,1],[0,-1]]){let x=Math.floor(g.x)+dx+.5,y=Math.floor(g.y)+dy+.5;if(!wall(x,y))options.push({x,y})}let fresh=options.filter(p=>!g.previous||p.x!==g.previous.x||p.y!==g.previous.y);if(fresh.length)options=fresh;g.target=options[Math.floor(Math.random()*options.length)];g.previous={x:Math.floor(g.x)+.5,y:Math.floor(g.y)+.5}}
  if(g.target){let dx=g.target.x-g.x,dy=g.target.y-g.y,d=Math.hypot(dx,dy),move=Math.min(d,dt*.46);if(d>.001){g.x+=dx/d*move;g.y+=dy/d*move}if(d<.03){g.x=g.target.x;g.y=g.target.y;g.target=null;g.wait=Math.random()*1.3}}
 }
 if(guestTalkIn<=0&&time>lesterSpeechUntil){const nearby=guests.filter(g=>!g.netted&&Math.hypot(g.x-player.x,g.y-player.y)<4&&sight(g.x,g.y));if(nearby.length){guestSay(nearby[Math.floor(Math.random()*nearby.length)]);guestTalkIn=8+Math.random()*5}}
 const target=aimedTarget();$('reticle').style.color=target?.guest?'#f0c477':'#f3e6bdc0';$('targetHint').textContent=target?.alien?(alien.state==='angry'?'ALIEN · RUN!':'UNREGISTERED GUEST · RIGHT-CLICK TO GIVE MAP'):target?.guest?(target.guest.hasMap?'GUEST · MAP ALREADY GIVEN':'GUEST · RIGHT-CLICK TO GIVE MAP'):'';
}
function aimedTarget(){
 // Nearest visible intersected body wins, so a guest can block a shot at Lester.
 return [{x:lester.x,y:lester.y,guest:null},...guests.map(g=>({x:g.x,y:g.y,guest:g})),...alienTargets()].map(t=>({...t,d:Math.hypot(t.x-player.x,t.y-player.y)})).filter(t=>t.d<5.5&&Math.abs(wrap(Math.atan2(t.y-player.y,t.x-player.x)-player.a))<Math.atan2(t.guest?.30:.43,Math.max(.01,t.d))+.025&&sight(t.x,t.y)).sort((a,b)=>a.d-b.d)[0];
}
function guestAudioState(){if((!playing||muted)&&wasGuestPlaying){window.speechSynthesis?.cancel();soundscape?.stopGuestVoice()}wasGuestPlaying=playing&&!muted}
function drawCharacters(horizon){
 const people=[...(captureTime>=0||defeatTime>=0?[]:[{x:lester.x,y:lester.y,sprite:actor,guest:false}]),...guests.map(g=>({...g,sprite:animatedGuest(g),guest:true})),...alienPeople()];
 people.sort((a,b)=>Math.hypot(b.x-player.x,b.y-player.y)-Math.hypot(a.x-player.x,a.y-player.y));
 for(const p of people){if(!p.sprite)continue;const d=Math.hypot(p.x-player.x,p.y-player.y),a=wrap(Math.atan2(p.y-player.y,p.x-player.x)-player.a);if(Math.abs(a)>1.2||d<.15)continue;
  const depth=d*Math.cos(a),h=H*.94/depth,w=h*(p.guest?.60:2/3),x=W/2+Math.tan(a)*W/(2*Math.tan(FOV/2))-w/2,y=horizon+H*.55/depth-h+Math.sin(time*(p.guest?3:5))*h*.01;
  for(let ix=Math.max(0,Math.ceil(x/2)*2);ix<Math.min(W,x+w);ix+=2)if(depth<(zbuf[ix/2]||0)){let sx=Math.max(0,(ix-x)/w*p.sprite.width),sw=Math.min(p.sprite.width-sx,2/w*p.sprite.width);if(sw>0)ctx.drawImage(p.sprite,sx,0,sw,p.sprite.height,ix,y,sw/p.sprite.width*w,h)}
 }
}

function drawBlade(c,scale){
 c.save();c.scale(scale,scale);c.shadowColor='#000';c.shadowBlur=6;
 poly(c,[[-10,40],[12,40],[12,115],[-10,115]],'#382c23');
 poly(c,[[-20,30],[23,30],[23,44],[-20,44]],'#7e8989');
 poly(c,[[-8,30],[-8,-108],[4,-160],[16,-105],[12,30]],'#b9ced0');
 poly(c,[[4,-160],[16,-105],[12,30],[3,30]],'#627d83');
 c.strokeStyle='#e5f2e8';c.lineWidth=2;c.beginPath();c.moveTo(-8,25);c.lineTo(-8,-108);c.lineTo(4,-160);c.stroke();c.restore();
}
function beginRevolt(){
 revolt=true;chaseTime=0;attackTime=0;nerve=Math.max(nerve,15);scare=0;
 for(const g of guests){g.netted=0;g.wait=0;g.target={x:Math.floor(g.x)+.5,y:Math.floor(g.y)+.5}}
 window.speechSynthesis?.cancel();soundscape?.stopGuestVoice();$('dialogue').hidden=true;$('chaseBanner').hidden=false;
 $('chaseBanner').textContent='THE GUESTS HAVE HAD ENOUGH. RUN!';
 $('complaints').textContent='3 COMPLAINTS · GUESTS HOSTILE';notice('SHIFT TO SPRINT. Keep moving!');sfx('scare');
}
function beginAttack(){
 if(attackTime>0||attackDone)return;
 attacker=guests.reduce((a,g)=>!a||Math.hypot(g.x-player.x,g.y-player.y)<Math.hypot(a.x-player.x,a.y-player.y)?g:a,null);
 attackTime=.001;shot=0;scare=0;$('chaseBanner').textContent='THEY CAUGHT YOU.';notice('');window.speechSynthesis?.cancel();soundscape?.stopGuestVoice();
}
function updateRevolt(dt){
 if(attackTime>0){const before=attackTime;attackTime+=dt;if(before<.65&&attackTime>=.65)sfx('scare');if(attackTime>=2.4){attackDone=true;finish(false);$('endTag').textContent='GUEST RELATIONS: TERMINATED';$('endTitle').textContent='The guests got their refund.';$('endText').textContent='You ran, but the furious guests caught and stabbed you. Three complaints turned the entire maze against you. Lester is still out there tickling guests whether they like it or not.';$('chaseBanner').hidden=true}return}
 chaseTime+=dt;nerve=Math.max(10,40-chaseTime);$('hint').textContent='RUN! The guests are closing in.';$('targetHint').textContent='';
 if(chaseTime>10)$('chaseBanner').textContent='FOOTSTEPS. CLOSER. FASTER.';
 for(const g of guests){if(g.netted>0){g.netted-=dt;continue}
  if(!g.target)g.target=pathTo(g.x,g.y,player.x,player.y);
  if(g.target){const dx=g.target.x-g.x,dy=g.target.y-g.y,d=Math.hypot(dx,dy),speed=1.15+Math.min(3.2,chaseTime*.13),step=Math.min(d,dt*speed);if(d>.001){g.x+=dx/d*step;g.y+=dy/d*step}if(d<=step+.001){g.x=g.target.x;g.y=g.target.y;g.target=null}}
  if(chaseTime>=10&&Math.hypot(g.x-player.x,g.y-player.y)<.72&&sight(g.x,g.y)){beginAttack();return}
 }
 // Authored horror ending: the escape phase always culminates in an ambush.
 if(chaseTime>=26)beginAttack();
}
function drawChase(){
 if(!revolt)return;
 ctx.save();
 if(attackTime>0){const p=Math.min(1,attackTime/.5),h=H*(1.1+p*.25),sprite=attacker?animatedGuest(attacker,attackTime):hostileSprites[0];
  ctx.translate(Math.sin(attackTime*43)*8,Math.cos(attackTime*37)*5);
  if(sprite)ctx.drawImage(sprite,W/2-h*.3,H-h,h*.6,h);
  
  if(attackTime>.65){ctx.fillStyle=`rgba(75,5,8,${Math.max(0,.4-(attackTime-.65)*.6)})`;ctx.fillRect(0,0,W,H)}
  ctx.fillStyle=`rgba(0,0,0,${Math.min(1,Math.max(0,(attackTime-1.1)/.9))})`;ctx.fillRect(0,0,W,H);
 }else{ctx.strokeStyle=`rgba(154,45,30,${.12+Math.sin(time*6)*.05})`;ctx.lineWidth=24;ctx.strokeRect(0,0,W,H)}
 ctx.restore();
}
