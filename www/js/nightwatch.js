"use strict";
/* ============================== Night Watch ==============================
   A separate mode: you are locked in a monitoring station for six nights.
   Listen to the cameras, close the doors and the vent, and use the
   flashlight to check the halls. Doors, cameras and the flashlight all use
   power. Uses the game's narrator (say), sound (play, spot, osc, noise),
   translations (t, PT) and screens (show). */
(function(){
// Registers a Portuguese translation next to its English text.
const L=(en,pt,v)=>{if(pt)PT[en]=pt;return t(en,v);};

const HOUR=50;            // seconds of real time per hour, 12 AM to 6 AM
const NIGHTS=6;
const CAMS=[null,
  {en:'Yellow Hall',pt:'Corredor Amarelo'},{en:'Left Corridor',pt:'Corredor Esquerdo'},
  {en:'Pool Rooms',pt:'Salas da Piscina'},{en:'Right Corridor',pt:'Corredor Direito'},
  {en:'Storage Room',pt:'Depósito'},{en:'Vent Shaft',pt:'Duto de Ventilação'}];
// Where each place is: a camera number, or a door.
const ROUTES={left:['start','c1','c2','L'],right:['start','c3','c4','R'],vent:['start','c6','V']};
const CAM_OF={start:5,c1:1,c2:2,c3:3,c4:4,c6:6};
const DOOR_POS={L:V3(-1,0,-0.25),R:V3(1,0,-0.25),V:V3(0,1,0.1)};
const camName=n=>LANG==='pt'?CAMS[n].pt:CAMS[n].en;
const doorName=d=>d==='L'?L('the left door','a porta esquerda'):d==='R'?L('the right door','a porta direita'):L('the vent','a ventilação');

// Monsters. move: seconds between tries, chance: odds to move each try,
// wait: seconds at a door before it attacks. from: first night it appears.
const MONS={
  hound:{from:1,name:['Hound','Cão'],routes:['left','right'],move:14,chance:0.55,wait:3.2},
  smiler:{from:2,name:['Smiler','Sorridente'],routes:['left','right'],move:20,chance:0.45,wait:6,silent:true},
  stealer:{from:3,name:['Skin-Stealer','Ladrão de Pele'],routes:['left','right'],move:17,chance:0.5,wait:9},
  party:{from:4,name:['Partygoer','Festeiro'],routes:['right','left'],move:0,chance:1,wait:4.5,watched:true},
  moths:{from:5,name:['Deathmoths','Mariposas da Morte'],routes:['vent'],move:13,chance:0.5,wait:5},
};
const mName=k=>MONS[k].name[LANG==='pt'?1:0];

const TAPES={
  1:['Hey. If you are hearing this, they got you too. Do not panic. You are in the Monitoring Station. Six nights, and the door unlocks. That is what the note says. Listen to the cameras. Things walk the halls at night. When you hear breathing at a door, close it. But the doors eat power, and when the power is gone, everything is open. Good luck. My name is Dana. I was the guard before you.',
     'Ei. Se você está ouvindo isto, pegaram você também. Não entre em pânico. Você está na Sala de Monitoramento. Seis noites, e a porta destranca. É o que diz o bilhete. Escute as câmeras. Coisas andam pelos corredores à noite. Quando ouvir respiração numa porta, feche. Mas as portas gastam energia, e quando a energia acaba, tudo fica aberto. Boa sorte. Meu nome é Dana. Eu era a vigia antes de você.'],
  2:['Night two. Something new is out there. A Smiler. You will not hear it coming. It just waits by the door, grinning. Light is the only thing it hates. Flash the hall and it backs off. But listen to me: the light draws everything else to you. Use it only when you have to.',
     'Noite dois. Tem algo novo lá fora. Um Sorridente. Você não vai ouvir ele chegando. Ele só espera na porta, sorrindo. Luz é a única coisa que ele odeia. Ilumine o corredor e ele recua. Mas me escute: a luz atrai todo o resto até você. Use só quando precisar.'],
  3:['Night three. If someone knocks and begs you to let them in, do not open the door. There are no other people down here. Not anymore. Keep the door closed until the knocking stops.',
     'Noite três. Se alguém bater e implorar para entrar, não abra a porta. Não existem outras pessoas aqui embaixo. Não mais. Mantenha a porta fechada até as batidas pararem.'],
  4:['Night four. Balloons. Giggling. A Partygoer got in. It only moves when nobody is watching it. Find it on the cameras and keep checking on it, or it comes knocking.',
     'Noite quatro. Balões. Risadinhas. Um Festeiro entrou. Ele só se mexe quando ninguém está olhando. Encontre ele nas câmeras e continue olhando, ou ele vem bater na porta.'],
  5:['Night five. The vent above your head. Moths. Big ones. When you hear wings in the vent shaft, close the vent. And if they reach the vent, keep it shut until they give up.',
     'Noite cinco. A ventilação em cima da sua cabeça. Mariposas. Grandes. Quando ouvir asas no duto, feche a ventilação. E se elas chegarem na saída, mantenha fechada até desistirem.'],
  6:['Night six. This is my last tape. I never made it past this night. Everything comes for you tonight. If you make it to six A M, find my tapes. Tell them my name was Dana.',
     'Noite seis. Esta é minha última fita. Eu nunca passei desta noite. Tudo vem atrás de você hoje. Se você chegar às seis da manhã, encontre minhas fitas. Diga a eles que meu nome era Dana.'],
};

const LOOKS={
  hound:['A Hound crouches low, panting, its jaw hanging open.','Um Cão está agachado, ofegante, com a mandíbula aberta.'],
  smiler:['In the dark, a wide white grin. Nothing else.','No escuro, um sorriso largo e branco. Mais nada.'],
  stealer:['A person stands there, very still. Its face looks borrowed.','Uma pessoa está parada ali, imóvel. O rosto parece emprestado.'],
  party:['A yellow figure with a big smile holds a bunch of balloons. It is staring at the camera.','Uma figura amarela com um sorriso enorme segura vários balões. Está encarando a câmera.'],
  moths:['Huge pale wings crawl over each other in the shaft.','Asas enormes e pálidas se arrastam umas sobre as outras no duto.'],
};

let W=null, timer=null, lastTick=0;
const best=()=>lsGet('br_nw_night',1);

/* ------------------------------ sounds ------------------------------ */
function hum(){if(!A.ctx)return;const t0=now();const out=spot(0,0.05,0.3,A.amb);
  [120,240,180.5].forEach((f,i)=>{const o=osc(i?'sine':'sawtooth',f,t0,3600);const g=gainNode(i?0.25:0.12);o.connect(g).connect(out);A.ambNodes.push(o);});
  const n=noise(t0,3600);const g=gainNode(0.08);n.connect(filt('lowpass',300)).connect(g).connect(out);A.ambNodes.push(n);}
function thud(pos,vol=1,count=1){if(!A.ctx)return;for(let i=0;i<count;i++){const t0=now()+i*0.32;const out=spot(pos,vol,0.4);
  const o=osc('sine',110,t0,0.3);o.frequency.exponentialRampToValueAtTime(45,t0+0.25);const g=gainNode(0);envelope(g,t0,0.005,0.9,0.28);o.connect(g).connect(out);
  const n=noise(t0,0.15);const g2=gainNode(0);envelope(g2,t0,0.003,0.5,0.12);n.connect(filt('lowpass',500)).connect(g2).connect(out);}}
function slam(pos){thud(pos,1.6,1);if(A.ctx){const t0=now();const out=spot(pos,0.7,0);const n=noise(t0,0.5);const g=gainNode(0);envelope(g,t0,0.002,0.8,0.45);n.connect(filt('bandpass',900,0.8)).connect(g).connect(out);}}
function doorSound(pos,closing){if(!A.ctx)return;const t0=now();const out=spot(pos,0.6,0);
  const o=osc('sawtooth',closing?220:160,t0,0.45);o.frequency.linearRampToValueAtTime(closing?90:260,t0+0.4);const g=gainNode(0);envelope(g,t0,0.02,0.18,0.4);o.connect(filt('lowpass',900)).connect(g).connect(out);
  setTimeout(()=>thud(pos,closing?1:0.4),closing?420:0);}
function flutter(pos,vol,muffle){if(!A.ctx)return;const t0=now();const out=spot(pos,vol,muffle);const n=noise(t0,1.6);const g=gainNode(0);
  for(let i=0;i<24;i++){const tt=t0+i*0.065;g.gain.setValueAtTime(0.0001,tt);g.gain.linearRampToValueAtTime(0.35,tt+0.02);g.gain.linearRampToValueAtTime(0.0001,tt+0.06);}
  n.connect(filt('bandpass',700,1.5)).connect(g).connect(out);}
function grinHum(pos,vol,muffle){if(!A.ctx)return;const t0=now();const out=spot(pos,vol,muffle);
  [330,333.5].forEach(f=>{const o=osc('sine',f,t0,2.2);const g=gainNode(0);envelope(g,t0,0.8,0.12,1.3);o.connect(g).connect(out);});}
function step(pos,vol,muffle){if(!A.ctx)return;const t0=now();const out=spot(pos,vol,muffle);const n=noise(t0,0.12);const g=gainNode(0);envelope(g,t0,0.004,0.6,0.1);n.connect(filt('lowpass',380)).connect(g).connect(out);}
function click(){if(!A.ctx)return;const t0=now();const n=noise(t0,0.03);const g=gainNode(0);envelope(g,t0,0.001,0.5,0.03);n.connect(filt('highpass',2500)).connect(g).connect(spot(0,0.6));}
function chime(times){if(!A.ctx)return;for(let i=0;i<times;i++){const t0=now()+i*0.9;[392,784,1176].forEach((f,k)=>{const o=osc('sine',f,t0,2.2);const g=gainNode(0);envelope(g,t0,0.01,k?0.05:0.18,2);o.connect(g).connect(spot(0,0.8));});}}
function camStatic(){play('static',{vol:0.22,muffle:0.2});click();}
// What a monster sounds like through a camera speaker.
function camSound(k){const s={vol:0.5,muffle:0.55};
  if(k==='hound')play(pick(['hound','hound2','growl1','growl3']),s);
  else if(k==='smiler')grinHum(0,0.35,0.5);
  else if(k==='stealer')play(pick(['moan','breath','weird']),{vol:0.35,muffle:0.6});
  else if(k==='party')play(pick(['giggle','giggle_child','giggle_insane','giggle_phased']),s);
  else if(k==='moths')flutter(0,0.5,0.5);}
// What it sounds like right outside a door, in 3D.
function doorSoundOf(k,d){const pos=DOOR_POS[d];
  if(k==='hound'){play(pick(['breath2','breath']),{pan:pos,vol:0.9});if(Math.random()<0.5)play(pick(['growl2','growl4']),{pan:pos,vol:0.7,delay:0.6});}
  else if(k==='smiler')grinHum(pos,0.5,0.1);
  else if(k==='stealer')thud(pos,0.9,3);
  else if(k==='party')play(pick(['laughter','giggle_insane']),{pan:pos,vol:0.8});
  else if(k==='moths'){flutter(pos,1,0);if(Math.random()<0.3)play('screech',{pan:pos,vol:0.5});}}
const pick=a=>a[Math.floor(Math.random()*a.length)];
const STEALER_LINES=[['Hello? Is someone in there? Please, let me in!','Alô? Tem alguém aí? Por favor, me deixa entrar!'],
  ['It is coming! Open the door, please, I am begging you!','Ele está vindo! Abre a porta, por favor, eu te imploro!'],
  ['I know you are in there. I can hear you breathing.','Eu sei que você está aí. Consigo ouvir você respirando.'],
  ['It is me. You know me. Open up.','Sou eu. Você me conhece. Abre.']];

/* ------------------------------ the night ------------------------------ */
function newNight(n){
  const hard=1+(n-1)*0.12;
  W={night:n,t:0,hour:0,power:100,doors:{L:false,R:false,V:false},cam:0,over:false,paused:false,lastSound:0,outAt:0,
    mons:Object.keys(MONS).filter(k=>MONS[k].from<=n).map(k=>({k,route:pick(MONS[k].routes),i:0,next:MONS[k].move/hard*(0.6+Math.random()*0.8),door:0,unwatched:0,hard})),
    flashCool:0};
  // night 6: everything starts a little closer
  if(n===6)W.mons.forEach(m=>{if(m.k!=='party'&&m.k!=='moths')m.i=1;});
}
const posOf=m=>ROUTES[m.route][m.i];
const atDoor=m=>{const p=posOf(m);return p==='L'||p==='R'||p==='V'?p:null;};
const drain=()=>(0.075+W.night*0.012)+['L','R','V'].filter(d=>W.doors[d]).length*0.2+(W.cam?0.07:0);

function tick(){
  if(!W||W.over)return;
  if(screen!=='watch'){stopLoop();W.over=true;clearAmb();return;} // left through Escape or another screen
  if(W.paused){lastTick=performance.now();return;}
  const tnow=performance.now(),dt=Math.min(0.5,(tnow-lastTick)/1000);lastTick=tnow;
  if(document.hidden)return;
  W.t+=dt;
  // power
  if(W.power>0){W.power=Math.max(0,W.power-drain()*dt);if(W.power<=0)powerOut();}
  // the hour
  const h=Math.floor(W.t/HOUR);
  if(h!==W.hour){W.hour=h;if(h>=6)return winNight();chime(1);say(L('{h} A M. Power {p} percent.','{h} da manhã. Energia {p} por cento.',{h,p:Math.round(W.power)}));render();}
  W.flashCool=Math.max(0,W.flashCool-dt);
  // monsters
  for(const m of W.mons){
    const def=MONS[m.k],d=atDoor(m);
    if(d){m.door-=dt;
      if(Math.random()<dt/2.2)doorSoundOf(m.k,d);
      if(m.k==='stealer'&&!m.spoke&&m.door<def.wait-1.5){m.spoke=true;const ln=pick(STEALER_LINES);say(L('A voice at {d}: {l}','Uma voz em {d}: {l}',{d:doorName(d),l:LANG==='pt'?ln[1]:ln[0]}));}
      if(m.door<=0){if(W.doors[d]&&W.power>0)return void repel(m,d);return void caught(m.k,d);}
      continue;}
    if(def.watched){ // Partygoer: moves only while nobody watches its camera
      if(W.cam&&CAM_OF[posOf(m)]===W.cam)m.unwatched=0;else m.unwatched+=dt;
      if(m.unwatched>Math.max(9,24-W.night*2.2)){m.unwatched=0;advance(m);}
      continue;}
    m.next-=dt;
    if(m.next<=0){m.next=def.move/m.hard*(0.6+Math.random()*0.8);if(Math.random()<def.chance)advance(m);}
  }
  // ambient cues: the camera feed, and steps in the corridors next to the doors
  W.lastSound-=dt;
  if(W.lastSound<=0){W.lastSound=2.2+Math.random()*1.5;
    if(W.cam){const here=W.mons.filter(m=>CAM_OF[posOf(m)]===W.cam);if(here.length)camSound(pick(here).k);}
    W.mons.forEach(m=>{const p=posOf(m);if((p==='c2'||p==='c4')&&!MONS[m.k].silent&&Math.random()<0.45)step(p==='c2'?V3(-0.9,0,-0.6):V3(0.9,0,-0.6),0.35,0.75);});}
  if(W.power<=0&&!W.outAt)W.outAt=W.t;
  renderStat();
}
function advance(m){
  const route=ROUTES[m.route];
  if(m.i<route.length-1){m.i++;const d=atDoor(m);
    if(d){m.door=MONS[m.k].wait*(W.night===6?0.85:1);m.spoke=false;doorSoundOf(m.k,d);}}
}
function retreat(m){m.i=0;m.route=pick(MONS[m.k].routes);m.door=0;m.next=MONS[m.k].move/m.hard;m.unwatched=0;}
function repel(m,d){slam(DOOR_POS[d]);buzz([120]);
  say(m.k==='stealer'?L('The knocking at {d} stops. Footsteps walk away.','As batidas em {d} param. Passos se afastam.',{d:doorName(d)})
    :L('Something slams into {d}, then retreats.','Algo se joga contra {d}, e depois recua.',{d:doorName(d)}));retreat(m);}
function caught(k,d){
  W.over=true;stopLoop();clearAmb();
  if(S.scares!==false){play(pick(['js1','js2','js3']),{vol:1.2});play('bigscream',{vol:0.8,delay:0.15});}
  buzz([500,80,300]);
  const hh=W.hour===0?12:W.hour;
  const how={hound:['The Hound bursts through {d}!','O Cão invade por {d}!'],smiler:['The grin fills the whole room. The Smiler got in through {d}.','O sorriso enche a sala inteira. O Sorridente entrou por {d}.'],
    stealer:['You let it in. It has your face now.','Você deixou entrar. Agora ele tem o seu rosto.'],party:['The Partygoer hugs you. It will not let go.','O Festeiro abraça você. Ele não solta mais.'],
    moths:['Wings pour out of the vent and fill the room.','Asas saem da ventilação e enchem a sala.']}[k];
  const msg=(LANG==='pt'?how[1]:how[0]).replace('{d}',doorName(d))+' '+L('Night {n} ends at {h} A M.','A noite {n} termina às {h} da manhã.',{n:W.night,h:hh});
  setTimeout(()=>{renderEnd(false,msg);say(msg+' '+L('Say try again, or menu.','Diga tentar de novo, ou menu.'));},1600);
}
function powerOut(){
  clearAmb();W.doors={L:false,R:false,V:false};W.cam=0;
  say(L('The power is out. The lights die, and every door slides open. Hold on until six A M.','A energia acabou. As luzes apagam e todas as portas se abrem. Aguente até as seis da manhã.'));
  render();
  // in the dark, the Hound comes for you, unless the morning comes first
  setTimeout(()=>{if(!W||W.over||W.night==null)return;const m=W.mons.find(x=>x.k==='hound')||W.mons[0];m.route=pick(['left','right']);m.i=ROUTES[m.route].length-1;m.door=4;doorSoundOf(m.k,atDoor(m));},(8+Math.random()*14)*1000);
}
function winNight(){
  W.over=true;stopLoop();clearAmb();chime(6);buzz([80,80,80]);
  const n=W.night;if(n>=best()&&n<NIGHTS)lsSet('br_nw_night',n+1);if(n===NIGHTS)lsSet('br_nw_done',true);
  const msg=n<NIGHTS?L('Six A M! You survived night {n}. The doors unlock for the day, and you hear the tape recorder click. Night {m} is open.','Seis da manhã! Você sobreviveu à noite {n}. As portas destrancam durante o dia, e você ouve o gravador fazer clique. A noite {m} está liberada.',{n,m:n+1})
    :L('Six A M. A heavy click. The security door swings open by itself. Outside, on a desk, lies a stack of tapes, each one labeled with a name. Dana is there. The newest tape has your name on it. You walk out into the hum of the Backrooms. You survived the Night Watch.',
       'Seis da manhã. Um clique pesado. A porta de segurança se abre sozinha. Lá fora, numa mesa, há uma pilha de fitas, cada uma com um nome. Dana está lá. A fita mais nova tem o seu nome. Você sai para o zumbido dos Backrooms. Você sobreviveu à Vigia Noturna.');
  setTimeout(()=>{renderEnd(true,msg);say(msg);},1200);
}

/* ------------------------------ actions ------------------------------ */
function toggle(d,want){
  if(!W||W.over)return;
  if(d==='V'&&W.night<5&&!W.doors.V&&want!==false){/* allowed, just costs power */}
  if(W.power<=0)return say(L('There is no power. The doors will not move.','Não há energia. As portas não se mexem.'));
  const v=want===undefined?!W.doors[d]:want;
  if(W.doors[d]===v)return say(v?L('{d} is already closed.','{d} já está fechada.',{d:cap(doorName(d))}):L('{d} is already open.','{d} já está aberta.',{d:cap(doorName(d))}));
  W.doors[d]=v;doorSound(DOOR_POS[d],v);tap('HEAVY');
  say(v?L('{d} closed.','{d} fechada.',{d:cap(doorName(d))}):L('{d} open.','{d} aberta.',{d:cap(doorName(d))}),{log:false});render();
}
const cap=s=>s.charAt(0).toUpperCase()+s.slice(1);
function flash(side){
  if(!W||W.over)return;
  if(W.power<=0)return say(L('The flashlight is dead without power.','A lanterna não funciona sem energia.'));
  if(W.flashCool>0)return say(L('The flashlight is still warming up.','A lanterna ainda está esquentando.'));
  W.flashCool=2;W.power=Math.max(0,W.power-1.5);click();
  const d=side==='L'?'L':'R',corr=side==='L'?'c2':'c4';
  const atD=W.mons.filter(m=>posOf(m)===d),near=W.mons.filter(m=>posOf(m)===corr);
  let out=[];
  if(atD.length){atD.forEach(m=>{
    if(m.k==='smiler'){out.push(L('Your light hits a wide white grin right outside {d}. It shrinks back into the dark.','Sua luz bate num sorriso largo e branco bem na frente de {d}. Ele recua para o escuro.',{d:doorName(d)}));retreat(m);}
    else{out.push(L('Your light hits the {m}, right outside {d}! It sees you.','Sua luz acerta o {m}, bem na frente de {d}! Ele vê você.',{m:mName(m.k),d:doorName(d)}));m.door=Math.min(m.door,2.2);}});}
  else if(near.length)out.push(L('Something moves at the far end of the hall. The {m}.','Algo se mexe no fim do corredor. O {m}.',{m:mName(near[0].k)}));
  else out.push(L('The hall outside {d} is empty.','O corredor em frente a {d} está vazio.',{d:doorName(d)}));
  // the light draws attention
  W.mons.forEach(m=>{if(m.k!=='smiler'&&!atDoor(m)&&!MONS[m.k].watched&&Math.random()<0.18+W.night*0.03)advance(m);});
  say(out.join(' '));render();
}
function camera(n){
  if(!W||W.over)return;
  if(W.power<=0)return say(L('The monitors are dark.','Os monitores estão apagados.'));
  if(!n){W.cam=0;click();say(L('Cameras down.','Câmeras desligadas.'),{log:false});render();return;}
  if(n===6&&W.night<5){}
  W.cam=n;camStatic();W.lastSound=0.9;
  say(L('Camera {n}, {c}.','Câmera {n}, {c}.',{n,c:camName(n)}),{log:false});render();
}
function look(){
  if(!W||W.over)return;
  if(!W.cam)return say(L('The cameras are down. Choose a camera first, or flash a hall.','As câmeras estão desligadas. Escolha uma câmera primeiro, ou ilumine um corredor.'));
  const here=W.mons.filter(m=>CAM_OF[posOf(m)]===W.cam);
  if(!here.length)return say(L('{c}: empty. Only the hum of the lights.','{c}: vazio. Só o zumbido das luzes.',{c:camName(W.cam)}));
  say(camName(W.cam)+': '+here.map(m=>LANG==='pt'?LOOKS[m.k][1]:LOOKS[m.k][0]).join(' '));
}
function status(){
  if(!W)return;
  const hh=W.hour===0?12:W.hour;
  const shut=['L','R','V'].filter(d=>W.doors[d]).map(doorName);
  say(L('Night {n}, {h} A M. Power {p} percent.','Noite {n}, {h} da manhã. Energia {p} por cento.',{n:W.night,h:hh,p:Math.round(W.power)})+' '+
    (shut.length?L('Closed: {l}.','Fechadas: {l}.',{l:shut.join(', ')}):L('Everything is open.','Tudo está aberto.'))+' '+
    (W.cam?L('Watching camera {n}, {c}.','Olhando a câmera {n}, {c}.',{n:W.cam,c:camName(W.cam)}):''),{log:false});
}

/* ------------------------------ screens ------------------------------ */
function stopLoop(){clearInterval(timer);timer=null;}
function lobby(prefix){
  stopLoop();W=null;clearAmb();menuMusic();
  const n=Math.min(best(),NIGHTS);
  $('#nwLobby').hidden=false;$('#nwPlay').hidden=true;$('#nwEnd').hidden=true;
  $('#nwStart').textContent=n===1?L('Start night 1','Começar a noite 1'):L('Continue: night {n}','Continuar: noite {n}',{n});
  const pickWrap=$('#nwPick');pickWrap.innerHTML='';
  for(let i=1;i<=n;i++){const b=document.createElement('button');b.textContent=L('Night {n}','Noite {n}',{n:i});b.addEventListener('click',()=>start(i));pickWrap.appendChild(b);}
  $('#nwPickH').hidden=n<2;
  $('#nwIntro').textContent=L('You wake up locked in a small office deep in the Backrooms. Monitors, a tape recorder, two security doors and a vent. A note on the desk says: survive six nights. Listen to the cameras, close the doors when something comes, and watch your power.','Você acorda trancado num pequeno escritório no fundo dos Backrooms. Monitores, um gravador, duas portas de segurança e uma ventilação. Um bilhete na mesa diz: sobreviva seis noites. Escute as câmeras, feche as portas quando algo chegar, e cuide da energia.');
  $('#nwHowBtn').textContent=L('How it works','Como funciona');$('#nwBack').textContent=L('Back to the main menu','Voltar ao menu principal');
  $('#nwPickH').textContent=L('Choose a night','Escolha uma noite');
  $('#nwTitle').textContent=L('Night Watch','Vigia Noturna');
  show('watch',(prefix||'')+L('Night Watch. {i} Say start, how it works, or back.','Vigia Noturna. {i} Diga começar, como funciona, ou voltar.',{i:$('#nwIntro').textContent}));
}
const HOW_EN='Each night runs from 12 A M to 6 A M, about five minutes. Monsters walk toward you along two halls, one to each door, and later through the vent above you. Choose a camera to hear what is there, and say look to hear what the camera shows. When something is right outside, you hear it from that side: breathing on the left means close the left door. Doors, cameras and the flashlight use power. If the power runs out, every door opens. The flashlight shows what is in a hall and scares off the silent Smiler, but the light draws the others to you. Commands: left door, right door, vent, flash left, flash right, camera 1 to 6, cameras off, look, and status. On a keyboard: Q and E for the doors, W for the vent, A and D to flash, numbers for cameras, zero for cameras off, L to look, S for status.';
const HOW_PT='Cada noite vai da meia-noite às seis da manhã, uns cinco minutos. Os monstros andam até você por dois corredores, um para cada porta, e depois pela ventilação em cima de você. Escolha uma câmera para ouvir o que tem lá, e diga olhar para ouvir o que a câmera mostra. Quando algo está bem do lado de fora, você ouve daquele lado: respiração na esquerda quer dizer feche a porta esquerda. Portas, câmeras e a lanterna gastam energia. Se a energia acabar, todas as portas se abrem. A lanterna mostra o que tem no corredor e espanta o Sorridente silencioso, mas a luz atrai os outros até você. Comandos: porta esquerda, porta direita, ventilação, lanterna esquerda, lanterna direita, câmera 1 a 6, desligar câmeras, olhar, e status. No teclado: Q e E para as portas, W para a ventilação, A e D para a lanterna, números para as câmeras, zero para desligar, L para olhar, S para status.';
function how(){say(LANG==='pt'?HOW_PT:HOW_EN);}
function start(n){
  initAudio();onlyMusic({},1.5);clearAmb();newNight(n);
  $('#nwLobby').hidden=true;$('#nwPlay').hidden=false;$('#nwEnd').hidden=true;
  W.paused=true;render();hum();
  const tape=TAPES[n],intro=L('Night {n}. 12 A M. The tape recorder clicks on.','Noite {n}. Meia-noite. O gravador liga sozinho.',{n})+' '+(LANG==='pt'?tape[1]:tape[0]);
  show('watch');setTimeout(()=>{$('#nwDoorL').focus();},60);
  say(intro);
  // the night starts once the tape is done
  const wait=Math.min(40,intro.length*58/S.rate/1000+1);
  setTimeout(()=>{if(!W||W.night!==n||W.over)return;W.paused=false;lastTick=performance.now();render();say(L('The tape ends. The night begins.','A fita acaba. A noite começa.'),{log:false});},wait*1000);
  lastTick=performance.now();stopLoop();timer=setInterval(tick,250);
}
function skipTape(){if(W&&W.paused&&!W.over){W.paused=false;lastTick=performance.now();render();$('#nwDoorL').focus();say(L('You stop the tape. The night begins.','Você para a fita. A noite começa.'),{log:false});}}
function renderEnd(won,msg){
  $('#nwPlay').hidden=true;$('#nwEnd').hidden=false;
  $('#nwEndMsg').textContent=msg;
  const next=won&&W.night<NIGHTS;
  $('#nwAgain').textContent=next?L('Start night {n}','Começar a noite {n}',{n:W.night+1}):won?L('Play night 6 again','Jogar a noite 6 de novo'):L('Try night {n} again','Tentar a noite {n} de novo',{n:W.night});
  $('#nwAgain').dataset.n=next?W.night+1:W.night;
  $('#nwEndMenu').textContent=L('Night Watch menu','Menu da Vigia Noturna');
  setTimeout(()=>$('#nwEndMsg').focus(),40);
}
function renderStat(){
  if(!W)return;const hh=W.hour===0?12:W.hour;
  $('#nwStat').textContent=L('Night {n} · {h} A M · Power {p}%','Noite {n} · {h} da manhã · Energia {p}%',{n:W.night,h:hh,p:Math.round(W.power)});
}
function render(){
  if(!W)return;renderStat();
  const lab=(id,d,en,pt)=>{const b=$(id);b.textContent=(LANG==='pt'?pt:en)+': '+(W.doors[d]?L('closed','fechada'):L('open','aberta'));b.setAttribute('aria-pressed',W.doors[d]?'true':'false');};
  lab('#nwDoorL','L','Left door','Porta esquerda');lab('#nwDoorR','R','Right door','Porta direita');lab('#nwVent','V','Vent','Ventilação');
  $('#nwFlashL').textContent=L('Flash the left hall','Iluminar o corredor esquerdo');$('#nwFlashR').textContent=L('Flash the right hall','Iluminar o corredor direito');
  $('#nwCamH').textContent=L('Cameras','Câmeras');
  const cams=$('#nwCams');cams.innerHTML='';
  for(let i=1;i<=6;i++){const b=document.createElement('button');b.textContent=L('Camera {n}, {c}','Câmera {n}, {c}',{n:i,c:camName(i)});b.setAttribute('aria-pressed',W.cam===i?'true':'false');b.addEventListener('click',()=>camera(i));cams.appendChild(b);}
  $('#nwCamOff').textContent=L('Cameras off','Desligar câmeras');$('#nwLook').textContent=L('Look closely at the camera','Olhar a câmera com atenção');
  $('#nwStatus').textContent=L('Status','Status');$('#nwSkip').textContent=L('Skip the tape','Pular a fita');$('#nwQuit').textContent=L('Quit the night','Sair da noite');
  $('#nwSkip').hidden=!W.paused;
}
function quit(){stopLoop();if(W)W.over=true;clearAmb();lobby(L('You leave the night. ','Você sai da noite. '));}

/* ------------------------------ hooking into the game ------------------------------ */
SCREENS.push('watch');
const host=document.createElement('section');host.id='watch';host.className='screen';host.hidden=true;host.setAttribute('aria-labelledby','nwTitle');
host.innerHTML=`<div class="menuBg"><h1 id="nwTitle" class="title" tabindex="-1">Night Watch</h1>
<div id="nwLobby"><p id="nwIntro"></p><div class="stack"><button id="nwStart" class="primary"></button><button id="nwHowBtn"></button><h2 id="nwPickH"></h2><div id="nwPick" class="stack"></div><button id="nwBack"></button></div></div>
<div id="nwPlay" hidden><p id="nwStat" aria-live="off"></p><div class="stack">
<button id="nwSkip"></button><button id="nwDoorL" class="primary"></button><button id="nwDoorR" class="primary"></button><button id="nwVent"></button>
<button id="nwFlashL"></button><button id="nwFlashR"></button><h2 id="nwCamH"></h2><div id="nwCams" class="stack"></div><button id="nwCamOff"></button><button id="nwLook"></button>
<button id="nwStatus"></button><button id="nwQuit"></button></div></div>
<div id="nwEnd" hidden><p id="nwEndMsg" tabindex="-1"></p><div class="stack"><button id="nwAgain" class="primary"></button><button id="nwEndMenu"></button></div></div></div>`;
const gameSec=$('#game');gameSec.parentNode.insertBefore(host,gameSec);
$('#nwStart').addEventListener('click',()=>start(Math.min(best(),NIGHTS)));
$('#nwHowBtn').addEventListener('click',how);
$('#nwBack').addEventListener('click',()=>{lobbyOff();showMain();});
$('#nwDoorL').addEventListener('click',()=>toggle('L'));$('#nwDoorR').addEventListener('click',()=>toggle('R'));$('#nwVent').addEventListener('click',()=>toggle('V'));
$('#nwFlashL').addEventListener('click',()=>flash('L'));$('#nwFlashR').addEventListener('click',()=>flash('R'));
$('#nwCamOff').addEventListener('click',()=>camera(0));$('#nwLook').addEventListener('click',look);
$('#nwStatus').addEventListener('click',status);$('#nwSkip').addEventListener('click',skipTape);$('#nwQuit').addEventListener('click',quit);
$('#nwAgain').addEventListener('click',e=>start(+e.currentTarget.dataset.n));$('#nwEndMenu').addEventListener('click',()=>lobby());
function lobbyOff(){stopLoop();W=null;clearAmb();}

// main menu button
const mb=document.createElement('button');mb.id='mWatch';mb.innerHTML='<span data-l="en">Night Watch</span><span data-l="pt">Vigia Noturna</span>';
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
  if(has(/ (start|begin|continue|play|comecar|começar|continuar|jogar) /)&&!$('#nwLobby').hidden)return{c:'nw_start'};
  if(has(/ (how|como funciona|ajuda|help) /))return{c:'nw_how'};
  if(has(/ (flash|light|shine|lanterna|iluminar|ilumina) /))return{c:'nw_flash',n:has(/ (right|direit\w*) /)?'R':'L'};
  if(has(/ (vent|vents|ventilation|ventilacao|ventilação|duto) /))return{c:'nw_door',n:'V',v:has(/ (open|abrir|abre) /)?false:has(/ (close|shut|fechar|fecha) /)?true:undefined};
  if(has(/ (door|porta|close|shut|open|fechar|fecha|abrir|abre) /)&&has(/ (left|lift|right|write|esquerd\w*|direit\w*) /))
    return{c:'nw_door',n:has(/ (right|write|direit\w*) /)?'R':'L',v:has(/ (open|abrir|abre) /)?false:has(/ (close|shut|fechar|fecha) /)?true:undefined};
  if(has(/ (camera|cam|câmera|camara) /)&&has(/ (off|down|close|desligar|desliga|fechar) /))return{c:'nw_cam',n:0};
  if(has(/ (camera|cam|câmera|camara) /)&&n!=null&&n>=1&&n<=6)return{c:'nw_cam',n};
  if(has(/ (look|see|what|olhar|olha|ver) /))return{c:'nw_look'};
  if(has(/ (status|time|power|hora|energia) /))return{c:'nw_status'};
  if(has(/ (quit|leave|menu|exit|sair|voltar|back) /))return{c:'nw_quit'};
  return null;
}
const _parse=parse;parse=function(s){return nwParse(s)||_parse(s);};
const _run=run;run=function(c,n,r){
  if(c==='nw_open'){initAudio();return lobby();}
  if(screen==='watch'){
    const playing=W&&!W.over;
    if(c==='nw_start')return start(Math.min(best(),NIGHTS));
    if(c==='nw_how')return how();
    if(c==='nw_again')return $('#nwAgain').click();
    if(c==='nw_skip')return skipTape();
    if(c==='nw_door')return toggle(n,r);
    if(c==='nw_flash')return flash(n);
    if(c==='nw_cam')return camera(n);
    if(c==='nw_look')return look();
    if(c==='nw_status')return status();
    if(c==='nw_quit'||c==='menu'||c==='quit'||c==='back')return playing?quit():(!$('#nwEnd').hidden?lobby():(lobbyOff(),showMain()));
    if(c==='repeat'||c==='history'||c==='faster'||c==='slower'||c==='musicoff'||c==='musicon'||c==='micoff'||c==='voiceon')return _run(c,n,r);
    return say(L('Night Watch command not understood. Say help for the commands.','Comando da Vigia Noturna não entendido. Diga ajuda para ouvir os comandos.'),{log:false});
  }
  return _run(c,n,r);
};
// heardSpeech calls run(cmd.c,cmd.n,cmd.r); our door commands carry open or close in v
const _heard=heardSpeech;heardSpeech=function(alts){
  if(screen==='watch'){for(const tx of alts){const cmd=nwParse(tx);if(cmd){$('#heard').textContent=t('Heard: “{t}”',{t:tx});return run(cmd.c,cmd.n,cmd.v);}}}
  return _heard(alts);
};
document.addEventListener('keydown',e=>{
  if(screen!=='watch'||!W||W.over||e.ctrlKey||e.metaKey||e.altKey)return;
  if(e.target.tagName==='BUTTON'&&(e.key==='Enter'||e.key===' '))return;
  const k=e.key.toLowerCase();
  const map={q:()=>toggle('L'),e:()=>toggle('R'),w:()=>toggle('V'),a:()=>flash('L'),d:()=>flash('R'),l:look,s:status,'0':()=>camera(0)};
  if(map[k]){e.preventDefault();map[k]();}else if(/^[1-6]$/.test(k)){e.preventDefault();camera(+k);}
});
document.addEventListener('visibilitychange',()=>{if(!document.hidden)lastTick=performance.now();});
window.NightWatch={lobby,start,state:()=>W};
})();
