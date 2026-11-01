// Lesson-progress scenes. Each lesson gets one (they rotate through the course
// so neighbouring lessons differ): a 64px strip above the question that moves
// one step per swipe, then expands into a finale when the lesson is done.
// 'ap' is the original membrane-potential trace (trace.js); the others are
// drawn here. Every scene has the same interface as createTrace:
//   layout(steps, misses, step), epsp(a, b) = a step done, ipsp(a, b) = a miss,
//   setCharge(), finale({ onPeak }) → Promise, refreshColors().
// The drawing code is compact on purpose: it's artwork, tuned by eye on a phone.

import { createTrace } from './trace.js';
import { content } from './content.js';
import { settings } from './progress.js';

export const THEMES = ['ap', 'axon', 'oft', 'ca', 'conf', 'patch', 'rna', 'pcr', 'spin', 'pip'];

const LABELS = {
  axon: ['Synapse formed', 'Your axon found its target'],
  oft: ['Session complete', 'Where the mouse spent its time'],
  ca: ['Network event', 'Every cell fired together'],
  conf: ['Stack complete', 'Max projection'],
  patch: ["You're whole-cell", 'The patch broke and the cell fired'],
  rna: ['Both channels in', 'Scored and imaged'],
  pcr: ['Amplified', 'Billions of copies, one band'],
  spin: ['Spun down', 'A clean pellet'],
  pip: ['Plate loaded', 'Every well filled'],
};

// The scene for a lesson: its position in the whole course picks the theme.
export function themeFor(lessonId) {
  if (settings.get('apOnly')) return 'ap';
  let i = 0;
  for (const t of content.course?.tracks || []) for (const u of t.units || []) for (const id of u.lessons || []) {
    if (id === lessonId) return THEMES[i % THEMES.length];
    i++;
  }
  return 'ap';
}

const SH = 64, FH = 300, FINALE_MS = 3200, PEAK_MS = 700;
const GREEN = '#6DD58C', MAG = '#E26FB8', AMBER = '#F2B23B', PALE = '#EAF3DE', TXT = '#B4B2A9', BAD = '#F0997B', TRACK = '#8DB0F7', MINUS = '−';
const rnd = (s) => () => (s = Math.imul(s ^ s >>> 15, 2246822507) + 1013904223 >>> 0) / 4294967296;
const ease = (t) => t <= 0 ? 0 : t >= 1 ? 1 : 1 - Math.pow(1 - t, 3);
const eio = (t) => t <= 0 ? 0 : t >= 1 ? 1 : t < .5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
const clamp = (x, a = 0, b = 1) => Math.max(a, Math.min(b, x));
const lerp = (a, b, t) => a + (b - a) * t;
const angDiff = (a, b) => Math.atan2(Math.sin(a - b), Math.cos(a - b));
const gauss = () => Math.sqrt(-2 * Math.log(Math.random() + 1e-9)) * Math.cos(6.2832 * Math.random());
const trF = (x, tt) => x.fires.reduce((s, f) => { const t = (tt - f.t) / 1000; return t < 0 ? s : s + f.a * (1 - Math.exp(-t / .08)) * Math.exp(-t / 1.0); }, 0);

// A current-clamp sweep from a small adapting neuron model (for the patch-clamp finale).
function simIC() {
  const dt = .05, n = 800 / dt, out = new Float32Array(n);
  let V = -68, w = 0, ref = -1;
  for (let i = 0; i < n; i++) {
    const t = i * dt, I = t >= 100 && t < 600 ? 120 : 0;
    if (ref >= 0) {
      const tt = ref, th = -50;
      out[i] = tt < .15 ? th + Math.pow(tt / .15, 2) * 8 : tt < .45 ? th + 8 + (38 - th - 8) * Math.sin((tt - .15) / .3 * Math.PI / 2) : tt < 1.5 ? -62 + 50 * (1 + Math.cos(Math.PI * (tt - .45) / 1.05)) : -62 + 2 * (tt - 1.5);
      ref += dt; if (ref >= 2.5) { ref = -1; V = -60; }
      w *= Math.exp(-dt / 200);
      continue;
    }
    V += dt * (-(V + 68) + .2 * (I - w)) / 20; w *= Math.exp(-dt / 200);
    if (V >= -50) { ref = 0; w += 18; }
    out[i] = V;
  }
  return out;
}

export function createScene(kind, host, signal) {
  if (kind === 'ap' || !THEMES.includes(kind)) return createTrace(host, signal);
  const still = matchMedia('(prefers-reduced-motion: reduce)').matches;
  host.classList.add('scene');
  const canvas = document.createElement('canvas');
  canvas.className = 'trace';
  canvas.setAttribute('role', 'img');
  host.replaceChildren(canvas);
  const main = canvas.getContext('2d'), off = document.createElement('canvas');
  let c = main, W = 0, H = 0, dpr = 1, lastFrame = 0;
  let N = 6, done = 0, misses = 0, fin = null;
  const ev = [];

  // ---------- drawing helpers ----------
  const rrect = (x, y, w, h, r) => { c.beginPath(); c.moveTo(x + r, y); c.arcTo(x + w, y, x + w, y + h, r); c.arcTo(x + w, y + h, x, y + h, r); c.arcTo(x, y + h, x, y, r); c.arcTo(x, y, x + w, y, r); c.closePath(); };
  const label = (s, x, y, col = TXT, f = '11px -apple-system, system-ui, sans-serif') => { c.fillStyle = col; c.font = f; c.fillText(s, x, y); };
  function blob(x, y, rx, ry, base, rim) { c.save(); c.translate(x, y); c.fillStyle = base; c.beginPath(); c.ellipse(0, 0, rx, ry, 0, 0, 7); c.fill(); if (rim) { c.strokeStyle = rim; c.lineWidth = 1.4; c.stroke(); } c.restore(); }
  // An irregular, organic outline (cells, nuclei, the axon terminal's neighbours).
  function opath(x, y, rx, ry, rot, seed, sc = 1) {
    const r = rnd(seed), p = [r() * 6.28, r() * 6.28, r() * 6.28], a = [.05 + r() * .04, .03 + r() * .03, .015 + r() * .015], co = Math.cos(rot), si = Math.sin(rot);
    c.beginPath();
    for (let i = 0; i <= 48; i++) {
      const t = i / 48 * 6.2832, k = 1 + a[0] * Math.sin(2 * t + p[0]) + a[1] * Math.sin(3 * t + p[1]) + a[2] * Math.sin(5 * t + p[2]);
      const ex = Math.cos(t) * rx * k * sc, ey = Math.sin(t) * ry * k * sc, X = x + ex * co - ey * si, Y = y + ex * si + ey * co;
      i ? c.lineTo(X, Y) : c.moveTo(X, Y);
    }
    c.closePath();
  }
  // A soft, grainy cell: faint halo, body, denser core and texture. No shine.
  function cell(x, y, rx, ry, rot, seed, rgb, a = 1, tex = true) {
    const f = (al) => `rgba(${rgb[0]},${rgb[1]},${rgb[2]},${Math.min(1, al)})`, lt = rgb.map((v) => Math.round(v + (255 - v) * .45)), co = Math.cos(rot), si = Math.sin(rot);
    opath(x, y, rx, ry, rot, seed, 1.2); c.fillStyle = f(.07 * a); c.fill();
    opath(x, y, rx, ry, rot, seed, 1); c.fillStyle = f(.5 * a); c.fill();
    opath(x, y, rx, ry, rot, seed, .7); c.fillStyle = f(.3 * a); c.fill();
    if (!tex) return;
    const r = rnd(seed * 7 + 1), n = Math.round(rx * ry / 5);
    for (let i = 0; i < n; i++) {
      const t = r() * 6.2832, d = Math.sqrt(r()) * .88, ex = Math.cos(t) * rx * d, ey = Math.sin(t) * ry * d;
      c.fillStyle = r() < .55 ? `rgba(${lt[0]},${lt[1]},${lt[2]},${Math.min(1, .3 * a)})` : `rgba(0,0,0,${Math.min(.3, .14 * a)})`;
      c.fillRect(x + ex * co - ey * si, y + ex * si + ey * co, 1.3, 1.3);
    }
  }
  // A 1.5 mL tube with its lid open on a bent strap (centrifuge finale).
  function eppi(x, y, s, lvl = 0, pellet = false, liq = 'rgba(232,120,135,.62)') {
    c.save(); c.translate(x, y); c.scale(s, s); const ln = 'rgba(225,232,240,.8)';
    const body = () => { c.beginPath(); c.moveTo(-10, 0); c.lineTo(-10, 28); c.bezierCurveTo(-9, 40, -4, 54, -1.5, 57); c.quadraticCurveTo(0, 58.5, 1.5, 57); c.bezierCurveTo(4, 54, 9, 40, 10, 28); c.lineTo(10, 0); c.closePath(); };
    c.strokeStyle = ln; c.lineWidth = 2.2; c.beginPath(); c.moveTo(-12, -1.5); c.quadraticCurveTo(-17, -2, -19, -7); c.stroke();
    c.save(); c.translate(-19, -7); c.rotate(-.6); c.fillStyle = 'rgba(225,232,240,.2)'; c.strokeStyle = ln; c.lineWidth = 1.1; rrect(-25, -5, 25, 5, 1.5); c.fill(); c.stroke(); rrect(-20, -11, 15, 6, 2); c.fill(); c.stroke(); c.restore();
    c.fillStyle = 'rgba(225,232,240,.14)'; body(); c.fill();
    if (lvl > 0) { c.save(); body(); c.clip(); const top = 58 - 58 * lvl; c.fillStyle = liq; c.fillRect(-11, top, 22, 62); c.fillStyle = 'rgba(255,255,255,.2)'; c.fillRect(2.5, top + 2, 2.5, 58 - top); c.restore(); }
    if (pellet) { c.fillStyle = '#4a4130'; c.beginPath(); c.ellipse(-2.4, 51.5, 2.6, 3.9, .35, 0, 7); c.fill(); }
    c.strokeStyle = 'rgba(225,232,240,.35)'; c.lineWidth = 1.4; [8, 18].forEach((g) => { c.beginPath(); c.moveTo(-6.5, g); c.lineTo(0, g); c.stroke(); });
    c.strokeStyle = ln; c.lineWidth = 1.3; body(); c.stroke(); c.fillStyle = 'rgba(225,232,240,.3)'; rrect(-12.5, -3, 25, 4, 1.5); c.fill(); c.lineWidth = 1.2; c.stroke(); c.restore();
  }
  function drawMouse(x, y, ang, sc) {
    c.save(); c.translate(x, y); c.rotate(ang); c.scale(sc, sc);
    c.strokeStyle = '#3a3734'; c.lineWidth = 3; c.lineCap = 'round'; c.beginPath(); c.moveTo(-14, 0); c.bezierCurveTo(-24, 3, -30, -8, -42, -4); c.stroke();
    blob(-2, 0, 14, 9, '#2b2927', '#1a1918'); blob(11, 0, 8, 6.2, '#2b2927', '#1a1918'); blob(6, -7, 3.8, 3.8, '#5a4a48'); blob(6, 7, 3.8, 3.8, '#5a4a48');
    c.restore();
  }

  // ---------- state ----------
  const S = { ang: 0, speed: 0, ic: null, mouse: { x: .07, y: .8, h: -Math.PI / 2, sp: 0 }, mode: 'linger', mq: [], pause: 0, mt: 0, trail: [], puncta: [], bg: [] };
  {
    const r = rnd(3);
    S.cells = Array.from({ length: 15 }, () => ({ x: .06 + r() * .88, y: .08 + r() * .5, a: r() * 3, w: 9 + r() * 5, h: 6 + r() * 3, n1: r() * 6.28, n2: r() * 6.28, l1: 22 + r() * 16, l2: 14 + r() * 12, fires: [] }));
    const sp = rnd(11); S.speck = Array.from({ length: 300 }, () => ({ x: sp(), y: sp(), o: .04 + sp() * .08 }));
    const fr = rnd(21); S.filo = Array.from({ length: 12 }, (_, i) => ({ a: -1.25 + 2.5 * (i + fr() * .6) / 12, l: 12 + fr() * 22, ph: fr() * 6 }));
    const rr = rnd(5); S.segs = [];
    const br = (x, y, a, len, d, max, spread, shrink, jit) => { if (d > max) return; const x2 = x + Math.cos(a) * len, y2 = y + Math.sin(a) * len; S.segs.push({ x, y, x2, y2, w: Math.max(1, (max === 4 ? 4 : 3.4) - d * .75), d }); for (let i = 0; i < 2; i++) br(x2, y2, a + (i ? spread : -spread) + (jit ? (rr() - .5) * .4 : 0), len * shrink, d + 1, max, spread, shrink, jit); };
    br(0, 0, -1.57, 42, 0, 4, .5, .74, true); br(0, 0, 1.45, 32, 1, 3, .55, .7, false);
    S.spines = []; S.segs.forEach((s) => { if (s.d < 1) return; const n = 2 + Math.floor(rr() * 3); for (let k = 0; k < n; k++) S.spines.push({ s, q: .15 + rr() * .75, side: rr() < .5 ? -1 : 1, len: 3 + rr() * 5, ty: rr() < .5 ? 'm' : rr() < .6 ? 't' : 's', det: rr() < .15, tilt: (rr() - .5) * .9 }); });
    const cr = rnd(17); S.cs = Array.from({ length: 34 }, () => ({ q: .03 + cr() * .94, side: cr() < .5 ? -1 : 1, len: 4 + cr() * 5, ty: cr() < .5 ? 'm' : cr() < .6 ? 't' : 's', tilt: (cr() - .5) * .9, z: .01 + cr() * .99 }));
    // Vesicles in the axon terminal, relative to its flat face; four docked at the active zone.
    const vr = rnd(31); S.ves = [{ x: -3, y: -4, d: 1 }, { x: -3, y: 4, d: 1 }, { x: -4, y: -9.5 }, { x: -4, y: 9.5 }];
    for (let t = 0; t < 800 && S.ves.length < 22; t++) { const x = -27 + vr() * 24, y = -12 + vr() * 24; if (((x + 13) / 13) ** 2 + (y / 12) ** 2 > 1 || vr() > .3 + .7 * (x + 27) / 24 || (x < -13 && y < -1 && y > -11)) continue; if (S.ves.every((v) => Math.hypot(v.x - x, v.y - y) > 5.4)) S.ves.push({ x, y }); }
  }

  const lastEv = () => ev[ev.length - 1], since = (now) => lastEv() ? now - lastEv().t : 1e9;
  const finished = (now) => fin && now > fin, fage = (now) => fin ? now - fin : 0;
  const missing = (now, ms = 1100) => lastEv()?.k === 'miss' && since(now) < ms;
  const okT = (i) => ev.filter((e) => e.k === 'ok')[i]?.t || 0;

  // ---------- open field: a small movement model ----------
  // Walking comes in smooth bouts broken by stops and scans, mostly along the walls.
  // A step done starts a calm trip into the center; a miss starts fast darting
  // along the walls with sharp turns, ending in a freeze.
  function wallFollow(m, gap) {
    const d = [m.x, 1 - m.x, m.y, 1 - m.y], o = [0, 1, 2, 3].sort((a, b) => d[a] - d[b]), i = o[0], j = o[1], N4 = [[-1, 0], [1, 0], [0, -1], [0, 1]], n = N4[i], t = i < 2 ? [0, 1] : [1, 0];
    let dir = Math.cos(m.h) * t[0] + Math.sin(m.h) * t[1] >= 0 ? 1 : -1;
    if (d[j] < .14 && (i < 2) !== (j < 2) && Math.cos(m.h) * n[0] + Math.sin(m.h) * n[1] > .5) dir = -(t[0] * N4[j][0] + t[1] * N4[j][1]) || dir; // turn corners away from the wall behind
    const k = clamp((d[i] - gap) * 12, -1.5, 4);
    return Math.atan2(t[1] * dir + n[1] * k, t[0] * dir + n[0] * k);
  }
  function oftEvent(kind) {
    if (kind === 'ok') { S.mq = [{ x: lerp(.32, .68, Math.random()), y: lerp(.32, .68, Math.random()), back: 1 }]; S.mode = 'explore'; }
    else { S.mode = 'anx'; S.anxT = 1.8 + Math.random() * .6; }
    S.pause = 0;
  }
  function oftSim(dt) {
    const m = S.mouse; S.mt += dt; let sp = .1, turn = 0, k = 3;
    if (S.mode === 'explore') {
      const g = S.mq[0];
      if (!g) S.mode = 'linger';
      else {
        if (Math.hypot(g.x - m.x, g.y - m.y) < .04) {
          S.mq.shift(); S.pause = .4 + Math.random() * .6;
          if (g.back) { const d = [m.x, 1 - m.x, m.y, 1 - m.y], i = d.indexOf(Math.min(...d)), t = (i < 2 ? m.y : m.x) + (Math.random() - .5) * .3; S.mq.push(i === 0 ? { x: .07, y: t } : i === 1 ? { x: .93, y: t } : i === 2 ? { x: t, y: .07 } : { x: t, y: .93 }); }
        }
        turn = angDiff(Math.atan2(g.y - m.y, g.x - m.x), m.h) * 4.5 + gauss() * .6; sp = .2;
      }
    } else if (S.mode === 'anx') {
      S.anxT -= dt;
      if (S.anxT <= 0) { S.mode = 'freeze'; S.freezeT = 1.3; }
      else { if (Math.random() < dt * 1.6) m.h += Math.PI * (.7 + Math.random() * .5) * (Math.random() < .5 ? -1 : 1); turn = angDiff(wallFollow(m, .04), m.h) * 5 + gauss() * 4; sp = .42; k = 9; }
    } else if (S.mode === 'freeze') { S.freezeT -= dt; sp = 0; if (S.freezeT <= 0) S.mode = 'linger'; }
    if (S.mode === 'linger') { turn = angDiff(wallFollow(m, .06), m.h) * 3 + gauss() * .7; sp = .1; if (Math.random() < dt * .3) S.pause = .8 + Math.random() * 1.6; if (Math.random() < dt * .04) m.h += Math.PI; }
    if (S.pause > 0) { S.pause -= dt; sp = 0; turn = Math.sin(S.mt * 5) * 1.2; }
    m.sp += (sp - m.sp) * Math.min(1, dt * k); m.h += turn * dt;
    m.x = clamp(m.x + Math.cos(m.h) * m.sp * dt, .04, .96); m.y = clamp(m.y + Math.sin(m.h) * m.sp * dt, .04, .96);
    if (m.sp > .003 || S.mt % .1 < dt) { S.trail.push({ x: m.x, y: m.y }); if (S.trail.length > 6000) S.trail.shift(); }
  }
  if (kind === 'oft') for (let i = 0; i < 120; i++) oftSim(.05);

  // ---------- patch clamp close-up ----------
  // The pipette slides in, dimples the membrane, then suction draws an Ω of
  // membrane into the tip while the seal ring tightens (gray → green).
  // brk (0..1) ruptures the patch for whole-cell; -1 = not yet.
  function patchScene(W, H, cx, y0, rx, ry, sc, p, now, m, brk) {
    c.fillStyle = '#4b4a45'; c.fillRect(0, 0, W, H); const cy = y0 + ry, CELL = '#5a5952';
    c.fillStyle = 'rgba(255,255,255,.2)'; c.beginPath(); c.ellipse(cx - 1.5 * sc, cy - 1.5 * sc, rx, ry, 0, 0, 7); c.fill(); c.fillStyle = 'rgba(0,0,0,.3)'; c.beginPath(); c.ellipse(cx + 1.5 * sc, cy + 1.5 * sc, rx, ry, 0, 0, 7); c.fill(); c.fillStyle = CELL; c.beginPath(); c.ellipse(cx, cy, rx, ry, 0, 0, 7); c.fill();
    const T = { x: cx - rx * .18, y: cy - ry * Math.sqrt(1 - .0324) }, a = -2.7, u = { x: Math.cos(a), y: Math.sin(a) }, n = { x: -u.y, y: u.x }, tr = 3 * sc;
    const slide = (1 - eio(clamp(p / .42))) * W * .5 + (m ? W * .06 : 0), down = (1 - clamp((p - .38) / .12)) * 7 * sc, dist = slide + down, tip = { x: T.x + u.x * down - slide, y: T.y + u.y * down };
    const dimp = m ? 0 : clamp((p - .5) / .15) * (1 - clamp((p - .65) / .15)), bulge = m ? 0 : clamp((p - .65) / .35);
    const ell = (o, ru, rn, col) => { c.save(); c.translate(o.x, o.y); c.rotate(a); c.fillStyle = col; c.beginPath(); c.ellipse(0, 0, Math.max(.1, ru), Math.max(.1, rn), 0, 0, 7); c.fill(); c.restore(); };
    if (brk < 0 && p < .6) for (let k = 0; k < 5; k++) { const d = ((now / 500 + k / 5) % 1) * 14 * sc; c.fillStyle = `rgba(255,255,255,${.3 * (1 - d / (14 * sc))})`; c.beginPath(); c.arc(tip.x - u.x * d + n.x * (k - 2) * 1.6 * sc, tip.y - u.y * d + n.y * (k - 2) * 1.6 * sc, 1.1 * sc, 0, 7); c.fill(); } // positive pressure
    if (dimp > 0) ell({ x: T.x - u.x * tr * .5, y: T.y - u.y * tr * .5 }, tr * .8, tr * 1.9, `rgba(0,0,0,${.35 * dimp})`);
    const dd = bulge * tr * 2.3;
    if (bulge > 0 && brk < .15) { const o = { x: T.x + u.x * dd / 2, y: T.y + u.y * dd / 2 }; ell(o, dd / 2 + .6 * sc, tr * .95, CELL); c.save(); c.translate(o.x, o.y); c.rotate(a); c.strokeStyle = 'rgba(255,255,255,.35)'; c.lineWidth = .9 * sc; c.beginPath(); c.ellipse(0, 0, dd / 2 + .6 * sc, tr * .95, 0, -Math.PI / 2, Math.PI / 2); c.stroke(); c.restore(); }
    const hw = (s) => s < 40 * sc ? lerp(tr + 1.3 * sc, 8 * sc, s / (40 * sc)) : lerp(8 * sc, 12 * sc, clamp((s - 40 * sc) / (200 * sc)));
    const side = (sg, offs) => { const pts = []; for (let s = 0; s <= 420; s += 6) pts.push({ x: tip.x + u.x * s + n.x * sg * (hw(s) - offs), y: tip.y + u.y * s + n.y * sg * (hw(s) - offs) }); return pts; };
    const poly = (A, B) => { c.beginPath(); A.forEach((q, i) => i ? c.lineTo(q.x, q.y) : c.moveTo(q.x, q.y)); B.reverse().forEach((q) => c.lineTo(q.x, q.y)); c.closePath(); };
    const line = (P) => { c.beginPath(); P.forEach((q, i) => i ? c.lineTo(q.x, q.y) : c.moveTo(q.x, q.y)); c.stroke(); };
    c.fillStyle = 'rgba(215,222,228,.2)'; poly(side(1, 0), side(-1, 0)); c.fill();
    if (brk > 0) { const len = ease(brk) * 45 * sc; c.fillStyle = CELL; poly(side(1, 1.4 * sc).filter((_, i) => i * 6 <= len), side(-1, 1.4 * sc).filter((_, i) => i * 6 <= len)); c.fill(); }
    c.strokeStyle = 'rgba(235,240,245,.8)'; c.lineWidth = 1.1; line(side(1, 0)); line(side(-1, 0));
    c.strokeStyle = 'rgba(235,240,245,.3)'; c.lineWidth = .8; line(side(1, 1.4 * sc)); line(side(-1, 1.4 * sc));
    if (dist < 1) {
      const sl = m ? 1 : bulge, col = m ? BAD : `rgb(${Math.round(lerp(150, 109, sl))},${Math.round(lerp(150, 213, sl))},${Math.round(lerp(145, 140, sl))})`;
      c.strokeStyle = col; c.lineWidth = 2.2 * sc; c.lineCap = 'round'; c.globalAlpha *= .5 + .5 * sl; c.beginPath();
      c.moveTo(T.x + n.x * (tr + 1.3 * sc), T.y + n.y * (tr + 1.3 * sc)); c.lineTo(T.x + n.x * (tr - .2 * sc), T.y + n.y * (tr - .2 * sc));
      c.moveTo(T.x - n.x * (tr + 1.3 * sc), T.y - n.y * (tr + 1.3 * sc)); c.lineTo(T.x - n.x * (tr - .2 * sc), T.y - n.y * (tr - .2 * sc));
      c.stroke(); c.globalAlpha = 1;
    } else if (m) { c.strokeStyle = BAD; c.lineWidth = 1.5 * sc; c.beginPath(); c.arc(tip.x, tip.y, tr * 2.2, 0, 7); c.stroke(); }
    if (brk > 0 && brk < 1) { c.strokeStyle = `rgba(234,243,222,${1 - brk})`; c.lineWidth = 1.5 * sc; c.beginPath(); c.arc(T.x, T.y, tr * (1.5 + brk * 3), 0, 7); c.stroke(); }
  }

  // ---------- axon growth (strip and finale share one drawing) ----------
  function axon(W, H, now) {
    const y0 = H * .5, x0 = H < 100 ? 24 : 50, x1 = W - 92, fx = W - 30, yA = (xx) => y0 + Math.sin(xx * .03) * Math.min(8, H / 10);
    let L = done / N; const m = missing(now, 1100); if (m) L = Math.max(0, L - .07 * (1 - since(now) / 1100));
    const tx = x0 + (x1 - x0) * L, ty = yA(tx);
    const fz = finished(now), fa = fz ? clamp(fage(now) / 900) : 0, g = fz ? ease(clamp((fage(now) - 300) / 1000)) : 0, bx = x1 + 2, by = yA(x1), F = bx + 18;
    const DEN = '#7d86c9';
    // the target dendrite, with a couple of existing spines
    [[-74, 1], [66, -1]].forEach(([dy, s]) => { const y = by + dy; c.strokeStyle = DEN; c.lineWidth = 4; c.beginPath(); c.moveTo(fx - 8, y); c.quadraticCurveTo(fx - 16, y + s * 3, fx - 22, y + s * 2); c.stroke(); opath(fx - 26, y + s * 2, 4.5, 6.5, .2 * s, dy + 99); c.fillStyle = DEN; c.fill(); });
    c.fillStyle = DEN; c.beginPath(); c.moveTo(fx - 9, -10); for (let y = -10; y <= H + 10; y += 10) c.lineTo(fx - 9 + Math.sin(y * .05) * 1.5, y); c.lineTo(fx + 9, H + 10); c.lineTo(fx + 9, -10); c.closePath(); c.fill();
    const dr = rnd(77); for (let i = 0; i < 70; i++) { c.fillStyle = dr() < .5 ? 'rgba(160,168,225,.5)' : 'rgba(0,0,0,.12)'; c.fillRect(fx - 7 + dr() * 14, dr() * H, 1.3, 1.3); }
    // the neuron and its axon
    c.strokeStyle = 'rgba(109,213,140,.55)'; c.lineCap = 'round';
    [-2.5, -1.95, 2.4, 1.9, 3].forEach((a, i) => { let px = x0, py = y0, w = 4; for (let k = 0; k < 4; k++) { const nx = px + Math.cos(a + Math.sin(i + k) * .3) * 7, ny = py + Math.sin(a + Math.sin(i + k) * .3) * 7; c.lineWidth = w; c.beginPath(); c.moveTo(px, py); c.lineTo(nx, ny); c.stroke(); px = nx; py = ny; w *= .72; } });
    const ax1 = fa > 0 ? F - 34 : tx - 8; c.strokeStyle = '#7fd49b'; c.lineWidth = 3.2; c.beginPath(); c.moveTo(x0 + 12, y0); for (let xx = x0 + 12; xx <= ax1; xx += 3) c.lineTo(xx, yA(xx)); c.stroke();
    cell(x0, y0, 13, 11, .2, 5, [98, 185, 126], 1.5); opath(x0 + 1, y0 + 1, 5.5, 4.5, 0, 8); c.fillStyle = 'rgba(70,92,200,.75)'; c.fill();
    // the growth cone: green microtubule core, magenta actin fan; collapses on a miss
    c.save(); c.globalAlpha *= 1 - fa;
    if (m) { blob(tx - 2, ty, 4, 3, '#7fd49b'); c.strokeStyle = 'rgba(226,111,184,.7)'; c.lineWidth = 1; for (let k = 0; k < 3; k++) { c.beginPath(); c.moveTo(tx - 2, ty + (k - 1) * 2); c.lineTo(tx - 16 - k * 3, ty + (k - 1) * 7); c.stroke(); } }
    else {
      c.fillStyle = 'rgba(226,111,184,.32)'; c.beginPath(); c.moveTo(tx, ty); S.filo.forEach((f) => { const a = f.a + Math.sin(now / 600 + f.ph) * .06, rr = 11 + Math.sin(now / 300 + f.ph) * 1.5; c.lineTo(tx + Math.cos(a) * rr, ty + Math.sin(a) * rr); }); c.closePath(); c.fill();
      c.strokeStyle = '#e26fb8'; c.lineWidth = 1.3; S.filo.forEach((f) => { const a = f.a + Math.sin(now / 600 + f.ph) * .06, l = Math.min(f.l, H * .4) * (.8 + .25 * Math.sin(now / 900 + f.ph)); c.beginPath(); c.moveTo(tx + Math.cos(a) * 8, ty + Math.sin(a) * 8); c.lineTo(tx + Math.cos(a) * l, ty + Math.sin(a) * l); c.stroke(); });
      cell(tx, ty, 7, 6, 0, 9, [127, 212, 155], 1.4, false);
    }
    c.restore();
    if (fa <= 0) return;
    // finale: a spine grows out to meet the new axon terminal, which then releases transmitter
    const ph = fage(now) > 1500 ? ((fage(now) - 1500) / 1900) % 1 : -1, flash = ph > .52 && ph < .8 ? Math.sin((ph - .52) / .28 * Math.PI) : 0;
    const hx = fx - 9 - 18 * g - 5;
    if (g > 0) {
      c.strokeStyle = DEN; c.lineWidth = 5.5; c.beginPath(); c.moveTo(fx - 8, by + 1); c.quadraticCurveTo(lerp(fx - 8, hx, .5), by + 3, hx + 3, by); c.stroke();
      opath(hx, by, 6.5, 14 * g + .5, 0, 123); c.fillStyle = DEN; c.fill();
      if (flash) { opath(hx, by, 6.5, 14 * g + .5, 0, 123); c.fillStyle = `rgba(140,240,170,${.75 * flash})`; c.fill(); }
      if (g > .7) { c.strokeStyle = '#22264f'; c.lineWidth = 3.5; c.beginPath(); c.ellipse(hx, by, 6.5, 14 * g, 0, Math.PI * .64, Math.PI * 1.36); c.stroke(); } // the PSD
    }
    // the axon terminal: the axon flares into a club whose flat face (the active zone) meets the spine
    const term = () => { c.beginPath(); c.moveTo(-36, -1.6); c.bezierCurveTo(-26, -2, -27, -15, -13, -15); c.bezierCurveTo(-4, -15, 0, -11, 0, -7); c.quadraticCurveTo(1.2, 0, 0, 7); c.bezierCurveTo(0, 11, -4, 15, -13, 15); c.bezierCurveTo(-27, 15, -26, 2, -36, 1.6); c.closePath(); };
    c.save(); c.translate(F, by); c.scale(fa, fa);
    term(); c.fillStyle = 'rgba(230,168,107,.85)'; c.fill();
    c.save(); term(); c.clip(); const br = rnd(43); for (let i = 0; i < 70; i++) { c.fillStyle = br() < .5 ? 'rgba(250,215,170,.4)' : 'rgba(120,70,30,.18)'; c.fillRect(-30 + br() * 30, -15 + br() * 30, 1.2, 1.2); } c.restore();
    c.strokeStyle = '#c4844a'; c.lineWidth = 1.4; term(); c.stroke();
    if (fa > .6) { c.fillStyle = 'rgba(215,118,106,.9)'; rrect(-27, -10, 13, 7, 3.5); c.fill(); c.strokeStyle = 'rgba(120,40,35,.7)'; c.lineWidth = .8; for (let k = 0; k < 3; k++) { c.beginPath(); c.moveTo(-24.5 + k * 3.5, -9); c.lineTo(-23.5 + k * 3.5, -4); c.stroke(); } }
    if (fa > .8) { c.strokeStyle = '#7a4a28'; c.lineWidth = 2.2; c.beginPath(); c.moveTo(-.8, -8); c.quadraticCurveTo(.4, 0, -.8, 8); c.stroke(); }
    const vis = fa > .6, fusing = ph > .3 && ph < .62;
    S.ves.forEach((v) => { if (!vis || (v.d && fusing)) return; c.fillStyle = 'rgba(251,238,221,.9)'; c.strokeStyle = '#a87448'; c.lineWidth = .9; c.beginPath(); c.arc(v.x, v.y, 2.2, 0, 7); c.fill(); c.stroke(); });
    if (vis && fusing) { c.strokeStyle = '#a87448'; c.lineWidth = .9; [-4, 4].forEach((dy) => { c.beginPath(); c.arc(-3, dy, 2.4, Math.PI * .5, Math.PI * 1.5); c.stroke(); }); }
    c.restore();
    if (ph >= 0 && ph < .3) { const xx = lerp(x0 + 14, F - 30, ph / .3); c.strokeStyle = 'rgba(234,243,222,.9)'; c.lineWidth = 5; c.beginPath(); c.moveTo(xx - 6, yA(xx - 6)); c.lineTo(xx + 6, yA(xx + 6)); c.stroke(); }
    if (ph > .38 && ph < .6) { const p = (ph - .38) / .22, r2 = rnd(7); for (let k = 0; k < 7; k++) { c.fillStyle = `rgba(234,243,222,${1 - p * .5})`; c.beginPath(); c.arc(F + 2 + p * (hx - 8.5 - F), by + (r2() - .5) * 14 * (.5 + p), 1.1, 0, 7); c.fill(); } }
  }

  // ================= STRIPS: what sits above the question during a lesson =================
  const STRIP = {
    axon,
    oft(W, h, now) {
      const s = h - 8, ox = 4, oy = 4;
      c.fillStyle = '#cfcabf'; rrect(ox, oy, s, s, 3); c.fill(); c.strokeStyle = '#8f8a7f'; c.lineWidth = 3; rrect(ox, oy, s, s, 3); c.stroke();
      c.setLineDash([3, 3]); c.strokeStyle = 'rgba(60,60,60,.5)'; c.lineWidth = 1; c.strokeRect(ox + s * .25, oy + s * .25, s * .5, s * .5); c.setLineDash([]);
      c.strokeStyle = 'rgba(30,90,200,.6)'; c.lineWidth = .8; c.beginPath(); S.trail.slice(-900).forEach((p, i) => i ? c.lineTo(ox + p.x * s, oy + p.y * s) : c.moveTo(ox + p.x * s, oy + p.y * s)); c.stroke();
      drawMouse(ox + S.mouse.x * s, oy + S.mouse.y * s, S.mouse.h, .2);
      // ethogram: a green block per step done (explore), a coral sliver per miss (anxious)
      const ex = s + 16, ew = W - ex - 8, ey = h / 2 - 9, bw = Math.max(4, (ew - misses * 7) / N);
      c.fillStyle = '#2c2c2a'; rrect(ex, ey, ew, 18, 4); c.fill(); let x = ex;
      ev.forEach((e) => { const w = (e.k === 'ok' ? bw : 7) * ease(clamp((now - e.t) / 900)); c.fillStyle = e.k === 'ok' ? GREEN : BAD; rrect(x, ey, Math.max(.1, Math.min(w - 1, ex + ew - x)), 18, 3); c.fill(); x += w; });
      label('explore', ex, h - 6, GREEN); label('anxious', ex + 52, h - 6, BAD);
    },
    ca(W, h, now) {
      const fl = rnd(Math.floor(now / 33)); S.speck.forEach((p) => { c.fillStyle = `rgba(95,208,122,${p.o * (.7 + .6 * fl())})`; c.fillRect(p.x * W, p.y * h, 1.6, 1.6); });
      c.strokeStyle = 'rgba(10,10,9,.75)'; c.lineWidth = 6; c.beginPath(); c.moveTo(0, h * .85); c.quadraticCurveTo(W * .5, h * .05, W, h * .7); c.stroke();
      for (let i = 0; i < N; i++) {
        const x = S.cells[i % 15], X = (i + .5) / N * W + (x.x - .5) * 16, Y = h * .5 + (x.y - .33) * 34, v = Math.max(clamp(trF(x, now)), i < done ? .2 : 0), nc = `rgba(95,208,122,${.12 + .35 * v})`;
        [[x.n1, x.l1 * .5, 1.8], [x.n2, x.l2 * .5, 1.4]].forEach(([a, l, w0]) => { c.strokeStyle = nc; let px = X + Math.cos(a) * x.w * .6, py = Y + Math.sin(a) * x.h * .6, w = w0; for (let k = 0; k < 4; k++) { const nx = px + Math.cos(a + Math.sin(k * 1.3 + a) * .25) * l / 4, ny = py + Math.sin(a + Math.sin(k * 1.3 + a) * .25) * l / 4; c.lineWidth = w; c.beginPath(); c.moveTo(px, py); c.lineTo(nx, ny); c.stroke(); px = nx; py = ny; w *= .75; } });
        cell(X, Y, x.w * .8, x.h * .8, x.a, i * 17 + 3, [95, 208, 122], .4 + 1.4 * v); opath(X + .5, Y + .5, x.w * .33, x.h * .33, x.a, i * 17 + 9); c.fillStyle = `rgba(17,17,16,${.55 - .3 * v})`; c.fill();
      }
    },
    conf(W, h, now) {
      const x0 = 10, x1 = W - 58, blur = missing(now, 900), L = done / N, pt = (q) => [lerp(x0, x1, q), h * .55 + Math.sin(q * 7) * 6];
      c.strokeStyle = 'rgba(226,111,184,.12)'; c.lineWidth = 10; c.beginPath(); for (let q = 0; q <= 1.001; q += .02) { const [x, y] = pt(q); q ? c.lineTo(x, y) : c.moveTo(x, y); } c.stroke();
      if (done) { c.strokeStyle = `rgba(226,111,184,${blur ? .25 : .35 + .65 * L})`; for (let q = 0; q < 1; q += .02) { const [x, y] = pt(q), [x2, y2] = pt(q + .02); c.lineWidth = blur ? 7 : lerp(4, 1.6, q); c.beginPath(); c.moveTo(x, y); c.lineTo(x2, y2); c.stroke(); } }
      if (!blur) S.cs.forEach((sp) => {
        if (sp.z > L) return;
        const [px, py] = pt(sp.q), [qx, qy] = pt(sp.q + .01), ang = Math.atan2(qy - py, qx - px) + sp.side * (Math.PI / 2 + sp.tilt), len = sp.ty === 's' ? 2.4 : sp.len, ex = px + Math.cos(ang) * len, ey = py + Math.sin(ang) * len, cur = sp.z > (done - 1) / N && since(now) < 900;
        c.strokeStyle = cur ? '#ffd6ef' : MAG; c.lineWidth = sp.ty === 's' ? 2.4 : 1; c.beginPath(); c.moveTo(px, py); c.lineTo(ex, ey); c.stroke();
        if (sp.ty !== 's') { c.fillStyle = cur ? '#ffd6ef' : MAG; c.beginPath(); c.arc(ex, ey, sp.ty === 'm' ? 2 : 1.2, 0, 7); c.fill(); }
      });
      const bx = W - 48, bw = 40 / N; for (let i = 0; i < N; i++) { c.fillStyle = i < done ? MAG : '#2c2c2a'; rrect(bx + i * bw, 10, Math.max(1, bw - 2), h - 20, Math.min(2, bw / 3)); c.fill(); }
    },
    patch(W, h, now) {
      const e = lastEv(), pe = e?.k === 'ok' && since(now) < 900 ? (done - 1 + ease(since(now) / 900)) / N : done / N;
      patchScene(W, h, W * .66, 24, W * .28, 44, 1.5, pe, now, missing(now, 1200), -1);
    },
    rna(W, h, now) {
      [{ x: .42, y: .5, r: 17 }, { x: .12, y: .42, r: 12 }, { x: .66, y: .6, r: 12 }].forEach((n, i) => { const X = n.x * W, Y = n.y * h; cell(X, Y, n.r, n.r * .82, .3 + i, i * 29 + 5, [96, 120, 230], 1.25); const r = rnd(i * 31 + 7), k = 3 + Math.floor(r() * 3); for (let j = 0; j < k; j++) { const t = r() * 6.28, d = Math.sqrt(r()) * .55; c.fillStyle = 'rgba(190,205,255,.7)'; c.beginPath(); c.arc(X + Math.cos(t) * n.r * d, Y + Math.sin(t) * n.r * .82 * d, 1.2 + r(), 0, 7); c.fill(); } });
      const cx0 = W * .42, cy0 = h * .5, R = 17, pt = (p) => ({ x: cx0 + Math.cos(p.a) * R * p.d * 1.15, y: cy0 + Math.sin(p.a) * R * p.d * .95 });
      S.puncta.forEach((p) => { const a = clamp((now - p.t) / 300), q = pt(p); c.fillStyle = `rgba(242,120,90,${a})`; c.beginPath(); c.arc(q.x, q.y, 2.1 * a, 0, 7); c.fill(); });
      const bgAt = (b) => [W * (.5 + b.x * 1.4), h * (b.y - .65) * 2.5];
      S.bg.forEach((b) => { const [x, y] = bgAt(b); c.fillStyle = 'rgba(242,120,90,.55)'; c.beginPath(); c.arc(x, y, 2.1, 0, 7); c.fill(); });
      if (missing(now, 1500)) { const [x, y] = bgAt(S.bg[S.bg.length - 1]); c.strokeStyle = BAD; c.lineWidth = 1.4; c.beginPath(); c.arc(x, y, 8, 0, 7); c.stroke(); }
      c.fillStyle = 'rgba(18,18,17,.85)'; rrect(W - 68, h / 2 - 14, 58, 28, 7); c.fill(); label(`score ${rnaScore()}`, W - 60, h / 2 + 5, PALE, '500 13px -apple-system, system-ui, sans-serif');
    },
    pcr(W, h, now) {
      const e = lastEv(), act = e && since(now) < 1400, p = act ? since(now) / 1400 : -1, bad = act && e.k === 'miss', xa = 12, xb = W * .66, cy = h * .5;
      const sep = p < 0 ? 0 : p < .25 ? eio(p / .25) : p < .85 ? 1 : 1 - eio((p - .85) / .15), ann = clamp((p - .25) / .2), ext = bad ? 0 : eio(clamp((p - .45) / .4)), fade = p < .85 ? 1 : 1 - (p - .85) / .15;
      const yT = cy - 5 - 13 * sep, yB = cy + 5 + 13 * sep, hl = 5 * (1 - sep) + 4 * sep;
      c.strokeStyle = '#8a8478'; c.lineWidth = 1.6; for (let x = xa + 3; x < xb; x += 6) { c.beginPath(); c.moveTo(x, yT); c.lineTo(x, yT + hl); c.moveTo(x, yB); c.lineTo(x, yB - hl); c.stroke(); }
      c.strokeStyle = '#d9d3c4'; c.lineWidth = 3; c.beginPath(); c.moveTo(xa, yT); c.lineTo(xb, yT); c.moveTo(xa, yB); c.lineTo(xb, yB); c.stroke();
      const pw = (xb - xa) * .16, strand = (x0, x1, y, col, a) => { c.globalAlpha = a; c.strokeStyle = col; c.lineWidth = 3; c.beginPath(); c.moveTo(x0, y); c.lineTo(x1, y); c.stroke(); c.globalAlpha = 1; };
      if (p >= .25) {
        const d = (1 - ease(ann)) * 12;
        if (bad) { const q = clamp((p - .4) / .25); strand(xa, xa + pw, yB - 8 - d - q * 14, BAD, 1 - q); } // the primer doesn't stick
        else {
          strand(xa, xa + pw, yB - 8 - d, AMBER, fade); strand(xb - pw, xb, yT + 8 + d, MAG, fade);
          if (ext > 0) { strand(xa + pw, lerp(xa + pw, xb, ext), yB - 8, GREEN, fade); strand(lerp(xb - pw, xa, ext), xb - pw, yT + 8, GREEN, fade); }
        }
      }
      const copies = act && !bad && p < .85 ? Math.pow(2, Math.max(0, done - 1)) : Math.pow(2, done), pop = act && !bad && p >= .85 ? 1 + .25 * Math.sin((p - .85) / .15 * Math.PI) : 1;
      c.save(); c.translate(W * .83, cy + 2); c.scale(pop, pop); c.textAlign = 'center'; label(copies.toLocaleString(), 0, 2, PALE, '600 20px -apple-system, system-ui, sans-serif'); label(copies === 1 ? 'copy' : 'copies', 0, 18, TXT); c.restore(); c.textAlign = 'left';
    },
    spin(W, h, now) {
      spinStep(now, missing(now, 1300) ? Math.max(0, done / N - .15) : done / N);
      const m = missing(now, 1300), cx0 = 36, cy0 = h / 2, R = 23, wob = m ? Math.sin(now / 40) * 2.5 * (1 - since(now) / 1300) : 0;
      c.fillStyle = '#c9ccd3'; rrect(cx0 - R - 9, cy0 - R - 7, 2 * R + 18, 2 * R + 14, 10); c.fill(); c.fillStyle = '#2c2f35'; c.beginPath(); c.arc(cx0, cy0, R + 3, 0, 7); c.fill();
      c.save(); c.translate(cx0 + wob, cy0); c.rotate(S.ang); blob(0, 0, R, R, '#9aa0aa', '#7d838d'); c.fillStyle = '#808690'; c.beginPath(); c.arc(0, 0, R * .3, 0, 7); c.fill();
      for (let k = 0; k < 24; k++) { c.save(); c.rotate(k * Math.PI / 12); c.fillStyle = '#5d636d'; c.beginPath(); c.arc(R * .7, 0, 1.8, 0, 7); c.fill(); if (k % 4 === 0 && !(m && k === 4)) { c.fillStyle = 'rgba(235,240,246,.95)'; c.fillRect(R * .7 - 2.5, -1.8, 5, 3.6); } c.restore(); }
      if (S.speed > .3) { c.globalAlpha = Math.min(.4, S.speed * .4); c.strokeStyle = '#d7dbe2'; c.lineWidth = 2.5; for (let k = 0; k < 6; k++) { c.beginPath(); c.arc(0, 0, R * .7, k * Math.PI / 3, k * Math.PI / 3 + S.speed * .8); c.stroke(); } c.globalAlpha = 1; }
      c.restore();
      // ×g rises with the square of rpm (about 21,000 × g at 15,000 rpm in a 24-place rotor)
      const xg = Math.round(21130 * S.speed * S.speed / 10) * 10, rpm = Math.round(S.speed * 15000 / 100) * 100, x = cx0 + R + 22;
      label(`${xg.toLocaleString()} × g`, x, 26, m ? BAD : GREEN, '15px ui-monospace, Menlo, monospace'); label(`${rpm.toLocaleString()} rpm`, x, 42, TXT, '11px ui-monospace, Menlo, monospace');
      c.fillStyle = '#2c2c2a'; rrect(x, h - 14, W - x - 12, 5, 2.5); c.fill(); c.fillStyle = m ? BAD : GREEN; rrect(x, h - 14, Math.max(5, (W - x - 12) * S.speed), 5, 2.5); c.fill();
    },
    pip(W, h, now) {
      const n = N, x0 = 28, x1 = W - 28, xs = (i) => n > 1 ? lerp(x0, x1, i / (n - 1)) : W / 2, ww = Math.min(16, (x1 - x0) / Math.max(1, n - 1) - 3), e = lastEv(), m = missing(now, 1200);
      c.fillStyle = '#d9d7cf'; rrect(x0 - 20, h - 30, x1 - x0 + 40, 26, 5); c.fill();
      for (let i = 0; i < n; i++) { const f = i < done ? ease(clamp((now - okT(i) - 350) / 500)) : 0, X = xs(i); c.fillStyle = '#3a3936'; rrect(X - ww / 2, h - 27, ww, 20, Math.min(5, ww / 3)); c.fill(); if (f > 0) { c.fillStyle = 'rgba(236,140,160,.9)'; rrect(X - ww / 2 + 1, h - 8 - 12 * f, ww - 2, 12 * f, Math.min(4, ww / 4)); c.fill(); } }
      const disp = e?.k === 'ok' && since(now) < 900, idx = disp ? done - 1 : Math.min(done, n - 1), tx = xs(idx), t = disp ? since(now) / 900 : 0;
      const ty = h - 31 + (disp ? Math.sin(clamp(t / .8) * Math.PI) * 8 : 0), liq = disp ? 1 - clamp((t - .3) / .3) : 1;
      c.fillStyle = '#e4e6e9'; c.fillRect(tx - 4, -4, 8, ty - 28); c.fillStyle = '#cfd3d8'; rrect(tx - 5, ty - 34, 10, 8, 2); c.fill();
      const tipP = () => { c.beginPath(); c.moveTo(tx - 3, ty - 26); c.lineTo(tx + 3, ty - 26); c.lineTo(tx + .7, ty); c.lineTo(tx - .7, ty); c.closePath(); };
      c.fillStyle = 'rgba(200,225,245,.25)'; tipP(); c.fill();
      if (liq > 0) { c.save(); tipP(); c.clip(); c.fillStyle = m ? 'rgba(240,153,123,.85)' : 'rgba(236,140,160,.85)'; c.fillRect(tx - 4, ty - 11 * liq, 8, 11 * liq); c.restore(); }
      c.strokeStyle = 'rgba(220,235,250,.75)'; c.lineWidth = 1; tipP(); c.stroke();
      if (m) { c.strokeStyle = 'rgba(234,243,222,.9)'; c.beginPath(); c.arc(tx, ty - 7, 2, 0, 7); c.stroke(); } // an air bubble
    },
  };
  function spinStep(now, target) { const dt = lastFrame ? Math.min(50, now - lastFrame) : 16; S.speed += (target - S.speed) * .035; S.ang += S.speed * dt * .05; }
  const rnaScore = () => { const n = S.puncta.length; return n > 15 ? 4 : n >= 10 ? 3 : n >= 4 ? 2 : n >= 1 ? 1 : 0; };

  // ================= FINALES: the strip expands when the lesson is done =================
  const FIN = {
    axon,
    oft(W, H, now) {
      const s = Math.min(W - 24, H - 16), ox = (W - s) / 2, oy = 8, a = clamp((fage(now) - 300) / 1200);
      c.fillStyle = '#cfcabf'; rrect(ox, oy, s, s, 4); c.fill(); c.strokeStyle = '#8f8a7f'; c.lineWidth = 5; rrect(ox, oy, s, s, 4); c.stroke();
      c.strokeStyle = `rgba(30,90,200,${.7 * (1 - a * .6)})`; c.lineWidth = 1; c.beginPath(); S.trail.forEach((p, i) => i ? c.lineTo(ox + p.x * s, oy + p.y * s) : c.moveTo(ox + p.x * s, oy + p.y * s)); c.stroke();
      if (a > 0) {
        // a soft occupancy heatmap: an 8×8 grid of time spent, smoothed by scaling it up
        const B = 8, g = Array(B * B).fill(0);
        S.trail.forEach((p) => { g[Math.min(B - 1, Math.floor(p.y * B)) * B + Math.min(B - 1, Math.floor(p.x * B))]++; });
        const mx = Math.max(...g) || 1, hm = document.createElement('canvas'); hm.width = hm.height = B;
        const hx = hm.getContext('2d'), img = hx.createImageData(B, B);
        g.forEach((v, i) => { const t = Math.pow(v / mx, .5), col = t < .5 ? [110, 40, 120].map((x, k) => lerp(x, [235, 110, 60][k], t * 2)) : [235, 110, 60].map((x, k) => lerp(x, [250, 225, 140][k], (t - .5) * 2)); img.data.set([...col.map(Math.round), Math.round(255 * (.06 + .72 * t))], i * 4); });
        hx.putImageData(img, 0, 0);
        c.save(); rrect(ox, oy, s, s, 4); c.clip(); c.globalAlpha *= a; c.imageSmoothingEnabled = true; c.imageSmoothingQuality = 'high'; c.drawImage(hm, ox, oy, s, s); c.restore();
      }
      c.setLineDash([5, 5]); c.strokeStyle = 'rgba(60,60,60,.6)'; c.lineWidth = 1.2; c.strokeRect(ox + s * .25, oy + s * .25, s * .5, s * .5); c.setLineDash([]);
      drawMouse(ox + S.mouse.x * s, oy + S.mouse.y * s, S.mouse.h, .6);
    },
    ca(W, H, now) {
      const fh = H * .6, Y = (y) => y * fh + 10;
      const fl = rnd(Math.floor(now / 33)); S.speck.forEach((p) => { c.fillStyle = `rgba(95,208,122,${p.o * (.7 + .6 * fl())})`; c.fillRect(p.x * W, p.y * fh + 8, 1.6, 1.6); });
      c.strokeStyle = 'rgba(10,10,9,.75)'; c.lineCap = 'round'; [[.05, .1, .4, .5, .95, .3, 9], [.2, .85, .5, .55, .7, .05, 6]].forEach(([a, b, cc, d, e, f, w]) => { c.lineWidth = w; c.beginPath(); c.moveTo(a * W, Y(b)); c.quadraticCurveTo(cc * W, Y(d), e * W, Y(f)); c.stroke(); });
      S.cells.forEach((x, i) => {
        const v = clamp(trF(x, now)), X = x.x * W, Yc = Y(x.y), nc = `rgba(95,208,122,${.12 + .35 * v})`;
        [[x.n1, x.l1, 2.2], [x.n2, x.l2, 1.8]].forEach(([a, l, w0]) => { c.strokeStyle = nc; let px = X + Math.cos(a) * x.w * .8, py = Yc + Math.sin(a) * x.h * .8, w = w0; for (let k = 0; k < 5; k++) { const nx = px + Math.cos(a + Math.sin(k * 1.3 + a) * .25) * l / 5, ny = py + Math.sin(a + Math.sin(k * 1.3 + a) * .25) * l / 5; c.lineWidth = w; c.beginPath(); c.moveTo(px, py); c.lineTo(nx, ny); c.stroke(); px = nx; py = ny; w *= .75; } });
        cell(X, Yc, x.w, x.h, x.a, i * 17 + 3, [95, 208, 122], .4 + 1.4 * v); opath(X + .5, Yc + .5, x.w * .42, x.h * .42, x.a, i * 17 + 9); c.fillStyle = `rgba(17,17,16,${.55 - .3 * v})`; c.fill();
      });
      c.fillStyle = PALE; c.fillRect(W - 50, fh + 2, 30, 2); label('20 µm', W - 52, fh - 2);
      const top = fh + 14, rh = (H - top - 4) / 4;
      S.cells.slice(0, 4).forEach((x, i) => { const y0 = top + rh * (i + 1) - 4; c.strokeStyle = GREEN; c.lineWidth = 1.3; c.beginPath(); for (let k = 0; k <= 120; k++) { const tt = now - (120 - k) * 25, xx = 40 + (W - 50) * k / 120, yy = y0 - trF(x, tt) * rh * .8 + (Math.sin(tt / 37 + i * 7) + Math.sin(tt / 13 + i)) * .45; k ? c.lineTo(xx, yy) : c.moveTo(xx, yy); } c.stroke(); label(`cell ${i + 1}`, 2, y0); });
      label('ΔF/F', 2, top - 2);
    },
    conf(W, H, now) {
      const cx0 = W * .45, cy0 = H * .58, spin = Math.cos(fage(now) / 800), P = (x, y) => [cx0 + x * spin, cy0 + y];
      S.segs.forEach((s) => { const [a, b] = P(s.x, s.y), [cc, d] = P(s.x2, s.y2); c.strokeStyle = 'rgba(226,111,184,.14)'; c.lineWidth = s.w + 6; c.beginPath(); c.moveTo(a, b); c.lineTo(cc, d); c.stroke(); });
      S.segs.forEach((s) => { const [a, b] = P(s.x, s.y), [cc, d] = P(s.x2, s.y2); c.strokeStyle = MAG; c.lineWidth = s.w; c.lineCap = 'round'; c.beginPath(); c.moveTo(a, b); c.lineTo(cc, d); c.stroke(); });
      S.spines.forEach((sp) => {
        const s = sp.s, px = s.x + (s.x2 - s.x) * sp.q, py = s.y + (s.y2 - s.y) * sp.q, ang = Math.atan2(s.y2 - s.y, s.x2 - s.x) + sp.side * (Math.PI / 2 + sp.tilt), len = sp.ty === 's' ? 2.2 : sp.len, [a, b] = P(px, py), [cc, d] = P(px + Math.cos(ang) * len, py + Math.sin(ang) * len);
        if (!sp.det) { c.strokeStyle = MAG; c.lineWidth = sp.ty === 's' ? 2.2 : .9; c.beginPath(); c.moveTo(a, b); c.lineTo(cc, d); c.stroke(); }
        if (sp.ty !== 's') { c.fillStyle = sp.det ? 'rgba(226,111,184,.75)' : MAG; c.beginPath(); c.arc(cc, d, sp.ty === 'm' ? 1.9 : 1.1, 0, 7); c.fill(); }
      });
      cell(cx0, cy0, 13 * Math.abs(spin) + 2, 12, 0, 4, [226, 111, 184], 1.7); c.fillStyle = PALE; c.fillRect(W - 50, H - 14, 30, 2); label('20 µm', W - 52, H - 18);
    },
    patch(W, H, now) {
      const sh = 212, brk = clamp(fage(now) / 700);
      if (!S.ic) S.ic = simIC();
      const n = S.ic.length, t0 = fage(now) - 900, head = t0 > 0 ? Math.min(800, (t0 % 2600) / 1900 * 800) : 0, vh = t0 > 0 ? S.ic[Math.min(n - 1, Math.floor(head / 800 * n))] : -68;
      c.save(); c.beginPath(); c.rect(0, 0, W, sh); c.clip();
      patchScene(W, sh, W * .6, 58, W * .3, 62, 1.8, 1, now, false, brk);
      if (vh > -10) { c.strokeStyle = 'rgba(234,243,222,.55)'; c.lineWidth = 2; c.beginPath(); c.ellipse(W * .6, 120, W * .3 + 4, 66, 0, 0, 7); c.stroke(); }
      c.restore();
      // one clean recording underneath: the cell fires once the current step starts
      c.fillStyle = '#1b1b1a'; rrect(4, sh + 6, W - 8, H - sh - 10, 10); c.fill();
      const y0 = sh + 12, hh = H - sh - 22, vy = (v) => y0 + (45 - v) / 135 * hh, x0 = 12, tw = W - 24, cols = Math.floor(tw * head / 800);
      c.strokeStyle = TRACK; c.lineWidth = 1.2; c.beginPath(); c.moveTo(x0, vy(-68));
      for (let i = 0; i < cols; i++) { const s0 = Math.floor(i / tw * n), s1 = Math.max(s0 + 1, Math.floor((i + 1) / tw * n)); let lo = 1e9, hi = -1e9; for (let j = s0; j < s1; j++) { const v = S.ic[j]; if (v < lo) lo = v; if (v > hi) hi = v; } const X = x0 + i + .5; c.lineTo(X, vy(S.ic[s0])); c.lineTo(X, vy(hi)); c.lineTo(X, vy(lo)); c.lineTo(X, vy(S.ic[s1 - 1])); }
      c.stroke();
    },
    rna(W, H, now) {
      const nuc = [{ x: .45, y: .5, r: 24 }, { x: .14, y: .24, r: 18 }, { x: .82, y: .3, r: 20 }, { x: .78, y: .8, r: 17 }, { x: .2, y: .78, r: 16 }], main = nuc[0], cx0 = main.x * W, cy0 = main.y * H;
      nuc.forEach((n, i) => { const X = n.x * W, Y = n.y * H; cell(X, Y, n.r, n.r * .82, .3 + i, i * 29 + 5, [96, 120, 230], 1.25); const r = rnd(i * 31 + 7), k = 3 + Math.floor(r() * 3); for (let j = 0; j < k; j++) { const t = r() * 6.28, d = Math.sqrt(r()) * .55; c.fillStyle = 'rgba(190,205,255,.7)'; c.beginPath(); c.arc(X + Math.cos(t) * n.r * d, Y + Math.sin(t) * n.r * .82 * d, 1.4 + r() * 1.2, 0, 7); c.fill(); } });
      const pt = (p) => ({ x: cx0 + Math.cos(p.a) * main.r * p.d * 1.15, y: cy0 + Math.sin(p.a) * main.r * p.d });
      S.puncta.forEach((p) => { const q = pt(p); c.fillStyle = 'rgb(242,120,90)'; c.beginPath(); c.arc(q.x, q.y, 2.2, 0, 7); c.fill(); });
      const a = clamp(fage(now) / 800), r = rnd(9); for (let k = 0; k < 8; k++) { const q = pt({ a: r() * 6.28, d: 1.2 + r() * .6 }); c.fillStyle = `rgba(109,213,140,${a})`; c.beginPath(); c.arc(q.x, q.y, 2.1, 0, 7); c.fill(); } // the second channel
      c.fillStyle = 'rgba(18,18,17,.8)'; rrect(W - 74, 10, 64, 30, 8); c.fill(); label(`score ${rnaScore()}`, W - 66, 30, PALE, '500 13px -apple-system, system-ui, sans-serif');
      c.fillStyle = PALE; c.fillRect(W - 50, H - 12, 30, 2); label('5 µm', W - 50, H - 16);
    },
    pcr(W, H, now) {
      // the copies pile up into one band in a gel lane under UV
      const a = fage(now), lx = W * .5 - 24, lw = 48, ly = 40, lh = H - 80, by = ly + lh * .45;
      c.fillStyle = 'rgb(40,20,64)'; rrect(6, 6, W - 12, H - 12, 12); c.fill(); c.fillStyle = 'rgba(66,40,98,.9)'; rrect(lx - 26, ly - 12, lw + 52, lh + 24, 6); c.fill(); c.fillStyle = '#0d0f10'; rrect(lx + 6, ly, lw - 12, 6, 2); c.fill();
      const r = rnd(5); let landed = 0;
      for (let i = 0; i < 64; i++) { const sx = 20 + r() * (W - 40), sy = 20 + r() * (H - 40), jx = (r() - .5) * 24, t = eio(clamp((a - i * 16) / 900)); if (t >= 1) { landed++; continue; } const x = lerp(sx, lx + lw / 2 + jx, t), y = lerp(sy, by + 2, t); c.fillStyle = '#d9d3c4'; c.fillRect(x - 6, y - 2, 12, 1.6); c.fillStyle = GREEN; c.fillRect(x - 6, y + 1, 12, 1.6); }
      const b = landed / 64, w = lw - 12, x = lx + 6;
      c.fillStyle = `rgba(255,170,150,${.1 + .9 * b})`; c.beginPath(); c.moveTo(x, by); c.quadraticCurveTo(x + w / 2, by + 3, x + w, by); c.lineTo(x + w, by + 6); c.quadraticCurveTo(x + w / 2, by + 9, x, by + 6); c.closePath(); c.fill();
    },
    spin(W, H, now) {
      spinStep(now, 1);
      const cx0 = W * .33, cy0 = H * .5, R = Math.min(70, W * .2);
      c.fillStyle = '#c9ccd3'; rrect(cx0 - R - 22, cy0 - R - 20, 2 * R + 44, 2 * R + 40, 22); c.fill(); c.fillStyle = '#2c2f35'; c.beginPath(); c.arc(cx0, cy0, R + 7, 0, 7); c.fill();
      c.save(); c.translate(cx0, cy0); c.rotate(S.ang); blob(0, 0, R, R, '#9aa0aa', '#7d838d'); c.fillStyle = '#808690'; c.beginPath(); c.arc(0, 0, R * .3, 0, 7); c.fill();
      for (let k = 0; k < 24; k++) { c.save(); c.rotate(k * Math.PI / 12); c.fillStyle = '#5d636d'; c.beginPath(); c.ellipse(R * .7, 0, 5.5, 3.6, 0, 0, 7); c.fill(); if (k % 4 === 0) { c.translate(R * .7, 0); c.rotate(Math.PI / 2); c.fillStyle = 'rgba(235,240,246,.9)'; rrect(-4, -5, 8, 12, 2.5); c.fill(); } c.restore(); }
      c.globalAlpha *= .4; c.strokeStyle = '#d7dbe2'; c.lineWidth = 4; for (let k = 0; k < 6; k++) { c.beginPath(); c.arc(0, 0, R * .7, k * Math.PI / 3, k * Math.PI / 3 + .8); c.stroke(); } c.restore();
      c.save(); c.globalAlpha *= clamp((fage(now) - 400) / 800); eppi(W * .8, cy0 - 50, 1.7, .4, true); c.restore();
    },
    pip(W, H, now) {
      // the full P20: blue grip, finger hook, plunger, separate tip ejector, volume window
      const tx = W * .5, ty = H - 34, a = clamp(fage(now) / 600);
      c.fillStyle = '#d9d7cf'; rrect(W * .12, H - 30, W * .76, 24, 5); c.fill();
      for (let i = 0; i < 6; i++) { const X = lerp(W * .18, W * .82, i / 5); c.fillStyle = '#3a3936'; rrect(X - 8, H - 27, 16, 18, 5); c.fill(); c.fillStyle = 'rgba(236,140,160,.9)'; rrect(X - 7, H - 19, 14, 9, 4); c.fill(); }
      const tipP = () => { c.beginPath(); c.moveTo(tx - 3.5, ty - 38); c.lineTo(tx + 3.5, ty - 38); c.lineTo(tx + .8, ty); c.lineTo(tx - .8, ty); c.closePath(); };
      c.fillStyle = 'rgba(200,225,245,.22)'; tipP(); c.fill(); c.strokeStyle = 'rgba(220,235,250,.75)'; c.lineWidth = 1; tipP(); c.stroke();
      c.fillStyle = '#cfd3d8'; rrect(tx - 5.5, ty - 51, 11, 14, 3); c.fill(); c.fillStyle = '#e4e6e9'; c.beginPath(); c.moveTo(tx - 6.5, ty - 98); c.lineTo(tx + 6.5, ty - 98); c.lineTo(tx + 4, ty - 50); c.lineTo(tx - 4, ty - 50); c.closePath(); c.fill();
      c.strokeStyle = '#a9aeb5'; c.lineWidth = 3; c.beginPath(); c.moveTo(tx + 10, ty - 100); c.lineTo(tx + 6, ty - 52); c.stroke();
      c.fillStyle = '#2a4f8a'; rrect(tx - 9, ty - 104, 18, 9, 3); c.fill(); c.fillStyle = '#3e6cb4'; rrect(tx - 13, ty - 170, 26, 70, 9); c.fill(); c.fillStyle = '#5482c6'; rrect(tx - 11, ty - 166, 5, 62, 2.5); c.fill();
      c.strokeStyle = '#2f5694'; c.lineWidth = 2; for (let y = ty - 146; y <= ty - 108; y += 6) { c.beginPath(); c.moveTo(tx + 1, y); c.lineTo(tx + 12, y); c.stroke(); }
      c.fillStyle = '#1a1c20'; rrect(tx - 5, ty - 164, 14, 36, 3); c.fill(); ['0', '2', '0'].forEach((d, i) => label(d, tx - 1.5, ty - 151 + i * 11, PALE, '11px ui-monospace, Menlo, monospace'));
      c.fillStyle = '#3e6cb4'; rrect(tx - 26, ty - 178, 32, 9, 4.5); c.fill(); c.fillStyle = '#2f5694'; rrect(tx - 26, ty - 172, 32, 3, 1.5); c.fill();
      c.fillStyle = '#c4c9cf'; c.fillRect(tx + 7, ty - 186, 3.5, 16); rrect(tx + 4, ty - 191, 10, 6, 2.5); c.fill();
      c.fillStyle = '#9aa1aa'; c.fillRect(tx - 2, ty - 196, 4, 20); c.fillStyle = '#b9c0c9'; c.beginPath(); c.ellipse(tx, ty - 195, 9, 3.5, 0, 0, 7); c.fill(); c.fillStyle = '#e9ecf0'; c.beginPath(); c.ellipse(tx, ty - 197, 9, 3.5, 0, 0, 7); c.fill();
      c.strokeStyle = `rgba(234,243,222,${a})`; c.lineWidth = 2.4; c.beginPath(); c.moveTo(W * .78, H * .32); c.lineTo(W * .82, H * .36); c.lineTo(W * .9, H * .26); c.stroke();
    },
  };

  // ---------- frame loop ----------
  function resize() {
    dpr = window.devicePixelRatio || 1;
    W = Math.max(160, Math.round(host.clientWidth));
    H = Math.max(30, Math.round(host.clientHeight));
    canvas.width = W * dpr; canvas.height = H * dpr;
    canvas.style.width = `${W}px`; canvas.style.height = `${H}px`;
  }
  // Each layer is drawn on its own canvas, then faded in, so a scene's own
  // alpha changes can't leak into the crossfade.
  function layer(fn, a) {
    off.width = canvas.width; off.height = canvas.height;
    c = off.getContext('2d'); c.setTransform(dpr, 0, 0, dpr, 0, 0); c.lineCap = 'round';
    fn();
    c = main;
    main.save(); main.setTransform(1, 0, 0, 1, 0, 0); main.globalAlpha = a; main.drawImage(off, 0, 0); main.restore();
  }
  // With reduced motion, time stands still a few seconds after the latest event,
  // so every transition shows its end state.
  const clock = (real) => (still ? (fin ? fin + FINALE_MS : (lastEv()?.t ?? 0) + 4000) : real);
  function draw(real) {
    if (signal.aborted) return;
    if (!W) resize();
    const now = clock(real);
    if (kind === 'oft' && !still) { let dt = lastFrame ? Math.min(.1, (real - lastFrame) / 1000) : .016; while (dt > 0) { oftSim(Math.min(.02, dt)); dt -= .02; } }
    c = main; main.setTransform(1, 0, 0, 1, 0, 0); main.clearRect(0, 0, canvas.width, canvas.height); main.setTransform(dpr, 0, 0, dpr, 0, 0);
    main.fillStyle = '#1b1b1a'; rrect(0, 0, W, H, 12); main.fill();
    main.save(); rrect(0, 0, W, H, 12); main.clip();
    const e = fin ? eio(clamp((real - fin) / 600)) : 0;
    if (e < 1) layer(() => STRIP[kind](W, SH, now), 1 - e);
    if (e > 0) layer(() => FIN[kind](W, Math.max(H, FH), now), e);
    main.restore();
    lastFrame = real;
    requestAnimationFrame(draw);
  }
  const ro = new ResizeObserver(resize);
  ro.observe(host);
  signal.addEventListener('abort', () => ro.disconnect());
  requestAnimationFrame(draw);

  const event = (k) => {
    const t = performance.now();
    ev.push({ k, t });
    if (kind === 'oft') { oftEvent(k); if (still) for (let i = 0; i < 200; i++) oftSim(.02); }
    return t;
  };
  return {
    layout(steps, nMisses, step) {
      N = Math.max(1, steps);
      canvas.setAttribute('aria-label', `Step ${Math.min(step, steps)} of ${steps}`);
    },
    epsp() {
      done++;
      const t = event('ok');
      if (kind === 'ca') S.cells[(done - 1) % 15].fires.push({ t, a: 1 });
      if (kind === 'rna') { const r = rnd(done * 13); for (let k = 0; k < 3; k++) S.puncta.push({ a: r() * 6.28, d: 1.15 + r() * .7, t }); }
    },
    ipsp() {
      misses++;
      const t = event('miss');
      if (kind === 'ca') S.cells[(done + 3) % 15].fires.push({ t, a: .25 });
      if (kind === 'rna') S.bg.push({ x: .05 + Math.random() * .15, y: .75 + Math.random() * .18, t });
    },
    setCharge() {},
    finale({ onPeak } = {}) {
      return new Promise((resolve) => {
        // let the last step's animation land in the strip, then expand
        setTimeout(() => {
          fin = performance.now();
          if (kind === 'ca') S.cells.forEach((x) => x.fires.push({ t: fin + 300, a: 1.2 }));
          host.classList.add('expanded');
          setTimeout(() => onPeak?.({ x: W / 2, y: FH / 2 }, LABELS[kind]), still ? 0 : PEAK_MS);
          setTimeout(resolve, still ? 1800 : FINALE_MS);
        }, still ? 0 : kind === 'pcr' ? 1300 : 700);
      });
    },
    refreshColors() {},
  };
}
