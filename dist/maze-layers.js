let lastLesterPing=null,nextLesterPing=30,mapHandoff=0;
function resetMazeLayers(){lastLesterPing=null;nextLesterPing=30;mapHandoff=0}
function updateMazeLayers(dt){
 mapHandoff=Math.max(0,mapHandoff-dt);
 if(time>=nextLesterPing){lastLesterPing={x:Math.floor(lester.x/3)*3+1.5,y:Math.floor(lester.y/3)*3+1.5,at:time};nextLesterPing=time+30;notice('Lester spotted! Red zone on your minimap.');}
}
function giveGuestMap(){
 if(alienCinematic())return;
 if(!playing||attackTime>0||captureTime>=0||defeatTime>=0)return;
 if(alien?.state==='angry'){notice('The alien is past accepting maps. RUN!');return}
 const alienHit=aimedTarget();if(alienHit?.alien&&alienHit.d<=2.4){helpAlien();return}
 if(revolt){notice('They are not interested in maps anymore. RUN!');return}
 const hit=aimedTarget(),g=hit?.guest;
 if(!g||hit.d>2.4){notice('Aim at a nearby guest, then right-click to offer a map.');return}
 if(g.netted>0){notice('Let them untangle themselves first.');return}
 if(g.hasMap){notice('This guest already has a map. Find someone else to help.');return}
 soundscape?.stopGuestVoice();window.speechSynthesis?.cancel();g.hasMap=true;nerve=Math.min(100,nerve+3);mapHandoff=.9;sfx('insert');notice('MAP DELIVERED · +3 Guest Goodwill');
 $('dialogueName').textContent=guestTypes[g.type].name;$('dialogueText').textContent='“A map! Great. Which way do I hold it?”';$('dialogue').hidden=false;captionTime=4;guestTalkIn=5;g.speakingUntil=time+4;
}
function clearBetween(ax,ay,bx,by){const distance=Math.hypot(bx-ax,by-ay);for(let t=.08;t<distance;t+=.08)if(wall(ax+(bx-ax)*t/distance,ay+(by-ay)*t/distance))return false;return true}
function stopGuestTickles(){for(const g of guests){g.tickled=false;g.tickleSeconds=0}}
function tickleNearbyGuest(dt){
 if(revolt||finished){stopGuestTickles();return false}
 const nearby=guests.filter(g=>(g.tickleLoss||0)<15&&!g.netted&&Math.hypot(g.x-lester.x,g.y-lester.y)<1.25&&clearBetween(lester.x,lester.y,g.x,g.y)).sort((a,b)=>Math.hypot(a.x-lester.x,a.y-lester.y)-Math.hypot(b.x-lester.x,b.y-lester.y));
 const target=nearby[0];
 for(const g of guests){g.tickled=g===target;if(g!==target)g.tickleSeconds=0}
 if(!target)return false;
 target.tickleSeconds=(target.tickleSeconds||0)+dt;
 if(target.tickleSeconds>=3){target.tickleSeconds-=3;target.tickleLoss=(target.tickleLoss||0)+5;nerve=Math.max(0,nerve-5);if(dist()<7)giggle();notice('Lester tickled a guest! −5 Guest Goodwill');if(nerve<=0)finish(false)}
 return true;
}
function drawLesterPing(ox,oy,size,span){
 if(lastLesterPing&&time-lastLesterPing.at<3&&Math.floor((time-lastLesterPing.at)*5)%2===0){ctx.fillStyle='#ff363650';ctx.fillRect(ox+(lastLesterPing.x-1.5)*size,oy+(lastLesterPing.y-1.5)*size,size*3,size*3);ellipse(ctx,ox+lastLesterPing.x*size,oy+lastLesterPing.y*size,5,5,'#ff4848')}
 ctx.fillStyle='#c69788';ctx.font='9px monospace';ctx.textAlign='left';ctx.fillText(`LESTER PING IN ${Math.max(0,Math.ceil(nextLesterPing-time))}s`,ox,oy+span+50);
}
function drawMapHandoff(){if(mapHandoff<=0)return;ctx.save();ctx.translate(W*.48,H*.8+Math.sin((1-mapHandoff/.9)*Math.PI)*-40);ctx.rotate(-.12);ctx.fillStyle='#e1d4a5';ctx.fillRect(-70,-45,140,100);ctx.strokeStyle='#697d52';ctx.lineWidth=3;for(let i=0;i<6;i++){ctx.beginPath();ctx.moveTo(-60+i*22,-35);ctx.lineTo(-60+i*22,35);ctx.lineTo(-45+i*22,35);ctx.stroke()}ctx.restore()}
const launcherImage=new Image();let launcherReady=false;launcherImage.onload=()=>launcherReady=true;launcherImage.src='net-launcher.png';
function drawNetLauncher(){
 if(!launcherReady){gunFallback();return}
 ctx.save();const w=Math.min(W*.64,H*1.04),h=w*launcherImage.naturalHeight/launcherImage.naturalWidth;
 const recoil=shot>0?Math.sin(shot/.5*Math.PI)*28:0,drop=reloading>0?Math.sin(reloading/2*Math.PI)*h*.55:0;
 ctx.translate(W-w*.44+(playing?Math.sin(steps*7)*3:0),H+drop+recoil);ctx.rotate(-recoil*.0018);ctx.drawImage(launcherImage,-w*.56,-h,w,h);ctx.restore();
 if(shot>.05){const p=1-shot/.5,r=25+p*W*.4;ctx.save();ctx.globalAlpha=(1-p)*.8;ctx.strokeStyle='#ddd5ae';ctx.lineWidth=1.5;ctx.beginPath();ctx.ellipse(W/2,H/2,r,r*.7,0,0,Math.PI*2);ctx.clip();for(let i=-10;i<=10;i++){ctx.beginPath();ctx.moveTo(W/2+i*r/8-r,H/2-r);ctx.lineTo(W/2+i*r/8+r,H/2+r);ctx.stroke();ctx.beginPath();ctx.moveTo(W/2+i*r/8+r,H/2-r);ctx.lineTo(W/2+i*r/8-r,H/2+r);ctx.stroke()}ctx.restore()}
 drawMapHandoff();
}
