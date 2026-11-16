#!/usr/bin/env node
/* Trains the machine-learning monster brain (www/js/mlbrain.js) with
   evolution strategies: many slightly different brains each play the same
   practice rounds, the ones that catch the player more often pull the brain
   toward them, and that repeats for many generations.

   The practice maze copies the game's rules for hearing:
     standing still is silent, sneaking is heard from 1 room, walking from 5,
     sprinting from 8. A hidden player is only found by bad luck when the
     monster stays right outside. The monster never sees the player.
   The practice player is a computer: half the rounds it is careless, half
   careful (it sneaks, stops, backs away and hides when it hears footsteps).

   Usage: node train.js [generations]   → writes www/js/mlweights.js
   Also prints how the old brain, the smart brain (build A) and the learned
   brain do on the same rounds. */
const path = require('path'), fs = require('fs');
const { MLB } = require('../../www/js/mlbrain.js');
const DX = [0, 1, 0, -1], DY = [-1, 0, 1, 0];

function rng(seed) { let a = seed >>> 0; return () => { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
function gauss(r) { let u = 0, v = 0; while (!u) u = r(); while (!v) v = r(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v); }

function genMaze(w, h, loops, r) {
  const ri = n => Math.floor(r() * n);
  const g = [...Array(h)].map(() => Array(w).fill(15)), vis = [...Array(h)].map(() => Array(w).fill(false));
  const carve = (x, y, d) => { const nx = x + DX[d], ny = y + DY[d]; if (ny < 0 || ny >= h || nx < 0 || nx >= w) return; g[y][x] &= ~(1 << d); g[ny][nx] &= ~(1 << ((d + 2) % 4)); };
  const st = [[ri(w), ri(h)]]; vis[st[0][1]][st[0][0]] = true;
  while (st.length) { const [x, y] = st[st.length - 1]; const ns = []; for (let d = 0; d < 4; d++) { const nx = x + DX[d], ny = y + DY[d]; if (nx >= 0 && ny >= 0 && nx < w && ny < h && !vis[ny][nx]) ns.push(d); }
    if (!ns.length) { st.pop(); continue; } const d = ns[ri(ns.length)]; carve(x, y, d); vis[y + DY[d]][x + DX[d]] = true; st.push([x + DX[d], y + DY[d]]); }
  for (let i = 0; i < Math.floor(w * h * loops); i++) carve(ri(w), ri(h), ri(4));
  return g;
}

function episode(policy, W, seed, careful, turns = 300) {
  const r = rng(seed), ri = n => Math.floor(r() * n);
  const w = 9 + ri(6), h = 9 + ri(6), g = genMaze(w, h, 0.12, r);
  const open = (x, y, d) => !(g[y][x] & (1 << d));
  const bfs = (sx, sy) => { const D = [...Array(h)].map(() => Array(w).fill(Infinity)); D[sy][sx] = 0; const q = [[sx, sy]];
    for (let i = 0; i < q.length; i++) { const [x, y] = q[i]; for (let d = 0; d < 4; d++) { if (!open(x, y, d)) continue; const nx = x + DX[d], ny = y + DY[d]; if (D[ny][nx] > D[y][x] + 1) { D[ny][nx] = D[y][x] + 1; q.push([nx, ny]); } } } return D; };
  const bfsMulti = (cells) => { const D = [...Array(h)].map(() => Array(w).fill(Infinity)); const q = []; for (const [x, y] of cells) { D[y][x] = 0; q.push([x, y]); }
    for (let i = 0; i < q.length; i++) { const [x, y] = q[i]; for (let d = 0; d < 4; d++) { if (!open(x, y, d)) continue; const nx = x + DX[d], ny = y + DY[d]; if (D[ny][nx] > D[y][x] + 1) { D[ny][nx] = D[y][x] + 1; q.push([nx, ny]); } } } return D; };
  const deg = (x, y) => { let n = 0; for (let d = 0; d < 4; d++) if (open(x, y, d)) n++; return n; };
  const step = (D, x, y, away) => { let best = -1, bd = D[y][x]; for (let d = 0; d < 4; d++) { if (!open(x, y, d)) continue; const v = D[y + DY[d]][x + DX[d]]; if (away ? v > bd : v < bd) { bd = v; best = d; } } return best; };
  let px = ri(w), py = ri(h);
  const farFrom = (x, y, min) => { const D = bfs(x, y); const c = []; for (let yy = 0; yy < h; yy++) for (let xx = 0; xx < w; xx++) if (D[yy][xx] >= min && D[yy][xx] < Infinity) c.push([xx, yy]); return c.length ? c[ri(c.length)] : [x, y]; };
  let [ex, ey] = farFrom(px, py, 8), exD = bfs(ex, ey);
  const spots = []; for (let i = 0; i < 3; i++) spots.push([ri(w), ri(h)]); const spotSet = new Set(spots.map(s => s[0] + ',' + s[1])); const dSpot = bfsMulti(spots);
  let [mx, my] = farFrom(px, py, 7);
  const M = { x: mx, y: my, mem: null, search: 0, goal: null, lastVisit: new Array(w * h).fill(-1) };
  let caught = 0, hidden = false, outside = 0, escaped = 0;
  for (let t = 0; t < turns; t++) {
    // ---------- player ----------
    let D = bfs(px, py); const dm = D[M.y][M.x];
    let noise = 5;
    if (careful) {
      if (hidden) { if (dm <= 4) noise = 0; else { hidden = false; noise = 0; } }
      else if (dm <= 3 && spotSet.has(px + ',' + py)) { hidden = true; noise = 0; }
      else if (dm <= 3 && r() < 0.4) noise = 0;
      else { const md = bfs(M.x, M.y); const d = dm <= 3 ? step(md, px, py, true) : (r() < 0.8 ? step(exD, px, py) : ri(4)); if (d >= 0 && open(px, py, d)) { px += DX[d]; py += DY[d]; } noise = dm <= 6 ? 1 : 5; }
    } else {
      const sprint = r() < 0.15; const n = sprint ? 2 : 1; noise = sprint ? 8 : 5;
      for (let k = 0; k < n; k++) { const d = r() < 0.75 ? step(exD, px, py) : ri(4); if (d >= 0 && open(px, py, d)) { px += DX[d]; py += DY[d]; } }
    }
    if (px === ex && py === ey) { escaped++; [ex, ey] = farFrom(px, py, 8); exD = bfs(ex, ey); }
    D = bfs(px, py);
    // ---------- monster ----------
    const dPM = D[M.y][M.x];
    const heard = !hidden && dPM <= noise;
    policy(M, { heard, px, py, t, w, h, open, deg, bfs, dSpot, spotSet, r, W, hidden });
    // ---------- caught? ----------
    if (M.x === px && M.y === py && !hidden) { caught++; [M.x, M.y] = farFrom(px, py, 6); M.mem = null; M.search = 0; }
    if (hidden) { const dd = bfs(px, py)[M.y][M.x]; if (dd <= 1) { outside++; if (outside >= 2 && r() < 0.18) { caught++; hidden = false; [M.x, M.y] = farFrom(px, py, 6); M.mem = null; outside = 0; } } else outside = 0; }
  }
  return { caught, escaped };
}

const ri2 = (r, n) => Math.floor(r() * n);
function wanderMove(M, c) { const ds = [0, 1, 2, 3].filter(d => c.open(M.x, M.y, d)); if (ds.length) { const d = ds[ri2(c.r, ds.length)]; M.x += DX[d]; M.y += DY[d]; } }
function stepTo(M, c, D) { let best = -1, bd = D[M.y][M.x]; for (let d = 0; d < 4; d++) { if (!c.open(M.x, M.y, d)) continue; const v = D[M.y + DY[d]][M.x + DX[d]]; if (v < bd) { bd = v; best = d; } } if (best >= 0) { M.x += DX[best]; M.y += DY[best]; } }
const CHASE = 0.65;
// the 1.5 brain: inside its hearing range it always knows where you are
function oldBrain(M, c) { const D = c.bfs(c.px, c.py); const sense = 5; const hunting = !c.hidden && D[M.y][M.x] <= sense; if (hunting) { if (c.r() < CHASE) stepTo(M, c, D); } else if (c.r() < 0.5) wanderMove(M, c); }
// build A: go where it last heard you, search there, give up
function smartBrain(M, c) {
  if (c.heard) { M.mem = { x: c.px, y: c.py, age: 0 }; M.search = 0; M.goal = null; }
  if (!M.mem) { if (c.r() < 0.5) wanderMove(M, c); return; }
  M.mem.age++;
  if (!M.search && !(M.x === M.mem.x && M.y === M.mem.y)) { if (c.r() < CHASE) stepTo(M, c, c.bfs(M.mem.x, M.mem.y)); if (M.mem.age > 30) M.mem = null; return; }
  if (!M.search) M.search = 5; M.search--;
  if (!M.goal || (M.x === M.goal.x && M.y === M.goal.y)) { const md = c.bfs(M.mem.x, M.mem.y); const cs = []; for (let y = 0; y < c.h; y++) for (let x = 0; x < c.w; x++) if (md[y][x] >= 1 && md[y][x] <= 3) cs.push({ x, y }); M.goal = cs.length ? cs[ri2(c.r, cs.length)] : { x: M.mem.x, y: M.mem.y }; }
  if (c.r() < 0.75) stepTo(M, c, c.bfs(M.goal.x, M.goal.y));
  if (M.search <= 0) M.mem = null;
}
// build B: the learned brain decides every move
function mlBrain(M, c) {
  if (c.heard) M.mem = { x: c.px, y: c.py, age: 0 };
  if (M.mem) { M.mem.age++; if (M.mem.age > 30) M.mem = null; }
  M.lastVisit[M.y * c.w + M.x] = c.t;
  if (c.r() > (M.mem ? CHASE : 0.5)) return;
  const o = { cx: M.x, cy: M.y, w: c.w, t: c.t, mem: M.mem, heard: c.heard, dMem: M.mem ? c.bfs(M.mem.x, M.mem.y) : null, dSpot: c.dSpot, lastVisit: M.lastVisit, deg: c.deg };
  const opts = [{ nx: M.x, ny: M.y, stay: true }]; for (let d = 0; d < 4; d++) if (c.open(M.x, M.y, d)) opts.push({ nx: M.x + DX[d], ny: M.y + DY[d], d });
  const ch = MLB.choose(c.W, o, opts, c.r); M.x = ch.nx; M.y = ch.ny;
}

function evaluate(policy, W, seeds) { let c = 0; for (const s of seeds) c += episode(policy, W, s, s % 2 === 0).caught; return c / seeds.length; }
function report(W, n = 200, base = 900000) {
  const res = {};
  for (const [name, p] of [['old (1.5)', oldBrain], ['smart (A)', smartBrain], ['learned (B)', mlBrain]]) {
    let careful = 0, careless = 0; for (let i = 0; i < n; i++) { const s = base + i; const e = episode(p, W, s, i % 2 === 0); if (i % 2 === 0) careful += e.caught; else careless += e.caught; }
    res[name] = { careful: +(careful / (n / 2) / 3).toFixed(2), careless: +(careless / (n / 2) / 3).toFixed(2) }; // catches per 100 turns
  }
  return res;
}

if (require.main === module) {
  const gens = +(process.argv[2] || 120), pop = 40, sigma = 0.1, lr = 0.05, perEval = 12;
  const R = rng(12345); let W = Array.from({ length: MLB.NW }, () => gauss(R) * 0.1);
  const m = new Array(MLB.NW).fill(0), v = new Array(MLB.NW).fill(0); let best = -1, bestW = W.slice();
  const t0 = Date.now();
  for (let gI = 0; gI < gens; gI++) {
    const seeds = Array.from({ length: perEval }, (_, i) => gI * 1000 + i);
    const eps = [], fit = [];
    for (let k = 0; k < pop / 2; k++) { const e = Array.from({ length: MLB.NW }, () => gauss(R)); eps.push(e, e.map(x => -x)); }
    for (const e of eps) fit.push(evaluate(mlBrain, W.map((w, i) => w + sigma * e[i]), seeds));
    // rank-based weights
    const order = fit.map((f, i) => [f, i]).sort((a, b) => a[0] - b[0]); const rank = new Array(pop); order.forEach(([, i], k) => rank[i] = k / (pop - 1) - 0.5);
    const grad = new Array(MLB.NW).fill(0); for (let k = 0; k < pop; k++) for (let i = 0; i < MLB.NW; i++) grad[i] += rank[k] * eps[k][i] / (pop * sigma);
    for (let i = 0; i < MLB.NW; i++) { m[i] = 0.9 * m[i] + 0.1 * grad[i]; v[i] = 0.999 * v[i] + 0.001 * grad[i] * grad[i]; W[i] += lr * (m[i] / (1 - Math.pow(0.9, gI + 1))) / (Math.sqrt(v[i] / (1 - Math.pow(0.999, gI + 1))) + 1e-8); }
    if (gI % 10 === 9 || gI === gens - 1) { const val = evaluate(mlBrain, W, Array.from({ length: 60 }, (_, i) => 500000 + i)); if (val > best) { best = val; bestW = W.slice(); }
      console.log(`gen ${gI + 1}/${gens}  mean ${(fit.reduce((a, b) => a + b, 0) / pop).toFixed(2)}  check ${val.toFixed(2)} catches/round  best ${best.toFixed(2)}  ${((Date.now() - t0) / 1000).toFixed(0)}s`); }
  }
  const out = path.join(__dirname, '../../www/js/mlweights.js');
  fs.writeFileSync(out, `"use strict";\n// Learned by tools/ml-monsters/train.js (${gens} generations). Do not edit by hand.\nwindow.ML_WEIGHTS=${JSON.stringify(bestW.map(x => +x.toFixed(4)))};\n`);
  console.log('Saved', out);
  console.log('Catches per 100 turns on 200 new practice rounds:', JSON.stringify(report(bestW), null, 1));
}
module.exports = { episode, oldBrain, smartBrain, mlBrain, report };
