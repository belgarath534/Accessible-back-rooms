"use strict";
/* ============================== Hunter mode ==============================
   A separate mode where the roles swap: you are the monster, and an
   AI survivor (the wanderer) is trying to reach the exit. You find them by
   sound: footsteps, breathing, a flashlight clicking on, a walkie-talkie.
   Each monster has one power. Like the main game it is turn-based: the
   wanderer moves after each thing you do, or when you stay idle.
   Uses the game's narrator (say), sound (play, spot, noise, osc), music
   (onlyMusic), difficulty (DF), translations (t, PT), screens (show) and
   achievements (ACH, unlock). Listening, status and help are free. */
(function(){
const L=(en,pt,v)=>{if(pt)PT[en]=pt;return t(en,v);};
const pick=a=>a[Math.floor(Math.random()*a.length)];
const DIRS=[[0,-1],[1,0],[0,1],[-1,0]];   // north, east, south, west
const BIT=[1,2,4,8];
const MUSIC={lobby:'music18',hunt:'music8',won:'music20',lost:'music16'};

/* ---------- the monsters you can play ---------- */
const MONS={
  hound:{name:['the Hound','o Cão'],power:['Sprint','Disparar'],cool:3,step:2,
    about:['Fast and loud. Your power, Sprint, moves you two steps at once, but the wanderer will hear your growl from far away.',
           'Rápido e barulhento. Seu poder, Disparar, move você dois passos de uma vez, mas o andarilho ouve seu rosnado de longe.']},
  lookalike:{name:['the Lookalike','o Sósia'],power:['Disguise','Disfarce'],cool:0,step:2,
    about:['Patient. Your power, Disguise, turns you into a bottle of almond water. A calm wanderer who passes nearby will come to pick you up, and then you have them. You cannot move while disguised. Walk to drop the disguise.',
           'Paciente. Seu poder, Disfarce, transforma você numa garrafa de água de amêndoa. Um andarilho calmo que passar perto vem pegar você, e aí você o pega. Você não pode andar disfarçado. Ande para sair do disfarce.']},
  crawler:{name:['the Wall Crawler','o Rastejador das Paredes'],power:['Scratch','Arranhar'],cool:3,step:1,
    about:['Silent. You move inside the walls, so the wanderer never hears you walk. You cannot grab someone who is moving: wait next to them until they stop, or hide, then reach through. Your power, Scratch, makes a loud scratching two steps ahead of you, to scare the wanderer the other way.',
           'Silencioso. Você anda dentro das paredes, então o andarilho nunca ouve você andar. Você não consegue pegar alguém que está andando: espere do lado até a pessoa parar, ou se esconder, e aí atravesse a parede. Seu poder, Arranhar, faz um arranhão alto dois passos à sua frente, para assustar o andarilho na outra direção.']},
  static:{name:['the Static','a Estática'],power:['Surge','Surto'],cool:5,step:1,
    about:['A drifting cloud of radio noise. You move silently, but you are nearly deaf: you only hear footsteps very close. Every time the wanderer uses their walkie-talkie, though, you hear exactly where they are. Your power, Surge, blasts static that freezes a nearby wanderer with fear for two turns.',
           'Uma nuvem de ruído de rádio. Você anda em silêncio, mas é quase surda: só ouve passos bem de perto. Mas toda vez que o andarilho usa o rádio, você ouve exatamente onde ele está. Seu poder, Surto, solta uma estática que congela de medo um andarilho próximo por dois turnos.']},
};
const ORDER=['hound','lookalike','crawler','static'];
const mName=k=>MONS[k].name[LANG==='pt'?1:0];
const pName=k=>MONS[k].power[LANG==='pt'?1:0];
const cap=s=>s.charAt(0).toUpperCase()+s.slice(1);

/* ---------- the map ---------- */
function makeMaze(w,h){
  const open=[...Array(h)].map(()=>Array(w).fill(0)),seen=[...Array(h)].map(()=>Array(w).fill(false));
  const st=[[rand(w),rand(h)]];seen[st[0][1]][st[0][0]]=true;
  while(st.length){const [x,y]=st[st.length-1];const opts=[0,1,2,3].filter(d=>{const nx=x+DIRS[d][0],ny=y+DIRS[d][1];return nx>=0&&ny>=0&&nx<w&&ny<h&&!seen[ny][nx];});
    if(!opts.length){st.pop();continue;}const d=pick(opts),nx=x+DIRS[d][0],ny=y+DIRS[d][1];open[y][x]|=BIT[d];open[ny][nx]|=BIT[(d+2)%4];seen[ny][nx]=true;st.push([nx,ny]);}
  // knock out some walls so there are loops: the wanderer can go around you
  for(let i=0;i<w*h*0.14;i++){const x=rand(w),y=rand(h),d=rand(4),nx=x+DIRS[d][0],ny=y+DIRS[d][1];if(nx<0||ny<0||nx>=w||ny>=h)continue;open[y][x]|=BIT[d];open[ny][nx]|=BIT[(d+2)%4];}
  return open;
}
const canGo=(x,y,d)=>!!(H.open[y][x]&BIT[d]);
function bfs(sx,sy,block){const d=[...Array(H.h)].map(()=>Array(H.w).fill(Infinity));d[sy][sx]=0;const q=[[sx,sy]];
  while(q.length){const [x,y]=q.shift();for(let k=0;k<4;k++){if(!canGo(x,y,k))continue;const nx=x+DIRS[k][0],ny=y+DIRS[k][1];if(d[ny][nx]!==Infinity)continue;if(block&&block(nx,ny))continue;d[ny][nx]=d[y][x]+1;q.push([nx,ny]);}}
  return d;}
// the next step from (x,y) along the shortest way to a target, given the distances from that target
function stepToward(x,y,dist){let best=null,bd=dist[y][x];for(let k=0;k<4;k++){if(!canGo(x,y,k))continue;const nx=x+DIRS[k][0],ny=y+DIRS[k][1];if(dist[ny][nx]<bd){bd=dist[ny][nx];best=[nx,ny];}}return best;}
const pathDist=(ax,ay,bx,by)=>bfs(ax,ay)[by][bx];
const cells=()=>{const a=[];for(let y=0;y<H.h;y++)for(let x=0;x<H.w;x++)a.push([x,y]);return a;};
const deg=(x,y)=>[0,1,2,3].filter(k=>canGo(x,y,k)).length;

/* ---------- state ---------- */
let H=null, idleTimer=null;
const SIZES={easy:[8,8],normal:[10,9],nightmare:[12,10]};
const REST={easy:2,normal:3,nightmare:5};   // the calm wanderer stops to listen once every this many turns

function newHunt(mon){
  const [w,h]=SIZES[S.diff]||SIZES.normal;
  H={mon,w,h,turn:0,cool:0,over:false,disguise:false,lastHeard:null,walkieIn:3+rand(3),noises:0};
  H.open=makeMaze(w,h);
  const all=cells();
  const pStart=pick(all);
  let dP=bfs(pStart[0],pStart[1]);
  const far=all.slice().sort((a,b)=>dP[b[1]][b[0]]-dP[a[1]][a[0]]);
  H.exit=far[0];
  const dE=bfs(H.exit[0],H.exit[1]);
  // you start a fair distance from the wanderer, and not right by the exit
  const want=S.diff==='easy'?5:S.diff==='nightmare'?7:6;
  const cand=all.filter(([x,y])=>dP[y][x]>=want-1&&dP[y][x]<=want+1&&dE[y][x]>=4);
  const hs=cand.length?pick(cand):far[Math.floor(far.length/2)];
  H.x=hs[0];H.y=hs[1];
  // face an open way, preferring toward the wanderer
  const nx=stepToward(H.x,H.y,dP);H.f=nx?DIRS.findIndex(d=>d[0]===nx[0]-H.x&&d[1]===nx[1]-H.y):[0,1,2,3].find(k=>canGo(H.x,H.y,k));
  // lockers in dead ends
  H.hides=new Set(all.filter(([x,y])=>deg(x,y)===1&&!(x===H.exit[0]&&y===H.exit[1])).slice(0,6).map(([x,y])=>x+','+y));
  H.p={x:pStart[0],y:pStart[1],hidden:0,alert:0,run:0,frozen:0,moved:false,wary:0};
}

/* ---------- sound ---------- */
// where something is, as seen from you: x is to your right, z negative is in front
function rel(x,y){const dx=x-H.x,dy=y-H.y,[fx,fy]=DIRS[H.f];const fwd=dx*fx+dy*fy,right=dx*(-fy)+dy*fx;const len=Math.hypot(fwd,right)||1;return {fwd,right,v:V3(right/len,0,-fwd/len)};}
function dirWords(x,y){const r=rel(x,y);if(!r.fwd&&!r.right)return L('right here','bem aqui');
  const a=Math.atan2(r.right,r.fwd)*180/Math.PI;
  const en=a>-22.5&&a<=22.5?'ahead':a>22.5&&a<=67.5?'ahead and to the right':a>67.5&&a<=112.5?'to your right':a>112.5&&a<=157.5?'behind you, to the right':a<=-22.5&&a>-67.5?'ahead and to the left':a<=-67.5&&a>-112.5?'to your left':a<=-112.5&&a>-157.5?'behind you, to the left':'behind you';
  const pt={'ahead':'à frente','ahead and to the right':'à frente e à direita','to your right':'à sua direita','behind you, to the right':'atrás de você, à direita','ahead and to the left':'à frente e à esquerda','to your left':'à sua esquerda','behind you, to the left':'atrás de você, à esquerda','behind you':'atrás de você'};
  return LANG==='pt'?pt[en]:en;}
function distWords(d){return d<=1?L('very close','muito perto'):d<=3?L('close','perto'):d<=6?L('a few rooms away','a alguns cômodos'):L('far away','longe');}
function steps(pos,vol,muffle,running){if(!A.ctx)return;const n=running?4:2,gap=running?0.18:0.38;for(let i=0;i<n;i++){const t0=now()+i*gap;const out=spot(pos,vol,muffle);
  const th=osc('sine',90,t0,0.1);th.frequency.exponentialRampToValueAtTime(50,t0+0.09);const tg=gainNode(0);envelope(tg,t0,0.003,0.5,0.09);th.connect(tg).connect(out);
  const ns=noise(t0,0.1);const g=gainNode(0);envelope(g,t0,0.004,0.8,0.08);ns.connect(filt('bandpass',1300,1.2)).connect(g).connect(out);}}
function click(pos,vol){if(!A.ctx)return;const t0=now();const n=noise(t0,0.03);const g=gainNode(0);envelope(g,t0,0.001,0.6*vol,0.03);n.connect(filt('highpass',2500)).connect(g).connect(spot(pos,1));}
function walkie(pos,vol){if(!A.ctx)return;const t0=now();const n=noise(t0,1.2);const g=gainNode(0);envelope(g,t0,0.02,0.5*vol,1.1);n.connect(filt('bandpass',1800,2)).connect(g).connect(spot(pos,1));
  const o=osc('square',1000,t0,0.15);const og=gainNode(0);envelope(og,t0,0.005,0.12*vol,0.12);o.connect(filt('lowpass',2000)).connect(og).connect(spot(pos,1));}
function scratch(pos,vol){if(!A.ctx)return;for(let i=0;i<5;i++){const t0=now()+i*0.14;const n=noise(t0,0.12);const f=filt('bandpass',2600+rand(1400),3);const g=gainNode(0);envelope(g,t0,0.01,0.5*vol,0.1);n.connect(f).connect(g).connect(spot(pos,1));}}
function chimeWaver(){if(!A.ctx)return;const t0=now();const o=osc('sine',1320,t0,1.4);o.frequency.setValueAtTime(1320,t0);o.frequency.linearRampToValueAtTime(1290,t0+0.7);o.frequency.linearRampToValueAtTime(1320,t0+1.3);const g=gainNode(0);envelope(g,t0,0.01,0.12,1.3);o.connect(g).connect(spot(0,1));}
function myStep(){if(!A.ctx)return;const m=H.mon;
  if(m==='crawler')return scratch(V3(pick([-1,1]),0,-0.2),0.25);
  if(m==='static'){const t0=now();const n=noise(t0,0.5);const g=gainNode(0);envelope(g,t0,0.08,0.18,0.4);n.connect(filt('bandpass',2200,1)).connect(g).connect(spot(0,1));return;}
  if(m==='hound')play(pick(['growl1','growl2']),{vol:0.35});
  for(let i=0;i<2;i++){const t0=now()+i*0.3;const ns=noise(t0,0.1);const g=gainNode(0);envelope(g,t0,0.004,0.5,0.08);ns.connect(filt('lowpass',900,0.8)).connect(g).connect(spot(i?0.15:-0.15,1));}}
function bumpWall(){if(!A.ctx)return;const t0=now();const o=osc('sine',90,t0,0.3);o.frequency.exponentialRampToValueAtTime(40,t0+0.25);const g=gainNode(0);envelope(g,t0,0.005,0.8,0.25);o.connect(g).connect(spot(0,1));}

// what you hear of the wanderer after a turn
function hearPrey(){const p=H.p,d=pathDist(H.x,H.y,p.x,p.y),r=rel(p.x,p.y);
  const range=H.mon==='static'?2:p.run?9:6;
  if(p.hidden){if(d<=1)play('breath',{pan:r.v,vol:0.45,muffle:0.5});return;}
  if(p.moved&&d<=range){const vol=Math.max(0.12,1-d/(range+1)),muffle=Math.min(0.85,d*0.12);steps(r.v,vol,muffle,p.run>0);}
  if(d<=2&&H.mon!=='static')play('breath2',{pan:r.v,vol:0.3,muffle:0.3,delay:0.6});
}

/* ---------- the wanderer ---------- */
function preyHears(srcX,srcY,loud){
  const p=H.p;if(!loud)return false;const d=pathDist(p.x,p.y,srcX,srcY);if(d>loud)return false;
  p.alert=4;p.run=2;p.wary=8;H.lastHeard=[srcX,srcY];return true;}
function preyTurn(out){
  const p=H.p;p.moved=false;
  if(p.frozen>0){p.frozen--;return;}
  if(p.hidden>0){p.hidden--;if(!p.hidden)out.push(L('Somewhere, a locker door creaks open.','Em algum lugar, a porta de um armário range ao abrir.'));return;}
  const dE=bfs(H.exit[0],H.exit[1]);
  // scared: hide nearby, or run for the exit the long way round
  if(p.alert>0){p.alert--;
    const lh=H.lastHeard;const dl=lh?pathDist(p.x,p.y,lh[0],lh[1]):99;
    if(dl<=3&&!p.triedHide&&H.mon!=='crawler'){const near=[...H.hides].map(s=>s.split(',').map(Number)).find(([x,y])=>pathDist(p.x,p.y,x,y)<=2&&pathDist(x,y,H.x,H.y)>1);
      if(near&&Math.random()<0.6){p.triedHide=true;const dh=bfs(near[0],near[1]);for(let i=0;i<2&&!(p.x===near[0]&&p.y===near[1]);i++){const s=stepToward(p.x,p.y,dh);if(!s)break;p.x=s[0];p.y=s[1];p.moved=true;}
        if(p.x===near[0]&&p.y===near[1]){p.hidden=3+rand(2);p.alert=0;p.run=0;out.push(L('A metal door slams shut somewhere. They are hiding.','Uma porta de metal bate em algum lugar. Estão se escondendo.'));}return;}}
    const n=p.run>0?2:1;if(p.run>0)p.run--;
    const avoid=lh?bfs(lh[0],lh[1]):null;
    const safe=avoid?bfs(H.exit[0],H.exit[1],(x,y)=>avoid[y][x]<=1&&!(x===H.exit[0]&&y===H.exit[1])):dE;
    for(let i=0;i<n;i++){let s=stepToward(p.x,p.y,safe[p.y][p.x]<Infinity?safe:dE);
      if(avoid&&(!s||avoid[s[1]][s[0]]<=1)){// no safe way: back away from the noise
        let best=null,bd=avoid[p.y][p.x];for(let k=0;k<4;k++){if(!canGo(p.x,p.y,k))continue;const nx=p.x+DIRS[k][0],ny=p.y+DIRS[k][1];if(avoid[ny][nx]>bd){bd=avoid[ny][nx];best=[nx,ny];}}s=best||s;}
      if(!s)break;p.x=s[0];p.y=s[1];p.moved=true;if(caughtNow())return;}
    return;}
  p.triedHide=false;
  if(p.wary>0)p.wary--;
  // calm: stop to listen now and then
  if(H.turn%(REST[S.diff]||3)===0){if(Math.random()<0.35){click(rel(p.x,p.y).v,Math.max(0.1,1-pathDist(H.x,H.y,p.x,p.y)/8));}return;}
  // a bottle of almond water nearby is too good to pass up, unless they heard something
  if(H.disguise&&!p.wary){const dh=bfs(H.x,H.y);if(dh[p.y][p.x]<=4){const s=stepToward(p.x,p.y,dh);if(s){p.x=s[0];p.y=s[1];p.moved=true;}return;}}
  const s=stepToward(p.x,p.y,dE);if(s){p.x=s[0];p.y=s[1];p.moved=true;}
}
function caughtNow(){const p=H.p;if(p.hidden)return false;
  if(H.mon==='crawler')return false;   // the Wall Crawler grabs only at the end of a turn
  return p.x===H.x&&p.y===H.y;}
function crawlerGrab(){const p=H.p;if(H.mon!=='crawler'||H.walked)return false;const d=pathDist(H.x,H.y,p.x,p.y);return d<=1&&(!p.moved||p.hidden>0);}

/* ---------- a turn ---------- */
function act(fn){
  if(!H||H.over)return;stopIdle();H.walked=false;
  const out=[];const r=fn(out);if(r===false){resetIdle();if(out.length)say(out.join(' '));return;}
  endTurn(out);
}
function endTurn(out){
  H.turn++;if(H.cool>0)H.cool--;
  if(checkEnd(out))return;
  preyTurn(out);
  if(checkEnd(out))return;
  // the walkie-talkie: the Static hears it from anywhere
  if(!H.p.hidden&&--H.walkieIn<=0){H.walkieIn=4+rand(3);const d=pathDist(H.x,H.y,H.p.x,H.p.y);const r=rel(H.p.x,H.p.y);
    if(H.mon==='static'){walkie(r.v,1);H.radioAt={x:H.p.x,y:H.p.y,turn:H.turn};out.push(L('A walkie-talkie crackles: {w}, {d}. You feel it in your static.','Um rádio chia: {w}, {d}. Você sente na sua estática.',{w:dirWords(H.p.x,H.p.y),d:distWords(d)}));}
    else if(d<=6){walkie(r.v,Math.max(0.15,1-d/7));}}
  hearPrey();
  if(H.disguise&&Math.random()<0.5)setTimeout(chimeWaver,500);
  render();
  if(out.length)say(out.join(' '));
  resetIdle();
}
function checkEnd(out){const p=H.p;
  if(caughtNow()||crawlerGrab()){win(out);return true;}
  if(p.x===H.exit[0]&&p.y===H.exit[1]){lose(out);return true;}
  return false;}

/* ---------- what you can do ---------- */
function openWays(){const w=[];const names=[L('ahead','à frente'),L('right','direita'),L('behind','atrás'),L('left','esquerda')];
  [0,3,1,2].forEach(k=>{if(canGo(H.x,H.y,(H.f+k)%4))w.push(names[k]);});
  return w.length?L('Open: {w}.','Aberto: {w}.',{w:w.join(', ')}):'';}
function move(turnBy){act(out=>{
  if(turnBy)H.f=(H.f+turnBy)%4;
  if(H.disguise){H.disguise=false;out.push(L('You unfold from the bottle.','Você se desdobra da garrafa.'));}
  if(!canGo(H.x,H.y,H.f)){bumpWall();out.push(L('A wall.','Uma parede.')+' '+openWays());return false;}
  H.x+=DIRS[H.f][0];H.y+=DIRS[H.f][1];H.walked=true;myStep();
  if(preyHears(H.x,H.y,MONS[H.mon].step))H.noises++;
  if(H.p.hidden&&H.p.x===H.x&&H.p.y===H.y&&H.mon!=='crawler')out.push(L('A locker. Behind its door, someone is holding their breath. Say search.','Um armário. Atrás da porta, alguém está prendendo a respiração. Diga procurar.'));
  out.push(openWays());
});}
function turn(by){if(!H||H.over)return;H.f=(H.f+by)%4;const t0=now&&A.ctx?now():0;if(A.ctx){const n=noise(t0,0.2);const g=gainNode(0);envelope(g,t0,0.03,0.2,0.15);n.connect(filt('bandpass',900,0.8)).connect(g).connect(spot(by===1?0.6:by===3?-0.6:0,1));}
  say(openWays()||L('Walls all around.','Paredes por todo lado.'),{log:false});resetIdle();}
function power(){act(out=>{
  if(H.cool>0){out.push(L('{p} is not ready. {n} more turns.','{p} não está pronto. Mais {n} turnos.',{p:pName(H.mon),n:H.cool}));return false;}
  const m=H.mon,p=H.p;
  if(m==='hound'){let n=0;for(let i=0;i<2;i++){if(!canGo(H.x,H.y,H.f))break;H.x+=DIRS[H.f][0];H.y+=DIRS[H.f][1];n++;if(caughtNow())break;}
    if(!n){bumpWall();out.push(L('A wall.','Uma parede.'));return false;}
    play('hound',{vol:0.8});preyHears(H.x,H.y,8);H.noises++;H.cool=MONS[m].cool;out.push(L('You sprint, snarling.','Você dispara, rosnando.')+' '+openWays());return;}
  if(m==='lookalike'){if(H.disguise){out.push(L('You are already disguised. Walk to drop it.','Você já está disfarçado. Ande para sair do disfarce.'));return false;}
    H.disguise=true;chimeWaver();out.push(L('You fold yourself up small, into a bottle of almond water, and wait.','Você se dobra bem pequeno, numa garrafa de água de amêndoa, e espera.'));return;}
  if(m==='crawler'){let x=H.x,y=H.y;for(let i=0;i<2;i++){if(!canGo(x,y,H.f))break;x+=DIRS[H.f][0];y+=DIRS[H.f][1];}
    scratch(rel(x,y).v,1);preyHears(x,y,5);H.cool=MONS[m].cool;out.push(L('You claw at the plaster ahead, loud and long.','Você arranha o gesso à frente, alto e demorado.'));return;}
  if(m==='static'){play('weird',{vol:0.7});const d=pathDist(H.x,H.y,p.x,p.y);H.cool=MONS[m].cool;
    if(d<=4&&!p.hidden){p.frozen=2;p.alert=0;p.run=0;out.push(L('You surge. Somewhere close, someone gasps and goes completely still.','Você explode em estática. Bem perto, alguém prende a respiração e fica completamente parado.'));}
    else out.push(L('You surge, and the static fades into silence. Nobody was close enough.','Você explode em estática, e ela some no silêncio. Ninguém estava perto o bastante.'));return;}
});}
function search(){act(out=>{const p=H.p;
  if(p.hidden&&p.x===H.x&&p.y===H.y&&H.mon!=='crawler'){p.hidden=0;p.moved=false;win(out,true);return false;}
  play('impact',{vol:0.5});preyHears(H.x,H.y,2);out.push(L('You tear the place apart. Nothing.','Você revira tudo. Nada.'));});}
function wait(){act(out=>{out.push(H.disguise?L('You wait, perfectly still.','Você espera, perfeitamente parado.'):L('You wait, and listen.','Você espera, e escuta.'));});}
function listen(){if(!H||H.over)return;const p=H.p,d=pathDist(H.x,H.y,p.x,p.y);const parts=[];
  const range=H.mon==='static'?2:6;
  if(p.hidden)parts.push(d<=1?L('Breathing, held tight, {w}.','Uma respiração presa, {w}.',{w:dirWords(p.x,p.y)}):L('Nothing. They have gone quiet.','Nada. Ficaram em silêncio.'));
  else if(d<=range)parts.push(L('The wanderer: {w}, {d}, about {n} steps.','O andarilho: {w}, {d}, uns {n} passos.',{w:dirWords(p.x,p.y),d:distWords(d),n:d})+(p.run?' '+L('They are running.','Estão correndo.'):p.frozen?' '+L('They are frozen with fear.','Estão congelados de medo.'):''));
  else if(H.mon==='static'&&H.radioAt)parts.push(L('Too far to hear. Their last radio call was {w}, {n} turns ago.','Longe demais para ouvir. O último chamado no rádio foi {w}, há {n} turnos.',{w:dirWords(H.radioAt.x,H.radioAt.y),n:H.turn-H.radioAt.turn}));
  else parts.push(L('Too far to hear clearly. Somewhere {w}, far away.','Longe demais para ouvir direito. Em algum lugar {w}, longe.',{w:dirWords(p.x,p.y)}));
  if(!p.hidden&&d<=range){const r=rel(p.x,p.y);steps(r.v,Math.max(0.2,1-d/7),Math.min(0.8,d*0.1),false);}
  const de=pathDist(H.x,H.y,H.exit[0],H.exit[1]);
  parts.push(L('You can smell the way out: {w}, {d}.','Você sente o cheiro da saída: {w}, {d}.',{w:dirWords(H.exit[0],H.exit[1]),d:distWords(de)}));
  parts.push(openWays());
  say(parts.join(' '),{log:false});}
function status(){if(!H)return;say(L('Hunting as {m}. Turn {t}. {p}: {r}.','Caçando como {m}. Turno {t}. {p}: {r}.',{m:mName(H.mon),t:H.turn,p:pName(H.mon),r:H.cool?L('ready in {n} turns','pronto em {n} turnos',{n:H.cool}):H.disguise?L('disguised','disfarçado'):L('ready','pronto')})+' '+openWays(),{log:false});}
function help(){say(L('Commands: forward, left, right, back to walk. Turn left, turn right, turn around. Listen to find the wanderer and the exit, it is free. {p}, your power. Search, to rip open a locker you are standing at. Wait. Status. Quit. Keys: arrows walk, shift and arrows turn, L listen, E power, F search, P wait, S status.','Comandos: frente, esquerda, direita, voltar para andar. Virar à esquerda, virar à direita, dar meia-volta. Escutar para achar o andarilho e a saída, é grátis. {p}, seu poder. Procurar, para abrir um armário onde você está. Esperar. Status. Sair. Teclas: setas andam, shift e setas viram, L escuta, E poder, F procura, P espera, S status.',{p:pName(H?H.mon:'hound')}),{log:false});}

/* ---------- endings ---------- */
const REC=()=>lsGet('br_hunt',{});
function win(out,searched){H.over=true;stopIdle();clearAmb();play('attack',{vol:0.9});play('scream',{vol:0.7,delay:0.3});
  const rec=REC();rec[H.mon]=(rec[H.mon]||0)+1;rec.total=(rec.total||0)+1;lsSet('br_hunt',rec);
  const msg=(out.length?out.join(' ')+' ':'')+(searched?L('You rip the locker door open. They scream. You have them.','Você arranca a porta do armário. A pessoa grita. Você pegou.'):H.mon==='crawler'?L('Your hand comes through the wall and takes hold. You have them.','Sua mão atravessa a parede e agarra. Você pegou.'):H.mon==='lookalike'&&H.disguise?L('They reach for the bottle, and the bottle reaches back. You have them.','A pessoa pega a garrafa, e a garrafa pega de volta. Você pegou.'):L('You catch the wanderer. You have them.','Você pega o andarilho. Você pegou.'))
    +' '+L('Caught in {t} turns.','Pego em {t} turnos.',{t:H.turn});
  const got=[];
  const tryUnlock=id=>{if(!ACHV[id]){unlock(id);const a=ACH.find(a=>a.id===id);if(a)got.push(L('Achievement unlocked: {name}.','Conquista desbloqueada: {name}.',{name:a[LANG][0]}));}};
  tryUnlock('hunt1');if(rec.total>=10)tryUnlock('hunt10');if(ORDER.every(k=>rec[k]))tryUnlock('huntall');if(!H.noises&&MONS[H.mon].step)tryUnlock('huntquiet');
  if(window.GC)GC.score('hunts',rec.total);
  onlyMusic({[MUSIC.won]:0.5},2);renderEnd(true,msg+(got.length?' '+got.join(' '):''));}
function lose(out){H.over=true;stopIdle();clearAmb();
  if(A.ctx){const t0=now();const n=noise(t0,0.6);const g=gainNode(0);envelope(g,t0,0.01,0.6,0.5);n.connect(filt('lowpass',400)).connect(g).connect(spot(rel(H.exit[0],H.exit[1]).v,1));}
  onlyMusic({[MUSIC.lost]:0.4},2);
  renderEnd(false,(out.length?out.join(' ')+' ':'')+L('A door slams far away, and the footsteps are gone. The wanderer escaped.','Uma porta bate longe, e os passos somem. O andarilho escapou.'));}

/* ---------- idle: the wanderer does not wait for you ---------- */
function stopIdle(){clearTimeout(idleTimer);idleTimer=null;}
function resetIdle(){stopIdle();if(!H||H.over||screen!=='hunt')return;
  idleTimer=setTimeout(()=>{if(!H||H.over||screen!=='hunt')return;if((G.quietUntil||0)>performance.now())return resetIdle();H.walked=false;endTurn([]);},Math.round(DF().idle*1.5));}

/* ---------- screens ---------- */
function lobby(prefix){
  stopIdle();H=null;clearAmb();onlyMusic({[MUSIC.lobby]:0.7},2);
  $('#huLobby').hidden=false;$('#huPlay').hidden=true;$('#huEnd').hidden=true;
  $('#huTitle').textContent=L('Hunter Mode','Modo Caçador');
  const rec=REC();
  $('#huIntro').textContent=L('This time, you are the monster. Somewhere in these halls a wanderer is trying to reach the exit. Find them by sound, and catch them before they get out. Choose your monster. Difficulty: {d}. Wins so far: {n}.','Desta vez, você é o monstro. Em algum lugar destes corredores, um andarilho tenta chegar na saída. Ache a pessoa pelo som, e pegue antes que ela escape. Escolha seu monstro. Dificuldade: {d}. Vitórias até agora: {n}.',{d:t(DF().label),n:rec.total||0});
  $$('#huMons button').forEach(b=>{const k=b.dataset.m;b.textContent=cap(mName(k))+(rec[k]?' · '+L('{n} caught','{n} pegos',{n:rec[k]}):'');});
  $('#huHowBtn').textContent=L('How it works','Como funciona');$('#huBack').textContent=L('Back to the main menu','Voltar ao menu principal');
  $('#huMonsH').textContent=L('Choose your monster','Escolha seu monstro');
  $('#huArt').alt=L('A dark hallway with peeling yellow wallpaper. At the far end stands a black shadow of a man with two small glowing white eyes, staring at you.','Um corredor escuro com papel de parede amarelo descascando. No fim, uma sombra negra de um homem com dois pequenos olhos brancos brilhando, encarando você.');
  show('hunt',(prefix||'')+$('#huIntro').textContent+' '+L('Say hound, lookalike, wall crawler or static, how it works, or back.','Diga cão, sósia, rastejador ou estática, como funciona, ou voltar.'));
}
function how(){say(L('Each thing you do takes a turn, and after each turn the wanderer moves. If you wait too long, they move anyway. The wanderer walks toward the exit, and stops now and then to listen. If they hear you, they run, two steps at a time, away from you, or hide in a locker. Listen is free: it tells you where the wanderer is, and where the exit is, so you can get there first. Catch them by walking into them. Each monster plays differently.','Cada coisa que você faz leva um turno, e depois de cada turno o andarilho se mexe. Se você demorar, ele se mexe mesmo assim. O andarilho anda até a saída, e às vezes para para escutar. Se ouvir você, ele corre, dois passos de cada vez, para longe, ou se esconde num armário. Escutar é grátis: diz onde o andarilho está e onde fica a saída, para você chegar lá primeiro. Pegue a pessoa andando até ela. Cada monstro joga de um jeito.')+' '+ORDER.map(k=>cap(mName(k))+'. '+MONS[k].about[LANG==='pt'?1:0]).join(' '));}
function start(mon){
  initAudio();stopIdle();clearAmb();newHunt(mon);H.last=mon;
  onlyMusic({[MUSIC.hunt]:0.25},2);
  $('#huLobby').hidden=true;$('#huPlay').hidden=false;$('#huEnd').hidden=true;
  render();show('hunt');setTimeout(()=>$('#huFwd').focus(),60);
  say(L('You are {m}. {a} Somewhere, a wanderer is moving toward the exit. Say listen to find them, or help for the commands.','Você é {m}. {a} Em algum lugar, um andarilho está indo para a saída. Diga escutar para achar a pessoa, ou ajuda para ouvir os comandos.',{m:mName(mon),a:MONS[mon].about[LANG==='pt'?1:0]})+' '+openWays());
  resetIdle();
}
function render(){if(!H)return;
  $('#huStat').textContent=L('{m} · Turn {t}','{m} · Turno {t}',{m:cap(mName(H.mon)),t:H.turn});
  $('#huFwd').textContent=L('Go forward','Ir para frente');$('#huLeft').textContent=L('Go left','Ir para a esquerda');$('#huRight').textContent=L('Go right','Ir para a direita');$('#huBackW').textContent=L('Go back','Voltar');
  $('#huTL').textContent=L('Turn left','Virar à esquerda');$('#huTR').textContent=L('Turn right','Virar à direita');
  $('#huListen').textContent=L('Listen (free)','Escutar (grátis)');
  $('#huPower').textContent=pName(H.mon)+(H.cool?' '+L('(ready in {n})','(pronto em {n})',{n:H.cool}):'');
  $('#huSearch').textContent=L('Search a locker','Procurar num armário');$('#huWait').textContent=L('Wait','Esperar');
  $('#huStatus').textContent=L('Status (free)','Status (grátis)');$('#huHelp').textContent=L('Help (free)','Ajuda (grátis)');$('#huQuit').textContent=L('Quit the hunt','Sair da caçada');
  $('#huSearch').hidden=H.mon==='crawler';}
function renderEnd(won,msg){
  $('#huPlay').hidden=true;$('#huEnd').hidden=false;$('#huEndMsg').textContent=msg;
  $('#huAgain').textContent=L('Hunt again as {m}','Caçar de novo como {m}',{m:mName(H.mon)});$('#huAgain').dataset.m=H.mon;
  $('#huEndMenu').textContent=L('Choose another monster','Escolher outro monstro');
  setTimeout(()=>$('#huEndMsg').focus(),40);say(msg);}
function quit(){stopIdle();if(H)H.over=true;clearAmb();lobby(L('You give up the hunt. ','Você desiste da caçada. '));}
function leave(){stopIdle();H=null;clearAmb();}

/* ---------- achievements ---------- */
ACH.push(
 {id:'hunt1',en:['Turnabout','Catch the wanderer in Hunter mode.'],pt:['Virada de Jogo','Pegue o andarilho no modo Caçador.']},
 {id:'huntall',en:['Apex','Win a hunt as every monster.'],pt:['Predador Supremo','Vença uma caçada com cada monstro.']},
 {id:'hunt10',en:['Predator','Win 10 hunts.'],pt:['Predador','Vença 10 caçadas.']},
 {id:'huntquiet',en:['Not a Sound','Win a hunt as the Hound or the Lookalike without the wanderer ever hearing you.'],pt:['Nem um Pio','Vença uma caçada como o Cão ou o Sósia sem o andarilho ouvir você.']});

/* ---------- hooking into the game ---------- */
SCREENS.push('hunt');
const host=document.createElement('section');host.id='hunt';host.className='screen';host.hidden=true;host.setAttribute('aria-labelledby','huTitle');
host.innerHTML=`<div class="menuBg"><h1 id="huTitle" class="title" tabindex="-1">Hunter Mode</h1>
<div id="huLobby"><img id="huArt" src="img/hunter.jpg" alt="" style="width:100%;max-width:520px;border-radius:12px;display:block;margin:0 auto 12px"><p id="huIntro"></p><div class="stack">
<h2 id="huMonsH"></h2><div id="huMons" class="stack">${ORDER.map(k=>`<button data-m="${k}" class="primary"></button>`).join('')}</div>
<button id="huHowBtn"></button><button id="huBack"></button></div></div>
<div id="huPlay" hidden><p id="huStat" aria-live="off"></p><div class="stack">
<button id="huFwd" class="primary"></button><button id="huLeft"></button><button id="huRight"></button><button id="huBackW"></button>
<button id="huTL"></button><button id="huTR"></button><button id="huListen" class="primary"></button><button id="huPower" class="primary"></button>
<button id="huSearch"></button><button id="huWait"></button><button id="huStatus"></button><button id="huHelp"></button><button id="huQuit"></button></div></div>
<div id="huEnd" hidden><p id="huEndMsg" tabindex="-1"></p><div class="stack"><button id="huAgain" class="primary"></button><button id="huEndMenu"></button></div></div></div>`;
const gameSec=$('#game');gameSec.parentNode.insertBefore(host,gameSec);
$$('#huMons button').forEach(b=>b.addEventListener('click',()=>start(b.dataset.m)));
$('#huHowBtn').addEventListener('click',how);$('#huBack').addEventListener('click',()=>{leave();showMain();});
$('#huFwd').addEventListener('click',()=>move(0));$('#huRight').addEventListener('click',()=>move(1));$('#huBackW').addEventListener('click',()=>move(2));$('#huLeft').addEventListener('click',()=>move(3));
$('#huTL').addEventListener('click',()=>turn(3));$('#huTR').addEventListener('click',()=>turn(1));
$('#huListen').addEventListener('click',listen);$('#huPower').addEventListener('click',power);$('#huSearch').addEventListener('click',search);$('#huWait').addEventListener('click',wait);
$('#huStatus').addEventListener('click',status);$('#huHelp').addEventListener('click',help);$('#huQuit').addEventListener('click',quit);
$('#huAgain').addEventListener('click',e=>start(e.currentTarget.dataset.m));$('#huEndMenu').addEventListener('click',()=>lobby());

const mb=document.createElement('button');mb.id='mHunt';mb.innerHTML='<span data-l="en">Hunter mode (New)</span><span data-l="pt">Modo Caçador (Novo)</span>';
$('#mEndless').after(mb);mb.addEventListener('click',()=>{initAudio();lobby();});

function huParse(s){
  const tx=norm(s),has=re=>re.test(tx);
  if(screen==='menu'&&has(/ (hunter|hunt|cacador|cacada) /))return{c:'hu_open'};
  if(screen!=='hunt')return null;
  if(!$('#huLobby').hidden){
    if(has(/ (hound|dog|cao) /))return{c:'hu_start',n:'hound'};
    if(has(/ (lookalike|look alike|sosia) /))return{c:'hu_start',n:'lookalike'};
    if(has(/ (crawler|wall|rastejador|parede) /))return{c:'hu_start',n:'crawler'};
    if(has(/ (static|estatica) /))return{c:'hu_start',n:'static'};
  }
  if(!$('#huEnd').hidden&&has(/ (again|retry|de novo|denovo|tentar) /))return{c:'hu_again'};
  if(has(/ (how does it work|how it works|como funciona) /))return{c:'hu_how'};
  if(has(/ (turn around|meia volta) /))return{c:'hu_turn',n:2};
  if(has(/ (turn|virar|vira) /)&&has(/ (left|lift|esquerda) /))return{c:'hu_turn',n:3};
  if(has(/ (turn|virar|vira) /)&&has(/ (right|write|direita) /))return{c:'hu_turn',n:1};
  if(has(/ (forward|ahead|go|walk|frente|andar|anda) /)&&!has(/ (left|right|back|esquerda|direita|voltar) /))return{c:'hu_move',n:0};
  if(has(/ (left|lift|esquerda) /))return{c:'hu_move',n:3};
  if(has(/ (right|write|direita) /))return{c:'hu_move',n:1};
  if(has(/ (back|backward|voltar|volta|tras) /)&&!$('#huPlay').hidden)return{c:'hu_move',n:2};
  if(has(/ (power|sprint|disguise|scratch|surge|poder|disparar|disfarce|arranhar|surto) /))return{c:'hu_power'};
  if(has(/ (search|open|locker|procurar|procura|armario) /))return{c:'hu_search'};
  if(has(/ (listen|escutar|escuta|ouvir) /))return{c:'hu_listen'};
  if(has(/ (wait|esperar|espera) /))return{c:'hu_wait'};
  if(has(/ (help|ajuda|commands|comandos) /))return{c:'hu_help'};
  if(has(/ (status) /))return{c:'hu_status'};
  if(has(/ (quit|leave|menu|exit|sair) /))return{c:'hu_quit'};
  return null;
}
const _parse=parse;parse=function(s){return huParse(s)||_parse(s);};
const _run=run;run=function(c,n,r){
  if(c==='hu_open'){initAudio();return lobby();}
  if(screen==='hunt'){
    const on=H&&!H.over;
    if(c==='hu_start')return start(n);
    if(c==='hu_again')return $('#huAgain').click();
    if(c==='hu_how')return how();
    if(c==='hu_help'||c==='help')return on?help():how();
    if(!on&&(c==='hu_quit'||c==='menu'||c==='quit'||c==='back'))return !$('#huEnd').hidden?lobby():(leave(),showMain());
    if(on){
      if(c==='hu_move'||c==='forward')return move(c==='forward'?0:n);
      if(c==='left')return move(3);if(c==='right')return move(1);
      if(c==='hu_turn')return turn(n);if(c==='turnleft')return turn(3);if(c==='turnright')return turn(1);if(c==='turnaround')return turn(2);
      if(c==='hu_power'||c==='sprint')return power();
      if(c==='hu_search')return search();
      if(c==='hu_listen'||c==='listen')return listen();
      if(c==='hu_wait')return wait();
      if(c==='hu_status'||c==='status')return status();
      if(c==='hu_quit'||c==='menu'||c==='quit')return quit();
    }
    if(c==='repeat'||c==='history'||c==='faster'||c==='slower'||c==='musicoff'||c==='musicon'||c==='micoff'||c==='voiceon')return _run(c,n,r);
    return say(L('Hunter command not understood. Say help for the commands.','Comando do Caçador não entendido. Diga ajuda para ouvir os comandos.'),{log:false});
  }
  return _run(c,n,r);
};
const _heard=heardSpeech;heardSpeech=function(alts){
  if(screen==='hunt'){for(const s of alts){const cmd=huParse(s);if(cmd){$('#heard').textContent=t('Heard: “{t}”',{t:s});return run(cmd.c,cmd.n);}}}
  return _heard(alts);
};
document.addEventListener('keydown',e=>{
  if(screen!=='hunt'||!H||H.over||e.ctrlKey||e.metaKey||e.altKey)return;
  if(e.target.tagName==='BUTTON'&&(e.key==='Enter'||e.key===' '))return;
  const k=e.key;let f=null;
  if(k==='ArrowUp')f=()=>move(0);else if(k==='ArrowDown')f=e.shiftKey?()=>turn(2):()=>move(2);
  else if(k==='ArrowLeft')f=e.shiftKey?()=>turn(3):()=>move(3);else if(k==='ArrowRight')f=e.shiftKey?()=>turn(1):()=>move(1);
  else f={l:listen,e:power,f:search,p:wait,s:status,h:help,r:()=>_run('repeat')}[k.toLowerCase()];
  if(f){e.preventDefault();f();}
});
setInterval(()=>{if(H&&!H.over&&screen!=='hunt'){stopIdle();H.over=true;clearAmb();}},500);
window.Hunter={lobby,start,state:()=>H,turn:()=>{H.walked=false;endTurn([]);},move,turn,power,search,listen,wait};
})();
