// Specimen slides for the slide box (views/slidebox.js). One slide per unit:
// what it shows comes from content/slides.json (written by the Project); how
// it's drawn lives here, as a fixed library of tissues. Two looks per slide:
//   slideSVG()  the glass slide as it looks to the eye (in the box, or held up)
//   scopeView() the section under the microscope
// Fluorescence layers blend with "screen" so channels add like a real merge;
// positions are jittered and seeded so a slide looks the same every time.
// The drawing code is compact on purpose: it's artwork, tuned against
// published images (see the comment on each tissue).

const rnd = (s) => () => (s = Math.imul(s ^ s >>> 15, 2246822507) + 1013904223 >>> 0) / 4294967296;
const f = (n) => Math.round(n * 10) / 10;
const esc = (s) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const C = (x, y, r, fill, extra = '') => `<circle cx="${f(x)}" cy="${f(y)}" r="${f(r)}" fill="${fill}" ${extra}/>`;
const T = (x, y, s, col, anchor = 'start') => `<text x="${x}" y="${y}" font-size="3.4" font-family="-apple-system,system-ui,sans-serif" font-weight="600" fill="${col}" text-anchor="${anchor}">${esc(s)}</text>`;
const bar = (len, lab, dark) => `<line x1="${94 - len}" y1="56" x2="94" y2="56" stroke="${dark ? '#222' : '#EAF3DE'}" stroke-width=".8"/>` + T(94, 53.6, lab, dark ? '#222' : '#EAF3DE', 'end');
const rgba = (hex, a) => { const n = parseInt(hex.slice(1), 16); return `rgba(${n >> 16},${n >> 8 & 255},${n & 255},${f(a)})`; };
const noise = (r, n, col, a) => { let s = ''; for (let i = 0; i < n; i++) s += `<rect x="${f(r() * 100)}" y="${f(r() * 60)}" width=".35" height=".35" fill="${rgba(col, a * (.4 + r() * .6))}"/>`; return s; };
const ell = (x, y, rx, ry, rot, fill, extra = '') => `<ellipse cx="${f(x)}" cy="${f(y)}" rx="${f(rx)}" ry="${f(ry)}" transform="rotate(${Math.round(rot)} ${f(x)} ${f(y)})" fill="${fill}" ${extra}/>`;
const SCREEN = 'style="mix-blend-mode:screen"';
let uid = 0;

// Jittered, non-overlapping circles inside a shape.
function pack(r, n, inside, rmin, rmax, gap = .5, tries = 3000, box = [0, 0, 100, 60], pw = 1.6) {
  const out = [];
  for (let t = 0; t < tries && out.length < n; t++) {
    const x = box[0] + r() * (box[2] - box[0]), y = box[1] + r() * (box[3] - box[1]), R = rmin + Math.pow(r(), pw) * (rmax - rmin);
    if (inside(x, y, R) && out.every((c) => Math.hypot(c.x - x, c.y - y) > c.R + R + gap)) out.push({ x, y, R });
  }
  return out;
}
// A smooth closed path through points (Catmull-Rom as cubic Béziers).
function smoothPath(P) {
  let d = `M${f(P[0][0])} ${f(P[0][1])}`;
  for (let i = 0; i < P.length; i++) {
    const p0 = P[(i - 1 + P.length) % P.length], p1 = P[i], p2 = P[(i + 1) % P.length], p3 = P[(i + 2) % P.length];
    d += ` C${f(p1[0] + (p2[0] - p0[0]) / 6)} ${f(p1[1] + (p2[1] - p0[1]) / 6)} ${f(p2[0] - (p3[0] - p1[0]) / 6)} ${f(p2[1] - (p3[1] - p1[1]) / 6)} ${f(p2[0])} ${f(p2[1])}`;
  }
  return d + 'Z';
}

// ---------- brain-coronal: a real Allen section (content/assets/atlas/<unit>.json, made by dev/atlas.py) ----------
// The plate is a hemisphere drawn mirrored. Looks: 'nissl' (violet, on glass), 'stain' (Nissl with the slide's
// regions highlighted and labelled), 'atlas' (Allen's own region colours), 'ghost' (a pale fluorescence section).
const hash = (s) => [...s].reduce((h, c) => (h * 31 + c.charCodeAt(0)) >>> 0, 7);
function centroids(atlas) {
  const sums = {};
  atlas.r.forEach(([, , fl, d]) => {
    if (!fl.startsWith('h')) return;
    const s = (sums[fl] ||= [0, 0, 0]);
    d.replace(/(-?\d+),(-?\d+)/g, (_, x, y) => { s[0] += +x; s[1] += +y; s[2]++; });
  });
  return Object.entries(sums).map(([fl, [x, y, n]]) => ({ i: +fl.slice(1), x: x / n, y: y / n }));
}
function brain(atlas, m, hl = '#1D9E75') {
  const id = 'b' + (uid++), s = 58 / atlas.h;
  let p = '', hi = '';
  atlas.r.forEach(([acr, col, fl, d]) => {
    let fill;
    if (m === 'atlas') fill = '#' + col;
    else if (m === 'ghost') fill = fl === 'v' ? 'none' : 'rgba(225,220,208,.22)';
    else if (fl === 'v') fill = 'none';
    else if (fl === 'f') fill = '#e9e1ee';
    else {
      // Nissl: cortical layer 1 is pale (few cells), layer 4 dense
      const h = hash(acr);
      let L = 50 + h % 10;
      if (/1$/.test(acr)) L += 16; else if (/4$/.test(acr)) L -= 8; else if (/2\/3$/.test(acr)) L -= 4;
      fill = `hsl(${282 + h % 12},${30 + h % 12}%,${L}%)`;
    }
    p += `<path d="${d}" fill="${fill}"${m === 'atlas' ? ' stroke="rgba(0,0,0,.3)" stroke-width=".35"' : ''}/>`;
    if (m === 'stain' && fl.startsWith('h')) hi += `<path d="${d}" fill="${hl}" fill-opacity=".45" stroke="${hl}" stroke-width=".6"/>`;
  });
  let out = `<g transform="translate(50,1) scale(${s})"><g id="${id}">${p}${hi}</g><use href="#${id}" transform="scale(-1,1)"/></g>`;
  if (m === 'stain' || m === 'atlas') {
    centroids(atlas).forEach((c, k) => {
      const x = 50 + c.x * s, y = 1 + c.y * s, dy = k % 2 ? 4 : -4, name = atlas.regions[c.i];
      const tx = Math.min(x + 9.5, 99 - name.length * 2.2); // keep long names (e.g. "Isocortex") inside the frame
      out += `<line x1="${f(x)}" y1="${f(y)}" x2="${f(x + 9)}" y2="${f(y + dy)}" stroke="#222" stroke-width=".3"/>` + T(f(tx), f(y + dy + (dy > 0 ? 2.6 : -.5)), name, '#222');
    });
  }
  return out;
}

// ---------- DRG (longitudinal): neurons crowd the rim, fibres run through the core into the root. NF200 (green)
// marks medium/large neurons, CGRP (magenta) small/medium ones, granular with a perinuclear cap; DAPI shows pale
// neuronal nuclei and 3–8 crescent satellite-glia nuclei per neuron. Refs: PMC8244979, PMC7899077. ----------
function drg() {
  const r = rnd(7), cx = 60, cy = 31, rx = 34, ry = 22;
  const inG = (x, y, R) => ((x - cx) / (rx - R)) ** 2 + ((y - cy) / (ry - R)) ** 2 < 1;
  const core = (x, y) => Math.abs(y - cy - (x - cx) * .08) < 5.5 - ((x - cx) / rx) ** 2 * 3 && x < cx + rx * .7;
  let g = '', mg = '', b = '';
  for (let i = 0; i < 22; i++) { const y0 = cy - 4 + i * .38 + (r() - .5) * .3, end = cx + rx * (.2 + r() * .6); g += `<path d="M0 ${f(y0)} C 18 ${f(y0 - .6)}, 30 ${f(y0 + .5)}, 40 ${f(y0 + (r() - .5) * 1.2)} S ${f(end - 12)} ${f(cy + (y0 - cy) * 1.3 + (r() - .5) * 3)}, ${f(end)} ${f(cy + (r() - .5) * 24)}" stroke="${rgba('#3cff6a', .18 + r() * .3)}" stroke-width="${f(.2 + r() * .3)}" fill="none"/>`; }
  for (let i = 0; i < 9; i++) { let x = 20 + r() * 60, y = cy + (r() - .5) * 30; for (let k = 0; k < 14; k++) { x += 1.3 + r(); y += (r() - .5) * 1.6; if (inG(x, y, 0) || x < 40) mg += C(x, y, .17, rgba('#ff4fa0', .85)); } }
  for (let i = 0; i < 30; i++) b += ell(4 + r() * 44, cy - 4 + r() * 8, 1, .28, (r() - .5) * 8, rgba('#4f74ff', .75));
  for (let i = 0; i < 40; i++) { const a = r() * 6.283; if (Math.cos(a) < -.85) continue; b += ell(cx + Math.cos(a) * (rx + .6), cy + Math.sin(a) * (ry + .6), .9, .25, Math.atan2(Math.sin(a) * rx, Math.cos(a) * ry) * 57.3 + 90, rgba('#4f74ff', .8)); }
  pack(r, 110, (x, y, R) => inG(x, y, R + .4) && !core(x, y), 1.1, 4.1, .75, 9000, [cx - rx, cy - ry, cx + rx, cy + ry], 1.25).forEach((c) => {
    const big = c.R > 2.6, med = c.R > 1.9, u = r(), nf = big ? u < .85 : med ? u < .45 : u < .08, cg = big ? u > .92 : med ? u > .55 : u > .45, k = .6 + r() * .5;
    const sx = c.R * (1 + (r() - .5) * .25), sy = c.R * (1 + (r() - .5) * .25), rot = r() * 180, nx = c.x + (r() - .5) * c.R * .3, ny = c.y + (r() - .5) * c.R * .3;
    if (nf) g += ell(c.x, c.y, sx * 1.18, sy * 1.18, rot, rgba('#3cff6a', .2 * k)) + ell(c.x, c.y, sx, sy, rot, rgba('#3cff6a', .6 * k)) + C(nx, ny, c.R * .36, '#020302');
    if (cg) {
      const a = r() * 6.283;
      mg += ell(c.x, c.y, sx, sy, rot, rgba('#ff3a8a', .28 * k)) + ell(nx + Math.cos(a) * c.R * .5, ny + Math.sin(a) * c.R * .5, c.R * .45, c.R * .3, a * 57.3, rgba('#ff5aa0', .8 * k));
      for (let q = 0; q < 8; q++) { const t = r() * 6.283, d = r() * c.R * .85; mg += C(c.x + Math.cos(t) * d, c.y + Math.sin(t) * d, .18 + r() * .14, rgba('#ff7ab8', .9)); }
      mg += C(nx, ny, c.R * .36, '#020302');
    }
    if (!nf && !cg) g += ell(c.x, c.y, sx, sy, rot, rgba('#3cff6a', .05));
    b += C(nx, ny, c.R * .34, rgba('#4f74ff', .22)) + C(nx + c.R * .08, ny - c.R * .06, .28, rgba('#9db4ff', .9));
    const n = 3 + Math.floor(r() * 4 + c.R * .6);
    for (let i = 0; i < n; i++) { const a = r() * 6.283; b += ell(c.x + Math.cos(a) * (sx + .45), c.y + Math.sin(a) * (sy + .45), .45 + r() * .35, .24, a * 57.3 + 90, rgba('#4f74ff', .65 + r() * .35)); }
  });
  return { bg: '#020302', channels: ['NF200', 'CGRP', 'DAPI'], colors: ['#3cff6a', '#ff5aa0', '#7f9cff'], scale: [14, '100 µm'],
    svg: `<rect width="100" height="60" fill="#020302"/>` + noise(r, 180, '#304a36', .45) + `<path d="M0 ${cy - 5} Q30 ${cy - 5.5} ${cx - rx + 3} ${cy - 6} L${cx - rx + 3} ${cy + 6} Q30 ${cy + 5.5} 0 ${cy + 5}Z" fill="rgba(40,70,46,.14)"/>` + ell(cx, cy, rx, ry, 0, 'rgba(40,70,46,.12)') + `<g ${SCREEN}>${g}</g><g ${SCREEN}>${mg}</g><g ${SCREEN}>${b}</g>` };
}

// ---------- lumbar spinal cord (L3), Luxol fast blue + cresyl violet. Outline, grey matter, central canal and
// motor pools traced from the Allen Mouse Spinal Cord Atlas P56 L3 reference plate (right half, mirrored). ----------
const CORD = (() => {
  const S = .064, mx = 595, X = (x) => 12 + x * S, Y = (y) => 3 + y * S;
  const halfOut = [[595, 32], [650, 22], [760, 22], [880, 30], [990, 60], [1070, 115], [1125, 190], [1160, 290], [1180, 400], [1190, 520], [1178, 640], [1140, 730], [1070, 795], [960, 835], [820, 850], [700, 835], [602, 796]];
  const halfGM = [[652, 48], [700, 40], [780, 42], [870, 55], [950, 90], [1005, 140], [1030, 192], [1012, 214], [960, 213], [908, 210], [900, 250], [893, 290], [890, 322], [930, 346], [980, 386], [1028, 440], [1058, 520], [1060, 580], [1046, 640], [1030, 688], [990, 704], [940, 690], [882, 660], [800, 645], [746, 616], [716, 560], [696, 506], [666, 486], [626, 478], [595, 480]];
  const mirror = (P) => P.map(([x, y]) => [2 * mx - x, y]);
  const dcs = [[595, 336], [618, 322], [642, 262], [654, 170]];
  const pool = (x, y, a, b) => ({ x: X(x), y: Y(y), a: a * S, b: b * S });
  return {
    out: smoothPath([...halfOut, [598, 530], [592, 530], ...mirror(halfOut).reverse().slice(0, -1)].map(([x, y]) => [X(x), Y(y)])),
    gm: smoothPath([...dcs, ...halfGM, ...mirror(halfGM).reverse(), ...mirror(dcs).reverse()].map(([x, y]) => [X(x), Y(y)])),
    cc: [X(595), Y(405)], lam2: [[X(658), Y(92)], [X(760), Y(72)], [X(900), Y(82)], [X(985), Y(160)]],
    pools: [pool(975, 655, 48, 34), pool(985, 575, 46, 28), pool(770, 612, 40, 30), pool(698, 520, 18, 24)],
    X, Y, mx: X(595), top: Y(32), bot: Y(850), dcBot: Y(336),
  };
})();
function cord() {
  const r = rnd(3), K = CORD, id = uid++;
  const mir = (d) => `<g transform="translate(${2 * K.mx} 0) scale(-1 1)">${d}</g>`;
  let s = `<rect width="100" height="60" fill="#f4f1ea"/>`;
  // roots: dorsal rootlets enter dorsolaterally, thicker ventral roots leave ventrolaterally (myelinated: blue)
  [1, -1].forEach((sx) => {
    const T2 = (x) => K.mx + sx * (x - K.mx);
    for (let i = 0; i < 3; i++) {
      s += `<path d="M${f(T2(K.X(1000) + i))} ${f(K.Y(70) - i * .6)} q${sx * 5} -3 ${sx * (12 + i * 2)} -4" stroke="#3c74b6" stroke-width="1.4" fill="none" stroke-linecap="round"/>`;
      s += `<path d="M${f(T2(K.X(1060) + i * 1.4))} ${f(K.Y(785) + i * .4)} q${sx * 4} 3 ${sx * (11 + i * 2)} 4" stroke="#2f62a8" stroke-width="1.9" fill="none" stroke-linecap="round"/>`;
    }
  });
  const mid = (K.top + K.bot) / 2;
  s += `<path d="${K.out}" fill="#e7bccb" transform="translate(${K.mx} ${mid}) scale(1.012) translate(${-K.mx} ${-mid})"/><path d="${K.out}" fill="#3a7bc4"/>`;
  s += `<clipPath id="cw${id}"><path d="${K.out}"/></clipPath><g clip-path="url(#cw${id})">` + ell(K.mx, K.top + 9, 5, 10, 0, 'rgba(20,60,130,.18)') + ell(K.mx, K.bot - 5, 14, 5, 0, 'rgba(20,60,130,.1)');
  for (let i = 0; i < 900; i++) s += C(r() * 100, r() * 60, .13 + r() * .1, rgba(r() < .7 ? '#163c78' : '#3d1f66', .5));
  s += `</g><path d="${K.gm}" fill="#d8b8dc"/><clipPath id="cg${id}"><path d="${K.gm}"/></clipPath><g clip-path="url(#cg${id})">`;
  // lamina II (substantia gelatinosa): a pale, glassy band under each dorsal horn surface
  const l2 = `<path d="M${K.lam2[0].join(' ')} C${K.lam2.slice(1).map((p) => p.join(' ')).join(' ')}" stroke="#efe2f0" stroke-width="2.3" fill="none"/>`;
  s += l2 + mir(l2);
  for (let i = 0; i < 1300; i++) s += C(r() * 100, r() * 60, .12 + r() * .12, rgba('#3d1f66', .5 + r() * .3));
  for (let i = 0; i < 160; i++) s += ell(r() * 100, K.Y(250) + r() * (K.Y(700) - K.Y(250)), .35 + r() * .25, .25 + r() * .15, r() * 180, rgba('#5a2f86', .65));
  s += '</g>';
  // motor neurons: large polygonal Nissl-dark cells clustered in the ventrolateral pools
  const mn = (x, y, R) => {
    let p = '';
    const n = 5 + Math.floor(r() * 2);
    for (let k = 0; k < n; k++) { const a = k / n * 6.283 + r() * .4, rr = R * (.75 + r() * .45); p += `${k ? 'L' : 'M'}${f(x + Math.cos(a) * rr)} ${f(y + Math.sin(a) * rr)} `; }
    const t = r() * 6.283;
    return `<path d="${p}Z" fill="#4a2470"/><path d="M${f(x + Math.cos(t) * R * .8)} ${f(y + Math.sin(t) * R * .8)} l${f(Math.cos(t) * R * 1.2)} ${f(Math.sin(t) * R * 1.2)}" stroke="#4a2470" stroke-width=".35"/>` + C(x + .1, y, R * .36, '#e6d4ec') + C(x + .15, y - .05, .14, '#2a0f45');
  };
  K.pools.forEach((p) => { for (let i = 0; i < (p.a > 2 ? 6 : 3); i++) { const t = r() * 6.283, d = Math.sqrt(r()) * .8, x = p.x + Math.cos(t) * d * p.a, y = p.y + Math.sin(t) * d * p.b; s += mn(x, y, .85 + r() * .35) + mn(2 * K.mx - x + (r() - .5), y + (r() - .5), .85 + r() * .35); } });
  // the central canal, ringed by ependymal nuclei; the dorsal septum; the ventral spinal artery
  for (let i = 0; i < 10; i++) { const a = i / 10 * 6.283; s += ell(K.cc[0] + Math.cos(a) * .9, K.cc[1] + Math.sin(a) * 1.25, .3, .18, a * 57.3 + 90, '#3d1f66'); }
  s += ell(K.cc[0], K.cc[1], .45, .75, 0, '#f4f1ea') + `<line x1="${K.mx}" y1="${K.top + .6}" x2="${K.mx}" y2="${K.dcBot}" stroke="#163c78" stroke-width=".35"/>`;
  s += C(K.mx, K.bot + .5, .9, '#f4f1ea', 'stroke="#9a4a6a" stroke-width=".35"') + C(K.mx - .2, K.bot + .5, .4, '#b5606e');
  s += `<line x1="${f(K.X(960))}" y1="${f(K.Y(120))}" x2="${f(K.X(1120))}" y2="1.8" stroke="#222" stroke-width=".3"/>` + T(f(K.X(1120) - 1), 4.2, 'dorsal horn', '#222', 'end');
  s += `<line x1="${f(2 * K.mx - K.X(985))}" y1="${f(K.Y(640))}" x2="4" y2="54" stroke="#222" stroke-width=".3"/>` + T(1.5, 57.6, 'ventral horn', '#222');
  return { bg: '#f4f1ea', dark: true, scale: [16, '500 µm'], svg: s };
}

// ---------- sciatic nerve, semithin toluidine blue, a ~100 µm field at a fascicle edge: bimodal myelinated fibres,
// g-ratio ≈ 0.62 (ring ≈ 0.38 of the fibre radius), slightly polygonal from packing; Remak bundles, Schwann nuclei,
// a capillary with one red cell; perineurium, then epineurium with fat and an arteriole. Refs: PMC6621767, PMC6705897. ----------
function nerve() {
  const r = rnd(5);
  let s = `<rect width="100" height="60" fill="#e9dfe6"/>`;
  [[90, -1, 6], [76, -3, 5], [6, 5, 6], [20, 1, 5]].forEach(([x, y, R]) => { s += ell(x, y, R, R * .85, 20, '#fbfaf6', 'stroke="#c7aec2" stroke-width=".3"'); });
  s += C(34, 2.5, 2.4, '#a75a7a') + C(34, 2.5, 1.4, '#f6eef2') + C(34.2, 2.4, .6, '#c4566a');
  const inside = (x, y, R) => Math.hypot(x - 60, y - 150) < 146 - R - .4;
  s += `<circle cx="60" cy="150" r="148.2" fill="#2e2a66"/><circle cx="60" cy="150" r="147.4" fill="#cbc3dd"/><circle cx="60" cy="150" r="146.6" fill="#3a3478"/><circle cx="60" cy="150" r="146" fill="#ecf0f7"/>`;
  const fib = pack(r, 520, (x, y, R) => inside(x, y, R) && y > -4, 1, 4.6, .28, 26000, [-2, -2, 102, 62], 1);
  fib.forEach((c) => { if (r() < .4 && c.R > 2.2) c.R = 1 + r() * 1.2; });
  fib.forEach((c) => {
    const R = c.R, rm = R * 1.62 / 2, w = R * .38;
    s += ell(c.x, c.y, rm * (1 + (r() - .5) * .24), rm * (1 + (r() - .5) * .24), r() * 180, '#cdd6e7', `stroke="#191d4a" stroke-width="${f(w)}"`);
    if (r() < .06) { const a = r() * 6.283; s += `<path d="M${f(c.x + Math.cos(a - .9) * (R + .3))} ${f(c.y + Math.sin(a - .9) * (R + .3))} A${f(R + .3)} ${f(R + .3)} 0 0 1 ${f(c.x + Math.cos(a + .9) * (R + .3))} ${f(c.y + Math.sin(a + .9) * (R + .3))}" stroke="#4b3a7a" stroke-width=".7" fill="none" stroke-linecap="round"/>`; }
  });
  for (let i = 0; i < 10; i++) { const x = r() * 95, y = 8 + r() * 50; if (!inside(x, y, 2)) continue; for (let k = 0; k < 6; k++) s += C(x + (r() - .5) * 2.2, y + (r() - .5) * 2.2, .42, '#9aa3bd', 'stroke="#7a84a3" stroke-width=".12"'); }
  s += C(24, 40, 3.2, '#ecf0f7', 'stroke="#6a6890" stroke-width=".5"') + ell(24.3, 40.2, 1.9, 1.4, 30, '#5f8a7a');
  s += `<line x1="44" y1="6" x2="40" y2="2.2" stroke="#222" stroke-width=".3"/>` + T(39.4, 2.8, 'perineurium', '#222', 'end');
  return { bg: '#f1eee6', dark: true, scale: [20, '20 µm'], svg: s };
}

// ---------- mouse islet: insulin beta-cell core (green, nuclei as dark holes, capillaries), a discontinuous glucagon
// alpha-cell rim (magenta), DAPI; acinar rosettes with basal nuclei around it. Refs: PMC2746740. ----------
function islet() {
  const r = rnd(11), ix = 50, iy = 31, IR = [17, 13.5], d0 = (x, y) => Math.hypot((x - ix) / IR[0], (y - iy) / IR[1]);
  let a = '', g = '', mg = '', b = '';
  pack(r, 60, (x, y, R) => d0(x, y) > 1 + R / 14, 3, 3.8, .15, 6000, [-3, -3, 103, 63], 1).forEach((c) => {
    const n = 6 + Math.floor(r() * 4), rot = r() * 6.283;
    for (let k = 0; k < n; k++) {
      const t = rot + k / n * 6.283, x1 = c.x + Math.cos(t) * c.R * .55, y1 = c.y + Math.sin(t) * c.R * .55;
      a += ell(x1, y1, c.R * .5, c.R * .32, t * 57.3, rgba('#55705a', .22 + r() * .12));
      for (let q = 0; q < 3; q++) a += C(x1 + (r() - .5) * 1.2, y1 + (r() - .5) * 1.2, .16, rgba('#9fbf9f', .35));
      b += ell(c.x + Math.cos(t) * c.R * .8, c.y + Math.sin(t) * c.R * .8, .55, .42, t * 57.3, rgba('#4f74ff', .6 + r() * .3));
    }
  });
  pack(r, 170, (x, y, R) => d0(x, y) < 1 - R / 16, 1.05, 1.3, .08, 12000, [ix - IR[0], iy - IR[1], ix + IR[0], iy + IR[1]], 1).forEach((c) => {
    const alpha = d0(c.x, c.y) > .8 ? r() < .62 : r() < .04, rot = r() * 180, k = .7 + r() * .4;
    const nx = c.x + (r() - .5) * .35, ny = c.y + (r() - .5) * .35, hole = C(nx, ny, c.R * .42, '#020302');
    if (alpha) mg += ell(c.x, c.y, c.R * 1.12, c.R * .95, rot, rgba('#ff3b8a', .8 * k)) + hole;
    else g += ell(c.x, c.y, c.R * 1.12, c.R * .98, rot, rgba('#3fd65a', .62 * k)) + hole;
    b += C(nx, ny, c.R * .4, rgba('#4f74ff', .85));
  });
  const cap = `<path d="M${ix - 12} ${iy - 6} C${ix - 4} ${iy - 2} ${ix + 2} ${iy - 9} ${ix + 11} ${iy - 4} M${ix - 9} ${iy + 8} C${ix - 2} ${iy + 3} ${ix + 5} ${iy + 9} ${ix + 13} ${iy + 5}" stroke="#020302" stroke-width=".55" fill="none"/>`;
  return { bg: '#020302', channels: ['insulin', 'glucagon', 'DAPI'], colors: ['#3fd65a', '#ff5aa0', '#7f9cff'], scale: [12, '50 µm'],
    svg: `<rect width="100" height="60" fill="#020302"/>` + noise(r, 160, '#3a4a3a', .45) + `<g ${SCREEN}>${a}</g><g ${SCREEN}>${g}</g>${cap}<g ${SCREEN}>${mg}</g><g ${SCREEN}>${b}</g>` };
}

// ---------- cortex microglia, Iba1: small somata, 3–6 thin beaded processes branching 2–4 more times and fading at
// the tips; territories that barely overlap (an even mosaic). Refs: PMC8369691, PMC3412752. ----------
function microglia() {
  const r = rnd(19);
  let g = '', b = '';
  const br = (x, y, a, l, w, d) => {
    if (d > 4 || w < .08) return;
    const mx = x + Math.cos(a + (r() - .5) * .5) * l * .5, my = y + Math.sin(a + (r() - .5) * .5) * l * .5, x2 = x + Math.cos(a) * l, y2 = y + Math.sin(a) * l, op = .9 - d * .16;
    g += `<path d="M${f(x)} ${f(y)} Q${f(mx)} ${f(my)} ${f(x2)} ${f(y2)}" stroke="${rgba('#ff9a3c', op)}" stroke-width="${f(w)}" fill="none" stroke-linecap="round"/>`;
    if (r() < .3) g += C(mx, my, w * .8, rgba('#ffb066', op));
    if (d >= 3) g += C(x2, y2, w * .95, rgba('#ffb066', op));
    const n = d < 1 ? 2 : 1 + (r() < .5 ? 1 : 0);
    for (let k = 0; k < n; k++) br(x2, y2, a + (r() - .5) * 1.3, l * (.62 + r() * .22), w * .68, d + 1);
  };
  [[16, 15], [46, 11], [78, 16], [28, 40], [60, 37], [90, 44], [8, 50], [48, 56], [96, 6]].forEach(([x, y]) => {
    const n = 3 + Math.floor(r() * 4);
    for (let k = 0; k < n; k++) br(x, y, k / n * 6.283 + r() * .7, 2.6 + r() * 2.2, .55, 0);
    g += ell(x, y, 1.9, 1.35, r() * 180, rgba('#ff9a3c', .95)) + ell(x, y, 1.1, .75, r() * 180, '#ffc48a');
  });
  for (let i = 0; i < 46; i++) b += ell(r() * 100, r() * 60, .85 + r() * .45, .62 + r() * .3, r() * 180, rgba('#4f74ff', .55 + r() * .35));
  return { bg: '#020302', channels: ['Iba1', 'DAPI'], colors: ['#ff9a3c', '#7f9cff'], scale: [12, '20 µm'],
    svg: `<rect width="100" height="60" fill="#020302"/>` + noise(r, 180, '#4a3a2a', .45) + `<g ${SCREEN}>${b}</g><g ${SCREEN}>${g}</g>` };
}

// ---------- RNAscope: discrete Gaussian dots clustered over some nuclei (scoring bins 0, 1–3, 4–9, 10–15, >15 per
// cell) plus a few strays; DAPI with mouse chromocenters, large pale neuronal and small bright glial nuclei.
// Probe names come from the slide's stain ("Trpv1 · Calca · DAPI"). Ref: ACD RNAscope data analysis guide. ----------
function rnascope(slide) {
  const r = rnd(23);
  let b = '', p1 = '', p2 = '';
  const nuc = pack(r, 12, (x, y, R) => x > R && x < 100 - R && y > R && y < 60 - R, 3.8, 4.6, 6.5, 4000, [0, 0, 100, 60], 1);
  const glia = pack(r, 14, (x, y, R) => nuc.every((n) => Math.hypot(n.x - x, n.y - y) > n.R + R + 3), 1.7, 2.2, 4, 4000, [0, 0, 100, 60], 1);
  const chromo = (c, n, col) => { let s = ''; for (let k = 0; k < n; k++) { const a = r() * 6.283, d = r() * c.R * .55; s += C(c.x + Math.cos(a) * d, c.y + Math.sin(a) * d, .35 + r() * .3, col); } return s; };
  nuc.forEach((c, i) => {
    const rot = r() * 180;
    b += ell(c.x, c.y, c.R, c.R * .84, rot, rgba('#4f74ff', .45)) + ell(c.x, c.y, c.R * .78, c.R * .62, rot, rgba('#4f74ff', .2)) + chromo(c, 5, rgba('#a8bcff', .85));
    const n1 = [22, 9, 0, 14, 3, 28, 6, 0, 18, 2, 11, 0][i] || 0, n2 = [6, 0, 4, 0, 0, 12, 0, 2, 0, 7, 0, 0][i] || 0;
    const dot = (col) => { const a = r() * 6.283, d = c.R * (.4 + Math.pow(r(), .6) * 1.3), x = c.x + Math.cos(a) * d, y = c.y + Math.sin(a) * d * .9, s2 = .32 + r() * .18; return C(x, y, s2 * 2.3, rgba(col, .12)) + C(x, y, s2 * 1.4, rgba(col, .35)) + C(x, y, s2, col); };
    for (let k = 0; k < n1; k++) p1 += dot('#ff8a3a');
    for (let k = 0; k < n2; k++) p2 += dot('#3cff6a');
  });
  glia.forEach((c) => { b += ell(c.x, c.y, c.R, c.R * .8, r() * 180, rgba('#5b80ff', .8)) + chromo(c, 3, rgba('#c0ceff', .9)); });
  for (let i = 0; i < 7; i++) p1 += C(r() * 100, r() * 60, .32, rgba('#ff8a3a', .7));
  const names = String(slide?.stain || '').split(/\s*[·,/]\s*/).filter((s) => s && !/dapi|rnascope/i.test(s));
  return { bg: '#020302', channels: [names[0] || 'probe 1', names[1] || 'probe 2', 'DAPI'], colors: ['#ff8a3a', '#3cff6a', '#7f9cff'], scale: [10, '10 µm'],
    svg: `<rect width="100" height="60" fill="#020302"/>` + noise(r, 140, '#334433', .45) + `<g ${SCREEN}>${b}</g><g ${SCREEN}>${p1}</g><g ${SCREEN}>${p2}</g>` };
}

// ---------- cortex from the pia down, NeuN + GFAP + DAPI: GFAP bright at the glia limitans and around a penetrating
// vessel, star-shaped astrocytes in layer 1, little in grey matter; no neurons in layer 1, dense below, with a hint of
// each apical dendrite. Refs: PMC6905344, PMC6673609. ----------
function cortexIf() {
  const r = rnd(29);
  let red = '', g = '', b = '';
  const pia = (x) => 4.5 + Math.sin(x * .05);
  g += `<path d="M0 ${f(pia(0))} ${Array.from({ length: 21 }, (_, i) => `L${i * 5} ${f(pia(i * 5))}`).join(' ')}" stroke="${rgba('#3cff5a', .95)}" stroke-width="1.2" fill="none"/>`;
  const V = 'M62 5 C 60 20, 67 34, 63 61';
  g += `<path d="${V}" stroke="${rgba('#3cff5a', .7)}" stroke-width="3" fill="none"/><path d="${V}" stroke="#020302" stroke-width="1.9" fill="none"/>`;
  for (let i = 0; i < 14; i++) { const t = i / 14, y = 5 + t * 56, x = 62 + Math.sin(t * 3) * 3; b += ell(x + (r() < .5 ? -1.3 : 1.3), y, .9, .35, 80, rgba('#4f74ff', .85)); }
  const astro = (x, y, k, n = 6) => {
    for (let i = 0; i < n; i++) { const a = i / n * 6.283 + r() * .6, l = 3 + r() * 4; g += `<path d="M${x} ${y} q${f(Math.cos(a + .4) * l * .4)} ${f(Math.sin(a + .4) * l * .4)} ${f(Math.cos(a) * l)} ${f(Math.sin(a) * l)}" stroke="${rgba('#3cff5a', .75 * k)}" stroke-width="${f(.45 - i * .02)}" fill="none" stroke-linecap="round"/>`; }
    g += C(x, y, 1, rgba('#3cff5a', k));
  };
  [[14, 9, 1], [34, 10, .9], [84, 9, 1], [58.5, 24, .9], [66, 42, .8]].forEach(([x, y, k]) => astro(x, y, k));
  astro(28, 36, .3, 4);
  pack(r, 34, (x, y) => y > 15 && y < 58 && Math.abs(x - 62 - Math.sin((y - 5) / 56 * 3) * 3) > 4.5, 1.6, 2.2, 1.9, 6000, [0, 13, 100, 60], 1).forEach((c) => {
    const k = .75 + r() * .35;
    red += C(c.x, c.y, c.R * 1.4, rgba('#ff3b3b', .12 * k)) + C(c.x, c.y, c.R, rgba('#ff3b3b', .75 * k)) + `<path d="M${f(c.x)} ${f(c.y - c.R)} l${f((r() - .5) * .8)} -${f(2 + r() * 2)}" stroke="${rgba('#ff3b3b', .45 * k)}" stroke-width=".55" stroke-linecap="round"/>`;
    b += ell(c.x, c.y, c.R * .82, c.R * .72, r() * 180, rgba('#4f74ff', .45));
  });
  for (let i = 0; i < 46; i++) b += ell(r() * 100, 6 + r() * 54, .8, .6, r() * 180, rgba('#5b80ff', .85));
  return { bg: '#020302', channels: ['NeuN', 'GFAP', 'DAPI'], colors: ['#ff6a6a', '#3cff5a', '#7f9cff'], scale: [12, '50 µm'], labelY: 11.5,
    svg: `<rect width="100" height="60" fill="#020302"/>` + noise(r, 140, '#334433', .45) + `<g ${SCREEN}>${b}</g><g ${SCREEN}>${red}</g><g ${SCREEN}>${g}</g>` + T(96, 11.5, 'layer 1', '#B4B2A9', 'end') };
}

// ---------- mouse distal colon wall, transverse, CGRP + CD45 + DAPI, lumen at the top: crypts lined by basal
// columnar nuclei (gaps for goblet cells) with thin lamina propria between them; muscularis mucosae; loose submucosa
// with vessels; circular muscle (nuclei cut lengthwise), myenteric ganglia, longitudinal muscle (nuclei cut across),
// serosa. CGRP+ extrinsic afferents: varicose fibers up the lamina propria to just under the surface, around
// submucosal vessels, along the muscle and through the myenteric ganglia. CD45+ immune cells mostly in the lamina
// propria, some right beside fibers. Refs: Wolfson 2023 (10.1016/j.cell.2023.07.007), Zhang 2022 (10.1016/j.cell.2022.09.008). ----------
function colon() {
  const r = rnd(31), wv = (x) => Math.sin(x * .05 + 1) * .9, S = 8.5, xs = Array.from({ length: 12 }, (_, i) => 3 + i * S);
  const Y = { surf: 6.5, crypt: 28.2, mm: 29.9, sub: 31.1, circ: 36.2, plex: 45.2, lon: 47.7, ser: 49.9 };
  let auto = '', b = '', g = '', m = '';
  const band = (y0, y1, fill) => `<path d="M0 ${f(y0 + wv(0))} ${Array.from({ length: 21 }, (_, i) => `L${i * 5} ${f(y0 + wv(i * 5))}`).join(' ')} L100 ${f(y1 + wv(100))} ${Array.from({ length: 21 }, (_, i) => `L${100 - i * 5} ${f(y1 + wv(100 - i * 5))}`).join(' ')}Z" fill="${fill}"/>`;
  auto += band(Y.surf, Y.crypt + 1.6, 'rgba(46,60,70,.38)') + band(Y.circ, Y.plex, 'rgba(52,56,64,.45)') + band(Y.lon, Y.ser + .6, 'rgba(52,56,64,.4)');
  const nuc = (x, y, rx, ry, rot, a = .8) => { b += ell(x, y + wv(x), rx, ry, rot, rgba('#4f74ff', a)) + ell(x - rx * .2, y + wv(x) - ry * .2, rx * .4, ry * .4, rot, rgba('#a8bcff', a * .6)); };
  // crypts: dark lumen and goblet gaps cut into the epithelium, nuclei along the basement membrane
  xs.forEach((cx) => {
    auto += `<path d="M${cx} ${f(Y.surf + wv(cx))} L${cx} ${f(Y.crypt - 1.4 + wv(cx))}" stroke="#020302" stroke-width=".9"/>`;
    for (let y = Y.surf + 2.6; y < Y.crypt - 1.6; y += 1.15) [-1, 1].forEach((s) => {
      if (r() < .24) { auto += ell(cx + s * 1.1, y + .3 + wv(cx), .65, .5, 0, '#020302'); return; }
      nuc(cx + s * 2.05, y + (r() - .5) * .3, .75, .34, (r() - .5) * 14);
    });
    for (let k = 0; k <= 6; k++) { const a = k / 6 * Math.PI; nuc(cx + Math.cos(a) * 2.05, Y.crypt - 1.6 + Math.sin(a) * 1.9, .7, .34, a * 57.3); }
  });
  for (let x = .8; x < 100; x += .95) if (xs.every((cx) => Math.abs(x - cx) > .7)) nuc(x, Y.surf + 1, .3, .65, (r() - .5) * 10, .7);
  // lamina propria: scattered stromal nuclei and CD45+ cells (membrane ring around a round nucleus)
  const imm = (x, y, k = 1) => { const R = .95 + r() * .3, yy = y + wv(x); g += C(x, yy, R * 1.35, rgba('#3cff6a', .12 * k)) + C(x, yy, R, rgba('#3cff6a', .62 * k)) + C(x, yy, R * .68, '#020302'); b += C(x + (r() - .5) * .2, yy, R * .62, rgba('#4f74ff', .85)); };
  const lp = (x) => xs.some((cx) => Math.abs(x - cx - S / 2) < 1.25);
  pack(r, 34, (x, y) => (lp(x) && y > Y.surf + 2.5 && y < Y.crypt) || (y > Y.crypt + .6 && y < Y.mm - .3), .45, .6, .5, 5000, [0, Y.surf, 100, Y.mm], 1).forEach((c) => nuc(c.x, c.y, .5, .38, r() * 180, .6));
  xs.slice(0, -1).forEach((cx, i) => { [.25, .55, .8].forEach((t, k) => { if ((i + k) % 3 !== 1 || r() < .3) imm(cx + S / 2 + (r() - .5) * .5, Y.surf + 3 + t * (Y.crypt - Y.surf - 3)); }); });
  [[9, Y.crypt + 1.4], [44, Y.crypt + 1.3], [79, Y.crypt + 1.5], [24, Y.sub + 2.6], [61, Y.sub + 3.6]].forEach(([x, y]) => imm(x, y, .9));
  // muscularis mucosae, submucosa with two vessels, circular muscle, myenteric ganglia, longitudinal muscle, serosa
  for (let x = 1; x < 100; x += 2.3 + r()) nuc(x, Y.mm + .7, 1.1, .2, (r() - .5) * 6, .7);
  const ves = [[31, Y.sub + 2.8, 3.3, 1.7], [73, Y.sub + 2.4, 2.2, 1.2]];
  ves.forEach(([x, y, rx, ry]) => { auto += ell(x, y + wv(x), rx, ry, 0, '#020302'); for (let k = 0; k < 9; k++) { const a = k / 9 * 6.283; nuc(x + Math.cos(a) * (rx + .3), y + Math.sin(a) * (ry + .3), .7, .22, a * 57.3 + 90, .7); } });
  for (let i = 0; i < 12; i++) { const x = r() * 100; if (ves.every(([vx, , rx]) => Math.abs(x - vx) > rx + 1.5)) nuc(x, Y.sub + 1 + r() * 4, .9, .25, (r() - .5) * 30, .55); }
  for (let y = Y.circ + .8; y < Y.plex - .4; y += .95) for (let x = r() * 3; x < 100; x += 2.6 + r() * 1.6) nuc(x, y + (r() - .5) * .3, 1.15, .22, (r() - .5) * 5, .7);
  const gang = [[12, 4.2], [39, 3.4], [64, 4.6], [90, 3.6]];
  auto += band(Y.plex + .6, Y.plex + 1.2, 'rgba(70,70,80,.35)');
  gang.forEach(([x, rx]) => { auto += ell(x, Y.plex + .9 + wv(x), rx, 1.5, 0, 'rgba(80,80,96,.6)'); for (let k = 0; k < Math.round(rx); k++) nuc(x - rx * .6 + k * rx * .45, Y.plex + .9 + (r() - .5) * .5, .62, .52, 0, .5); nuc(x - rx * .8, Y.plex + .3, .35, .25, 0, .9); nuc(x + rx * .75, Y.plex + 1.5, .35, .25, 0, .9); });
  for (let x = r(); x < 100; x += .85 + r() * .5) nuc(x, Y.lon + .4 + r() * 1.6, .32, .28, 0, .75);
  for (let x = 2; x < 100; x += 6 + r() * 3) nuc(x, Y.ser + .4, 1.3, .18, 0, .7);
  // CGRP: thin varicose fibers (a smooth path plus beads)
  const fiber = (P, a = 1) => {
    const Q = P.map(([x, y]) => [x, y + wv(x)]);
    let d = `M${f(Q[0][0])} ${f(Q[0][1])}`;
    for (let i = 1; i < Q.length; i++) { const [x0, y0] = Q[i - 1], [x1, y1] = Q[i]; d += ` Q${f((x0 + x1) / 2 + (r() - .5) * .8)} ${f((y0 + y1) / 2 + (r() - .5) * .8)} ${f(x1)} ${f(y1)}`; }
    m += `<path d="${d}" stroke="${rgba('#ff5aa0', .45 * a)}" stroke-width=".22" fill="none"/>`;
    for (let i = 1; i < Q.length; i++) { const [x0, y0] = Q[i - 1], [x1, y1] = Q[i], n = Math.floor(Math.hypot(x1 - x0, y1 - y0) / 1.1); for (let k = 0; k < n; k++) { const t = (k + r() * .6) / n; m += C(x0 + (x1 - x0) * t, y0 + (y1 - y0) * t, .2 + r() * .14, rgba('#ff7ab8', .95 * a)); } }
  };
  [0, 1, 3, 4, 6, 8, 9].forEach((i) => { const x = xs[i] + S / 2; fiber([[x + .3, Y.sub + .5], [x - .2, Y.crypt + 1], [x + .25, Y.crypt - 6], [x - .3, Y.surf + 9], [x + .1, Y.surf + 3.4], [x + (i % 2 ? 2.8 : -2.8), Y.surf + 2.6]]); });
  fiber([[0, Y.sub + 1.2], [14, Y.sub + 1.6], [27, Y.sub + .9], [44, Y.sub + 1.5], [60, Y.sub + 1], [82, Y.sub + 1.7], [100, Y.sub + 1.1]], .8);
  ves.forEach(([x, y, rx, ry]) => { const P = []; for (let k = 0; k <= 14; k++) { const a = k / 12 * 6.283; P.push([x + Math.cos(a) * (rx + .9), y + Math.sin(a) * (ry + .8)]); } fiber(P); });
  [[Y.circ + 3, 6, 47], [Y.circ + 7.5, 52, 97]].forEach(([y, x0, x1]) => fiber([[x0, y], [(x0 * 2 + x1) / 3, y + .4], [(x0 + x1 * 2) / 3, y - .3], [x1, y + .2]], .75));
  [[20, 0], [57, 1]].forEach(([x]) => fiber([[x, Y.sub + 1.5], [x + 1, Y.circ + 4], [x - .5, Y.plex + 1]]));
  fiber([[0, Y.plex + .9], ...gang.flatMap(([x, rx]) => [[x - rx, Y.plex + .4], [x, Y.plex + 1.5], [x + rx, Y.plex + .5]]), [100, Y.plex + 1]], 1);
  gang.forEach(([x, rx]) => { for (let k = 0; k < 12; k++) m += C(x + (r() - .5) * rx * 1.7, Y.plex + .9 + wv(x) + (r() - .5) * 2, .24 + r() * .12, rgba('#ff7ab8', .9)); });
  const lab = (y, s) => `<text x="99" y="${f(y)}" font-size="2.6" font-family="-apple-system,system-ui,sans-serif" font-weight="600" fill="#B4B2A9" text-anchor="end" stroke="#020302" stroke-width=".7" paint-order="stroke">${s}</text>`;
  return { bg: '#020302', channels: ['CGRP', 'CD45', 'DAPI'], colors: ['#ff5aa0', '#3cff6a', '#7f9cff'], scale: [10, '50 µm'], labelY: 4.4,
    svg: `<rect width="100" height="60" fill="#020302"/>` + noise(r, 140, '#334433', .45) + `<g ${SCREEN}>${auto}</g><g ${SCREEN}>${b}</g><g ${SCREEN}>${g}</g><g ${SCREEN}>${m}</g>`
      + lab(4.4, 'lumen') + lab(18.5, 'mucosa') + lab(34.8, 'submucosa') + lab(41.6, 'muscle') };
}

const DRAW = { drg, cord, nerve, islet, microglia, rnascope, 'cortex-if': cortexIf, colon };

// The section under the microscope. mode: 'stain' or 'atlas' (brain-coronal only).
// Returns { bg, svg } for a 100×60 viewBox, with channel names and a scale bar.
const scopeCache = new Map();
export function scopeView(unitId, slide, atlas, mode = 'stain', accent) {
  const key = `${unitId}|${slide.tissue}|${slide.stain}|${mode}`;
  if (scopeCache.has(key)) return scopeCache.get(key);
  let v;
  if (slide.tissue === 'brain-coronal') v = atlas ? { bg: '#f3efe6', svg: brain(atlas, mode, accent) } : { bg: '#f3efe6', svg: T(50, 32, 'Section loading…', '#555', 'middle') };
  else v = { ...DRAW[slide.tissue](slide) };
  let extra = '';
  if (v.channels) { let x = 4; v.channels.forEach((c, i) => { extra += T(x, v.labelY || 7, c, v.colors[i]); x += c.length * 2.1 + 4.5; }); }
  if (v.scale) extra += bar(v.scale[0], v.scale[1], v.dark);
  // tissue + meta let the eyepiece zoom the section while drawing its own labels and scale bar
  const out = { bg: v.bg, svg: v.svg + extra, tissue: v.svg, channels: v.channels, colors: v.colors, scale: v.scale, dark: v.dark };
  if (slide.tissue !== 'brain-coronal' || atlas) scopeCache.set(key, out);
  return out;
}

// ---------- the glass slide, 75×25 mm (viewBox 150×50): ground edges with a blue-green tint, a frosted end in the
// track's colour labelled in fine-tip marker, a near-invisible coverslip (edge, mountant halo, one bubble; pink
// nail-polish seal on fluorescence slides), and the sections as they look to the eye: fluorescence ones almost
// clear, Nissl/LFB ones violet and blue, semithin ones tiny dark-blue dots, several per slide. ----------
export const FROST = { A: '#8fd18b', B: '#f4a6c4', C: '#8fc0ea', D: '#f6e27a', E: '#f7b26b' };
const HAND = 'font-family="Bradley Hand,Segoe Print,Marker Felt,cursive"';
const FLUOR = new Set(['drg', 'islet', 'microglia', 'rnascope', 'cortex-if', 'colon']);
const ghost = 'rgba(232,226,212,.32)';
function sections(slide, atlas) {
  const t = slide?.tissue;
  let s = '';
  if (t === 'brain-coronal') { if (atlas) [0, 50].forEach((x) => { s += `<g transform="translate(${x} 16) scale(.5)">${brain(atlas, 'nissl')}</g>`; }); }
  else if (t === 'cord') [18, 50, 82].forEach((x) => { s += `<g transform="translate(${x} 30) scale(.36) translate(-50 -30)"><path d="${CORD.out}" fill="#3a7bc4"/><path d="${CORD.gm}" fill="#c9a2cf"/></g>`; });
  else if (t === 'nerve') [[38, 28], [62, 32]].forEach(([x, y]) => { s += C(x, y, 2.2, '#2c3170') + C(x + .4, y - .4, 1.2, '#4a4f98'); });
  else if (t === 'drg') [16, 38, 60, 82].forEach((x, i) => { const y = 30 + (i % 2 ? 2 : -2); s += ell(x, y, 7, 4.6, -8 + i * 5, ghost) + `<path d="M${x - 7} ${y} l-6 -1" stroke="${ghost}" stroke-width="2"/>`; });
  else if (t === 'islet') [20, 50, 80].forEach((x, i) => { s += `<path d="M${x - 10} 28 Q${x - 6} ${18 + i * 2} ${x + 1} 21 Q${x + 11} 19 ${x + 10} 30 Q${x + 9} 41 ${x} 39 Q${x - 11} ${42 - i} ${x - 10} 28Z" fill="${ghost}"/>`; });
  else if (t === 'colon') [20, 50, 80].forEach((x, i) => { const y = 30 + (i % 2 ? 2 : -2); s += ell(x, y, 10, 8.5, i * 20, 'none', `stroke="${ghost}" stroke-width="2.6"`) + ell(x, y, 7.2, 5.8, i * 20, 'none', 'stroke="rgba(232,226,212,.16)" stroke-width="1.2"'); });
  else if (t) [17, 50, 83].forEach((x) => { s += ell(x, 30, 12, 9, 0, ghost) + ell(x - 4, 27, 3, 2, 0, 'rgba(232,226,212,.18)') + ell(x + 4, 27, 3, 2, 0, 'rgba(232,226,212,.18)'); });
  return s;
}
// slide: the slides.json entry, or null (earned, but the Project hasn't described it yet: a blank slide)
export function slideSVG(unitId, slide, atlas, big = false) {
  const fr = FROST[unitId[0]] || '#f4f4f0', lines = slide ? [slide.label, slide.stain && slide.stain.length > 14 ? slide.stain.slice(0, 13).trim() + '…' : slide.stain] : ['', ''];
  let grain = '';
  for (let i = 0; i < 60; i++) grain += `<rect x="${2 + (i * 37) % 35}" y="${2 + (i * 53) % 45}" width=".6" height=".6" fill="rgba(255,255,255,.25)"/>`;
  const txt = (y, size, s) => `<text x="20.5" y="${y}" font-size="${size}" ${HAND} fill="#1d2440" text-anchor="middle">${esc(s)}</text>`;
  return `<svg viewBox="0 0 150 50" role="img" aria-hidden="true">
<rect x=".5" y=".5" width="149" height="49" rx=".8" fill="rgba(214,232,226,.16)" stroke="#cfe6df" stroke-opacity=".75"/>
<rect x="1.2" y="1.2" width="147.6" height="47.6" rx=".5" fill="none" stroke="rgba(255,255,255,.18)" stroke-width=".5"/>
<rect x="1.5" y="1.5" width="38" height="47" fill="${fr}"/>${grain}
${txt(big ? 14 : 22, big ? 9 : 11, unitId)}${big ? txt(25, Math.min(6, 62 / (lines[0]?.length || 1)), lines[0]) + txt(33, Math.min(6, 62 / (lines[1]?.length || 1)), lines[1]) : txt(35, 7.5, lines[0])}
${slide ? `<svg x="44" y="4" width="102" height="42" viewBox="0 0 100 60">${sections(slide, atlas)}</svg>
<rect x="44" y="3" width="102" height="44" fill="rgba(255,255,255,.03)" stroke="rgba(235,245,250,.55)" stroke-width=".45"/>
<rect x="43.3" y="2.3" width="103.4" height="45.4" fill="none" stroke="rgba(235,245,250,.12)" stroke-width="1.2"/>
${FLUOR.has(slide.tissue) ? '<rect x="43.4" y="2.4" width="103.2" height="45.2" fill="none" stroke="rgba(240,120,165,.6)" stroke-width="1.3"/>' : ''}
<circle cx="${big ? 131 : 133}" cy="40" r="1.2" fill="none" stroke="rgba(255,255,255,.45)" stroke-width=".35"/>` : ''}
</svg>`;
}

// Allen sections for brain slides, fetched once per unit.
const atlasCache = new Map();
export function loadAtlas(unitId, slide) {
  if (slide?.tissue !== 'brain-coronal') return Promise.resolve(null);
  if (!atlasCache.has(unitId)) {
    const url = slide.atlasPath || `content/assets/atlas/${encodeURIComponent(unitId)}.json`;
    atlasCache.set(unitId, fetch(url).then((r) => (r.ok ? r.json() : null)).catch(() => null));
  }
  return atlasCache.get(unitId);
}
