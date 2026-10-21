// A short victory performance before the results screen.
let captureTime=-1,captureStartSize=0;
const cryingLester=new Image();let cryingLesterReady=false;
cryingLester.onload=()=>cryingLesterReady=true;
cryingLester.src='lester-crying.png';
function beginLesterCapture(){
 if(captureTime>=0||finished||revolt)return;
 ArcadeLeaderboard.capture(nerve);captureTime=0;captureStartSize=Math.min(H*.8,H*.94/Math.max(1,dist()));
 lester.target=null;scare=0;reloading=0;stopGuestTickles();
 window.speechSynthesis?.cancel();soundscape?.stopGuestVoice();
 if(soundscape){for(const source of soundscape.laughSources)source.stop();soundscape.laughSources.clear()}
 $('hud').hidden=true;notice('');sfx('capture');
}
function updateLesterCapture(dt){
 captureTime+=dt;
 if(captureTime>=5.5){captureTime=-1;finish(true)}
}
function drawLesterCapture(){
 if(captureTime<0)return;
 const t=captureTime,ease=1-Math.pow(1-Math.min(1,t/.85),3);
 ctx.save();ctx.fillStyle=`rgba(3,10,14,${.65*ease})`;ctx.fillRect(0,0,W,H);
 const h=captureStartSize+(Math.min(H*.83,W*1.15)-captureStartSize)*ease,w=h*2/3;
 const struggle=t>.5?Math.sin(t*24)*Math.exp(-Math.max(0,t-1)*.6)*w*.018:0;
 const sob=t>1.1?Math.sin(t*11)*h*.008:0;
 ctx.translate(W/2+struggle,H*.55+sob);ctx.rotate(t>.5?Math.sin(t*15)*.018:0);
 const x=-w/2,y=-h/2;
 const cryingBlend=cryingLesterReady?Math.max(0,Math.min(1,(t-.65)/.35)):0;
 ctx.globalAlpha=1-cryingBlend;if(cryingBlend<1)ctx.drawImage(actor,x,y,w,h);
 ctx.globalAlpha=cryingBlend;if(cryingBlend>0)ctx.drawImage(cryingLester,x,y,w,h);ctx.globalAlpha=1;
 // Flying mesh cinches around shoulders, arms, torso and boots, leaving the face visible.
 const cinch=Math.min(1,t/.65),rx=w*(.9-.45*cinch),ry=h*(.66-.27*cinch),cy=h*.1;
 ctx.save();ctx.beginPath();ctx.ellipse(0,cy,rx,ry,0,0,Math.PI*2);ctx.clip();
 ctx.strokeStyle='#eadfbbc9';ctx.lineWidth=Math.max(1.5,w*.006);
 const gap=Math.max(14,w*.095);
 for(let k=-h*2;k<h*2;k+=gap){ctx.beginPath();ctx.moveTo(k-h,-h);ctx.lineTo(k+h,h);ctx.stroke();ctx.beginPath();ctx.moveTo(k+h,-h);ctx.lineTo(k-h,h);ctx.stroke()}
 ctx.restore();ctx.strokeStyle='#d7c592';ctx.lineWidth=3;ctx.beginPath();ctx.ellipse(0,cy,rx,ry,0,0,Math.PI*2);ctx.stroke();
 ctx.restore();
 ctx.save();ctx.textAlign='center';ctx.shadowColor='#000';ctx.shadowBlur=12;ctx.fillStyle='#ead594';ctx.font=`bold ${Math.min(32,W*.045)}px Georgia`;ctx.fillText(t<.7?'GOT HIM!':'LESTER: NETTED.',W/2,H*.09);
 ctx.font=`${Math.min(17,W*.026)}px Arial`;ctx.fillStyle='#eee7d6';ctx.fillText(t>1.4?'Who’s giggling now?':'',W/2,H*.95);ctx.restore();
}
