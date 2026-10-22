// Recorded Lester giggles and procedural environmental sound design. All audio starts after a player gesture.
class MazeSound {
  constructor(context, output) {
    this.ctx=context; this.laughOutput=output;this.output=context.createGain();this.output.gain.value=1;this.output.connect(output);this.duckUntil=0;this.laughSources=new Set();this.laughBuffers={};this.distantBag=[];this.lastDistant=null;this.active=false;
    if(typeof fetch==='function')for(const [key,file]of [['distant1','lester-distant-1.mp3'],['distant2','lester-distant-2.mp3'],['distant3','lester-distant-3.mp3'],['distant4','lester-distant-4.mp3'],['attack','lester-tickle-layered.wav'],['escape','lester-first-encounter.mp3'],['dale01','dale-01.mp3'],['dale02','dale-02.mp3'],['dale03','dale-03.mp3'],['bev01','bev-01.mp3'],['bev02','bev-02.mp3'],['bev03','bev-03.mp3'],['gary01','gary-01.mp3'],['gary02','gary-02.mp3'],['garyNetted','gary-netted.mp3'],['nina01','nina-01.mp3'],['nina02','nina-02.mp3'],['poppy01','poppy-01.mp3'],['poppy02','poppy-02.mp3'],['poppy03','poppy-03.mp3'],['milo01','milo-01.mp3'],['milo02','milo-02.mp3'],['milo03','milo-03.mp3']])fetch('audio/'+file).then(r=>{if(!r.ok)throw Error('Audio unavailable');return r.arrayBuffer()}).then(b=>context.decodeAudioData(b)).then(b=>this.laughBuffers[key]=b).catch(()=>{});
    this.musicGain=context.createGain();this.musicGain.gain.value=0;this.musicGain.connect(this.output);
    this.musicBeat=0;this.musicNext=0;this.musicActive=false;
    for(const f of [55,55.7,77.78]){const o=context.createOscillator(),b=context.createBiquadFilter(),g=context.createGain();o.type='sawtooth';o.frequency.value=f;b.type='lowpass';b.frequency.value=250;g.gain.value=.025;o.connect(b);b.connect(g);g.connect(this.musicGain);o.start()}
    this.cricketIn=1; this.rustleIn=3; this.heartIn=0;
    this.noise=context.createBuffer(1,context.sampleRate*3,context.sampleRate);
    const samples=this.noise.getChannelData(0);
    for(let i=0;i<samples.length;i++)samples[i]=Math.random()*2-1;
    this.wind=context.createBufferSource();this.wind.buffer=this.noise;this.wind.loop=true;
    const filter=context.createBiquadFilter();filter.type='lowpass';filter.frequency.value=450;
    this.windGain=context.createGain();this.windGain.gain.value=0;
    this.wind.connect(filter);filter.connect(this.windGain);this.windGain.connect(this.output);this.wind.start();
  }
  stopGuestVoice(){
    if(this.guestVoice){this.guestVoice.stop();this.guestVoice=null}
  }
  playGuestVoice(key){
    this.stopGuestVoice();if(this.ctx.state!=='running')return 0;const buffer=this.laughBuffers[key];if(!buffer)return 0;
    const c=this.ctx,source=c.createBufferSource(),gain=c.createGain();
    source.buffer=buffer;source.playbackRate.value=1;gain.gain.value=1;
    source.connect(gain);gain.connect(this.laughOutput);this.guestVoice=source;
    source.onended=()=>{if(this.guestVoice===source)this.guestVoice=null;source.disconnect();gain.disconnect()};
    source.start();return buffer.duration;
  }
  escapeTaunt(){
    if(this.ctx.state!=='running')return false;
    const buffer=this.laughBuffers.escape;if(!buffer)return false;
    for(const source of this.laughSources)source.stop();this.laughSources.clear();
    const c=this.ctx,source=c.createBufferSource(),gain=c.createGain();
    source.buffer=buffer;source.playbackRate.value=1;gain.gain.value=1.2;
    source.connect(gain);gain.connect(this.laughOutput);this.laughSources.add(source);
    this.duckUntil=c.currentTime+buffer.duration+.2;
    source.onended=()=>{this.laughSources.delete(source);source.disconnect();gain.disconnect()};
    source.start();return true;
  }
  nextDistantGiggle(){
    const available=Object.keys(this.laughBuffers).filter(key=>key.startsWith('distant'));
    if(!available.length)return null;
    if(!this.distantBag.length){
      this.distantBag=available.slice();
      for(let i=this.distantBag.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[this.distantBag[i],this.distantBag[j]]=[this.distantBag[j],this.distantBag[i]]}
      const last=this.distantBag.length-1;
      if(last>0&&this.distantBag[last]===this.lastDistant)[this.distantBag[0],this.distantBag[last]]=[this.distantBag[last],this.distantBag[0]];
    }
    this.lastDistant=this.distantBag.pop();
    return this.laughBuffers[this.lastDistant];
  }
  // Attack asset mixes both supplied recordings from time zero, preserving their full lengths.
  laugh(attack,distance,panValue){
    if(this.ctx.state!=='running')return true;
    // Skip distant cues while another laugh plays, including the attack cackle.
    if(!attack&&this.laughSources.size)return true;
    const buffer=attack?this.laughBuffers.attack:this.nextDistantGiggle();
    // While recordings load, stay silent instead of using the old synthetic giggle.
    if(!buffer)return true;
    if(attack){this.stopGuestVoice();for(const source of this.laughSources)source.stop();this.laughSources.clear()}
    const c=this.ctx,source=c.createBufferSource(),gain=c.createGain(),pan=c.createStereoPanner();source.buffer=buffer;source.playbackRate.value=1;
    gain.gain.value=attack?1.35:Math.max(.20,1.05/(1+Math.max(0,distance-1)*.10));pan.pan.value=attack?0:panValue;
    source.connect(gain);gain.connect(pan);pan.connect(this.laughOutput);this.laughSources.add(source);
    if(attack)this.duckUntil=c.currentTime+buffer.duration+.2;
    source.onended=()=>{this.laughSources.delete(source);source.disconnect();gain.disconnect();pan.disconnect()};source.start();return true;
  }
  burst({duration=.2,level=.1,freq=1300,filter='bandpass',pan=0,delay=0}={}) {
    const c=this.ctx,t=c.currentTime+delay,source=c.createBufferSource(),b=c.createBiquadFilter(),g=c.createGain(),p=c.createStereoPanner();
    source.buffer=this.noise;b.type=filter;b.frequency.value=freq;b.Q.value=.65;p.pan.value=pan;
    g.gain.setValueAtTime(.0001,t);g.gain.exponentialRampToValueAtTime(level,t+.012);g.gain.exponentialRampToValueAtTime(.0001,t+duration);
    source.connect(b);b.connect(g);g.connect(p);p.connect(this.output);source.start(t,Math.random());source.stop(t+duration+.02);
    source.onended=()=>{source.disconnect();b.disconnect();g.disconnect();p.disconnect()};
  }
  note(freq,end,duration=.15,level=.1,delay=0,type='sine',pan=0,destination=this.output) {
    const c=this.ctx,t=c.currentTime+delay,o=c.createOscillator(),g=c.createGain(),p=c.createStereoPanner();o.type=type;p.pan.value=pan;
    o.frequency.setValueAtTime(freq,t);o.frequency.exponentialRampToValueAtTime(end,t+duration);
    g.gain.setValueAtTime(.0001,t);g.gain.exponentialRampToValueAtTime(level,t+.008);g.gain.exponentialRampToValueAtTime(.0001,t+duration);
    o.connect(g);g.connect(p);p.connect(destination);o.start(t);o.stop(t+duration+.02);o.onended=()=>{o.disconnect();g.disconnect();p.disconnect()};
  }
  play(name,amount=1) {
    if(this.ctx.state!=='running')return;
    switch(name){
      case 'step': this.burst({duration:.13,level:.10*amount,freq:650,pan:Math.random()*.18-.09});this.note(85,38,.12,.07*amount);this.burst({duration:.18,level:.035*amount,freq:3500,delay:.025});break;
      case 'launch': this.burst({duration:.36,level:.45,freq:1600,filter:'lowpass'});this.note(135,33,.22,.26);this.burst({duration:.45,level:.10,freq:4200,delay:.08});break;
      case 'empty': this.burst({duration:.035,level:.13,freq:2600});this.note(600,220,.04,.05);break;
      case 'reload': this.burst({duration:.09,level:.17,freq:1600});this.note(230,130,.1,.06);break;
      case 'insert': this.burst({duration:.22,level:.09,freq:1900});this.burst({duration:.07,level:.14,freq:850,delay:.15});break;
      case 'ready': this.burst({duration:.08,level:.19,freq:2100});this.note(420,180,.07,.06,.06);break;
      case 'switch': this.burst({duration:.025,level:.12,freq:3400});break;
      case 'scare': this.burst({duration:.5,level:.27,freq:2600});this.note(150,45,.5,.20);this.note(490,170,.35,.06,0,'triangle');break;
      case 'capture': this.burst({duration:.65,level:.20,freq:2200});[330,440,660].forEach((f,i)=>this.note(f,f,.5,.10,.15+i*.17,'triangle'));break;
      case 'lose': this.note(180,50,1.2,.14);this.note(220,65,1,.07,.12,'triangle');break;
    }
  }
  tick(dt,playing,nerve,time,chasing=false) {
    if(!playing&&this.active){this.stopGuestVoice();for(const source of this.laughSources)source.stop();this.laughSources.clear();this.duckUntil=0}
    // Cleanup still runs on pause; do not queue one-shots against a frozen audio clock.
    if(this.ctx.state!=='running')return;
    this.output.gain.setTargetAtTime(this.ctx.currentTime<this.duckUntil?.28:1,this.ctx.currentTime,.04);
    const musicOn=playing&&chasing;
    if(musicOn!==this.musicActive){this.musicActive=musicOn;this.musicGain.gain.setTargetAtTime(musicOn?.75:0,this.ctx.currentTime,.12);if(musicOn){this.musicBeat=0;this.musicNext=0}}
    if(musicOn){
      this.musicNext-=dt;
      if(this.musicNext<=0){
        const beat=this.musicBeat++,bass=[55,55,58.27,55,51.91,55,77.78,58.27][beat%8];
        this.note(bass,bass*.98,.20,.16,0,'sawtooth',0,this.musicGain);
        this.note(beat%2?220:311.13,beat%2?220:311.13,.13,.035,0,'triangle',beat%2?.35:-.35,this.musicGain);
        if(beat%4===0){this.note(90,32,.25,.24,0,'sine',0,this.musicGain);this.note(155.56,146.83,.75,.045,0,'sawtooth',-.2,this.musicGain)}
        this.musicNext=.21;
      }
    }
    if(this.active!==playing){this.active=playing;this.windGain.gain.setTargetAtTime(playing?.055:0,this.ctx.currentTime,.15)}
    if(!playing)return;
    this.windGain.gain.setTargetAtTime(.045+Math.sin(time*.27)*.015,this.ctx.currentTime,.3);
    this.cricketIn-=dt;this.rustleIn-=dt;this.heartIn-=dt;
    if(this.cricketIn<=0){let pan=Math.random()*1.8-.9,f=3800+Math.random()*1000;for(let i=0;i<3;i++)this.note(f,f*.96,.055,.022,i*.085,'sine',pan);this.cricketIn=1.2+Math.random()*3}
    if(this.rustleIn<=0){this.burst({duration:1.1,level:.045,freq:2300,pan:Math.random()*1.8-.9});this.rustleIn=3+Math.random()*5}
    if(nerve<45&&this.heartIn<=0){this.note(65,38,.15,.11);this.note(55,32,.17,.08,.22);this.heartIn=.8+nerve/100}
  }
}
