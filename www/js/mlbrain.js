"use strict";
/* Machine-learning monster brain (1.6 experiment B).
   A tiny neural network scores every move a monster can make (stay, or step
   through an open doorway). It only sees what the monster could know: where
   it last heard you and how long ago, whether it heard you this turn, where
   it has already been, how open the room is, and how far the hiding spots
   are. It never sees where you are. The weights (ML_WEIGHTS) were learned by
   tools/ml-monsters/train.js, which made monsters play thousands of rounds
   in a practice maze. Shared by the game and the trainer, so both behave
   the same. */
(function(root){
const NF=11, NH=12, NW=NH*NF+NH+NH+1+NF;
// what the monster "knows" about one possible move (to cell nx,ny)
function feats(o,nx,ny,stay){
  const has=o.mem?1:0;
  const dmC=has?Math.min(o.dMem[o.cy][o.cx],20):0, dmN=has?Math.min(o.dMem[ny][nx],20):0;
  const dsC=o.dSpot?Math.min(o.dSpot[o.cy][o.cx],20):20, dsN=o.dSpot?Math.min(o.dSpot[ny][nx],20):20;
  const lv=o.lastVisit[ny*o.w+nx]; const rec=(lv===undefined||lv<0)?0:Math.max(0,1-(o.t-lv)/10);
  return [o.heard?1:0, has, has?Math.min(o.mem.age/20,1):0, has?(dmN-dmC):0, dmN/10, rec, o.deg(nx,ny)/4, dsN-dsC, dsN/10, stay?1:0, 1];
}
function score(W,f){
  let out=W[NH*NF+NH+NH];
  for(let i=0;i<NF;i++)out+=W[NH*NF+NH+NH+1+i]*f[i];
  for(let j=0;j<NH;j++){let s=W[NH*NF+j];for(let i=0;i<NF;i++)s+=W[j*NF+i]*f[i];out+=W[NH*NF+NH+j]*Math.tanh(s);}
  return out;
}
// options: [{nx,ny,d,stay}] ; returns the chosen option (softmax with a little randomness)
function choose(W,o,options,rnd){
  const sc=options.map(op=>score(W,feats(o,op.nx,op.ny,op.stay)));
  const mx=Math.max(...sc); const ex=sc.map(s=>Math.exp((s-mx)/0.25)); const tot=ex.reduce((a,b)=>a+b,0);
  let r=rnd()*tot; for(let i=0;i<options.length;i++){r-=ex[i];if(r<=0)return options[i];} return options[options.length-1];
}
root.MLB={NF,NH,NW,feats,score,choose};
})(typeof window!=='undefined'?window:module.exports);
