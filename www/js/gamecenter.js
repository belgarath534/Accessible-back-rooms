"use strict";
/* ============================== Game Center ==============================
   On the iPhone app only: signs in to Game Center, mirrors every in-game
   achievement there (Game Center id = "br_" + the game's id), and sends
   three leaderboard scores. Achievements unlocked before Game Center are
   sent after sign-in. On the website and Android nothing here runs.
   The native side is native/game-center (window.Capacitor.Plugins.GameCenter). */
(function(){
const plugin=()=>{const C=window.Capacitor;return C&&C.isNativePlatform&&C.isNativePlatform()&&C.Plugins&&C.Plugins.GameCenter;};
const BOARDS={depth:'br_endless_depth',hunts:'br_hunter_wins',streak:'br_daily_streak'};
let on=false;
async function report(id,banner){const g=plugin();if(!g||!on)return;
  try{const r=await g.unlock({id:'br_'+id,banner:banner!==false});if(r&&r.reported){const s=lsGet('br_gc_sent',{});s[id]=1;lsSet('br_gc_sent',s);}}catch(e){}}
async function score(k,v){const g=plugin();if(!g||!on||!BOARDS[k]||!(v>0))return;try{await g.submitScore({id:BOARDS[k],score:Math.round(v)});}catch(e){}}
function catchUp(){const sent=lsGet('br_gc_sent',{});Object.keys(ACHV).forEach(id=>{if(!sent[id])report(id,false);});
  score('depth',lsGet('br_best',0));score('hunts',(lsGet('br_hunt',{}).total)||0);score('streak',(lsGet('br_daily',{}).streak)||0);}
async function signIn(){const g=plugin();if(!g)return;
  try{const r=await g.signIn();on=!!(r&&r.signedIn);}catch(e){on=false;}
  $('#mGC').hidden=!on;if(on)catchUp();}
// every achievement the game unlocks also goes to Game Center
const _unlock=unlock;unlock=function(id){const had=!!ACHV[id];_unlock(id);if(!had&&ACHV[id])report(id);};
const _dailyWin=dailyWin;dailyWin=function(){const r=_dailyWin.apply(this,arguments);score('streak',(lsGet('br_daily',{}).streak)||0);return r;};
// main menu button, shown once signed in
const b=document.createElement('button');b.id='mGC';b.hidden=true;b.innerHTML='<span data-l="en">Game Center</span><span data-l="pt">Game Center</span>';
$('#mAch').after(b);b.addEventListener('click',()=>{const g=plugin();if(g)g.show({what:'default'}).catch(()=>{});});
window.GC={score,report,signIn,isOn:()=>on};
if(plugin())setTimeout(signIn,2500);
})();
