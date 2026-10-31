// "Your circuit": the course drawn as real neural pathways in an anatomical
// picture (brain, brainstem, spinal cord, DRG, vagus, organs). Each track is
// one real circuit (see circuits-data.js); its units are neurons placed along
// that pathway in course order.
//   - finishing a lesson grows one dendrite on its unit's neuron
//   - the cell body fills in as the unit's lessons get done
//   - reviewing until questions reach the top boxes thickens and myelinates
//     the axons along the pathway
// When every written unit is mastered, the circuit is complete and signals
// run along every pathway.

import { content, playable } from './content.js';
import { progress, MAX_BOX } from './progress.js';
import { CIRCUITS, CIRCUIT_KEYS } from './circuits-data.js';
import { svg, esc } from './ui.js';

const VIEW_W = 360, VIEW_H = 560;
const MASTERED = 0.8;
const f = (n) => n.toFixed(1);

// ---------- anatomy ----------

// Cortex outline, front of the head on the left. Each edge is drawn as two
// outward bulges so the surface reads as folded gyri.
const CORTEX = [[40, 150], [30, 118], [36, 84], [56, 56], [88, 34], [128, 20], [172, 15], [216, 19], [256, 30], [290, 50], [316, 78], [332, 110], [334, 140], [322, 166], [300, 182], [268, 188], [240, 194], [216, 212], [180, 222], [140, 222], [108, 214], [88, 198], [82, 180], [66, 172], [50, 164]];

function gyralOutline(points, bulge = 5) {
  const cx = points.reduce((a, p) => a + p[0], 0) / points.length;
  const cy = points.reduce((a, p) => a + p[1], 0) / points.length;
  const out = (x, y) => { const d = Math.hypot(x - cx, y - cy) || 1; return [x + ((x - cx) / d) * bulge, y + ((y - cy) / d) * bulge]; };
  let d = `M${points[0][0]} ${points[0][1]}`;
  points.forEach((p, i) => {
    const q = points[(i + 1) % points.length];
    const m = [(p[0] + q[0]) / 2, (p[1] + q[1]) / 2];
    for (const [a, b] of [[p, m], [m, q]]) {
      const [kx, ky] = out((a[0] + b[0]) / 2, (a[1] + b[1]) / 2);
      d += `Q${f(kx)} ${f(ky)} ${f(b[0])} ${f(b[1])}`;
    }
  });
  return d + 'Z';
}

const SULCI_MAJOR = [
  'M178 17C172 45 186 65 170 92S165 125 158 140',          // central sulcus
  'M84 180C110 168 150 160 190 150S232 138 250 126',        // lateral (Sylvian) fissure
  'M292 46C296 64 290 80 300 96',                           // parieto-occipital
];
const SULCI_MINOR = [
  'M150 22C146 50 158 70 142 98S138 120 132 134',           // precentral
  'M206 22C200 48 212 70 198 98S192 118 188 130',           // postcentral
  'M110 196C145 186 190 178 230 166S262 152 282 138',       // superior temporal
  'M130 211C160 205 200 199 238 186',                       // inferior temporal
  'M128 30C100 45 80 58 62 80', 'M136 70C110 80 85 95 58 115', // frontal
  'M206 80C230 72 255 80 292 98', 'M312 110C318 130 312 150 318 162',
  'M60 128c10-8 22-4 30 4', 'M92 118c10 6 20 4 28-4', 'M238 50c8 10 20 12 30 6',
  'M162 198c8-6 18-6 24 0', 'M262 116c8 6 18 6 24 0', 'M72 96c8 4 16 2 22-4',
];
const CEREBELLUM = 'M236 200C248 186 296 182 322 196C338 208 334 236 306 246C278 254 246 246 236 228C230 218 230 208 236 200Z';
const BRAINSTEM = 'M200 192C196 206 188 222 192 238C195 250 206 258 212 284L232 284C233 262 238 240 236 224C235 210 233 200 232 190Z';
const CORD = 'M212 282C212 340 214 420 216 548L230 548C230 420 232 340 232 282Z';
const PANCREAS = 'M110 506C116 494 140 496 160 500C180 504 200 500 212 496C220 494 224 502 216 508C200 516 176 514 156 516C136 520 112 520 110 506Z';
const SPLEEN = 'M48 488C60 478 80 482 82 496C84 512 66 518 56 512C46 506 42 496 48 488Z';
const MUSCLE = 'M284 520C296 508 318 512 326 528C314 538 292 534 284 520Z';

const LABELS = [
  ['Thalamus', 222, 136], ['Striatum', 76, 136], ['S1', 186, 9], ['Insula', 120, 164],
  ['Cerebellum', 300, 264], ['Brainstem', 174, 262], ['Spinal cord', 206, 352, 'end'],
  ['DRG', 262, 420], ['DRG', 262, 480], ['Vagus', 26, 420, 'start'], ['Nodose', 96, 296, 'end'],
  ['Pancreas', 166, 532], ['Spleen', 62, 534], ['Skin', 338, 360], ['Muscle', 306, 548], ['Hypothal.', 150, 186, 'end'],
];

// Short wandering curves, clipped to the cortex, read as folded gyri.
function gyriTexture() {
  let h = 7;
  const rnd = () => ((h = Math.imul(h ^ (h >>> 13), 1597334677) + 0x6d2b79f5) >>> 0) / 4294967296;
  const out = [];
  for (let i = 0; i < 70; i++) {
    let x = 36 + rnd() * 296, y = 20 + rnd() * 200, a = rnd() * Math.PI * 2;
    let d = `M${f(x)} ${f(y)}`;
    const steps = 3 + Math.floor(rnd() * 3);
    for (let k = 0; k < steps; k++) {
      a += (rnd() - 0.5) * 2.2;
      const len = 7 + rnd() * 8;
      const cx = x + Math.cos(a) * len * 0.6, cy = y + Math.sin(a) * len * 0.6;
      x += Math.cos(a + (rnd() - 0.5)) * len; y += Math.sin(a + (rnd() - 0.5)) * len;
      d += `Q${f(cx)} ${f(cy)} ${f(x)} ${f(y)}`;
    }
    out.push(d);
  }
  return out.join('');
}

function anatomy() {
  const roots = [];
  for (let y = 300; y <= 540; y += 20) roots.push(`M231 ${y}l8 3M213 ${y}l-8 3`);
  const folia = [];
  for (let k = 1; k <= 9; k++) { const y = 188 + k * 6; folia.push(`M${232 + k} ${y}Q284 ${y - 9 + k} ${330 - k * 2} ${y + 3}`); }
  const cortex = gyralOutline(CORTEX);
  return `
  <defs>
    <clipPath id="nl-cb"><path d="${CEREBELLUM}"/></clipPath>
    <clipPath id="nl-cx"><path d="${cortex}"/></clipPath>
    <radialGradient id="nl-shade" cx="42%" cy="38%" r="70%"><stop offset="0%" class="a-shade-in"/><stop offset="100%" class="a-shade-out"/></radialGradient>
  </defs>
  <path d="${CORD}" class="a-tissue"/>
  <path d="${roots.join('')}" class="a-nerve"/>
  <path d="M231 404L254 404M231 464L254 464" class="a-nerve thick"/>
  <ellipse cx="262" cy="404" rx="9" ry="6" class="a-ganglion"/><ellipse cx="262" cy="464" rx="9" ry="6" class="a-ganglion"/>
  <path d="M271 402C300 398 320 394 336 392M271 462C300 458 320 454 336 452M216 482C250 494 280 506 300 520" class="a-nerve thick"/>
  <path d="M214 268C170 280 120 300 92 330C70 356 60 400 64 470C66 482 66 488 64 494" class="a-nerve thick"/>
  <ellipse cx="100" cy="318" rx="7" ry="5" class="a-ganglion"/>
  <path d="M150 504C180 488 214 452 254 410" class="a-nerve"/>
  <path d="M340 366C336 400 344 440 338 480" class="a-skin"/>
  <path d="${PANCREAS}" class="a-organ"/><path d="${SPLEEN}" class="a-organ"/><path d="${MUSCLE}" class="a-muscle"/>
  <path d="${BRAINSTEM}" class="a-tissue"/>
  <path d="${CEREBELLUM}" class="a-tissue"/>
  <path d="${folia.join('')}" class="a-folia" clip-path="url(#nl-cb)"/>
  <path d="${cortex}" class="a-cortex"/>
  <path d="${gyriTexture()}" class="a-gyri" clip-path="url(#nl-cx)"/>
  <path d="${SULCI_MINOR.join('')}" class="a-sulcus"/>
  <path d="${SULCI_MAJOR.join('')}" class="a-sulcus major"/>
  <g class="a-deep">
    <ellipse cx="200" cy="142" rx="17" ry="10"/>
    <path d="M150 96C126 94 112 110 116 128C120 142 138 146 152 140"/>
    <ellipse cx="140" cy="130" rx="13" ry="10"/><ellipse cx="156" cy="141" rx="7" ry="6"/>
    <ellipse cx="170" cy="158" rx="5" ry="3"/><ellipse cx="176" cy="174" rx="9" ry="6"/>
  </g>
  ${LABELS.map(([t, x, y, a = 'middle']) => `<text x="${x}" y="${y}" text-anchor="${a}" class="a-label">${t}</text>`).join('')}`;
}

// ---------- pathways ----------

// Smooth curve through the points (Catmull-Rom), sampled with arc length.
function samplePath(points, closed) {
  const n = points.length, P = (i) => points[closed ? (i + n) % n : Math.max(0, Math.min(n - 1, i))];
  const out = [];
  const segs = closed ? n : n - 1;
  for (let i = 0; i < segs; i++) {
    const [p0, p1, p2, p3] = [P(i - 1), P(i), P(i + 1), P(i + 2)];
    for (let k = 0; k < 16; k++) {
      const t = k / 16, t2 = t * t, t3 = t2 * t;
      const c = (a, b, cc, d) => 0.5 * (2 * b + (-a + cc) * t + (2 * a - 5 * b + 4 * cc - d) * t2 + (-a + 3 * b - 3 * cc + d) * t3);
      out.push({ x: c(p0[0], p1[0], p2[0], p3[0]), y: c(p0[1], p1[1], p2[1], p3[1]) });
    }
  }
  const last = closed ? points[0] : points[n - 1];
  out.push({ x: last[0], y: last[1] });
  let s = 0;
  out.forEach((p, i) => { if (i) s += Math.hypot(p.x - out[i - 1].x, p.y - out[i - 1].y); p.s = s; });
  return { pts: out, length: s, closed };
}

function pointAt(path, s) {
  const { pts } = path;
  let i = 1;
  while (i < pts.length - 1 && pts[i].s < s) i++;
  const a = pts[i - 1], b = pts[i], t = (s - a.s) / ((b.s - a.s) || 1);
  return { x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t, angle: Math.atan2(b.y - a.y, b.x - a.x) };
}

function slice(path, s0, s1) {
  const seg = (a, b) => [pointAt(path, a), ...path.pts.filter((p) => p.s > a && p.s < b), pointAt(path, b)];
  const list = s1 >= s0 ? seg(s0, s1) : [...seg(s0, path.length), ...seg(0, s1)]; // wraps on a loop
  return 'M' + list.map((p) => `${f(p.x)} ${f(p.y)}`).join('L');
}

const fullPath = (path) => 'M' + path.pts.map((p) => `${f(p.x)} ${f(p.y)}`).join('L');

// Which circuit each track uses: its own "circuit" setting, else the next free one.
export function circuitFor() {
  const used = new Set(content.tracks.map((t) => t.circuit).filter((c) => CIRCUITS[c]));
  const free = CIRCUIT_KEYS.filter((k) => !used.has(k));
  let extra = 0;
  return new Map(content.tracks.map((t) => {
    if (CIRCUITS[t.circuit]) return [t.id, { key: t.circuit, offset: 0 }];
    if (free.length) return [t.id, { key: free.shift(), offset: 0 }];
    return [t.id, { key: CIRCUIT_KEYS[extra % CIRCUIT_KEYS.length], offset: 6 * (1 + Math.floor(extra++ / CIRCUIT_KEYS.length)) }];
  }));
}

function unitState(unit, skipLesson) {
  const written = unit.lessons.filter(playable);
  const done = written.filter((id) => id !== skipLesson && progress.isComplete(id));
  const boxes = [];
  for (const [key, r] of Object.entries(progress.state.review)) {
    const lessonId = key.slice(0, key.lastIndexOf(':'));
    if (written.includes(lessonId)) boxes.push(r.box);
  }
  const doneFrac = written.length ? done.length / written.length : 0;
  const boxFactor = boxes.length ? boxes.reduce((a, b) => a + b, 0) / boxes.length / MAX_BOX : 1;
  return { written, done, doneFrac, mastery: doneFrac * boxFactor };
}

function layout() {
  const mapping = circuitFor();
  const tracks = [];
  const nodes = new Map();
  for (const t of content.tracks) {
    const { key, offset } = mapping.get(t.id);
    const def = CIRCUITS[key];
    const path = samplePath(def.points.map(([x, y]) => [x + offset, y + offset]), def.closed);
    const n = t.units.length;
    const spacing = path.length / Math.max(n, 1);
    const at = (i) => def.closed ? (path.length * i) / n : n === 1 ? path.length / 2 : path.length * (0.05 + (0.9 * i) / (n - 1));
    const units = t.units.map((u, i) => {
      const s = at(i), p = pointAt(path, s);
      const node = { ...p, s, unit: u, track: t, spacing };
      nodes.set(u.id, node);
      return node;
    });
    tracks.push({ track: t, def, path, units });
  }
  return { tracks, nodes };
}

/**
 * Returns { el: <svg>, summary }.
 * highlightUnit: pulse this neuron; newLesson: animate the dendrite (and any
 * axons) that finishing this lesson just added.
 */
export function renderCircuit({ highlightUnit = null, newLesson = null } = {}) {
  const { tracks, nodes } = layout();
  const now = new Map(), before = new Map();
  for (const [id, n] of nodes) {
    now.set(id, unitState(n.unit));
    before.set(id, newLesson ? unitState(n.unit, newLesson) : now.get(id));
  }
  const written = [...now.values()].filter((s) => s.written.length);
  const summary = {
    wired: written.filter((s) => s.done.length).length,
    myelinated: written.filter((s) => s.mastery >= MASTERED).length,
    total: written.length,
    complete: written.length > 0 && written.every((s) => s.mastery >= MASTERED),
  };

  const tractLayer = [], axonLayer = [], neuronLayer = [], signals = [];
  let axonId = 0;
  const axon = (d, color, sa, sb, wasLit) => {
    const m = Math.min(sa.mastery, sb.mastery);
    const grow = wasLit ? '' : ' grow" pathLength="100';
    if (m >= MASTERED) axonLayer.push(`<path d="${d}" class="c-myelin${grow}" style="stroke:${color}"/>`);
    const id = `nl-ax${axonId++}`;
    axonLayer.push(`<path id="${id}" d="${d}" class="c-axon on${grow}" style="stroke:${color};stroke-width:${f(1.3 + 1.8 * m)}"/>`);
    signals.push({ id, color });
  };

  for (const { track, path, units } of tracks) {
    // The pathway itself: a faint tract you can see before you've learned it.
    tractLayer.push(`<path d="${fullPath(path)}" class="c-tract-glow" style="stroke:${track.color}"/>`);
    tractLayer.push(`<path d="${fullPath(path)}" class="c-tract" style="stroke:${track.color}"/>`);
    const links = units.slice(1).map((u, i) => [units[i], u]);
    if (path.closed && units.length > 2) links.push([units[units.length - 1], units[0]]);
    for (const [a, b] of links) {
      const sa = now.get(a.unit.id), sb = now.get(b.unit.id);
      if (!(sa.done.length && sb.done.length)) continue;
      const wasLit = before.get(a.unit.id).done.length && before.get(b.unit.id).done.length;
      axon(slice(path, a.s, b.s), track.color, sa, sb, wasLit);
    }
  }

  // Neurons: cell body + one dendrite per written lesson, pointing upstream.
  for (const [id, n] of nodes) {
    const st = now.get(id), color = n.track.color;
    if (!st.written.length) { neuronLayer.push(`<circle cx="${f(n.x)}" cy="${f(n.y)}" r="2" class="c-ghost" style="fill:${color}"/>`); continue; }
    const count = Math.min(st.written.length, 8);
    const soma = 2.8 + 2.2 * st.doneFrac;
    const len = Math.max(5, Math.min(11, n.spacing * 0.32));
    const parts = [];
    st.written.slice(0, count).forEach((lessonId, k) => {
      const ang = n.angle + Math.PI + (k - (count - 1) / 2) * ((Math.PI * 1.4) / Math.max(count, 2));
      const x0 = n.x + Math.cos(ang) * soma, y0 = n.y + Math.sin(ang) * soma;
      const xf = n.x + Math.cos(ang) * (soma + len * 0.65), yf = n.y + Math.sin(ang) * (soma + len * 0.65);
      const tw = (s) => `M${f(xf)} ${f(yf)}L${f(xf + Math.cos(ang + s) * len * 0.45)} ${f(yf + Math.sin(ang + s) * len * 0.45)}`;
      const bend = (k % 2 ? -0.25 : 0.25);
      const d = `M${f(x0)} ${f(y0)}Q${f(n.x + Math.cos(ang + bend) * (soma + len * 0.3))} ${f(n.y + Math.sin(ang + bend) * (soma + len * 0.3))} ${f(xf)} ${f(yf)}${tw(0.5)}${tw(-0.45)}`;
      const isDone = st.done.includes(lessonId);
      parts.push(`<path d="${d}" class="c-dend${isDone ? '' : ' off'}${lessonId === newLesson ? ' grow" pathLength="100' : ''}"${isDone ? ` style="stroke:${color}"` : ''}/>`);
    });
    const filled = st.done.length > 0, hl = id === highlightUnit;
    neuronLayer.push(`<g class="c-neuron">${parts.join('')}`
      + (st.mastery >= MASTERED ? `<circle cx="${f(n.x)}" cy="${f(n.y)}" r="${f(soma + 2.6)}" class="c-halo" style="stroke:${color}"/>` : '')
      + (hl ? `<circle cx="${f(n.x)}" cy="${f(n.y)}" r="${f(soma + 2)}" class="c-ping" style="stroke:${color}"/>` : '')
      + `<circle cx="${f(n.x)}" cy="${f(n.y)}" r="${f(soma)}" class="c-soma${filled ? '' : ' off'}" style="${filled ? `fill:${color};` : ''}stroke:${color}"/>`
      + `<title>${esc(n.unit.id)}: ${esc(n.unit.title)} — ${st.done.length}/${st.written.length} lessons</title></g>`);
  }

  if (summary.complete) {
    signals.forEach(({ id, color }, k) => neuronLayer.push(
      `<circle r="2.4" fill="${color}" class="c-signal"><animateMotion dur="1.8s" begin="${f((k * 0.29) % 1.8)}s" repeatCount="indefinite"><mpath href="#${id}"/></animateMotion></circle>`));
  }

  const label = `Your circuit: ${summary.wired} of ${summary.total} neurons wired, ${summary.myelinated} myelinated${summary.complete ? '. Circuit complete.' : '.'}`;
  const el = svg(`<svg class="circuit" viewBox="0 0 ${VIEW_W} ${VIEW_H}" role="img" aria-label="${label}">${anatomy()}${tractLayer.join('')}${axonLayer.join('')}${neuronLayer.join('')}</svg>`);
  return { el, summary };
}

// Per-track progress and circuit names, for the legend.
export function trackProgress() {
  const mapping = circuitFor();
  return content.tracks.map((t) => {
    const states = t.units.map((u) => unitState(u)).filter((s) => s.written.length);
    return { track: t, circuit: CIRCUITS[mapping.get(t.id).key], wired: states.filter((s) => s.done.length).length, total: states.length };
  });
}
