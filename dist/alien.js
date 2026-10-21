// One unlisted visitor. Helping and angering it are mutually exclusive.
let alien=null,alienScene=null,alienClock=0;
const EXTRACTION_DURATION=8.2;
const extractionShip=new Image();let extractionShipReady=false;
extractionShip.onload=()=>extractionShipReady=true;extractionShip.src='alien-extraction-ship.png';
const alienFrames=new Map();
const alienReference=new Image();let alienReferenceReady=false;
alienReference.onload=()=>{alienReferenceReady=true;alienFrames.clear()};alienReference.src='alien-reference.png';
const alienWalkSheet=new Image();let alienWalkReady=false;
alienWalkSheet.onload=()=>{alienWalkReady=true;alienFrames.clear()};alienWalkSheet.src='alien-walk-sheet.png';
// Individually registered source rectangles keep the feet and torso aligned between poses.
const alienWalkRows=[
 [[150,4,130,394,214],[428,4,130,395,493],[701,4,126,396,770],[977,4,123,396,1048]],
 [[102,415,213,382,218],[401,415,183,381,495],[663,415,230,381,773],[958,415,219,382,1053]],
 [[129,807,141,408,203],[422,807,142,407,491],[692,807,135,407,766],[981,805,136,413,1046]]
];
function alienCinematic(){return alienScene!==null}
function resetAlien(){
 stopAlienVideo();alienScene=null;alienClock=0;let cells=[];
 for(let y=1;y<N-1;y++)for(let x=1;x<N-1;x++)if(!wall(x,y)&&Math.hypot(x+.5-player.x,y+.5-player.y)>9&&!guests.some(g=>Math.hypot(g.x-x-.5,g.y-y-.5)<.8))cells.push({x:x+.5,y:y+.5});
 alien={...cells[Math.floor(Math.random()*cells.length)],state:'idle',target:null,chase:0,stun:0,heading:Math.floor(Math.random()*4)*Math.PI/2,walkDistance:0,moving:false,wait:0,previous:null};
}
function alienTargets(){return alien&&(alien.state==='idle'||alien.state==='angry')?[{x:alien.x,y:alien.y,alien:true,guest:null}]:[]}
function alienView(heading,observerAngle){
 const relative=wrap(observerAngle-heading),angle=Math.abs(relative);
 if(angle<Math.PI/4)return 'front';if(angle>Math.PI*3/4)return 'back';
 return relative>0?'right':'left';
}
function alienPeople(){
 return alienTargets().map(p=>{const view=alienView(alien.heading,Math.atan2(player.y-alien.y,player.x-alien.x)),frame=alien.moving?Math.floor(alien.walkDistance*5)%4:1;
 return {...p,sprite:alienSprite(alien.state==='angry',frame,view,alien.moving),guest:true};});
}
function alienSprite(angry=false,frame=0,view='front',walking=false){
 const key=angry+':'+frame+':'+view+':'+walking;if(alienFrames.has(key))return alienFrames.get(key);
 const c=document.createElement('canvas');c.width=320;c.height=560;const a=c.getContext('2d');
 const e=(x,y,rx,ry,color,rot=0)=>{a.fillStyle=color;a.beginPath();a.ellipse(x,y,rx,ry,rot,0,Math.PI*2);a.fill()};
 if(alienWalkReady&&(walking||view!=='front')){
  const row=view==='back'?2:view==='front'?0:1,[sx,sy,sw,sh,anchor]=alienWalkRows[row][frame%4],scale=520/sh;
  a.save();if(view==='left'){a.translate(320,0);a.scale(-1,1)}
  a.drawImage(alienWalkSheet,sx,sy,sw,sh,160+(sx-anchor)*scale,20,sw*scale,520);
  if(angry&&view!=='back'){
   const eyes=row===0?[-15,15]:[30];
   for(const offset of eyes){e(160+offset,61,7,3,'#ff392e',offset>0?-.2:.2);a.strokeStyle='#404348';a.lineWidth=3;a.beginPath();a.moveTo(160+offset-8,52);a.lineTo(160+offset+8,offset>0?47:55);a.stroke()}
  }
  a.restore();alienFrames.set(key,c);return c;
 }
 if(alienReferenceReady){
  // Preserve the reference anatomy. Small offsets animate the intact sculpted body.
  const sway=Math.sin(frame*Math.PI/2)*(angry?3:1);
  a.drawImage(alienReference,-27+sway,0,374,560);
  if(angry){for(const side of [-1,1]){e(160+side*19+sway,52,9,4,'#ff372d',side*-.25);a.strokeStyle='#3c4142';a.lineWidth=4;a.beginPath();a.moveTo(160+side*8+sway,45);a.lineTo(160+side*30+sway,37);a.stroke()}}
  alienFrames.set(key,c);return c;
 }
 const silver=a.createLinearGradient(90,0,230,0);silver.addColorStop(0,'#505c64');silver.addColorStop(.35,'#d4dddc');silver.addColorStop(.57,'#9caeb1');silver.addColorStop(.8,'#e1e6de');silver.addColorStop(1,'#586973');
 a.strokeStyle='#283941';a.lineWidth=3;
 const limb=(x,y,dx,dy,width)=>{a.lineCap='round';a.strokeStyle='#34464d';a.lineWidth=width+5;a.beginPath();a.moveTo(x,y);a.lineTo(x+dx,y+dy);a.stroke();a.strokeStyle=silver;a.lineWidth=width;a.stroke()};
 const stride=Math.sin(frame*Math.PI/2)*(angry?16:3);
 limb(140,348,-13+stride,142,29);limb(181,348,14-stride,142,29);
 e(132+stride,510,23,29,silver,-.25);e(194-stride,510,23,29,silver,.25);
 for(let i=0;i<3;i++){e(113+stride+i*14,531,8,14,silver);e(180-stride+i*14,531,8,14,silver)}
 limb(107,216,-28-stride,143,22);limb(213,216,28+stride,143,22);
 for(const side of [-1,1]){let x=160+side*(81+stride);e(x,370,12,22,silver);for(let i=0;i<3;i++)limb(x+(i-1)*7,378,(i-1)*3,23,4)}
 e(160,278,53,91,silver);e(127,224,26,29,silver);e(193,224,26,29,silver);
 e(138,250,25,21,'#c5cfce');e(183,250,25,21,'#b4c2c4');
 for(let j=0;j<3;j++)for(const side of [-1,1])e(160+side*14,284+j*20,12,9,j%2?'#aababc':'#bac7c7');
 limb(160,158,0,43,27);
 // Elongated cranium, tapering cheeks and tiny downturned mouth from the references.
 e(160,93,67,80,silver);a.fillStyle=silver;a.beginPath();a.moveTo(100,116);a.quadraticCurveTo(111,161,160,180);a.quadraticCurveTo(209,160,220,116);a.fill();
 for(const side of [-1,1]){e(160+side*35,104,26,18,'#596e75',side*-.35);e(160+side*35,105,23,15,angry?'#e53638':'#050b11',side*-.35);e(160+side*40,99,8,4,angry?'#ffb778':'#cbd9db80',side*-.35);if(angry){a.strokeStyle='#4b5557';a.lineWidth=9;a.beginPath();a.moveTo(160+side*10,82);a.lineTo(160+side*58,68);a.stroke()}}
 e(155,134,2,3,'#3a464b');e(165,134,2,3,'#3a464b');a.strokeStyle='#34444c';a.lineWidth=3;a.beginPath();a.moveTo(143,158);a.quadraticCurveTo(160,angry?134:142,177,158);a.stroke();
 a.strokeStyle='#effffb55';a.lineWidth=2;a.beginPath();a.moveTo(141,30);a.quadraticCurveTo(113,47,111,74);a.stroke();
 alienFrames.set(key,c);return c;
}
function alienCaption(text){soundscape?.stopGuestVoice();$('dialogueName').textContent='UNREGISTERED GUEST';$('dialogueText').textContent=text;$('dialogue').hidden=false;captionTime=4;guestTalkIn=6}
function helpAlien(){
 if(!alien||alien.state!=='idle')return;
 alien.state='extracting';nerve=100;$('nerve').style.width='100%';mapHandoff=.9;
 alienScene='extract';alienClock=0;stopGuestTickles();scare=0;shot=0;reloading=0;mapHandoff=0;$('hud').hidden=true;
 if(soundscape){soundscape.stopGuestVoice();for(const source of soundscape.laughSources)try{source.stop()}catch{}soundscape.laughSources.clear()}
 $('dialogue').hidden=true;$('targetHint').textContent='';notice('GALACTIC GUEST RELATIONS · Goodwill restored to 100%');alienTone(false);
}
function netAlien(){
 if(!alien||!['idle','angry'].includes(alien.state))return;
 if(alien.state==='angry'){alien.stun=.3;notice('The alien tears through your net. RUN!');return}
 alien.state='angry';alien.chase=0;alien.target={x:Math.floor(alien.x)+.5,y:Math.floor(alien.y)+.5};
 stopGuestTickles();alienCaption('That was a very bad first contact.');$('chaseBanner').hidden=false;$('chaseBanner').textContent='YOU NETTED THE WRONG SPECIES. RUN!';notice('SHIFT TO SPRINT. The alien is coming for you!');sfx('scare');
}
function alienTone(danger){if(!audioCtx||muted)return;for(let i=0;i<4;i++)tone((danger?85:330)*(1+i*.5),1.5,.07,'sine')}
function updateAlien(dt){
 if(alienScene){alienClock+=dt;
  if(alienScene==='extract'&&alienClock>=EXTRACTION_DURATION){alien.state='gone';alienScene=null;$('hud').hidden=false;$('dialogue').hidden=true;notice('Visitor returned to orbit. Guest Goodwill: 100%.');}
  // The defeat video ends via its media ended event, never a fixed timer.
  return;
 }
 if(alien?.state==='idle'){
  alien.moving=false;alien.wait=Math.max(0,alien.wait-dt);if(alien.wait>0)return;
  if(!alien.target){
   const cx=Math.floor(alien.x)+.5,cy=Math.floor(alien.y)+.5;
   let options=[[1,0],[-1,0],[0,1],[0,-1]].map(([dx,dy])=>({x:cx+dx,y:cy+dy})).filter(p=>!wall(p.x,p.y));
   const fresh=options.filter(p=>!alien.previous||p.x!==alien.previous.x||p.y!==alien.previous.y);if(fresh.length)options=fresh;
   alien.target=options[Math.floor(Math.random()*options.length)];alien.previous={x:cx,y:cy};
  }
  moveAlien(dt,.58);
  if(!alien.target)alien.wait=.4+Math.random()*1.4;
  return;
 }
 if(alien?.state!=='angry')return;
 $('hint').textContent='The alien is hunting you. Keep moving!';$('targetHint').textContent='';if(captionTime>0){captionTime-=dt;if(captionTime<=0)$('dialogue').hidden=true}
 alien.chase+=dt;alien.stun=Math.max(0,alien.stun-dt);alien.moving=false;if(alien.stun)return;
 if(!alien.target)alien.target=pathTo(alien.x,alien.y,player.x,player.y);
 moveAlien(dt,2.25+Math.min(1.1,alien.chase*.045));
 if(Math.hypot(alien.x-player.x,alien.y-player.y)<.65&&sight(alien.x,alien.y)){alienScene='burn';alienClock=0;scare=0;shot=0;stopGuestTickles();soundscape?.stopGuestVoice();$('dialogue').hidden=true;$('hud').hidden=true;$('chaseBanner').hidden=true;startAlienVideo()}
}
function moveAlien(dt,speed){
 if(!alien.target)return;
 const dx=alien.target.x-alien.x,dy=alien.target.y-alien.y,d=Math.hypot(dx,dy),step=Math.min(d,dt*speed);
 if(d>.001){alien.heading=Math.atan2(dy,dx);alien.moving=true;alien.x+=dx/d*step;alien.y+=dy/d*step;alien.walkDistance+=step}
 if(d<=step+.001){alien.x=alien.target.x;alien.y=alien.target.y;alien.target=null}
}
function alienVideoActive(){return alienScene==='burn'}
function stopAlienVideo(){
 const video=$('alienFilmVideo');video.pause();video.currentTime=0;$('alienFilm').hidden=true;$('alienFilmStart').hidden=true;
}
function startAlienVideo(){
 const video=$('alienFilmVideo');$('alienFilm').hidden=false;video.currentTime=0;video.muted=muted;
 if(soundscape){soundscape.stopGuestVoice();for(const source of soundscape.laughSources)try{source.stop()}catch{}soundscape.laughSources.clear()}
 document.exitPointerLock?.();resumeAlienVideo();
}
function resumeAlienVideo(){
 const video=$('alienFilmVideo');playing=true;$('pause').hidden=true;video.muted=muted;
 video.play().then(()=>{$('alienFilmStart').hidden=true}).catch(()=>{if(alienVideoActive()){$('alienFilmStart').textContent='PLAY VIDEO';$('alienFilmStart').hidden=false}});
}
function finishAlienVideo(){
 if(!alienVideoActive())return;
 stopAlienVideo();alienScene=null;alien.state='gone';playing=false;finished=true;document.exitPointerLock?.();
 $('pause').hidden=true;$('end').hidden=false;$('endTag').textContent='CLOSE ENCOUNTER: TERMINATED';$('endTitle').textContent='You are now locally sourced ash.';$('endText').textContent='The alien caught you. Its ship incinerated you from orbit. Next time, try offering a map.';
}
document.addEventListener('DOMContentLoaded',()=>{
 $('alienFilmVideo').addEventListener('ended',finishAlienVideo);
 $('alienFilmVideo').addEventListener('error',()=>{if(alienVideoActive()){$('alienFilmStart').textContent='VIDEO UNAVAILABLE · CONTINUE';$('alienFilmStart').hidden=false}});
 $('alienFilmStart').onclick=()=>{if($('alienFilmVideo').error)finishAlienVideo();else resumeAlienVideo()};
});
// A continuous, eased extraction shot. The defeated-player film is independent.
const extractClamp=v=>Math.max(0,Math.min(1,v));
const extractEase=v=>{v=extractClamp(v);return v*v*(3-2*v)};
const extractProgress=(t,start,end)=>extractEase((t-start)/(end-start));
function extractionPose(t){
 const arrival=extractProgress(t,.6,2.25),lift=extractProgress(t,3.05,6.05),departure=extractProgress(t,6.3,7.55);
 return {arrival,lift,departure,beam:extractProgress(t,1.85,2.7)*(1-extractProgress(t,6.05,6.5)),opacity:extractProgress(t,0,.65)*(1-extractProgress(t,7.55,EXTRACTION_DURATION))};
}
let extractionBackdrop=null,extractionBackdropKey='';
function drawExtractionBackdrop(){
 const key=W+':'+H+':'+corn.width;
 if(key!==extractionBackdropKey){
  extractionBackdropKey=key;extractionBackdrop=document.createElement('canvas');extractionBackdrop.width=W;extractionBackdrop.height=H;const c=extractionBackdrop.getContext('2d');
  const sky=c.createLinearGradient(0,0,0,H);sky.addColorStop(0,'#020813');sky.addColorStop(.6,'#10252c');sky.addColorStop(1,'#080f10');c.fillStyle=sky;c.fillRect(0,0,W,H);
  for(let i=0;i<90;i++){c.fillStyle=i%4?'#c9e8e553':'#e3f9ef99';c.fillRect((i*173.37)%W,(i*67.23)%(H*.53),i%6?1:2,i%6?1:2)}
  const floor=c.createLinearGradient(0,H*.6,0,H);floor.addColorStop(0,'#102523');floor.addColorStop(1,'#3b4030');c.fillStyle=floor;c.fillRect(0,H*.6,W,H*.4);
  for(let i=0;i<160;i++){const y=H*.64+(i/160)**1.5*H*.36,x=(i*139.71)%W;c.fillStyle=i%3?'#a6aa7030':'#090f1240';c.fillRect(x,y,2+i%5,1+i%3)}
  for(const side of [-1,1]){
   const bank=document.createElement('canvas');bank.width=W;bank.height=H;const b=bank.getContext('2d');
   b.drawImage(corn,0,0,corn.width,corn.height,side<0?-W*.18:W*.76,H*.12,W*.43,H*.94);
   b.globalCompositeOperation='destination-in';const top=b.createLinearGradient(0,H*.1,0,H*.32);top.addColorStop(0,'#0000');top.addColorStop(1,'#000');b.fillStyle=top;b.fillRect(0,0,W,H);
   const edge=b.createLinearGradient(0,0,W,0);if(side<0){edge.addColorStop(0,'#000');edge.addColorStop(.13,'#000');edge.addColorStop(.25,'#0000');edge.addColorStop(1,'#0000')}else{edge.addColorStop(0,'#0000');edge.addColorStop(.76,'#0000');edge.addColorStop(.89,'#000');edge.addColorStop(1,'#000')};b.fillStyle=edge;b.fillRect(0,0,W,H);c.save();c.globalAlpha=.52;c.drawImage(bank,0,0);c.restore();
  }
  const shade=c.createLinearGradient(0,0,W,0);shade.addColorStop(0,'#01060be8');shade.addColorStop(.3,'#01070b00');shade.addColorStop(.7,'#01070b00');shade.addColorStop(1,'#01060be8');c.fillStyle=shade;c.fillRect(0,0,W,H);
 }
 ctx.drawImage(extractionBackdrop,0,0);
}
function drawExtractionMap(x,y,size,angle,held=false){
 ctx.save();ctx.translate(x,y);ctx.rotate(angle);ctx.shadowColor='#0008';ctx.shadowBlur=7;
 poly(ctx,[[-size*.52,-size*.36],[-size*.16,-size*.42],[size*.17,-size*.31],[size*.52,-size*.37],[size*.52,size*.37],[size*.17,size*.43],[-size*.16,size*.32],[-size*.52,size*.39]],'#e0d1a4');ctx.shadowBlur=0;
 for(let i=0;i<3;i++){ctx.fillStyle=['#a79d7850','#fff5cf45','#968d6750'][i];ctx.fillRect(-size*.5+i*size/3,-size*.32,size/3,size*.66)}
 ctx.strokeStyle='#647955';ctx.lineWidth=Math.max(1,size*.025);
 for(let i=0;i<5;i++){ctx.beginPath();ctx.moveTo(-size*.4+i*size*.17,-size*.24);ctx.lineTo(-size*.4+i*size*.17,size*.22);ctx.lineTo(-size*.31+i*size*.17,size*.22);ctx.stroke()}
 ellipse(ctx,size*.25,-size*.12,size*.035,size*.035,'#ba5d3b');if(held)for(let i=0;i<3;i++)ellipse(ctx,-size*.46,-size*.1+i*size*.075,size*.085,size*.03,'#bac5c2');ctx.restore();
}
function drawExtractionShip(x,y,width,t){
 if(extractionShipReady){
  const h=width*extractionShip.naturalHeight/extractionShip.naturalWidth;
  ctx.save();ctx.translate(x,y);ctx.rotate(Math.sin(t*.7)*.008);ctx.drawImage(extractionShip,-width/2,-h*.77,width,h);ctx.restore();
 }else{const steel=ctx.createLinearGradient(x,y-width*.17,x,y+width*.06);steel.addColorStop(0,'#97a9af');steel.addColorStop(.5,'#2c404d');steel.addColorStop(1,'#111f2b');ellipse(ctx,x,y-width*.07,width*.5,width*.12,steel);ellipse(ctx,x,y-width*.13,width*.22,width*.11,steel)}
}
function drawAlienScene(){
 if(alienScene!=='extract')return;
 const t=alienClock,p=extractionPose(t),shipWidth=Math.min(W*.67,H*.94),shipX=W*.5+Math.sin(t*.65)*W*.003,shipY=H*(.29-.43*(1-p.arrival)-.7*p.departure*p.departure),apertureY=shipY;
 const groundY=H*.91,liftY=groundY-(groundY-apertureY-H*.02)*p.lift,bodyH=H*.54*(1-p.lift*.64),bodyW=bodyH*320/560;
 ctx.save();ctx.globalAlpha=p.opacity;drawExtractionBackdrop();
 // The pool of reflected light grows before the alien leaves the ground.
 ctx.save();ctx.globalCompositeOperation='screen';
 const pool=ctx.createRadialGradient(W*.5,groundY,0,W*.5,groundY,W*.26);pool.addColorStop(0,`rgba(116,248,210,${p.beam*.36})`);pool.addColorStop(1,'#70efd500');ctx.fillStyle=pool;ctx.fillRect(W*.18,H*.67,W*.64,H*.33);ellipse(ctx,W*.5,groundY,W*.19*p.beam,H*.018*p.beam,`rgba(167,255,226,${p.beam*.2})`);
 if(p.beam>0){
  const beam=ctx.createLinearGradient(0,apertureY,0,groundY);beam.addColorStop(0,`rgba(208,255,243,${p.beam*.26})`);beam.addColorStop(.6,`rgba(105,234,202,${p.beam*.1})`);beam.addColorStop(1,`rgba(128,252,218,${p.beam*.19})`);
  poly(ctx,[[shipX-shipWidth*.055,apertureY],[shipX+shipWidth*.055,apertureY],[W*.69,groundY],[W*.31,groundY]],beam);
  for(let j=0;j<8;j++){const fraction=j/8,alpha=Math.sin(fraction*Math.PI)*.018*p.beam;poly(ctx,[[shipX+(fraction-.5)*shipWidth*.11,apertureY],[shipX+(fraction-.5)*shipWidth*.11+3,apertureY],[W*.5+(fraction-.5)*W*.38+10,groundY],[W*.5+(fraction-.5)*W*.38,groundY]],`rgba(200,255,238,${alpha})`)}
 }
 ctx.restore();
 // One stable reference-body pose floats upward, rather than walking in mid-air.
 ctx.save();ctx.beginPath();ctx.rect(0,apertureY+H*.006,W,H);ctx.clip();ctx.globalAlpha*=1-extractProgress(p.lift,.86,1);ctx.shadowColor='#a3ffe2';ctx.shadowBlur=7*p.beam;
 const hover=Math.sin(Math.max(0,t-2.7)*2.3)*H*.003*p.beam*(1-p.lift);
 ctx.translate(W*.5+Math.sin(t*1.4)*H*.002*p.beam,liftY+hover);ctx.rotate(Math.sin(t*1.1)*.015*p.beam);ctx.drawImage(alienSprite(false,0),-bodyW/2,-bodyH,bodyW,bodyH);ctx.restore();
 // The folded map travels from the player's hand into the alien's hand.
 const handoff=extractProgress(t,.15,1.35),withdraw=extractProgress(t,1.35,1.95),mapX=W*.5+bodyH*.17,mapY=liftY-bodyH*.44;
 if(t<6.05){
  const mx=W*.72+(mapX-W*.72)*handoff,my=H*1.02+(mapY-H*1.02)*handoff;
  ctx.save();ctx.globalAlpha*=1-extractProgress(p.lift,.82,.98);drawExtractionMap(mx,my,H*.072*(1-p.lift*.64),-.22+.34*handoff,handoff>=.99);ctx.restore();
  if(t<1.95){ctx.save();ctx.translate(mx+withdraw*W*.25,my+H*.05+withdraw*H*.35);ctx.rotate(-.3);poly(ctx,[[0,0],[H*.06,-H*.02],[H*.2,H*.35],[H*.1,H*.4]],'#3a493b');ellipse(ctx,0,0,H*.038,H*.026,'#75816b');ctx.restore()}
 }
 // Fine drifting motes suggest energy without strobing or hard beam bands.
 ctx.save();ctx.globalCompositeOperation='screen';
 for(let i=0;i<54;i++){const f=(i*.173+t*(.1+i%4*.009))%1,y=groundY-f*(groundY-apertureY),spread=W*.17*(1-f)+shipWidth*.035;const x=shipX+Math.sin(i*9.71+t*.2)*spread,alpha=Math.sin(f*Math.PI)*p.beam*.52;ellipse(ctx,x,y,1+i%3*.5,1+i%3*.7,`rgba(191,255,235,${alpha})`)}
 ctx.restore();drawExtractionShip(shipX,shipY,shipWidth*(1-p.departure*.4),t);
 // A restrained lower-third keeps the alien, beam and ship unobstructed.
 const textAlpha=extractProgress(t,.55,1.2)*(1-extractProgress(t,7.2,7.65));
 ctx.save();ctx.globalAlpha*=textAlpha;ctx.fillStyle='#021018c9';ctx.fillRect(W*.15,H*.92,W*.7,H*.065);ctx.textAlign='center';ctx.fillStyle='#def7e7';ctx.font=`bold ${Math.min(19,W*.026)}px monospace`;ctx.fillText(t<6.2?'GUEST GOODWILL RESTORED · 100%':'THANK YOU FOR VISITING EARTH.',W*.5,H*.96);ctx.restore();
 ctx.restore();
}
