"use strict";
/* ============================== Visual mode ==============================
   For players who look at the screen instead of listening to a narrator.
   Chosen on the first screen ("I want to see the game") or in Settings.
   The narrator is silent and its text shows under the picture, Listen is
   hidden (the gold path and map already show the way), swipes on the
   picture turn and walk, and the sound puzzles become visual ones:
   numbers scrawled on walls, scratch marks on switches, colored lights on
   the valve and a keypad on the door. All of it is hidden from screen
   readers, which never use this mode.
   The scare effects (red edges when something is close, lights that
   flicker, figures glimpsed at the end of a hallway) are seen by every
   sighted player, whatever the mode. */
(function(){
// Registers a Portuguese translation next to its English text.
const tl=(en,pt,v)=>{if(pt)PT[en]=pt;return t(en,v);};
const on=()=>!!S.vis;
const playing=()=>screen==='game'&&G.maze&&G.state==='play';
const rnd=(a,b)=>a+Math.random()*(b-a);

/* ---------- the story under the picture ---------- */
const capEl=$('#caption');
function showCaption(){if(!capEl)return;if(!on()||!G.lastText){capEl.hidden=true;return;}capEl.textContent=G.lastText;capEl.hidden=false;capEl.scrollTop=0;}
const _say=say;
say=function(text,o){const r=_say(text,o);showCaption();return r;};

/* ---------- swipe on the picture to turn and walk ---------- */
const vw=$('#viewWrap'); let p0=null;
vw.querySelectorAll('img,canvas').forEach(el=>{el.draggable=false;});
vw.addEventListener('pointerdown',e=>{if(on()&&playing())p0={x:e.clientX,y:e.clientY,id:e.pointerId};});
vw.addEventListener('pointerup',e=>{if(!p0||e.pointerId!==p0.id)return;const dx=e.clientX-p0.x,dy=e.clientY-p0.y;p0=null;
  if(Math.max(Math.abs(dx),Math.abs(dy))<35||!playing())return;
  run(Math.abs(dx)>Math.abs(dy)?(dx<0?'turnleft':'turnright'):(dy<0?'forward':'turnaround'),1,0);});
vw.addEventListener('pointercancel',()=>{p0=null;});

/* ---------- no tutorial: it teaches listening ---------- */
const _newGame=newGame;
newGame=function(skip){return _newGame(skip||on());};

/* ---------- door keypad ---------- */
const kp=$('#keypad'),kpS=$('#kpScreen'); let kpD='';
const kpShow=()=>{kpS.textContent=(kpD+'___').slice(0,3).split('').join(' ');};
function openKeypad(){kpD='';kpShow();kp.hidden=false;kp.scrollIntoView({block:'nearest'});}
const closeKeypad=()=>{kp.hidden=true;};
$$('[data-kp]').forEach(b=>b.addEventListener('click',()=>{const k=b.dataset.kp;
  if(k==='close')return closeKeypad(); if(k==='clear'){kpD='';return kpShow();}
  if(kpD.length>=3)return; kpD+=k; sfx(clickSound,true); kpShow();
  if(kpD.length===3){const d=kpD;setTimeout(()=>{closeKeypad();_enterCode(d);},400);}}));
const atExit=()=>G.exit&&G.x===G.exit[0]&&G.y===G.exit[1];
const _enterCode=enterCode;
enterCode=function(v){if(on()&&v===undefined&&G.state==='play'&&G.code&&!G.code.done&&atExit())return openKeypad();return _enterCode(v);};

/* ---------- the valve: colored lights instead of a tune ---------- */
const MEMC=['#ff2b2b','#25ff5c','#2f86ff']; const SLOT=850; let lights=null;
function showLights(){if(!G.mem)return;const art=$('#artCard');if(art)art.classList.remove('on');G.mem.pos=0;const at=performance.now()+900;lights={tune:G.mem.tune.slice(),at};
  G.mem.tune.forEach((n,i)=>setTimeout(()=>{if(lights&&lights.at===at)sfx(clickSound,true);},900+i*SLOT));}
const _memIntro=memIntro;
memIntro=function(){if(!on())return _memIntro();if(!G.mem)return '';showLights();
  return tl('The drain is shut by a valve with three colored lights. Watch them flash, then tap the colors in the same order. There are {n} flashes.','A saída do ralo está fechada por uma válvula com três luzes coloridas. Veja as luzes piscarem e depois toque nas cores na mesma ordem. São {n} piscadas.',{n:G.mem.tune.length});};
$('#memShow').addEventListener('click',()=>{if(G.mem&&!G.mem.done&&atExit())showLights();});

/* ---------- each new level ---------- */
let nextGlimpse=0, tipUntil=0;
const _newLevel=newLevel;
newLevel=function(){const r=_newLevel.apply(this,arguments);lights=null;closeKeypad();nextGlimpse=performance.now()+rnd(25000,50000);
  if(on()){const n=lsGet('br_vistip',0);if(n<3){lsSet('br_vistip',n+1);tipUntil=performance.now()+9000;}}
  return r;};

/* ---------- drawn over the picture ---------- */
const POS=[['7','_','_'],['_','7','_'],['_','_','7']];
function canSee(){return !isDark(G.x,G.y)||G.inv.light;}
function scrawl(cx,W,H,i,digit,tm){
  cx.save();cx.fillStyle='rgba(0,0,0,0.55)';cx.fillRect(0,H*0.18,W,H*0.5);
  const parts=POS[i].map(c=>c==='7'?String(digit):'_');cx.font='bold 150px Georgia,serif';cx.textAlign='center';cx.textBaseline='middle';
  parts.forEach((c,k)=>{const x=W/2+(k-1)*190,y=H*0.42+(k===1?-6:8);cx.fillStyle='#b00d0d';cx.shadowColor='#ff2a14';cx.shadowBlur=c==='_'?0:16;
    cx.save();cx.translate(x,y);cx.rotate((k-1)*0.06+Math.sin(tm/900+k)*0.01);cx.fillText(c,0,0);cx.restore();
    if(c!=='_'){cx.shadowBlur=0;cx.fillStyle='rgba(140,8,8,0.9)';for(let d=0;d<3;d++){const dx=x-30+d*28,len=30+((digit*7+d*13)%40);cx.fillRect(dx,y+50,5,len);}}});
  cx.restore();}
function marks(cx,W,H,n){
  cx.save();const w=260,h=200,x=W-w-24,y=H-h-24;cx.fillStyle='rgba(70,72,78,0.92)';cx.fillRect(x,y,w,h);cx.strokeStyle='#22252a';cx.lineWidth=6;cx.strokeRect(x,y,w,h);
  cx.strokeStyle='#e8e2d0';cx.lineWidth=9;cx.lineCap='round';
  for(let k=0;k<n;k++){const mx=x+w/2+(k-(n-1)/2)*44;cx.beginPath();cx.moveTo(mx-6,y+40);cx.lineTo(mx+6,y+h-40);cx.stroke();}
  cx.restore();}
function caption(cx,W,H,text,y){cx.save();cx.font='bold 30px system-ui';cx.textAlign='center';
  const lines=[];let cur='';text.split(' ').forEach(w=>{const tr=cur?cur+' '+w:w;if(cx.measureText(tr).width>W-80&&cur){lines.push(cur);cur=w;}else cur=tr;});lines.push(cur);
  const w=Math.min(W-40,Math.max(...lines.map(l=>cx.measureText(l).width))+40),h=lines.length*38+14;
  cx.fillStyle='rgba(0,0,0,0.78)';cx.fillRect((W-w)/2,y-34,w,h);cx.fillStyle='#ffe08a';lines.forEach((l,i)=>cx.fillText(l,W/2,y+i*38));cx.restore();}
function draw(cx,W,H,tm){
  if(!G.maze||G.state!=='play')return;
  if(on()&&lights){const e=tm-lights.at,i=Math.floor(e/SLOT);
    if(i>=lights.tune.length)lights=null;
    else if(e>=0&&e%SLOT<SLOT*0.65){const c=MEMC[lights.tune[i]];cx.save();cx.fillStyle='rgba(0,0,0,0.6)';cx.fillRect(0,0,W,H);
      const g=cx.createRadialGradient(W/2,H/2,10,W/2,H/2,H*0.42);g.addColorStop(0,'#fff');g.addColorStop(0.25,c);g.addColorStop(1,'rgba(0,0,0,0)');cx.fillStyle=g;cx.beginPath();cx.arc(W/2,H/2,H*0.42,0,7);cx.fill();cx.restore();}}
  if(on()&&G.code&&G.wallWriting){const i=G.wallWriting.get(key(G.x,G.y));if(i!==undefined&&canSee())scrawl(cx,W,H,i,G.code.digits[i],tm);}
  if(on()&&G.puz&&!G.puz.done){const c=puzAt(G.x,G.y);if(c&&!c.on){if(canSee())marks(cx,W,H,c.tone+1);else caption(cx,W,H,tl('Too dark to see the marks. Turn on your flashlight.','Escuro demais para ver as marcas. Ligue a lanterna.'),H-80);}}
  if(on()&&tm<tipUntil)caption(cx,W,H,tl('Swipe the picture: left or right to turn, up to walk, down to turn around.','Deslize na imagem: esquerda ou direita para virar, para cima para andar, para baixo para dar meia-volta.'),100);
}

/* ---------- dread: red edges, flickering lights, glimpses ---------- */
const dread=$('#dread');
setInterval(()=>{
  if(!playing()||G.inHide){dread.style.opacity=0;return;}
  const near=nearestHostile(bfs(G.x,G.y)),d=near?near.d:99,now=performance.now();
  let o=d<=1?0.85:d<=2?0.6:d<=3?0.35:d<=4?0.15:0;
  if(o&&!reduceMotion)o*=0.7+0.3*Math.abs(Math.sin(now/(d<=2?160:300)));
  dread.style.opacity=o.toFixed(2);
  if(d<=3&&Math.random()<0.18)G.flash=now;
  if(window.R3&&R3.on()&&R3.glimpse&&!L().calm&&G.mode!=='tutorial'&&now>nextGlimpse){nextGlimpse=now+rnd(40000,90000);R3.glimpse();}
},250);

window.VIS={draw,showCaption,openKeypad};
})();
