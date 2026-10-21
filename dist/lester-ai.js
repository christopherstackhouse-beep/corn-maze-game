// Encounter progression: impossible first escape, then a fast, catchable charge.
let encounter=0,escapeTime=0,escapeGoal=null,lesterSpeechUntil=0,rushWarning=0;
function resetLesterEncounters(){encounter=0;escapeTime=0;escapeGoal=null;lesterSpeechUntil=0;rushWarning=0;lester.target=null}
function lesterSays(line,recordedEscape=false){
 lesterSpeechUntil=time+5.5;guestTalkIn=7;captionTime=5.5;
 for(const g of guests)g.speakingUntil=0;
 $('dialogueName').textContent='LESTER';$('dialogueText').textContent='“'+line+'”';$('dialogue').hidden=false;
 window.speechSynthesis?.cancel();soundscape?.stopGuestVoice();
 if(recordedEscape&&soundscape?.escapeTaunt())return;
}
function fleeLester(){
 escapeTime=0;let best=-1;
 for(let y=1;y<N-1;y++)for(let x=1;x<N-1;x++)if(!wall(x,y)){const d=Math.hypot(x+.5-player.x,y+.5-player.y);if(d>best){best=d;escapeGoal={x:x+.5,y:y+.5}}}
 lester.target={x:Math.floor(lester.x)+.5,y:Math.floor(lester.y)+.5};
}
function encounterVisible(){return dist()<5.2&&sight(lester.x,lester.y)&&Math.abs(wrap(Math.atan2(lester.y-player.y,lester.x-player.x)-player.a))<.58}
function checkLesterEncounter(force=false){
 if(alien?.state==='angry'||alienCinematic()||revolt||(!force&&!encounterVisible()))return;
 if(encounter===0){encounter=1;fleeLester();lesterSays('Hehehe you’ll never catch me!',true);notice('He is too fast! Listen for him to return.')}
 else if(encounter===2){encounter=3;rushWarning=.45;lester.target={x:Math.floor(lester.x)+.5,y:Math.floor(lester.y)+.5};lesterSays('Ohhh someone looks ticklish! I’m gonna get you!');notice('LESTER IS CHARGING! Ready your net!')}
}
function updateLester(dt){
 if(revolt||alien?.state==='angry')return;
 checkLesterEncounter();
 if((encounter===0||encounter===2)&&tickleNearbyGuest(dt))return;
 if(encounter!==0&&encounter!==2)stopGuestTickles();
 if(encounter===1||encounter===4){escapeTime+=dt;if(escapeTime>3.5&&(!sight(lester.x,lester.y)||dist()>8)){encounter=2;lester.target=null;escapeGoal=null}}
 if(encounter===3&&rushWarning>0){rushWarning=Math.max(0,rushWarning-dt);return}
 const fleeing=encounter===1||encounter===4,goal=fleeing?escapeGoal:player;
 if(!lester.target||Math.hypot(lester.x-lester.target.x,lester.y-lester.target.y)<.025)lester.target=pathTo(lester.x,lester.y,goal.x,goal.y);
 if(lester.target){const dx=lester.target.x-lester.x,dy=lester.target.y-lester.y,d=Math.hypot(dx,dy),v=Math.min(d,dt*(fleeing?8:encounter===3?4.6:1.1));if(d>.001){lester.x+=dx/d*v;lester.y+=dy/d*v}}
 if(encounter===3&&dist()<.85&&sight(lester.x,lester.y)){
  scare=1.1;nerve=Math.max(0,nerve-30);giggle(true);sfx('scare');notice('TICKLED ON THE JOB! −30 Guest Goodwill');
  encounter=4;fleeLester();if(nerve<=0)finish(false);
 }
}
