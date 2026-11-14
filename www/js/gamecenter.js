"use strict";
/* ======================= Game Center and Google Play Games =======================
   In the apps only (on the website nothing here runs):
   - iPhone: Game Center, through our own plugin native/game-center
     (Capacitor.Plugins.GameCenter); ids are "br_" + the game's id.
   - Android: Google Play Games, through capacitor-game-connect-7
     (Capacitor.Plugins.CapacitorGameConnect); Google gave every achievement
     and leaderboard its own id, listed in js/playgames-ids.js (PLAYGAMES_IDS,
     made by tools/playgames/create.py).
   Every in-game achievement is mirrored there, plus three leaderboards.
   Achievements unlocked before signing in are sent after sign-in. */
(function(){
const Cap=()=>window.Capacitor;
const native=()=>{const c=Cap();return !!(c&&c.isNativePlatform&&c.isNativePlatform());};
const platform=()=>{const c=Cap();return c&&c.getPlatform?c.getPlatform():'web';};
const gcPlugin=()=>native()&&platform()==='ios'&&Cap().Plugins&&Cap().Plugins.GameCenter;
const gpPlugin=()=>native()&&platform()==='android'&&Cap().Plugins&&(Cap().Plugins.CapacitorGameConnect||Cap().Plugins.GameConnect);
const PG=()=>window.PLAYGAMES_IDS||{};
const BOARDS={depth:'br_endless_depth',hunts:'br_hunter_wins',streak:'br_daily_streak'};
const isAndroid=()=>!!gpPlugin();
const SENT=()=>isAndroid()?'br_gp_sent':'br_gc_sent';
let on=false;

async function report(id,banner){if(!on)return;
  try{
    if(gcPlugin()){const r=await gcPlugin().unlock({id:'br_'+id,banner:banner!==false});if(!(r&&r.reported))return;}
    else if(gpPlugin()){const pid=PG()['br_'+id];if(!pid)return;await gpPlugin().unlockAchievement({achievementID:pid});}
    else return;
    const s=lsGet(SENT(),{});s[id]=1;lsSet(SENT(),s);
  }catch(e){}}
async function score(k,v){if(!on||!BOARDS[k]||!(v>0))return;
  try{
    if(gcPlugin())await gcPlugin().submitScore({id:BOARDS[k],score:Math.round(v)});
    else if(gpPlugin()&&PG()[BOARDS[k]])await gpPlugin().submitScore({leaderboardID:PG()[BOARDS[k]],totalScoreAmount:Math.round(v)});
  }catch(e){}}
function catchUp(){const sent=lsGet(SENT(),{});Object.keys(ACHV).forEach(id=>{if(!sent[id])report(id,false);});
  score('depth',lsGet('br_best',0));score('hunts',(lsGet('br_hunt',{}).total)||0);score('streak',(lsGet('br_daily',{}).streak)||0);}
async function signIn(){
  try{
    if(gcPlugin()){const r=await gcPlugin().signIn();on=!!(r&&r.signedIn);}
    else if(gpPlugin()){const r=await gpPlugin().signIn();on=!!r;}
    else return;
  }catch(e){on=false;}
  const b=$('#mGC');b.hidden=!on;
  if(isAndroid())b.innerHTML='<span data-l="en">Play Games achievements</span><span data-l="pt">Conquistas do Play Games</span>';
  if(on)catchUp();}
function showBoard(){
  if(gcPlugin())gcPlugin().show({what:'default'}).catch(()=>{});
  else if(gpPlugin())gpPlugin().showAchievements().catch(()=>{});}
// every achievement the game unlocks also goes to Game Center or Play Games
const _unlock=unlock;unlock=function(id){const had=!!ACHV[id];_unlock(id);if(!had&&ACHV[id])report(id);};
const _dailyWin=dailyWin;dailyWin=function(){const r=_dailyWin.apply(this,arguments);score('streak',(lsGet('br_daily',{}).streak)||0);return r;};
// main menu button, shown once signed in
const b=document.createElement('button');b.id='mGC';b.hidden=true;b.innerHTML='<span data-l="en">Game Center</span><span data-l="pt">Game Center</span>';
$('#mAch').after(b);b.addEventListener('click',showBoard);
window.GC={score,report,signIn,isOn:()=>on};
if(gcPlugin()||gpPlugin())setTimeout(signIn,2500);
})();
