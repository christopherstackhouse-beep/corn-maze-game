// Scores always come from the shared API. Local storage remembers only a name.
const ArcadeLeaderboard=(()=>{
 let round=null,sequence=0,refreshTimer=null,refreshVersion=0,lastSavedId=null;
 const apiBase=(window.LESTER_LEADERBOARD_API||'').replace(/\/$/,'');
 const el=id=>document.getElementById(id);
 const formatTime=seconds=>`${Math.floor(seconds/60)}:${String(seconds%60).padStart(2,'0')}`;
 async function request(path,body){
  let response;try{response=await fetch(apiBase+path,{method:body?'POST':'GET',headers:body?{'Content-Type':'application/json'}:{},body:body?JSON.stringify(body):undefined,cache:'no-store',signal:AbortSignal.timeout(10000)})}catch{throw Error('Cannot reach the shared leaderboard. Check your connection and try again.')}
  let result;try{result=await response.json()}catch{throw Error('The shared leaderboard is not connected yet.')}
  if(!response.ok)throw Error(result.error||'The leaderboard is temporarily unavailable.');return result;
 }
 function beginRun(){
  const current=++sequence;lastSavedId=null;
  round={sequence:current,elapsedMs:0,captured:null,runId:null,startError:null,startPromise:null,saved:false};
  const active=round;
  active.startPromise=request('/api/runs',{}).then(r=>{active.runId=r.runId}).catch(e=>{active.startError=e.message});
  el('scoreEntry').hidden=true;el('captureSummary').hidden=true;el('scoreMessage').textContent='';
 }
 function tick(ms){if(round&&!round.captured)round.elapsedMs+=Math.max(0,ms)}
 function capture(goodwill){if(round&&!round.captured)round.captured={elapsedSeconds:Math.max(1,Math.floor(round.elapsedMs/1000)),goodwill:Math.max(0,Math.min(100,Math.round(goodwill)))}}
 function victory(){
  if(!round?.captured)return;
  el('captureSummary').textContent=`CAPTURE TIME ${formatTime(round.captured.elapsedSeconds)} · GUEST GOODWILL ${round.captured.goodwill}%`;
  el('captureSummary').hidden=false;el('scoreEntry').hidden=false;el('scoreSubmit').disabled=false;
  el('scoreMessage').textContent='';
  try{el('arcadeName').value=localStorage.getItem('lester.arcadeName')||''}catch{}
 }
 async function submit(event){
  event.preventDefault();const active=round;if(!active?.captured||active.saved)return;
  const name=el('arcadeName').value.normalize('NFKC').trim().replace(/\s+/gu,' ');
  if(!/^[\p{L}\p{N} ._'!?-]{1,16}$/u.test(name)){el('scoreMessage').textContent='Enter 1–16 letters, numbers, spaces, or simple punctuation.';return}
  el('scoreSubmit').disabled=true;el('scoreMessage').textContent='Saving your score…';
  try{
   await active.startPromise;if(!active.runId)throw Error(active.startError||'This run could not connect to the leaderboard. Start another game when connected.');
   const result=await request('/api/scores',{runId:active.runId,name,...active.captured});
   active.saved=true;try{localStorage.setItem('lester.arcadeName',name)}catch{}
   if(round!==active)return;lastSavedId=result.entry.id;el('scoreMessage').textContent=`Score saved! You are #${result.entry.rank}.`;el('scoreSubmit').textContent='SCORE SAVED';
   open(`Your score is #${result.entry.rank}: ${formatTime(result.entry.elapsedSeconds)}, ${result.entry.goodwill}% goodwill.`);
  }catch(error){if(round===active){el('scoreMessage').textContent=error.message;el('scoreSubmit').disabled=false}}
 }
 async function refresh(){
  const version=++refreshVersion;el('leaderboardRefresh').disabled=true;
  try{
   const data=await request('/api/leaderboard');if(version!==refreshVersion||el('leaderboard').hidden)return;
   const rows=data.entries;if(!Array.isArray(rows))throw Error('Invalid leaderboard response.');
   el('leaderboardRows').replaceChildren();
   for(const row of rows){
    const tr=document.createElement('tr');if(row.id===lastSavedId)tr.className='yourScore';
    for(const text of [`${row.rank}. ${row.name}`,formatTime(row.elapsedSeconds),`${row.goodwill}%`]){const td=document.createElement('td');td.textContent=text;tr.appendChild(td)}el('leaderboardRows').appendChild(tr);
   }
   el('leaderboardStatus').textContent=rows.length?`TOP ${rows.length} · ${data.total} CAPTURE${data.total===1?'':'S'} RECORDED`:'No captures yet. Be the first to net Lester.';
  }catch(error){if(version===refreshVersion&&!el('leaderboard').hidden)el('leaderboardStatus').textContent=error.message}
  finally{if(version===refreshVersion)el('leaderboardRefresh').disabled=false}
 }
 let previousFocus=null;
 function open(message=''){
  previousFocus=document.activeElement;el('leaderboard').hidden=false;el('leaderboardResult').textContent=message;el('leaderboardStatus').textContent='Loading shared scores…';el('leaderboardRows').replaceChildren();el('leaderboardClose').focus();refresh();
  clearInterval(refreshTimer);refreshTimer=setInterval(()=>{if(!document.hidden)refresh()},15000);
 }
 function close(){el('leaderboard').hidden=true;refreshVersion++;clearInterval(refreshTimer);el('leaderboardRefresh').disabled=false;previousFocus?.focus()}
 document.addEventListener('DOMContentLoaded',()=>{
  el('scoreEntry').addEventListener('submit',submit);el('leaderboardClose').onclick=close;el('leaderboardRefresh').onclick=refresh;
  for(const button of document.querySelectorAll('[data-leaderboard]'))button.onclick=()=>open();
  el('leaderboard').addEventListener('keydown',e=>{
   if(e.key==='Escape'){e.preventDefault();close()}
   if(e.key==='Tab'){const first=el('leaderboardRefresh'),last=el('leaderboardClose');if(e.shiftKey&&document.activeElement===first){e.preventDefault();last.focus()}else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first.focus()}}
  });
 });
 return {beginRun,tick,capture,victory,formatTime};
})();
