/* Accessible Backrooms: 3D view (three.js). The game never depends on it: sound and speech carry everything. */
(function(){
'use strict';
const T=window.THREE;
const hasGL=(()=>{try{const c=document.createElement('canvas');return !!(T&&(c.getContext('webgl')||c.getContext('experimental-webgl')));}catch(e){return false;}})();
const CS=4, WH=3.2, EYE=1.6;
let ren=null, scene, cam, built=null, lastCell='', lastT=0;
let amb, glow, flash, fill=[], monMeshes=new Map(), exitSign=null, water=null, sparks=null, curYaw=0, monTex={};
const cv3=document.getElementById('view3d');

const col=(c,k=1)=>`hsl(${Math.round(c[0])},${Math.round(c[1])}%,${Math.round(Math.max(0,Math.min(100,c[2]*k)))}%)`;
const rnd=(a,b)=>a+Math.random()*(b-a);
function canvasTex(size,paint,rx=1,ry=1){
  const c=document.createElement('canvas');c.width=c.height=size;const g=c.getContext('2d');paint(g,size);
  const tx=new T.CanvasTexture(c);tx.wrapS=tx.wrapT=T.RepeatWrapping;tx.repeat.set(rx,ry);
  if(ren)tx.anisotropy=Math.min(4,ren.capabilities.getMaxAnisotropy());return tx;}
function speckle(g,s,n,alpha){for(let i=0;i<n;i++){g.fillStyle=`rgba(${Math.random()<0.5?0:255},${Math.random()<0.5?0:255},0,${Math.random()*alpha})`;g.fillRect(Math.random()*s,Math.random()*s,1+Math.random()*2,1+Math.random()*2);}}
function grime(g,s,n){for(let i=0;i<n;i++){const x=Math.random()*s,y=Math.random()*s,r=rnd(8,40);const gr=g.createRadialGradient(x,y,0,x,y,r);gr.addColorStop(0,'rgba(40,25,0,0.18)');gr.addColorStop(1,'rgba(40,25,0,0)');g.fillStyle=gr;g.fillRect(x-r,y-r,r*2,r*2);}}

function wallTex(lv){const a=lv.amb,base=lv.wall;
  return canvasTex(256,(g,s)=>{g.fillStyle=col(base);g.fillRect(0,0,s,s);
    if(a==='hum'||a==='office'||a==='home'||a==='last'){for(let x=0;x<s;x+=32){g.fillStyle=col(base,0.9);g.fillRect(x,0,14,s);}
      for(let y=16;y<s;y+=32)for(let x=8;x<s;x+=32){g.fillStyle=col(base,a==='home'?0.75:0.85);g.beginPath();g.arc(x+(y%64?16:0),y,3,0,7);g.fill();}
      g.fillStyle=col(base,0.55);g.fillRect(0,s-14,s,14);grime(g,s,10);}
    else if(a==='pool'){g.strokeStyle='rgba(120,140,150,0.6)';g.lineWidth=2;for(let i=0;i<=s;i+=32){g.beginPath();g.moveTo(i,0);g.lineTo(i,s);g.moveTo(0,i);g.lineTo(s,i);g.stroke();}}
    else if(a==='party'){for(let i=0;i<70;i++){g.fillStyle=['#e64b5d','#4bb3e6','#e6d34b','#7ad35b'][i%4];g.globalAlpha=0.55;g.fillRect(Math.random()*s,Math.random()*s,6,3);}g.globalAlpha=1;g.fillStyle=col(base,0.7);g.fillRect(0,s-14,s,14);}
    else if(a==='library'){g.fillStyle='#2a170c';g.fillRect(0,0,s,s);for(let r=0;r<4;r++){const y0=r*64;g.fillStyle='#4a2c16';g.fillRect(0,y0+56,s,8);let x=4;while(x<s-4){const w=rnd(6,14),h=rnd(36,52);g.fillStyle=`hsl(${rnd(0,360)},${rnd(25,55)}%,${rnd(18,38)}%)`;g.fillRect(x,y0+56-h,w,h);g.fillStyle='rgba(255,230,160,0.25)';g.fillRect(x+1,y0+56-h+6,w-2,2);x+=w+1;}}}
    else if(a==='city'){g.fillStyle=col(base,0.9);g.fillRect(0,0,s,s);for(let y=12;y<s;y+=40)for(let x=12;x<s;x+=36){const lit=Math.random()<0.08;g.fillStyle=lit?'rgba(255,214,120,0.9)':'rgba(8,10,16,0.95)';g.fillRect(x,y,22,26);}}
    else if(a==='carnival'){for(let x=0;x<s;x+=32){g.fillStyle=(x/32)%2?'#e9e2d2':col(base,1.3);g.fillRect(x,0,32,s);}grime(g,s,25);g.fillStyle='rgba(0,0,0,0.25)';g.fillRect(0,0,s,s);}
    else if(a==='suburbs'){for(let y=0;y<s;y+=16){g.fillStyle=col(base,y%32?1.1:0.9);g.fillRect(0,y,s,16);g.fillStyle='rgba(0,0,0,0.25)';g.fillRect(0,y+14,s,2);}g.fillStyle='rgba(10,10,14,0.95)';g.fillRect(90,60,76,90);g.strokeStyle='#ccc';g.lineWidth=4;g.strokeRect(90,60,76,90);}
    else{ // concrete, metal, pipes, electrical, ocean, void, alarm
      for(let y=0;y<s;y+=32){g.fillStyle='rgba(0,0,0,0.22)';g.fillRect(0,y,s,2);for(let x=(y/32)%2?0:32;x<s;x+=64)g.fillRect(x,y,2,32);}
      if(a==='pipes'){[60,170].forEach(y=>{g.fillStyle='#5a3c22';g.fillRect(0,y,s,22);g.fillStyle='rgba(255,200,140,0.35)';g.fillRect(0,y+4,s,4);});}
      if(a==='electric'){g.fillStyle='rgba(30,30,30,0.6)';g.fillRect(40,40,90,120);for(let x=40;x<130;x+=18){g.fillStyle=x%36?'#d8b400':'#111';g.fillRect(x,40,18,10);}}
      grime(g,s,30);}
    speckle(g,s,1500,0.12);
  },1,1);}
function floorTex(lv){const st=lv.step,a=lv.amb,base=lv.floor;
  return canvasTex(256,(g,s)=>{g.fillStyle=col(base);g.fillRect(0,0,s,s);
    if(st==='tile'){g.strokeStyle='rgba(90,120,130,0.55)';g.lineWidth=2;for(let i=0;i<=s;i+=32){g.beginPath();g.moveTo(i,0);g.lineTo(i,s);g.moveTo(0,i);g.lineTo(s,i);g.stroke();}}
    else if(st==='grass'){for(let i=0;i<2500;i++){g.strokeStyle=`hsl(${rnd(85,120)},${rnd(25,45)}%,${rnd(8,20)}%)`;const x=Math.random()*s,y=Math.random()*s;g.beginPath();g.moveTo(x,y);g.lineTo(x+rnd(-2,2),y-rnd(3,8));g.stroke();}}
    else if(st==='metal'){g.strokeStyle='rgba(0,0,0,0.45)';g.lineWidth=3;for(let i=0;i<s;i+=16){g.beginPath();g.moveTo(i,0);g.lineTo(i,s);g.stroke();}}
    else if(st==='carpet'){for(let i=0;i<9000;i++){g.fillStyle=`rgba(${Math.random()<0.5?0:255},${Math.random()<0.5?0:200},0,${Math.random()*0.08})`;g.fillRect(Math.random()*s,Math.random()*s,1,2);}grime(g,s,a==='hum'?18:6);}
    else{speckle(g,s,4000,0.18);g.strokeStyle='rgba(0,0,0,0.35)';for(let i=0;i<5;i++){let x=Math.random()*s,y=Math.random()*s;g.beginPath();g.moveTo(x,y);for(let k=0;k<6;k++){x+=rnd(-20,20);y+=rnd(-20,20);g.lineTo(x,y);}g.stroke();}grime(g,s,14);}
  },1,1);}
function ceilTex(lv){const base=lv.ceil;
  return canvasTex(256,(g,s)=>{g.fillStyle=col(base);g.fillRect(0,0,s,s);speckle(g,s,2500,0.1);
    g.strokeStyle='rgba(0,0,0,0.3)';g.lineWidth=3;for(let i=0;i<=s;i+=64){g.beginPath();g.moveTo(i,0);g.lineTo(i,s);g.moveTo(0,i);g.lineTo(s,i);g.stroke();}grime(g,s,6);},1,1);}
const OUTDOOR={city:1,carnival:1,suburbs:1,ocean:1};

function paintMon(type){
  if(monTex[type])return monTex[type];
  const c=document.createElement('canvas');c.width=128;c.height=192;const g=c.getContext('2d');const W=128,H=192;
  // a tall, thin figure: head, narrow shoulders, arms that hang too low
  const body=(fillStyle,wk=0.42,hk=0.92)=>{g.fillStyle=fillStyle;g.shadowColor=fillStyle;g.shadowBlur=6;const cx=W/2,top=H*(1-hk),sh=W*wk*0.55,hr=W*wk*0.24;
    g.beginPath();g.ellipse(cx,top+hr*1.1,hr*0.85,hr*1.1,0,0,7);g.fill();
    g.beginPath();g.moveTo(cx-hr*0.35,top+hr*2.1);g.lineTo(cx-sh,top+hr*2.7);g.lineTo(cx-sh*0.75,H*0.58);g.lineTo(cx-sh*0.45,H*0.6);g.lineTo(cx-sh*0.5,H);g.lineTo(cx-sh*0.12,H);g.lineTo(cx,H*0.66);
    g.lineTo(cx+sh*0.12,H);g.lineTo(cx+sh*0.5,H);g.lineTo(cx+sh*0.45,H*0.6);g.lineTo(cx+sh*0.75,H*0.58);g.lineTo(cx+sh,top+hr*2.7);g.lineTo(cx+hr*0.35,top+hr*2.1);g.closePath();g.fill();
    g.lineWidth=W*wk*0.09;g.lineCap='round';g.strokeStyle=fillStyle;[-1,1].forEach(k=>{g.beginPath();g.moveTo(cx+k*sh*0.95,top+hr*2.8);g.quadraticCurveTo(cx+k*sh*1.25,H*0.55,cx+k*sh*1.05,H*0.82);g.stroke();});g.shadowBlur=0;};
  const eyes=(c2,y=0.28,r=6,glowc)=>{g.fillStyle=c2;if(glowc){g.shadowColor=glowc;g.shadowBlur=14;}[-1,1].forEach(k=>{g.beginPath();g.arc(W/2+k*r*1.5,H*y,r*0.7,0,7);g.fill();});g.shadowBlur=0;};
  if(type==='moths'){g.fillStyle='#c9c2a0';for(let i=0;i<120;i++){g.fillRect(rnd(10,W-10),rnd(20,H-40),4,2);}}
  else if(type==='clump'){g.fillStyle='rgba(60,35,30,0.97)';g.beginPath();g.ellipse(W/2,H*0.62,W*0.48,H*0.36,0,0,7);g.fill();g.fillStyle='#d9c7b0';for(let i=0;i<14;i++){g.beginPath();g.arc(rnd(20,W-20),rnd(H*0.35,H*0.9),4,0,7);g.fill();}}
  else if(type==='watcher'){g.fillStyle='rgba(235,235,230,0.9)';g.beginPath();g.ellipse(W/2,H*0.3,22,30,0,0,7);g.fill();eyes('#000',0.27,5);}
  else if(type==='face'||type==='marcus'){body(type==='face'?'#ddd6c4':'#8c836f');}
  else if(type==='party'){body('#e8c43a');g.strokeStyle='#000';g.lineWidth=3;[-1,1].forEach(k=>{g.beginPath();g.arc(W/2+k*14,H*0.25,4,0,7);g.stroke();});g.beginPath();g.arc(W/2,H*0.29,20,0.15*Math.PI,0.85*Math.PI);g.stroke();}
  else if(type==='librarian'){body('rgba(40,38,36,0.97)',0.36,0.98);g.fillStyle='#bdb6a8';g.beginPath();g.ellipse(W/2,H*0.12,14,18,0,0,7);g.fill();}
  else if(type==='jester'){body('#6d1a4f');g.fillStyle='#f2efe6';g.beginPath();g.arc(W/2,H*0.22,24,0,7);g.fill();g.strokeStyle='#c4182b';g.lineWidth=4;g.beginPath();g.arc(W/2,H*0.23,14,0.1*Math.PI,0.9*Math.PI);g.stroke();g.fillStyle='#e6c13a';[-1,1].forEach(k=>{g.beginPath();g.arc(W/2+k*30,H*0.06,7,0,7);g.fill();});}
  else if(type==='deep'){g.fillStyle='rgba(5,10,20,0.95)';g.beginPath();g.ellipse(W/2,H*0.8,W*0.5,H*0.3,0,0,7);g.fill();eyes('#9fe',0.72,5,'#9fe');}
  else if(type==='hound'){g.fillStyle='rgba(8,6,6,0.96)';g.shadowColor='#000';g.shadowBlur=6;g.beginPath();g.ellipse(W/2,H*0.68,W*0.4,H*0.12,0,0,7);g.fill();g.beginPath();g.ellipse(W*0.2,H*0.58,W*0.13,H*0.08,0.4,0,7);g.fill();
    g.lineWidth=7;g.strokeStyle='rgba(8,6,6,0.96)';[0.25,0.38,0.62,0.76].forEach(x=>{g.beginPath();g.moveTo(W*x,H*0.72);g.lineTo(W*x+rnd(-4,4),H);g.stroke();});g.shadowBlur=0;
    g.fillStyle='#ff3b2a';g.shadowColor='#ff3b2a';g.shadowBlur=12;[0.15,0.24].forEach(x=>{g.beginPath();g.arc(W*x,H*0.56,3.5,0,7);g.fill();});g.shadowBlur=0;}
  else if(type==='smiler'){g.fillStyle='rgba(0,0,0,0.0)';eyes('#fff',0.45,9,'#fff');g.strokeStyle='#fff';g.shadowColor='#fff';g.shadowBlur=10;g.lineWidth=4;g.beginPath();g.arc(W/2,H*0.5,30,0.12*Math.PI,0.88*Math.PI);g.stroke();
    for(let i=0;i<14;i++){const a=(0.14+i*0.053)*Math.PI;g.beginPath();g.moveTo(W/2+Math.cos(a)*30,H*0.5+Math.sin(a)*30);g.lineTo(W/2+Math.cos(a)*22,H*0.5+Math.sin(a)*22);g.stroke();}g.shadowBlur=0;}
  else{body(type==='wretch'?'rgba(70,64,58,0.96)':'rgba(6,6,6,0.96)',type==='chaser'?0.9:0.42,type==='chaser'?0.99:0.92);
    eyes(MonCopier(type)?'#e9d7c0':type==='wretch'?'#111':'#fff',type==='chaser'?0.1:0.12,type==='chaser'?9:6,type==='howler'||type==='chaser'?'#ff3b2a':null);
    if(type==='howler'){g.fillStyle='#000';g.beginPath();g.ellipse(W/2,H*0.17,7,12,0,0,7);g.fill();}}
  const tx=new T.CanvasTexture(c);monTex[type]=tx;return tx;}
const MonCopier=t=>MT[t]&&MT[t].copier;
const MSIZE={hound:[2.4,1.6],smiler:[1.8,2.4],chaser:[3.6,3.2],clump:[3.4,2.6],moths:[2.6,2.6],watcher:[1.6,2.4],deep:[3.2,2.2],librarian:[1.9,3.1]};

function dispose(o){o.traverse(n=>{if(n.geometry)n.geometry.dispose();if(n.material){(Array.isArray(n.material)?n.material:[n.material]).forEach(m=>{if(m.map&&!Object.values(monTex).includes(m.map))m.map.dispose();m.dispose();});}});}
function init(){
  if(ren!==null)return ren;
  try{ren=new T.WebGLRenderer({canvas:cv3,antialias:true,powerPreference:'low-power'});}catch(e){ren=false;return ren;}
  ren.setPixelRatio(Math.min(1.5,window.devicePixelRatio||1));
  cam=new T.PerspectiveCamera(72,16/9,0.05,80);
  return ren;}
function wallCells(){const list=[];for(let y=0;y<G.h;y++)for(let x=0;x<G.w;x++){const v=G.maze[y][x];
  if(v&1)list.push([x*CS,(y-0.5)*CS,0]); if(v&8)list.push([(x-0.5)*CS,y*CS,1]);
  if(y===G.h-1&&(v&4))list.push([x*CS,(y+0.5)*CS,0]); if(x===G.w-1&&(v&2))list.push([(x+0.5)*CS,y*CS,1]);}return list;}
function build(){
  if(scene)dispose(scene); monMeshes=new Map(); const lv=L(); const out=!!OUTDOOR[lv.amb];
  scene=new T.Scene(); const fogC=new T.Color(lv.run?'#220404':out?col(lv.ceil,0.6):col(lv.ceil,0.25));
  scene.background=fogC; scene.fog=new T.FogExp2(fogC,lv.dark>=1?0.2:out?0.09:0.075);
  // walls
  const walls=wallCells(); const wm=new T.MeshLambertMaterial({map:wallTex(lv)});
  const wi=new T.InstancedMesh(new T.BoxGeometry(CS+0.24,WH,0.24),wm,walls.length); const m4=new T.Matrix4(),q=new T.Quaternion(),e=new T.Euler(),one=new T.Vector3(1,1,1);
  walls.forEach(([x,z,r],i)=>{e.set(0,r?Math.PI/2:0,0);q.setFromEuler(e);m4.compose(new T.Vector3(x,WH/2,z),q,one);wi.setMatrixAt(i,m4);}); scene.add(wi);
  // floor & ceiling
  const fw=G.w*CS,fh=G.h*CS; const ft=floorTex(lv); ft.repeat.set(G.w,G.h);
  const floor=new T.Mesh(new T.PlaneGeometry(fw,fh),new T.MeshLambertMaterial({map:ft}));floor.rotation.x=-Math.PI/2;floor.position.set(fw/2-CS/2,0,fh/2-CS/2);scene.add(floor);
  if(!out){const ct=ceilTex(lv);ct.repeat.set(G.w,G.h);const ceil=new T.Mesh(new T.PlaneGeometry(fw,fh),new T.MeshLambertMaterial({map:ct}));ceil.rotation.x=Math.PI/2;ceil.position.set(fw/2-CS/2,WH,fh/2-CS/2);scene.add(ceil);}
  // light panels on lit cells
  const lit=[];for(let y=0;y<G.h;y++)for(let x=0;x<G.w;x++)if(!isDark(x,y))lit.push([x,y]);
  if(lv.lights&&!out&&lit.length){const pm=new T.MeshBasicMaterial({color:lv.run?0xff3020:0xfff6d8});const pi=new T.InstancedMesh(new T.PlaneGeometry(1.4,0.7),pm,lit.length);
    lit.forEach(([x,y],i)=>{e.set(Math.PI/2,0,0);q.setFromEuler(e);m4.compose(new T.Vector3(x*CS,WH-0.02,y*CS),q,one);pi.setMatrixAt(i,m4);});scene.add(pi);}
  if(lv.lights&&out){const pm=new T.MeshBasicMaterial({color:0xffcf80});lit.filter((c,i)=>i%3===0).forEach(([x,y])=>{const pole=new T.Mesh(new T.CylinderGeometry(0.06,0.06,3.4),new T.MeshLambertMaterial({color:0x222222}));pole.position.set(x*CS+1.6,1.7,y*CS+1.6);scene.add(pole);const bulb=new T.Mesh(new T.SphereGeometry(0.18,8,6),pm);bulb.position.set(x*CS+1.6,3.45,y*CS+1.6);scene.add(bulb);});}
  // lighting
  amb=new T.AmbientLight(0xffffff,lv.lights?0.55:0.3); scene.add(amb);
  const hemi=new T.HemisphereLight(lv.run?0xff5040:0xfff4d0,0x202020,lv.lights?0.35:0.12); scene.add(hemi);
  glow=new T.PointLight(lv.run?0xff4030:0xfff0d0,lv.lights?0.9:0.45,9,2); scene.add(glow);
  fill=[0,1,2].map(()=>{const p=new T.PointLight(lv.run?0xff3020:0xfff2cc,0,14,2);scene.add(p);return p;});
  flash=new T.SpotLight(0xfff0d0,0,22,0.42,0.5,1.5); scene.add(flash); scene.add(flash.target);
  // exit door
  const [ex,ey]=G.exit; const dirs=[0,1,2,3].filter(d=>!isOpen(ex,ey,d)); const dd=dirs.length?dirs[0]:0;
  const door=new T.Group(); const dm=new T.Mesh(new T.BoxGeometry(1.5,2.5,0.12),new T.MeshLambertMaterial({color:lv.locked?0x777777:lv.amb==='home'?0xe8e0cc:0x6b4423}));dm.position.y=1.25;door.add(dm);
  const knob=new T.Mesh(new T.SphereGeometry(0.06,8,6),new T.MeshBasicMaterial({color:0xd8b84a}));knob.position.set(0.55,1.2,0.09);door.add(knob);
  exitSign=new T.Mesh(new T.BoxGeometry(0.9,0.28,0.08),new T.MeshBasicMaterial({color:lv.amb==='home'?0xfff3c0:0xff2a20}));exitSign.position.set(0,2.85,0.05);door.add(exitSign);
  const sl=new T.PointLight(lv.amb==='home'?0xfff3c0:0xff2a20,1.2,7,2);sl.position.set(0,2.7,0.6);door.add(sl);
  const off=dirs.length?CS/2-0.2:0; door.position.set(ex*CS+DX[dd]*off,0,ey*CS+DY[dd]*off); door.rotation.y=[0,-Math.PI/2,Math.PI,Math.PI/2][dd]+(dirs.length?0:0); scene.add(door);
  // hiding spots
  if(G.spots)G.spots.forEach((v,k)=>{const [x,y]=k.split(',').map(Number);const d=[0,1,2,3].find(d=>!isOpen(x,y,d));const b=new T.Mesh(new T.BoxGeometry(1.1,2.1,0.7),new T.MeshLambertMaterial({color:0x4d5560}));
    const o=d===undefined?0:CS/2-0.6;b.position.set(x*CS+(d===undefined?1:DX[d]*o),1.05,y*CS+(d===undefined?1:DY[d]*o));b.rotation.y=d===undefined?0:[0,-Math.PI/2,Math.PI,Math.PI/2][d];scene.add(b);});
  // water
  water=null; if(G.wet&&G.wet.size){const wmat=new T.MeshLambertMaterial({color:0x0b2a44,transparent:true,opacity:0.82,emissive:0x041422});const wi2=new T.InstancedMesh(new T.PlaneGeometry(CS,CS),wmat,G.wet.size);let i=0;
    G.wet.forEach(k=>{const [x,y]=k.split(',').map(Number);e.set(-Math.PI/2,0,0);q.setFromEuler(e);m4.compose(new T.Vector3(x*CS,0.12,y*CS),q,one);wi2.setMatrixAt(i++,m4);});scene.add(wi2);water=wmat;}
  // live-wire sparks
  sparks=null; if(G.haz&&G.haz.size){const pts=[];G.haz.forEach(k=>{const [x,y]=k.split(',').map(Number);for(let i=0;i<14;i++)pts.push(x*CS+rnd(-1.4,1.4),rnd(0.2,2.8),y*CS+rnd(-1.4,1.4));});
    const geo=new T.BufferGeometry();geo.setAttribute('position',new T.Float32BufferAttribute(pts,3));sparks=new T.Points(geo,new T.PointsMaterial({color:0xfff6a0,size:0.09}));scene.add(sparks);}
  built=G.maze; lastCell='';
  cam.position.set(G.x*CS,EYE,G.y*CS); curYaw=-G.f*Math.PI/2; cam.rotation.set(0,curYaw,0);
}
function nearLit(){const lv=L();if(!lv.lights)return [];const d=bfs(G.x,G.y);const c=[];for(let y=0;y<G.h;y++)for(let x=0;x<G.w;x++)if(!isDark(x,y)&&d[y][x]<6)c.push([d[y][x],x,y]);c.sort((a,b)=>a[0]-b[0]);return c.slice(0,3);}
function frame(){
  if(!init())return false;
  if(built!==G.maze)build();
  const now=performance.now(),dt=Math.min(0.1,(now-(lastT||now))/1000);lastT=now; const k=1-Math.exp(-dt*9); const lv=L();
  // size
  const w=cv3.clientWidth|0,h=cv3.clientHeight|0; if(w&&h&&(cv3.width!==Math.round(w*ren.getPixelRatio())||cv3.height!==Math.round(h*ren.getPixelRatio()))){ren.setSize(w,h,false);cam.aspect=w/h;cam.updateProjectionMatrix();}
  // camera
  const tx=G.x*CS,tz=G.y*CS; const moving=Math.hypot(tx-cam.position.x,tz-cam.position.z);
  cam.position.x+=(tx-cam.position.x)*k; cam.position.z+=(tz-cam.position.z)*k;
  let ty=EYE; if(G.inHide)ty=1.0; if(!reduceMotion&&moving>0.05)ty+=Math.sin(now/90)*0.06; cam.position.y+=(ty-cam.position.y)*k;
  const target=-G.f*Math.PI/2; let dy=target-curYaw; dy=Math.atan2(Math.sin(dy),Math.cos(dy)); curYaw+=dy*k;
  let roll=0; if(!reduceMotion&&G.sanity<35)roll=Math.sin(now/900)*0.04*(35-G.sanity)/35; cam.rotation.set(0,curYaw,roll);
  // lighting: darkness, flicker, flashlight
  const cell=G.x+','+G.y; if(cell!==lastCell){lastCell=cell;const nl=nearLit();fill.forEach((p,i)=>{const c=nl[i];if(c){p.position.set(c[1]*CS,WH-0.3,c[2]*CS);p.userData.on=1;}else p.userData.on=0;});}
  let flick=1; if(!reduceMotion&&now-(G.flash||0)<300)flick=0.3+0.5*Math.random(); if(lv.run&&!reduceMotion)flick*=0.6+0.4*Math.abs(Math.sin(now/300));
  const dark=isDark(G.x,G.y); const base=dark?0.03:(lv.lights?0.55:0.3);
  amb.intensity+=((base*flick)-amb.intensity)*k; fill.forEach(p=>{p.intensity=p.userData.on&&!dark?0.9*flick:0;});
  glow.position.copy(cam.position); glow.intensity=dark?0.08:(lv.lights?0.6:0.35)*flick;
  scene.fog.density+=((dark?(G.inv.light?0.12:0.32):OUTDOOR[lv.amb]?0.09:0.075)-scene.fog.density)*k;
  flash.intensity=G.inv.light?3:0; flash.position.copy(cam.position); const fwd=new T.Vector3(-Math.sin(curYaw),-0.08,-Math.cos(curYaw)); flash.target.position.copy(cam.position).add(fwd);
  if(exitSign)exitSign.material.color.setHSL(lv.amb==='home'?0.13:0.0,1,0.4+0.15*Math.sin(now/200));
  if(water)water.opacity=0.75+0.08*Math.sin(now/600);
  if(sparks)sparks.visible=Math.random()<0.55;
  // monsters
  const seen=new Set();
  for(const m of G.mons){seen.add(m);let s=monMeshes.get(m);
    if(!s){s=new T.Sprite(new T.SpriteMaterial({map:paintMon(m.type),transparent:true,fog:true}));const sz=MSIZE[m.type]||[1.7,2.7];s.scale.set(sz[0],sz[1],1);s.position.set(m.x*CS,sz[1]/2,m.y*CS);scene.add(s);monMeshes.set(m,s);}
    const sz=MSIZE[m.type]||[1.7,2.7]; s.position.x+=(m.x*CS-s.position.x)*k*0.8; s.position.z+=(m.y*CS-s.position.z)*k*0.8;
    s.position.y=m.type==='deep'?(isWater(m.x,m.y)?0.4:-2):m.type==='watcher'?2.0:sz[1]/2+(m.type==='moths'?0.3+0.15*Math.sin(now/200):0);
    const near=Math.abs(m.x-G.x)+Math.abs(m.y-G.y); const vis=!isDark(m.x,m.y)||m.type==='face'||m.type==='marcus'||(G.inv.light&&near<=3);
    s.visible=vis&&!(m.type==='deep'&&!isWater(m.x,m.y));}
  monMeshes.forEach((s,m)=>{if(!seen.has(m)){scene.remove(s);s.material.dispose();monMeshes.delete(m);}});
  ren.render(scene,cam); return true;
}
window.R3={available:hasGL, on:()=>hasGL&&S.gfx!=='classic'&&ren!==false, frame:()=>{try{return frame();}catch(e){console.error(e);ren=false;return false;}}, reset:()=>{built=null;}};
})();
