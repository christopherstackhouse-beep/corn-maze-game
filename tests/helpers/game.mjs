import vm from 'node:vm';
import {readFileSync} from 'node:fs';

// Execute the shipped game scripts together, with observable DOM/input boundaries.
export function game({touch=false,width=1280,height=800}={}) {
 const gradient={addColorStop(){}};
 const draw=new Proxy({createLinearGradient:()=>gradient,createRadialGradient:()=>gradient},{get:(o,k)=>k in o?o[k]:()=>{}});
 const nodes={},events={},windowEvents={},requests=[];
 function listen(target,type,cb){
  const previous=target[type];
  target[type]=event=>{previous?.(event);return cb(event)};
 }
 function node(id='') {
  const captures=new Set(),attributes={};
  return {style:{},hidden:id!=='menu',textContent:'',value:'',events:{},attributes,width:320,height:560,playCount:0,pauseCount:0,lockRequests:0,
   getContext:()=>draw,addEventListener(type,cb){listen(this.events,type,cb)},
   pause(){this.pauseCount++},play(){this.playCount++;return Promise.resolve()},
   focus(){},replaceChildren(){},appendChild(){},
   requestPointerLock(){this.lockRequests++;return Promise.resolve()},
   setPointerCapture(id){captures.add(id)},hasPointerCapture:id=>captures.has(id),
   releasePointerCapture(id){captures.delete(id);this.events.lostpointercapture?.({pointerId:id})},
   setAttribute(name,value){attributes[name]=value},
   getBoundingClientRect(){return id==='touchJoystick'?{left:0,top:0,right:128,bottom:128,width:128,height:128}:{left:200,top:200,right:400,bottom:300,width:200,height:100}}
  };
 }
 const classes=new Set();
 const document={activeElement:null,hidden:false,pointerLockElement:null,
  documentElement:{classList:{toggle(name,on){if(on)classes.add(name);else classes.delete(name)},contains:name=>classes.has(name)}},
  getElementById:id=>nodes[id]??=node(id),createElement:()=>node(),querySelector:()=>node(),querySelectorAll:()=>[],
  addEventListener(type,cb){(events[type]??=[]).push(cb)},exitPointerLock(){document.pointerLockElement=null}
 };
 const window={innerWidth:width,innerHeight:height,matchMedia:()=>({matches:touch}),addEventListener:(type,cb)=>listen(windowEvents,type,cb)};
 const env={console,Math,Set,Map,navigator:{maxTouchPoints:touch?5:0},Image:class{naturalWidth=1024;naturalHeight=1536},document,window,
  requestAnimationFrame(){},setInterval(){return 1},clearInterval(){},localStorage:{getItem:()=>'',setItem(){}},AbortSignal,
  fetch:async(path,options)=>{requests.push({path,options});return {ok:true,json:async()=>path==='/api/runs'?{runId:crypto.randomUUID()}:path==='/api/scores'?{entry:{id:'saved',rank:1,elapsedSeconds:12,goodwill:77}}:{entries:[],total:0}}}
 };
 vm.createContext(env);
 for(const f of ['sound','guest-art','guests','lester-ai','maze-layers','capture','defeat','alien','leaderboard','touch-controls','game'])vm.runInContext(readFileSync(new URL('../../dist/'+f+'.js',import.meta.url),'utf8'),env,{filename:f+'.js'});
 for(const cb of events.DOMContentLoaded||[])cb();
 function emit(type,event={}){for(const cb of events[type]||[])cb(event)}
 function pointer(id,type,pointerId,x=250,y=250,pointerType='touch') {
  const target=nodes[id]||document.getElementById(id);
  const event={pointerId,pointerType,clientX:x,clientY:y,target,preventDefault(){this.prevented=true},stopPropagation(){this.stopped=true}};
  if(type==='pointerdown')emit(type,event);
  target.events[type]?.(event);
  return event;
 }
 return {run:s=>vm.runInContext(s,env),nodes,windowEvents,requests,window,document,emit,pointer};
}
