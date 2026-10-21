// Lester gets a celebratory curtain call after either loss condition.
let defeatTime=-1,defeatGigglePlayed=false;
function beginLesterDefeat(){
 if(defeatTime>=0||finished)return;
 defeatTime=0;defeatGigglePlayed=false;scare=0;shot=0;reloading=0;
 stopGuestTickles();window.speechSynthesis?.cancel();soundscape?.stopGuestVoice();
 if(soundscape){for(const source of soundscape.laughSources)source.stop();soundscape.laughSources.clear();soundscape.laugh(true,0,0)}
 $('hud').hidden=true;$('end').hidden=true;$('dialogue').hidden=true;
}
function updateLesterDefeat(dt){
 defeatTime+=dt;
 if(defeatTime>4&&!defeatGigglePlayed){defeatGigglePlayed=true;soundscape?.laugh(false,0,0)}
 if(defeatTime>=6.8){defeatTime=-1;finish(false,true)}
}
function drawLesterDefeat(){
 const t=defeatTime;if(t<0)return;
 const dance=Math.max(0,t-2),beat=dance*8,arrival=Math.min(1,t/.5);
 ctx.save();ctx.fillStyle=`rgba(4,10,15,${arrival*.88})`;ctx.fillRect(0,0,W,H);
 const spotlight=ctx.createRadialGradient(W*.5,H*.45,10,W*.5,H*.5,H*.65);spotlight.addColorStop(0,'#ad925238');spotlight.addColorStop(1,'#07121a00');ctx.fillStyle=spotlight;ctx.fillRect(0,0,W,H);
 const settle=Math.min(1,dance/.65),zoom=t<2?1+Math.sin(t*7)*.06:1;
 const h=Math.min(H*(1.4-(.62*settle)),W*1.8)*zoom,w=h*2/3;
 const hop=Math.abs(Math.sin(beat))*H*.045*settle;
 const sway=Math.sin(beat*.5)*W*.1*settle;
 ctx.translate(W/2+sway+(t<2?Math.sin(t*35)*8:0),H*.9-hop);
 ctx.rotate(Math.sin(beat)*.09*settle);
 ctx.scale(1+Math.sin(beat)*.035*settle,1-Math.sin(beat)*.025*settle);
 ctx.drawImage(actor,-w/2,-h,w,h);ctx.restore();
 // Quick tickling motion lines accompany the close-up, then a shower of harvest confetti.
 ctx.save();
 if(t<2){ctx.strokeStyle='#f0d68e';ctx.lineWidth=3;for(const side of [-1,1])for(let i=0;i<3;i++){const x=W/2+side*W*(.18+i*.025),y=H*.49+Math.sin(t*22+i)*13;ctx.beginPath();ctx.moveTo(x,y);ctx.quadraticCurveTo(x+side*18,y-17,x+side*30,y+10);ctx.stroke()}}
 else{const colors=['#d6b96e','#ef9a48','#b9c888','#e7dcb1'];for(let i=0;i<42;i++){const x=((i*137.3+Math.sin(dance*2+i)*25)%W+W)%W,y=((dance*(65+i%5*15)+i*47)%(H+40))-20;ctx.save();ctx.translate(x,y);ctx.rotate(dance*3+i);ctx.fillStyle=colors[i%4];ctx.fillRect(-3,-5,6,10);ctx.restore()}}
 ctx.textAlign='center';ctx.shadowColor='#000';ctx.shadowBlur=14;
 ctx.font=`bold ${Math.min(34,W*.048)}px Georgia`;ctx.fillStyle='#f0d58f';if(t<2)ctx.fillText('TICKLE TICKLE!',W/2,H*.1);
 ctx.font=`${Math.min(18,W*.026)}px Arial`;ctx.fillStyle='#eee5cd';ctx.fillText(t<2?'He just had to get the last tickle.':'You lost the shift. He found his rhythm.',W/2,H*.96);
 ctx.restore();
}
