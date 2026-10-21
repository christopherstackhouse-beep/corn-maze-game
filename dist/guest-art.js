// Articulated cut-paper guests, inspired by the user's angular character reference.
// Drawn from separate joints so poses animate rather than sliding a static photo.
function paintBlockGuest(canvas,type,t,state={}){
 const c=canvas.getContext('2d');c.clearRect(0,0,canvas.width,canvas.height);c.save();c.scale(canvas.width/600,canvas.height/1000);
 const palettes=[
 {coat:'#a94736',pants:'#3c566d',skin:'#d8aa74',shadow:'#a9784e',hair:'#44382d',style:'flannel'},
 {coat:'#dbac38',pants:'#3b5665',skin:'#986244',shadow:'#68422e',hair:'#332c29',style:'hoodie',woman:true},
 {coat:'#4a8c86',pants:'#716a56',skin:'#ddb587',shadow:'#a07958',hair:'#b2b6a7',style:'tee'},
 {coat:'#85659b',pants:'#374c68',skin:'#c18c66',shadow:'#8b6046',hair:'#332721',style:'hoodie',woman:true},
 {coat:'#e67d39',pants:'#435b73',skin:'#bd8056',shadow:'#86583d',hair:'#292b29',style:'hoodie',child:true},
 {coat:'#719c4b',pants:'#69618b',skin:'#ecc79b',shadow:'#b68e6d',hair:'#99532c',style:'tee',child:true,woman:true}
 ],p=palettes[type%palettes.length];
 if(p.child){c.translate(63,195);c.scale(.79,.79)}

 const angry=state.hostile,net=state.netted,moving=state.walk&&!net&&!state.tickled,pace=angry?11:4.3,cycle=t*pace+type*1.7;
 const stride=moving?Math.sin(cycle)*(angry?.43:.24):0,sway=state.tickled?Math.sin(t*24)*.065:net?Math.sin(t*13)*.08:Math.sin(t*1.5+type)*.025;
 const bounce=moving?Math.abs(Math.cos(cycle))*(angry?13:7):Math.sin(t*2)*3;
 c.translate(300,0);c.rotate(sway);c.translate(-300,-bounce);
 function shape(pts,color){poly(c,pts,color);c.strokeStyle='#172326';c.lineWidth=5;c.lineJoin='miter';c.stroke()}
 function segment(x,y,angle,len,width,color,tip){c.save();c.translate(x,y);c.rotate(angle);shape([[-width/2,0],[width/2,-3],[width/2-5,len],[-width/2+5,len+3]],color);if(tip)tip(len);c.restore()}
 // Opposing knees and oversized flat shoes.
 for(let side of [-1,1]){const swing=stride*side;segment(300+side*49,696,swing,118,62,p.pants,len=>{
  segment(0,len,-swing*.65+(moving?Math.max(0,-Math.sin(cycle)*side)*.25:0),126,51,p.pants,end=>shape([[-26,end-6],[30,end-6],[side>0?65:34,end+24],[side<0?-65:-28,end+24]],'#24302c'));
 })}
 // Casual farm-visit clothes: flannel, hoodies, T-shirts, jeans and sneakers.
 shape([[195,405],[378,405],[402,485],[369,720],[220,715],[192,500]],p.coat);
 if(p.style==='hoodie'){
  shape([[240,408],[260,385],[335,385],[355,412],[326,445],[269,445]],p.coat);
  c.strokeStyle='#eee5ce';c.lineWidth=4;for(const x of [278,319]){c.beginPath();c.moveTo(x,443);c.lineTo(x+3,505);c.stroke()}
  shape([[255,611],[333,611],[347,665],[244,665]],p.coat);
 }else if(p.style==='flannel'){
  c.save();c.beginPath();c.rect(222,445,143,252);c.clip();c.strokeStyle='#382f3655';c.lineWidth=12;
  for(let y=450;y<715;y+=43){c.beginPath();c.moveTo(220,y);c.lineTo(375,y);c.stroke()}
  for(let x=230;x<380;x+=39){c.beginPath();c.moveTo(x,430);c.lineTo(x,720);c.stroke()}c.restore();
  c.strokeStyle='#d5af84';c.lineWidth=3;c.beginPath();c.moveTo(300,428);c.lineTo(300,706);c.stroke();
  for(let y=460;y<700;y+=42)ellipse(c,305,y,3,3,'#d8c5a0');
 }else{
  shape([[266,405],[327,405],[316,433],[279,433]],p.skin);
  ellipse(c,296,531,29,29,'#dbbd6e');poly(c,[[282,535],[294,504],[310,535]],'#617449');
 }
 c.strokeStyle='#e8e0cc';c.lineWidth=5;c.beginPath();c.moveTo(224,704);c.lineTo(365,708);c.stroke();
 // Bent elbows and hands. Hostile guests raise their weapon arm.
 for(let side of [-1,1]){
  const weapon=angry&&side===1;
  let shoulder=state.tickled?side*(.7+Math.sin(t*17)*.18):net?side*.17:weapon?-.85:(side*.15-stride*.75);
  if(weapon&&state.attack)shoulder=-1.7+Math.min(1,state.attack/.65)*2.2;
  segment(300+side*(weapon?75:101),429,shoulder,weapon?100:141,60,p.coat,len=>{
   const elbow=weapon?-1.05:net?side*1.1:side===-1?-.52:.22;
   segment(0,len,elbow,weapon?76:116,47,p.style==='tee'?p.skin:p.coat,end=>{
    shape([[-20,end-4],[20,end-4],[24,end+53],[-18,end+59]],p.skin);
    c.strokeStyle=p.shadow;c.lineWidth=2;for(let i=0;i<3;i++){c.beginPath();c.moveTo(-10+i*9,end+20);c.lineTo(-8+i*9,end+46);c.stroke()}
    if(weapon){c.save();c.translate(4,end+24);c.rotate(.2);drawBlade(c,.75);c.restore()}
    else if(side===-1&&!net){
     if(state.hasMap||type%3===0){shape([[-38,end-14],[17,end-29],[56,end-10],[48,end+66],[-4,end+54],[-40,end+73]],'#d6d1ae');c.strokeStyle='#7c9977';c.lineWidth=4;c.beginPath();c.moveTo(-27,end+42);c.lineTo(1,end+18);c.lineTo(19,end+39);c.lineTo(39,end+9);c.stroke()}
     if(!state.hasMap&&type%3===1){shape([[-35,end-6],[40,end-6],[28,end+77],[-25,end+77]],'#eee0b0');c.fillStyle='#a64937';for(let i=0;i<3;i++)c.fillRect(-23+i*22,end,9,67);for(let i=0;i<9;i++)ellipse(c,-28+i*8,end-7-Math.sin(i*3)*7,9,10,'#f1dfa0')}
     if(!state.hasMap&&type%3===2){shape([[-41,end],[40,end],[40,end+48],[-41,end+48]],'#303d3e');ellipse(c,0,end+24,20,18,'#758b88');ellipse(c,0,end+24,12,12,'#182e35')}
    }
   });
  });
 }
 // Long cuboid head with a visible shaded side face and off-axis features.
 shape([[273,332],[326,332],[329,421],[274,421]],p.shadow);
 c.save();c.translate(297,342);c.rotate(net?Math.sin(t*12)*.07:angry?-.045:Math.sin(t*1.7+type)*.05);c.translate(-297,-342);
 shape([[210,63],[350,54],[381,80],[378,341],[348,365],[216,353]],p.skin);
 shape([[350,54],[381,80],[378,341],[348,365]],p.shadow);
 // Uneven inked hair, stubble and asymmetric eyebrows.
 shape([[210,63],[350,54],[351,99],[334,80],[318,91],[303,76],[285,95],[271,80],[249,99],[236,85],[215,133]],p.hair);
 if(p.woman)shape([[211,77],[194,121],[204,293],[218,251],[231,111]],p.hair);
 if(type%3===2){shape([[193,83],[214,42],[347,36],[369,80],[392,98],[195,107]],'#888964');shape([[213,64],[350,60],[368,85],[205,94]],'#b0a77a')}
 if(p.woman){shape([[350,85],[397,111],[403,298],[373,257],[352,128]],p.hair)}
 if(p.child){for(let i=0;i<5;i++)ellipse(c,229+i*6,235,2,2,p.shadow)}
 const blink=Math.sin(t*1.9+type*2)>.994;
 for(const [x,y,tilt]of [[247,150,-.1],[322,211,.12]]){
  c.save();c.translate(x,y);c.rotate(tilt);shape(angry?[[-16,-8],[15,-10],[19,12],[-14,15]]:[[-16,-20],[15,-22],[19,15],[-14,20]],'#f3eddb');
  if(blink){c.fillStyle=p.skin;c.fillRect(-17,-23,37,41);c.strokeStyle='#253135';c.beginPath();c.moveTo(-15,4);c.lineTo(18,4);c.stroke()}else{c.fillStyle='#15282d';c.fillRect(-2+(angry?0:Math.sin(t*.8)*3),-2,6,11)}
  c.strokeStyle='#273031';c.lineWidth=5;c.beginPath();c.moveTo(-18,angry?(x<280?-29:-14):-35);c.lineTo(16,angry?(x<280?-12:-31):-39);c.stroke();c.restore();
 }
 c.strokeStyle=p.shadow;c.lineWidth=3;c.beginPath();c.moveTo(279,243);c.lineTo(276,252);c.moveTo(288,243);c.lineTo(290,250);c.stroke();
 c.fillStyle='#263131';const mouthOpen=(state.talking||state.tickled)?(Math.sin(t*18)>.1?17:5):angry?13:4;c.fillRect(254,285,67,mouthOpen);
 if(angry){c.fillStyle='#e9dfc7';c.fillRect(258,287,58,7);c.strokeStyle='#263131';c.lineWidth=2;for(let x=265;x<315;x+=10){c.beginPath();c.moveTo(x,287);c.lineTo(x,294);c.stroke()}c.beginPath();c.moveTo(269,263);c.lineTo(259,275);c.moveTo(306,263);c.lineTo(318,275);c.stroke()}
 if(!p.woman&&!p.child)for(let i=0;i<54;i++){let x=225+((i*37)%115),y=266+((i*19)%76);if(y<310&&x>246&&x<325)continue;c.strokeStyle='#5c4f3b';c.lineWidth=2;c.beginPath();c.moveTo(x,y);c.lineTo(x+1,y+5);c.stroke()}
 c.restore();
 if(net){c.save();c.beginPath();c.ellipse(300,540,210,400,0,0,Math.PI*2);c.clip();c.strokeStyle='#e7ddbbb0';c.lineWidth=4;for(let k=-900;k<1500;k+=60){c.beginPath();c.moveTo(k,125);c.lineTo(k+700,970);c.stroke();c.beginPath();c.moveTo(k,970);c.lineTo(k+700,125);c.stroke()}c.restore()}
 c.restore();
}
function makeGuestCanvas(){const c=document.createElement('canvas');c.width=480;c.height=800;return c}
function animatedGuest(g,attack=0){
 if(!g.art)g.art=makeGuestCanvas();const frame=Math.floor(time*24),mode=`${!!g.netted}/${!!g.tickled}/${!!g.hasMap}/${revolt}/${!!g.target}/${g.speakingUntil>time}/${Math.floor(attack*24)}`;
 if(g.artFrame!==frame||g.artMode!==mode){paintBlockGuest(g.art,g.type,time+(g.phase||0),{walk:!!g.target&&g.wait<=0,netted:g.netted>0,tickled:g.tickled,hasMap:g.hasMap,hostile:revolt,talking:g.speakingUntil>time,attack});g.artFrame=frame;g.artMode=mode}
 return g.art;
}
