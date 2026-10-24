"use strict";
/* ============================== Night Watch ==============================
   A separate mode: you are locked in a monitoring station for six nights.
   Like the main game it is turn-based: the monsters move after each thing
   you do, or when you stay idle for a while (longer on Easy). Checking a
   camera, a door, the vent or the flashlight takes a turn; listening,
   looking again, status and help are free. Everything you would see is
   also said. Uses the game's narrator (say), sound (play, spot, osc,
   noise), music (onlyMusic), difficulty (DF), translations (t, PT) and
   screens (show). */
(function(){
// Registers a Portuguese translation next to its English text.
const L=(en,pt,v)=>{if(pt)PT[en]=pt;return t(en,v);};

const TURNS_PER_HOUR=6;    // each turn is ten minutes, 12 AM to 6 AM
const NIGHTS=6;
const NIGHT_MUSIC=0.3;     // quiet, so the monsters can be heard over it
// Backrooms' own horror tracks, one per night.
const MUSIC={lobby:'music18',1:'music0',2:'music9',3:'music8',4:'music22',5:'music16',6:'music23',end:'music20'};
const CAMS=[null,
  {en:'Yellow Hall',pt:'Corredor Amarelo'},{en:'Left Corridor',pt:'Corredor Esquerdo'},
  {en:'Pool Rooms',pt:'Salas da Piscina'},{en:'Right Corridor',pt:'Corredor Direito'},
  {en:'Storage Room',pt:'Depósito'},{en:'Vent Shaft',pt:'Duto de Ventilação'}];
// Each monster walks one route, one place per move, toward a door.
const ROUTES={left:['start','c1','c2','L'],right:['start','c3','c4','R'],vent:['start','c6','V']};
const CAM_OF={start:5,c1:1,c2:2,c3:3,c4:4,c6:6};
const DOOR_POS={L:V3(-1,0,-0.25),R:V3(1,0,-0.25),V:V3(0,1,0.1)};
const camName=n=>LANG==='pt'?CAMS[n].pt:CAMS[n].en;
const doorName=d=>d==='L'?L('the left door','a porta esquerda'):d==='R'?L('the right door','a porta direita'):L('the vent','a ventilação');
const cap=s=>s.charAt(0).toUpperCase()+s.slice(1);
const pick=a=>a[Math.floor(Math.random()*a.length)];

// chance: odds to move each turn. wait: turns at a door before it attacks,
// so wait 1 means you get exactly one action to close the door.
const MONS={
  hound:{from:1,name:['Hound','Cão'],routes:['left','right'],chance:0.3,grow:0.04,wait:1},
  smiler:{from:2,name:['Smiler','Sorridente'],routes:['left','right'],chance:0.22,grow:0.03,wait:2,silent:true},
  stealer:{from:3,name:['Skin-Stealer','Ladrão de Pele'],routes:['left','right'],chance:0.25,grow:0.03,wait:3},
  party:{from:4,name:['Partygoer','Festeiro'],routes:['right','left'],wait:1,watched:true},
  moths:{from:5,name:['Deathmoths','Mariposas da Morte'],routes:['vent'],chance:0.28,grow:0.03,wait:2},
};
const mName=k=>MONS[k].name[LANG==='pt'?1:0];

// What a camera shows, and what you hear from each one at a door.
const LOOKS={
  hound:['A Hound crouches low, panting, its jaw hanging open.','Um Cão está agachado, ofegante, com a mandíbula aberta.'],
  smiler:['In the dark, a wide white grin. Nothing else.','No escuro, um sorriso largo e branco. Mais nada.'],
  stealer:['A person stands very still, facing the camera. Its face looks borrowed.','Uma pessoa está parada, de frente para a câmera. O rosto parece emprestado.'],
  party:['A yellow figure with a huge smile holds a bunch of balloons. It is staring right at the camera.','Uma figura amarela com um sorriso enorme segura vários balões. Está encarando a câmera.'],
  moths:['Huge pale wings crawl over each other in the shaft.','Asas enormes e pálidas se arrastam umas sobre as outras no duto.'],
};
const HEARS={
  hound:['heavy panting','respiração pesada e ofegante'],smiler:['a faint, high hum','um zumbido fraco e agudo'],
  stealer:['knocking, and a voice','batidas, e uma voz'],party:['giggling and squeaky balloons','risadinhas e balões rangendo'],
  moths:['the flutter of huge wings','o bater de asas enormes'],
};
const hearsOf=k=>HEARS[k][LANG==='pt'?1:0];
const EMPTY=[['Empty. Only the hum of the lights.','Vazio. Só o zumbido das luzes.'],['Empty. A light flickers.','Vazio. Uma luz pisca.'],
  ['Empty. The wallpaper is peeling.','Vazio. O papel de parede está descascando.'],['Empty, but you could swear something just moved.','Vazio, mas você jura que algo acabou de se mexer.']];

const TAPES={
  1:['Hey. If you are hearing this, they got you too. Do not panic. You are in the Monitoring Station. Survive six nights and the door unlocks. That is what the note says. Things walk the halls at night. Every time you do something, they move too, so think before you act. When something reaches a door you will hear it, and I mean right outside. Close that door. But doors eat power, and when the power is gone, everything opens. My name is Dana. I was the guard before you.',
     'Ei. Se você está ouvindo isto, pegaram você também. Não entre em pânico. Você está na Sala de Monitoramento. Sobreviva seis noites e a porta destranca. É o que diz o bilhete. Coisas andam pelos corredores à noite. Cada vez que você faz algo, elas se mexem também, então pense antes de agir. Quando algo chega numa porta, você vai ouvir, bem do lado de fora. Feche aquela porta. Mas as portas gastam energia, e quando a energia acaba, tudo abre. Meu nome é Dana. Eu era a vigia antes de você.'],
  2:['Night two. Something new is out there. A Smiler. You will not hear it coming, only a faint hum once it is at the door. Light is the only thing it hates: flash the hall and it backs off. But listen to me. The light draws everything else to you.',
     'Noite dois. Tem algo novo lá fora. Um Sorridente. Você não vai ouvir ele chegando, só um zumbido fraco quando ele estiver na porta. Luz é a única coisa que ele odeia: ilumine o corredor e ele recua. Mas me escute. A luz atrai todo o resto até você.'],
  3:['Night three. If someone knocks and begs you to let them in, do not open the door. There are no other people down here. Not anymore. Keep it closed until the knocking stops.',
     'Noite três. Se alguém bater e implorar para entrar, não abra a porta. Não existem outras pessoas aqui embaixo. Não mais. Mantenha fechada até as batidas pararem.'],
  4:['Night four. Balloons. Giggling. A Partygoer got in. It only moves while nobody is watching it. Find it on the cameras and keep checking on it.',
     'Noite quatro. Balões. Risadinhas. Um Festeiro entrou. Ele só se mexe quando ninguém está olhando. Encontre ele nas câmeras e continue olhando.'],
  5:['Night five. The vent above your head. Moths. Big ones. When you hear wings in the vent shaft, close the vent.',
     'Noite cinco. A ventilação em cima da sua cabeça. Mariposas. Grandes. Quando ouvir asas no duto, feche a ventilação.'],
  6:['Night six. This is my last tape. I never made it past this night. Everything comes for you tonight. If you make it to six A M, find my tapes. Tell them my name was Dana.',
     'Noite seis. Esta é minha última fita. Eu nunca passei desta noite. Tudo vem atrás de você hoje. Se você chegar às seis da manhã, encontre minhas fitas. Diga a eles que meu nome era Dana.'],
};
const STEALER_LINES=[['Hello? Is someone in there? Please, let me in!','Alô? Tem alguém aí? Por favor, me deixa entrar!'],
  ['It is coming! Open the door, please, I am begging you!','Ele está vindo! Abre a porta, por favor, eu te imploro!'],
  ['I know you are in there. I can hear you breathing.','Eu sei que você está aí. Consigo ouvir você respirando.'],
  ['It is me. You know me. Open up.','Sou eu. Você me conhece. Abre.']];

let W=null, idleTimer=null;
const best=()=>lsGet('br_nw_night',1);
const tx=a=>LANG==='pt'?a[1]:a[0];

/* ------------------------------ sounds ------------------------------ */
function hum(){if(!A.ctx)return;const t0=now();const out=spot(0,0.05,0.3,A.amb);
  [120,240,180.5].forEach((f,i)=>{const o=osc(i?'sine':'sawtooth',f,t0,3600);const g=gainNode(i?0.25:0.12);o.connect(g).connect(out);A.ambNodes.push(o);});
  const n=noise(t0,3600);const g=gainNode(0.08);n.connect(filt('lowpass',300)).connect(g).connect(out);A.ambNodes.push(n);}
function thud(pos,vol=1,count=1){if(!A.ctx)return;for(let i=0;i<count;i++){const t0=now()+i*0.32;const out=spot(pos,vol,0.4);
  const o=osc('sine',110,t0,0.3);o.frequency.exponentialRampToValueAtTime(45,t0+0.25);const g=gainNode(0);envelope(g,t0,0.005,0.9,0.28);o.connect(g).connect(out);
  const n=noise(t0,0.15);const g2=gainNode(0);envelope(g2,t0,0.003,0.5,0.12);n.connect(filt('lowpass',500)).connect(g2).connect(out);}}
function slam(pos){thud(pos,1.6,1);play('impact',{pan:pos,vol:0.9});}
function doorSound(pos,closing){if(!A.ctx)return;const t0=now();const out=spot(pos,0.6,0);
  const o=osc('sawtooth',closing?220:160,t0,0.45);o.frequency.linearRampToValueAtTime(closing?90:260,t0+0.4);const g=gainNode(0);envelope(g,t0,0.02,0.18,0.4);o.connect(filt('lowpass',900)).connect(g).connect(out);
  setTimeout(()=>thud(pos,closing?1:0.4),closing?420:0);}
function flutter(pos,vol,muffle){if(!A.ctx)return;const t0=now();const out=spot(pos,vol,muffle);const n=noise(t0,1.6);const g=gainNode(0);
  for(let i=0;i<24;i++){const tt=t0+i*0.065;g.gain.setValueAtTime(0.0001,tt);g.gain.linearRampToValueAtTime(0.35,tt+0.02);g.gain.linearRampToValueAtTime(0.0001,tt+0.06);}
  n.connect(filt('bandpass',700,1.5)).connect(g).connect(out);}
function grinHum(pos,vol,muffle){if(!A.ctx)return;const t0=now();const out=spot(pos,vol,muffle);
  [330,333.5,660].forEach((f,i)=>{const o=osc('sine',f,t0,2.4);const g=gainNode(0);envelope(g,t0,0.8,i===2?0.03:0.12,1.5);o.connect(g).connect(out);});}
function step(pos,vol,muffle){if(!A.ctx)return;for(let i=0;i<3;i++){const t0=now()+i*0.45;const out=spot(pos,vol,muffle);const n=noise(t0,0.12);const g=gainNode(0);envelope(g,t0,0.004,0.6,0.1);n.connect(filt('lowpass',380)).connect(g).connect(out);}}
function click(){if(!A.ctx)return;const t0=now();const n=noise(t0,0.03);const g=gainNode(0);envelope(g,t0,0.001,0.5,0.03);n.connect(filt('highpass',2500)).connect(g).connect(spot(0,0.6));}
function clockTick(){if(!A.ctx)return;[0,0.5].forEach(d=>{const t0=now()+d;const o=osc('square',d?1500:1800,t0,0.04);const g=gainNode(0);envelope(g,t0,0.001,0.06,0.03);o.connect(filt('bandpass',2000,3)).connect(g).connect(spot(0,0.5));});}
function chime(times){if(!A.ctx)return;for(let i=0;i<times;i++){const t0=now()+i*0.9;[392,784,1176].forEach((f,k)=>{const o=osc('sine',f,t0,2.2);const g=gainNode(0);envelope(g,t0,0.01,k?0.05:0.18,2);o.connect(g).connect(spot(0,0.8));});}}
// What a monster sounds like through a camera speaker.
function camSound(k){const s={vol:0.55,muffle:0.5};
  if(k==='hound')play(pick(['hound','hound2','growl1','growl3']),s);
  else if(k==='smiler')grinHum(0,0.35,0.5);
  else if(k==='stealer')play(pick(['moan','breath','weird']),{vol:0.4,muffle:0.6});
  else if(k==='party')play(pick(['giggle','giggle_child','giggle_insane','giggle_phased']),s);
  else if(k==='moths')flutter(0,0.5,0.5);}
// What it sounds like right outside a door, in 3D on headphones.
function doorSoundOf(k,d){const pos=DOOR_POS[d];
  if(k==='hound'){play(pick(['breath2','breath']),{pan:pos,vol:1});play(pick(['growl2','growl4']),{pan:pos,vol:0.8,delay:0.7});}
  else if(k==='smiler')grinHum(pos,0.45,0.1);
  else if(k==='stealer'){thud(pos,1,3);play('weird',{pan:pos,vol:0.4,delay:1});}
  else if(k==='party')play(pick(['laughter','giggle_insane','giggle_phased']),{pan:pos,vol:0.9});
  else if(k==='moths'){flutter(pos,1,0);play('screech',{pan:pos,vol:0.5,delay:0.6});}}
// Things far away in the Backrooms, more of them on later nights.
function farScare(){const pos=rndPos(Math.random()<0.3?0.6:0);
  play(pick(['farscream','farscream2','howl','ghost1','ghost2','ghost3','shush1','shush2','moan','scream_ghost']),{pan:pos,vol:0.22+W.night*0.03,muffle:0.7});}

/* ------------------------------ the night ------------------------------ */
function newNight(n){
  const hard=(DF().chase||1)*(n===6?1.15:1);
  W={night:n,turn:0,power:100,doors:{L:false,R:false,V:false},cam:0,over:false,tape:true,out:false,outTurns:0,
    mons:Object.keys(MONS).filter(k=>MONS[k].from<=n).map(k=>({k,route:pick(MONS[k].routes),i:0,door:0,unwatched:0})),hard};
  if(n===6)W.mons.forEach(m=>{if(m.k!=='party'&&m.k!=='moths')m.i=1;}); // night 6: they start closer
}
const posOf=m=>ROUTES[m.route][m.i];
const atDoor=m=>{const p=posOf(m);return p==='L'||p==='R'||p==='V'?p:null;};
const nearDoor=m=>({c2:'L',c4:'R',c6:'V'})[posOf(m)]||null;
const hourOf=turn=>Math.floor(turn/TURNS_PER_HOUR);
const clock=()=>{const h=hourOf(W.turn),m=(W.turn%TURNS_PER_HOUR)*10;return (h===0?12:h)+':'+(m?m:'00')+' '+L('A M','da manhã');};
const playing=()=>W&&!W.over&&!W.tape;

// One turn passes: power, the clock, and every monster. Returns what happened.
function passTurn(){
  const out=[];
  W.turn++;
  if(!W.out){
    W.power=Math.max(0,W.power-(0.55+W.night*0.1)-['L','R','V'].filter(d=>W.doors[d]).length*1.5-(W.cam?0.45:0));
    if(W.power<=0)out.push(powerOut());
  }
  // monsters already waiting at a door attack or give up
  for(const m of W.mons){const d=atDoor(m);if(!d)continue;
    m.door--;
    if(m.k==='stealer'&&m.door>0){const ln=pick(STEALER_LINES);out.push(L('A voice at {d}: {l}','Uma voz em {d}: {l}',{d:doorName(d),l:tx(ln)}));doorSoundOf(m.k,d);}
    if(m.door<=0){
      if(W.doors[d]&&!W.out){slam(DOOR_POS[d]);buzz([120]);
        out.push(m.k==='stealer'?L('The knocking at {d} stops. Footsteps walk away.','As batidas em {d} param. Passos se afastam.',{d:doorName(d)})
          :L('Something slams into {d}, then retreats.','Algo se joga contra {d}, e depois recua.',{d:doorName(d)}));retreat(m);}
      else{caught(m.k,d,out);return null;}
    }}
  // the others move
  for(const m of W.mons){if(atDoor(m))continue;const def=MONS[m.k];
    if(def.watched){if(W.cam&&CAM_OF[posOf(m)]===W.cam)m.unwatched=0;else if(++m.unwatched>=Math.max(2,5-Math.floor(W.night/2))){m.unwatched=0;advance(m,out);}continue;}
    if(Math.random()<(def.chance+def.grow*W.night)*W.hard)advance(m,out);}
  // in the dark, the Hound comes for you
  if(W.out&&++W.outTurns===3){const m=W.mons.find(x=>x.k==='hound');m.route=pick(['left','right']);m.i=ROUTES[m.route].length-2;advance(m,out);}
  // sounds of this turn
  const atAny=W.mons.some(atDoor),nearAny=W.mons.some(m=>nearDoor(m)&&!MONS[m.k].silent);
  if(atAny)play('heartfast',{vol:0.55});else if(nearAny)play('heartslow',{vol:0.35});
  W.mons.forEach(m=>{const d=nearDoor(m);if(d&&!MONS[m.k].silent)step(DOOR_POS[d],0.35,0.7);});
  if(Math.random()<0.18+W.night*0.04)farScare();
  // a new hour
  if(W.turn%TURNS_PER_HOUR===0){const h=hourOf(W.turn);if(h>=6){winNight();return null;}chime(1);
    out.push(L('{h} A M. Power {p} percent.','{h} da manhã. Energia {p} por cento.',{h,p:Math.round(W.power)}));}
  else clockTick();
  return out;
}
function advance(m,out){
  const route=ROUTES[m.route];if(m.i>=route.length-1)return;
  m.i++;const d=atDoor(m),diff=S.diff;
  if(d){m.door=MONS[m.k].wait;doorSoundOf(m.k,d);play(pick(['sting','riser']),{vol:0.45});buzz([60,60,60]);
    if(m.k==='smiler'){if(diff==='easy')out.push(L('The air by {d} turns cold. Something is waiting there without a sound.','O ar perto de {d} fica gelado. Algo está esperando ali sem fazer barulho.',{d:doorName(d)}));}
    else if(diff==='nightmare')out.push(L('A sound at {d}!','Um som em {d}!',{d:doorName(d)}));
    else out.push(L('{s}, right outside {d}!','{s}, bem do lado de fora de {d}!',{s:cap(hearsOf(m.k)),d:doorName(d)}));
    if(m.k==='stealer')out.push(L('A voice: {l}','Uma voz: {l}',{l:tx(pick(STEALER_LINES))}));}
  else if(diff==='easy'&&nearDoor(m)&&!MONS[m.k].silent)out.push(L('Footsteps in the hall toward {d}.','Passos no corredor em direção a {d}.',{d:doorName(nearDoor(m))}));
}
function retreat(m){m.i=0;m.route=pick(MONS[m.k].routes);m.door=0;m.unwatched=0;}
function caught(k,d,out){
  W.over=true;stopIdle();clearAmb();onlyMusic({},0.2);
  if(S.scares!==false){play(pick(['js1','js2','js3']),{vol:1.3});play(pick(['scream_demon','bigscream','screech_monster']),{vol:0.9,delay:0.12});}
  buzz([500,80,300]);
  const how={hound:['The Hound bursts through {d}!','O Cão invade por {d}!'],smiler:['The grin fills the whole room. The Smiler got in through {d}.','O sorriso enche a sala inteira. O Sorridente entrou por {d}.'],
    stealer:['You let it in. It has your face now.','Você deixou entrar. Agora ele tem o seu rosto.'],party:['The Partygoer hugs you. It will not let go.','O Festeiro abraça você. Ele não solta mais.'],
    moths:['Wings pour out of the vent and fill the room.','Asas saem da ventilação e enchem a sala.']}[k];
  const msg=(out.length?out.join(' ')+' ':'')+tx(how).replace('{d}',doorName(d))+' '+L('Night {n} ends at {c}.','A noite {n} termina às {c}.',{n:W.night,c:clock()});
  setTimeout(()=>{renderEnd(false,msg);say(msg+' '+L('Say try again, or menu.','Diga tentar de novo, ou menu.'));},1500);
}
function powerOut(){
  W.out=true;clearAmb();W.doors={L:false,R:false,V:false};W.cam=0;onlyMusic({musicbox:1},1);render();
  return L('The power is out. The lights die, and every door slides open. A music box starts playing somewhere in the dark. Hold on until six A M.','A energia acabou. As luzes apagam e todas as portas se abrem. Uma caixinha de música começa a tocar em algum lugar no escuro. Aguente até as seis da manhã.');
}
function winNight(){
  W.over=true;stopIdle();clearAmb();chime(6);buzz([80,80,80]);
  const n=W.night;onlyMusic(n===NIGHTS?{[MUSIC.end]:0.7}:{},n===NIGHTS?4:1.5);
  if(n>=best()&&n<NIGHTS)lsSet('br_nw_night',n+1);if(n===NIGHTS)lsSet('br_nw_done',true);
  const msg=n<NIGHTS?L('Six A M! You survived night {n}. The doors unlock for the day, and the tape recorder clicks. Night {m} is open.','Seis da manhã! Você sobreviveu à noite {n}. As portas destrancam durante o dia, e o gravador faz clique. A noite {m} está liberada.',{n,m:n+1})
    :L('Six A M. A heavy click. The security door swings open by itself. Outside, on a desk, lies a stack of tapes, each one labeled with a name. Dana is there. The newest tape has your name on it. You walk out into the hum of the Backrooms. You survived the Night Watch.',
       'Seis da manhã. Um clique pesado. A porta de segurança se abre sozinha. Lá fora, numa mesa, há uma pilha de fitas, cada uma com um nome. Dana está lá. A fita mais nova tem o seu nome. Você sai para o zumbido dos Backrooms. Você sobreviveu à Vigia Noturna.');
  setTimeout(()=>{renderEnd(true,msg);say(msg);},1200);
}

/* ------------------------------ actions ------------------------------ */
// An action that takes a turn: do it, then let the night move, then say it all.
function act(fn){
  if(!W||W.over)return;
  if(W.tape)return say(L('The tape is still playing. Say skip to start the night.','A fita ainda está tocando. Diga pular para começar a noite.'),{log:false});
  const first=fn();if(first===false)return;
  const rest=passTurn();if(rest===null)return;
  say([].concat(first||[],rest).join(' '));render();resetIdle();
}
function toggle(d,want){act(()=>{
  if(W.out){say(L('There is no power. The doors will not move.','Não há energia. As portas não se mexem.'));return false;}
  const v=want===undefined?!W.doors[d]:want;
  if(W.doors[d]===v){say(v?L('{d} is already closed.','{d} já está fechada.',{d:cap(doorName(d))}):L('{d} is already open.','{d} já está aberta.',{d:cap(doorName(d))}),{log:false});return false;}
  W.doors[d]=v;doorSound(DOOR_POS[d],v);tap('HEAVY');
  return v?L('{d} closed.','{d} fechada.',{d:cap(doorName(d))}):L('{d} open.','{d} aberta.',{d:cap(doorName(d))});
});}
function flash(d){act(()=>{
  if(W.out){say(L('The flashlight is dead without power.','A lanterna não funciona sem energia.'));return false;}
  W.power=Math.max(0,W.power-2);click();
  const corr=d==='L'?'c2':'c4',atD=W.mons.filter(m=>posOf(m)===d),near=W.mons.filter(m=>posOf(m)===corr),out=[];
  if(atD.length)atD.forEach(m=>{
    if(m.k==='smiler'){out.push(L('Your light hits a wide white grin right outside {d}. It shrinks back into the dark.','Sua luz bate num sorriso largo e branco bem na frente de {d}. Ele recua para o escuro.',{d:doorName(d)}));retreat(m);}
    else{out.push(L('Your light hits the {m}, right outside {d}! It sees you, and it is coming in. Close the door!','Sua luz acerta o {m}, bem na frente de {d}! Ele vê você e vai entrar. Feche a porta!',{m:mName(m.k),d:doorName(d)}));m.door=1;}});
  else if(near.length)out.push(L('At the far end of the hall, something moves. The {m}.','No fim do corredor, algo se mexe. O {m}.',{m:mName(near[0].k)}));
  else out.push(L('The hall outside {d} is empty.','O corredor em frente a {d} está vazio.',{d:doorName(d)}));
  // the light draws attention
  W.mons.forEach(m=>{if(m.k!=='smiler'&&!atDoor(m)&&!MONS[m.k].watched&&Math.random()<0.15+W.night*0.03)advance(m,out);});
  return out.join(' ');
});}
function describeCam(){
  const here=W.mons.filter(m=>CAM_OF[posOf(m)]===W.cam);
  if(here.length)camSound(pick(here).k);
  return L('Camera {n}, {c}.','Câmera {n}, {c}.',{n:W.cam,c:camName(W.cam)})+' '+(here.length?here.map(m=>tx(LOOKS[m.k])).join(' '):tx(pick(EMPTY)));
}
function camera(n){
  if(!W||W.over)return;
  if(W.out)return say(L('The monitors are dark.','Os monitores estão apagados.'));
  if(!n){if(!W.cam)return say(L('The cameras are already off.','As câmeras já estão desligadas.'),{log:false});W.cam=0;click();render();return say(L('Cameras off. That saves power.','Câmeras desligadas. Isso economiza energia.'),{log:false});}
  if(W.tape)return say(L('The tape is still playing. Say skip to start the night.','A fita ainda está tocando. Diga pular para começar a noite.'),{log:false});
  // switching camera takes a turn; the camera shows where things are after the night moves
  W.cam=n;play('static',{vol:0.2,muffle:0.2});click();
  const rest=passTurn();if(rest===null)return;
  say([describeCam()].concat(rest).join(' '));render();resetIdle();
}
function look(){
  if(!playing())return;
  if(!W.cam)return say(L('The cameras are off. Choose a camera first.','As câmeras estão desligadas. Escolha uma câmera primeiro.'),{log:false});
  say(describeCam());resetIdle();
}
// Free: what you can hear from your chair, like Listen in the main game.
function listen(){
  if(!playing())return;
  const parts=[];
  ['L','R','V'].forEach(d=>{const ms=W.mons.filter(m=>atDoor(m)===d);
    if(ms.length)parts.push(L('At {d}: {s}.','Em {d}: {s}.',{d:doorName(d),s:ms.map(m=>hearsOf(m.k)).join(', ')}));});
  W.mons.forEach(m=>{const d=nearDoor(m);if(d&&!MONS[m.k].silent)parts.push(L('Footsteps in the hall toward {d}.','Passos no corredor em direção a {d}.',{d:doorName(d)}));});
  W.mons.forEach(m=>{const d=atDoor(m);if(d)doorSoundOf(m.k,d);});
  say(L('You hold your breath and listen.','Você prende a respiração e escuta.')+' '+(parts.length?parts.join(' '):L('Only the hum of the lights, and your own heartbeat.','Só o zumbido das luzes, e o seu próprio coração.')));resetIdle();
}
function wait(){act(()=>L('You wait, and watch the clock.','Você espera, olhando o relógio.'));}
function status(){
  if(!W)return;
  const shut=['L','R','V'].filter(d=>W.doors[d]).map(doorName);
  say(L('Night {n}, {c}. Power {p} percent.','Noite {n}, {c}. Energia {p} por cento.',{n:W.night,c:clock(),p:Math.round(W.power)})+' '+
    (shut.length?L('Closed: {l}.','Fechadas: {l}.',{l:shut.join(', ')}):L('Everything is open.','Tudo está aberto.'))+' '+
    (W.cam?L('Watching camera {n}, {c}.','Olhando a câmera {n}, {c}.',{n:W.cam,c:camName(W.cam)}):L('Cameras off.','Câmeras desligadas.')),{log:false});resetIdle();
}
const HELP_EN='Commands. Left door, right door and vent close or open them. Flash left or flash right checks a hall with the flashlight. Camera 1 to 6 shows a camera, and cameras off saves power. Wait lets time pass. These all take a turn, and the monsters move after each one. Free, without using a turn: listen, look again, status, repeat, and help. If you stay idle for a while, time passes on its own.';
const HELP_PT='Comandos. Porta esquerda, porta direita e ventilação fecham ou abrem. Lanterna esquerda ou lanterna direita ilumina um corredor. Câmera 1 a 6 mostra uma câmera, e desligar câmeras economiza energia. Esperar deixa o tempo passar. Tudo isso gasta um turno, e os monstros se mexem depois de cada um. De graça, sem gastar turno: escutar, olhar de novo, status, repetir, e ajuda. Se você ficar parado por um tempo, o tempo passa sozinho.';
function help(){
  let h=LANG==='pt'?HELP_PT:HELP_EN;
  if(!S.narr)h=h.replace(' If you stay idle for a while, time passes on its own.',' With a screen reader, time only passes when you act, so take all the time you need.')
    .replace(' Se você ficar parado por um tempo, o tempo passa sozinho.',' Com leitor de tela, o tempo só passa quando você age, então use o tempo que precisar.');
  say(h,{log:false});resetIdle();}

// Like the main game: if you do nothing for a while, a turn passes on its own.
// The wait starts after the narrator has finished speaking.
function stopIdle(){clearTimeout(idleTimer);idleTimer=null;}
function idleMs(){return Math.round(DF().idle*1.5);}
function resetIdle(){stopIdle();if(!playing())return;
  // With a screen reader, the game cannot tell how long you are reading, so time only passes when you act.
  if(!S.narr)return;
  const quiet=Math.max(0,(G.quietUntil||0)-performance.now());
  idleTimer=setTimeout(()=>{if(!playing()||screen!=='watch')return;
    if((G.quietUntil||0)>performance.now()+200)return resetIdle();
    const rest=passTurn();if(rest===null)return;
    if(rest.length)say(rest.join(' '));render();resetIdle();},quiet+idleMs());}

/* ------------------------------ screens ------------------------------ */
function lobby(prefix){
  stopIdle();W=null;clearAmb();onlyMusic({[MUSIC.lobby]:0.7},2);
  const n=Math.min(best(),NIGHTS);
  $('#nwLobby').hidden=false;$('#nwPlay').hidden=true;$('#nwEnd').hidden=true;
  $('#nwStart').textContent=n===1?L('Start night 1','Começar a noite 1'):L('Continue: night {n}','Continuar: noite {n}',{n});
  const pickWrap=$('#nwPick');pickWrap.innerHTML='';
  for(let i=1;i<=n;i++){const b=document.createElement('button');b.textContent=L('Night {n}','Noite {n}',{n:i});b.addEventListener('click',()=>start(i));pickWrap.appendChild(b);}
  $('#nwPickH').hidden=n<2;
  $('#nwIntro').textContent=L('You wake up locked in a small office deep in the Backrooms. Monitors, a tape recorder, two security doors and a vent. A note on the desk says: survive six nights. The monsters move after every thing you do, so take your time and think. Difficulty: {d}. You can change it in Settings.','Você acorda trancado num pequeno escritório no fundo dos Backrooms. Monitores, um gravador, duas portas de segurança e uma ventilação. Um bilhete na mesa diz: sobreviva seis noites. Os monstros se mexem depois de cada coisa que você faz, então vá com calma e pense. Dificuldade: {d}. Você pode mudar nas Configurações.',{d:DL()});
  $('#nwHowBtn').textContent=L('How it works','Como funciona');$('#nwBack').textContent=L('Back to the main menu','Voltar ao menu principal');
  $('#nwPickH').textContent=L('Choose a night','Escolha uma noite');
  $('#nwTitle').textContent=L('Night Watch (Beta)','Vigia Noturna (Beta)');
  $('#nwBeta').textContent=L('Beta: Night Watch is an early experiment. It may change a lot, or be removed. Does it fit Accessible Backrooms? Tell us with the feedback button.','Beta: a Vigia Noturna é um experimento inicial. Pode mudar muito, ou ser removida. Ela combina com o Backrooms Acessível? Conte para nós com o botão de opinião.');
  $('#nwFbBtn').textContent=L('Send feedback about Night Watch','Enviar opinião sobre a Vigia Noturna');
  $('#nwFb').hidden=true;
  show('watch',(prefix||'')+L('Night Watch, beta. {b} {i} Say start, how it works, or back.','Vigia Noturna, beta. {b} {i} Diga começar, como funciona, ou voltar.',{b:$('#nwBeta').textContent,i:$('#nwIntro').textContent}));
}
const HOW_EN='Each night runs from 12 A M to 6 A M. Every action takes ten minutes, and after each one the monsters move. They walk toward you along two halls, one to each door, and later through the vent above you. When one reaches a door, you hear it from that side and the narrator tells you. You then have one action to close that door, sometimes more. Choose a camera to hear and see what is there. Listen tells you everything you can hear, for free. Closed doors, cameras and the flashlight use power. If the power runs out, every door opens. The flashlight checks a hall and scares off the silent Smiler, but the light draws the others. Say help during a night to hear the commands.';
const HOW_PT='Cada noite vai da meia-noite às seis da manhã. Cada ação leva dez minutos, e depois de cada uma os monstros se mexem. Eles andam até você por dois corredores, um para cada porta, e depois pela ventilação em cima de você. Quando um chega numa porta, você ouve daquele lado e o narrador avisa. Aí você tem uma ação para fechar a porta, às vezes mais. Escolha uma câmera para ouvir e ver o que tem lá. Escutar conta tudo que você consegue ouvir, de graça. Portas fechadas, câmeras e a lanterna gastam energia. Se a energia acabar, todas as portas se abrem. A lanterna ilumina um corredor e espanta o Sorridente silencioso, mas a luz atrai os outros. Diga ajuda durante uma noite para ouvir os comandos.';
function how(){say(LANG==='pt'?HOW_PT:HOW_EN);}
function start(n){
  initAudio();stopIdle();onlyMusic({[MUSIC[n]]:NIGHT_MUSIC},2);clearAmb();newNight(n);
  $('#nwLobby').hidden=true;$('#nwPlay').hidden=false;$('#nwEnd').hidden=true;
  render();hum();show('watch');setTimeout(()=>$('#nwSkip').focus(),60);
  if(!S.narr)$('#nwSkip').textContent=L('Start the night','Começar a noite');
  say(L('Night {n}. 12 A M. The tape recorder clicks on.','Noite {n}. Meia-noite. O gravador liga sozinho.',{n})+' '+tx(TAPES[n]));
  const check=()=>{if(!W||W.night!==n||!W.tape||W.over)return;if((G.quietUntil||0)>performance.now())return setTimeout(check,500);beginNight(L('The tape ends.','A fita acaba.'));};
  // with a screen reader the tape waits until you press Skip or Start the night
  if(S.narr)setTimeout(check,1500);
}
function beginNight(prefix){
  if(!W||!W.tape)return;W.tape=false;render();setTimeout(()=>$('#nwDoorL').focus(),40);
  say(prefix+' '+L('The night begins. Say help for the commands.','A noite começa. Diga ajuda para ouvir os comandos.'));resetIdle();
}
function skipTape(){if(W&&W.tape&&!W.over)beginNight(L('You stop the tape.','Você para a fita.'));}
function renderEnd(won,msg){
  $('#nwPlay').hidden=true;$('#nwEnd').hidden=false;
  $('#nwEndMsg').textContent=msg;
  const next=won&&W.night<NIGHTS;
  $('#nwAgain').textContent=next?L('Start night {n}','Começar a noite {n}',{n:W.night+1}):won?L('Play night 6 again','Jogar a noite 6 de novo'):L('Try night {n} again','Tentar a noite {n} de novo',{n:W.night});
  $('#nwAgain').dataset.n=next?W.night+1:W.night;
  $('#nwEndMenu').textContent=L('Night Watch menu','Menu da Vigia Noturna');
  setTimeout(()=>$('#nwEndMsg').focus(),40);
}
// Updates labels in place, so VoiceOver keeps its focus on the button you used.
function render(){
  if(!W)return;
  $('#nwStat').textContent=L('Night {n} · {c} · Power {p}%','Noite {n} · {c} · Energia {p}%',{n:W.night,c:clock(),p:Math.round(W.power)});
  const lab=(id,d,en,pt)=>{const b=$(id);b.textContent=(LANG==='pt'?pt:en)+': '+(W.doors[d]?L('closed','fechada'):L('open','aberta'));b.setAttribute('aria-pressed',W.doors[d]?'true':'false');};
  lab('#nwDoorL','L','Left door','Porta esquerda');lab('#nwDoorR','R','Right door','Porta direita');lab('#nwVent','V','Vent','Ventilação');
  $('#nwFlashL').textContent=L('Flash the left hall','Iluminar o corredor esquerdo');$('#nwFlashR').textContent=L('Flash the right hall','Iluminar o corredor direito');
  $('#nwListen').textContent=L('Listen (free)','Escutar (grátis)');$('#nwWait').textContent=L('Wait, let time pass','Esperar, deixar o tempo passar');
  $('#nwCamH').textContent=L('Cameras','Câmeras');
  $$('#nwCams button').forEach((b,i)=>{b.textContent=L('Camera {n}, {c}','Câmera {n}, {c}',{n:i+1,c:camName(i+1)});b.setAttribute('aria-pressed',W.cam===i+1?'true':'false');});
  $('#nwCamOff').textContent=L('Cameras off','Desligar câmeras');$('#nwLook').textContent=L('Look at the camera again (free)','Olhar a câmera de novo (grátis)');
  $('#nwStatus').textContent=L('Status (free)','Status (grátis)');$('#nwHelp').textContent=L('Help (free)','Ajuda (grátis)');
  $('#nwSkip').textContent=L('Skip the tape','Pular a fita');$('#nwQuit').textContent=L('Quit the night','Sair da noite');
  $('#nwSkip').hidden=!W.tape;
}
function quit(){stopIdle();if(W)W.over=true;clearAmb();lobby(L('You leave the night. ','Você sai da noite. '));}
function leave(){stopIdle();W=null;clearAmb();}

/* ------------------------------ hooking into the game ------------------------------ */
SCREENS.push('watch');
const host=document.createElement('section');host.id='watch';host.className='screen';host.hidden=true;host.setAttribute('aria-labelledby','nwTitle');
host.innerHTML=`<div class="menuBg"><h1 id="nwTitle" class="title" tabindex="-1">Night Watch</h1>
<div id="nwLobby"><p id="nwBeta"></p><p id="nwIntro"></p><div class="stack"><button id="nwStart" class="primary"></button><button id="nwHowBtn"></button><button id="nwFbBtn"></button>
<div id="nwFb" class="stack" hidden><h2 id="nwFbH" tabindex="-1"></h2><p id="nwFbNote"></p><div id="nwFbFits" class="stack"></div><label for="nwFbText" id="nwFbL"></label><textarea id="nwFbText" rows="4" maxlength="1000"></textarea><button id="nwFbSend" class="primary"></button></div><h2 id="nwPickH"></h2><div id="nwPick" class="stack"></div><button id="nwBack"></button></div></div>
<div id="nwPlay" hidden><p id="nwStat" aria-live="off"></p><div class="stack">
<button id="nwSkip"></button><button id="nwDoorL" class="primary"></button><button id="nwDoorR" class="primary"></button><button id="nwVent"></button>
<button id="nwListen"></button><button id="nwFlashL"></button><button id="nwFlashR"></button><button id="nwWait"></button>
<h2 id="nwCamH"></h2><div id="nwCams" class="stack">${[1,2,3,4,5,6].map(i=>`<button data-cam="${i}"></button>`).join('')}</div><button id="nwCamOff"></button><button id="nwLook"></button>
<button id="nwStatus"></button><button id="nwHelp"></button><button id="nwQuit"></button></div></div>
<div id="nwEnd" hidden><p id="nwEndMsg" tabindex="-1"></p><div class="stack"><button id="nwAgain" class="primary"></button><button id="nwEndMenu"></button></div></div></div>`;
const gameSec=$('#game');gameSec.parentNode.insertBefore(host,gameSec);
$('#nwStart').addEventListener('click',()=>start(Math.min(best(),NIGHTS)));
$('#nwHowBtn').addEventListener('click',how);
// Feedback goes to the developer's email through Formspree, like reports in Dungeon Descent.
const FB_URL='https://formspree.io/f/mkjnkenn';let fbFits='';
function openFeedback(){
  const f=$('#nwFb');f.hidden=false;fbFits='';
  $('#nwFbH').textContent=L('Does Night Watch fit Accessible Backrooms?','A Vigia Noturna combina com o Backrooms Acessível?');
  $('#nwFbNote').textContent=L('Your answer goes to the developer by email. Do not include personal information.','Sua resposta vai para o desenvolvedor por e-mail. Não inclua informações pessoais.');
  const fits=$('#nwFbFits');fits.innerHTML='';
  [['yes','Yes, keep it','Sim, mantenha'],['no','No, it does not fit','Não, não combina'],['unsure','Not sure','Não tenho certeza']].forEach(([v,en,pt])=>{
    const b=document.createElement('button');b.textContent=LANG==='pt'?pt:en;b.setAttribute('aria-pressed','false');
    b.addEventListener('click',()=>{fbFits=v;fits.querySelectorAll('button').forEach(x=>x.setAttribute('aria-pressed',x===b?'true':'false'));say(L('Selected: {a}','Selecionado: {a}',{a:b.textContent}),{log:false});});
    fits.appendChild(b);});
  $('#nwFbL').textContent=L('Anything else? What would make it better? (optional)','Mais alguma coisa? O que deixaria melhor? (opcional)');
  $('#nwFbSend').textContent=L('Send','Enviar');
  setTimeout(()=>$('#nwFbH').focus(),40);
  say(L('Feedback. Does Night Watch fit Accessible Backrooms? Choose yes, no, or not sure, add a comment if you want, then press Send.','Opinião. A Vigia Noturna combina com o Backrooms Acessível? Escolha sim, não, ou não tenho certeza, escreva um comentário se quiser, e aperte Enviar.'),{log:false});
}
async function sendFeedback(){
  const msg=$('#nwFbText').value.trim();
  if(!fbFits&&!msg)return say(L('Choose an answer or write a comment first.','Escolha uma resposta ou escreva um comentário primeiro.'),{log:false});
  $('#nwFbSend').disabled=true;
  try{
    const r=await fetch(FB_URL,{method:'POST',headers:{'Content-Type':'application/json',Accept:'application/json'},
      body:JSON.stringify({_subject:'Night Watch feedback (Accessible Backrooms)',game:'Accessible Backrooms',mode:'Night Watch beta',fits:fbFits||'(no answer)',message:msg||'(none)',language:LANG,best_night:best()})});
    if(!r.ok)throw new Error(r.status);
    $('#nwFbText').value='';$('#nwFb').hidden=true;$('#nwFbBtn').focus();
    say(L('Thank you! Your feedback was sent.','Obrigado! Sua opinião foi enviada.'));
  }catch(e){say(L('Sorry, the feedback could not be sent. Check your internet connection and try again.','Desculpe, não foi possível enviar. Verifique sua internet e tente de novo.'));}
  $('#nwFbSend').disabled=false;
}
$('#nwFbBtn').addEventListener('click',openFeedback);$('#nwFbSend').addEventListener('click',sendFeedback);
$('#nwBack').addEventListener('click',()=>{leave();showMain();});
$('#nwDoorL').addEventListener('click',()=>toggle('L'));$('#nwDoorR').addEventListener('click',()=>toggle('R'));$('#nwVent').addEventListener('click',()=>toggle('V'));
$('#nwFlashL').addEventListener('click',()=>flash('L'));$('#nwFlashR').addEventListener('click',()=>flash('R'));
$('#nwListen').addEventListener('click',listen);$('#nwWait').addEventListener('click',wait);
$$('#nwCams button').forEach(b=>b.addEventListener('click',()=>camera(+b.dataset.cam)));
$('#nwCamOff').addEventListener('click',()=>camera(0));$('#nwLook').addEventListener('click',look);
$('#nwStatus').addEventListener('click',status);$('#nwHelp').addEventListener('click',help);$('#nwSkip').addEventListener('click',skipTape);$('#nwQuit').addEventListener('click',quit);
$('#nwAgain').addEventListener('click',e=>start(+e.currentTarget.dataset.n));$('#nwEndMenu').addEventListener('click',()=>lobby());

// main menu button
const mb=document.createElement('button');mb.id='mWatch';mb.innerHTML='<span data-l="en">Night Watch (Beta)</span><span data-l="pt">Vigia Noturna (Beta)</span>';
$('#mEndless').after(mb);mb.addEventListener('click',()=>{initAudio();lobby();});


// voice commands while on this screen
function nwParse(s){
  const tx=norm(s),has=re=>re.test(tx);
  const num=(tx.match(/ (\d) /)||[])[1]||Object.keys(NUMW).find(w=>tx.includes(' '+w+' '));
  const n=num===undefined?null:(+num||NUMW[num]);
  if(screen==='menu'&&has(/ (night watch|nightwatch|vigia noturna|vigia) /))return{c:'nw_open'};
  if(screen!=='watch')return null;
  if(has(/ (try again|again|retry|tentar|de novo|denovo) /)&&!$('#nwEnd').hidden)return{c:'nw_again'};
  if(has(/ (skip|pular|pula) /))return{c:'nw_skip'};
  if(has(/ (start|begin|continue|play|comecar|continuar|jogar) /)&&!$('#nwLobby').hidden)return{c:'nw_start'};
  if(has(/ (how does it work|how it works|como funciona) /))return{c:'nw_how'};
  if(has(/ (help|ajuda|commands|comandos) /))return{c:'nw_help'};
  if(has(/ (listen|escutar|escuta|ouvir) /))return{c:'nw_listen'};
  if(has(/ (wait|pass|esperar|espera|passar) /))return{c:'nw_wait'};
  if(has(/ (flash|light|shine|lanterna|iluminar|ilumina) /))return{c:'nw_flash',n:has(/ (right|write|direit\w*) /)?'R':'L'};
  if(has(/ (vent|vents|ventilation|ventilacao|duto) /))return{c:'nw_door',n:'V',v:has(/ (open|abrir|abre) /)?false:has(/ (close|shut|fechar|fecha) /)?true:undefined};
  if(has(/ (door|porta|close|shut|open|fechar|fecha|abrir|abre) /)&&has(/ (left|lift|right|write|esquerd\w*|direit\w*) /))
    return{c:'nw_door',n:has(/ (right|write|direit\w*) /)?'R':'L',v:has(/ (open|abrir|abre) /)?false:has(/ (close|shut|fechar|fecha) /)?true:undefined};
  if(has(/ (camera|cameras|cam|camara) /)&&has(/ (off|down|close|desligar|desliga|fechar) /))return{c:'nw_cam',n:0};
  if(has(/ (camera|cam|camara) /)&&n!=null&&n>=1&&n<=6)return{c:'nw_cam',n};
  if(has(/ (look|see|what|olhar|olha|ver) /))return{c:'nw_look'};
  if(has(/ (status|time|power|hora|energia) /))return{c:'nw_status'};
  if(has(/ (quit|leave|menu|exit|sair|voltar|back) /))return{c:'nw_quit'};
  return null;
}
const _parse=parse;parse=function(s){return nwParse(s)||_parse(s);};
const _run=run;run=function(c,n,r){
  if(c==='nw_open'){initAudio();return lobby();}
  if(screen==='watch'){
    const inNight=W&&!W.over;
    if(c==='nw_start')return start(Math.min(best(),NIGHTS));
    if(c==='nw_how')return how();
    if(c==='nw_help'||c==='help')return inNight?help():how();
    if(c==='nw_again')return $('#nwAgain').click();
    if(c==='nw_skip')return skipTape();
    if(c==='nw_door')return toggle(n,r);
    if(c==='nw_flash')return flash(n);
    if(c==='nw_cam')return camera(n);
    if(c==='nw_look'||c==='look')return look();
    if(c==='nw_listen'||c==='listen')return listen();
    if(c==='nw_wait')return wait();
    if(c==='nw_status'||c==='status')return status();
    if(c==='nw_quit'||c==='menu'||c==='quit'||c==='back')return inNight?quit():(!$('#nwEnd').hidden?lobby():(leave(),showMain()));
    if(c==='repeat'||c==='history'||c==='faster'||c==='slower'||c==='musicoff'||c==='musicon'||c==='micoff'||c==='voiceon')return _run(c,n,r);
    return say(L('Night Watch command not understood. Say help for the commands.','Comando da Vigia Noturna não entendido. Diga ajuda para ouvir os comandos.'),{log:false});
  }
  return _run(c,n,r);
};
// door commands carry open or close in v
const _heard=heardSpeech;heardSpeech=function(alts){
  if(screen==='watch'){for(const s of alts){const cmd=nwParse(s);if(cmd){$('#heard').textContent=t('Heard: “{t}”',{t:s});return run(cmd.c,cmd.n,cmd.v);}}}
  return _heard(alts);
};
// Keyboard, matching the main game where it can: L listen, K look, S status, H help, R repeat.
document.addEventListener('keydown',e=>{
  if(screen!=='watch'||!W||W.over||e.ctrlKey||e.metaKey||e.altKey)return;
  if(e.target.tagName==='BUTTON'&&(e.key==='Enter'||e.key===' '))return;
  const k=e.key.toLowerCase();
  const map={q:()=>toggle('L'),e:()=>toggle('R'),w:()=>toggle('V'),a:()=>flash('L'),d:()=>flash('R'),l:listen,k:look,s:status,h:help,p:wait,r:()=>_run('repeat'),'0':()=>camera(0)};
  if(map[k]){e.preventDefault();map[k]();}else if(/^[1-6]$/.test(k)){e.preventDefault();camera(+k);}
});
// leaving through Escape or another screen ends the night
setInterval(()=>{if(W&&!W.over&&screen!=='watch'){stopIdle();W.over=true;clearAmb();}},500);
window.NightWatch={lobby,start,state:()=>W,turn:()=>{const r=passTurn();if(r)say(r.join(' '));render();}};
})();
