// "Your circuit": the whole course drawn as a network of neurons inside a
// brain. Each track gets a brain region; each unit is a neuron in it.
//   - finishing a lesson grows one dendrite on its unit's neuron
//   - the cell body fills in as the unit's lessons get done
//   - reviewing until questions reach the top boxes thickens and myelinates
//     the axons between neurons
//   - prereqs are axons (across regions when a prereq is in another track)
// When every written unit is mastered, the circuit is complete and signals
// run along every axon.

import { content, playable } from './content.js';
import { progress, MAX_BOX } from './progress.js';
import { svg, esc } from './ui.js';

const VIEW_W = 360, VIEW_H = 300;
const MASTERED = 0.8;

// Brain regions, largest first. Tracks with the most units get the biggest.
const REGIONS = [
  { cx: 106, cy: 132, rx: 48, ry: 54 },  // frontal
  { cx: 214, cy: 86, rx: 58, ry: 33 },   // parietal
  { cx: 182, cy: 186, rx: 58, ry: 25 },  // temporal
  { cx: 292, cy: 138, rx: 31, ry: 43 },  // occipital
  { cx: 266, cy: 230, rx: 34, ry: 14 },  // cerebellum
  { cx: 216, cy: 262, rx: 8, ry: 20 },   // brainstem
];
const OUTLINE = 'M60 170C40 120 70 60 140 45C200 30 280 45 315 95C340 130 335 175 305 195C285 210 260 212 240 208C225 225 200 232 175 228C150 240 110 238 90 222C70 210 62 192 60 170Z';
const CEREBELLUM = 'M226 214C236 200 286 198 304 214C318 228 306 250 276 252C248 254 222 238 226 214Z';
const BRAINSTEM = 'M204 224C210 248 210 272 214 294M228 222C226 246 228 270 232 294';
const SULCI = ['M150 60C160 90 150 120 165 150', 'M240 52C232 80 248 104 236 130', 'M100 190C130 175 170 168 215 170', 'M285 90C276 110 288 130 280 156'];

// Small deterministic random generator so a unit always sits in the same spot.
function seeded(str) {
  let h = 2166136261;
  for (const c of str) h = Math.imul(h ^ c.charCodeAt(0), 16777619);
  return () => {
    h = Math.imul(h ^ (h >>> 15), 2246822507);
    h = Math.imul(h ^ (h >>> 13), 3266489909);
    return ((h ^= h >>> 16) >>> 0) / 4294967296;
  };
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
  const order = content.tracks.map((t, i) => ({ t, i })).sort((a, b) => b.t.units.length - a.t.units.length || a.i - b.i);
  const nodes = new Map();
  order.forEach(({ t }, k) => {
    const R = REGIONS[k % REGIONS.length];
    const placed = [];
    for (const unit of t.units) {
      // Best of 24 random spots: the one farthest from neurons already placed.
      const rnd = seeded(unit.id);
      let best = null, bestD = -1;
      for (let c = 0; c < 24; c++) {
        const a = rnd() * Math.PI * 2, r = Math.sqrt(rnd()) * 0.86;
        const p = { x: R.cx + Math.cos(a) * r * R.rx, y: R.cy + Math.sin(a) * r * R.ry };
        const d = placed.length ? Math.min(...placed.map((q) => Math.hypot(q.x - p.x, q.y - p.y))) : 1e9;
        if (d > bestD) { bestD = d; best = p; }
      }
      placed.push(best);
      nodes.set(unit.id, { ...best, unit, track: t, region: R, rnd });
    }
  });

  // Axons: prereqs (including across tracks); a track with no internal
  // prereqs is wired in course order so it still forms a circuit.
  const edges = [];
  for (const t of content.tracks) {
    const ids = new Set(t.units.map((u) => u.id));
    const linked = t.units.some((u) => u.prereqs.some((p) => ids.has(p)));
    t.units.forEach((u, i) => {
      for (const p of u.prereqs) if (nodes.has(p)) edges.push([p, u.id]);
      if (!linked && i > 0) edges.push([t.units[i - 1].id, u.id]);
    });
  }
  return { nodes, edges };
}

const f = (n) => n.toFixed(1);

/**
 * Returns an <svg> of the circuit plus a summary.
 * highlightUnit: pulse this neuron; newLesson: animate the dendrite (and any
 * axons) that finishing this lesson just added.
 */
export function renderCircuit({ highlightUnit = null, newLesson = null } = {}) {
  const { nodes, edges } = layout();
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

  const out = [];
  out.push(`<path d="${OUTLINE}" class="c-brain"/><path d="${CEREBELLUM}" class="c-brain"/><path d="${BRAINSTEM}" class="c-brain stem"/>`);
  out.push(SULCI.map((d) => `<path d="${d}" class="c-sulcus"/>`).join(''));

  // Axons first, so neurons sit on top of them.
  const signals = [];
  edges.forEach(([a, b], i) => {
    const A = nodes.get(a), B = nodes.get(b), sa = now.get(a), sb = now.get(b);
    const cross = A.track !== B.track;
    const mx = (A.x + B.x) / 2, my = (A.y + B.y) / 2;
    // Long-range axons bow toward the middle of the brain.
    const bow = cross ? 0.35 : 0.18;
    const qx = mx + (190 - mx) * bow + (B.y - A.y) * 0.12, qy = my + (140 - my) * bow - (B.x - A.x) * 0.12;
    const d = `M${f(A.x)} ${f(A.y)}Q${f(qx)} ${f(qy)} ${f(B.x)} ${f(B.y)}`;
    const lit = sa.done.length && sb.done.length;
    if (!lit) { out.push(`<path d="${d}" class="c-axon off"/>`); return; }
    const wasLit = before.get(a).done.length && before.get(b).done.length;
    const m = Math.min(sa.mastery, sb.mastery);
    const color = (sa.done.length >= sb.done.length ? A : B).track.color;
    const grow = !wasLit ? ' grow" pathLength="100' : '';
    if (m >= MASTERED) out.push(`<path d="${d}" class="c-myelin${grow}" style="stroke:${color}"/>`);
    out.push(`<path id="ax${i}" d="${d}" class="c-axon on${grow}" style="stroke:${color};stroke-width:${f(1.2 + 2 * m)}"/>`);
    signals.push({ i, color });
  });

  for (const [id, n] of nodes) {
    const st = now.get(id), color = n.track.color;
    if (!st.written.length) {
      out.push(`<circle cx="${f(n.x)}" cy="${f(n.y)}" r="2" class="c-ghost"/>`);
      continue;
    }
    // Dendrites point away from the neuron's first axon.
    const target = edges.find(([a]) => a === id)?.[1];
    const T = target ? nodes.get(target) : { x: n.x + 10, y: n.y };
    const axonAngle = Math.atan2(T.y - n.y, T.x - n.x);
    const count = Math.min(st.written.length, 8);
    const soma = 3.4 + 2.6 * st.doneFrac;
    const parts = [];
    st.written.slice(0, count).forEach((lessonId, k) => {
      const ang = axonAngle + Math.PI + (k - (count - 1) / 2) * ((Math.PI * 1.5) / Math.max(count, 2));
      const len = 9 + n.rnd() * 4;
      const x0 = n.x + Math.cos(ang) * soma, y0 = n.y + Math.sin(ang) * soma;
      const xf = n.x + Math.cos(ang) * (soma + len * 0.65), yf = n.y + Math.sin(ang) * (soma + len * 0.65);
      const tw = (s) => `M${f(xf)} ${f(yf)}L${f(xf + Math.cos(ang + s) * len * 0.45)} ${f(yf + Math.sin(ang + s) * len * 0.45)}`;
      const d = `M${f(x0)} ${f(y0)}Q${f(n.x + Math.cos(ang + 0.25) * (soma + len * 0.3))} ${f(n.y + Math.sin(ang + 0.25) * (soma + len * 0.3))} ${f(xf)} ${f(yf)}${tw(0.5)}${tw(-0.45)}`;
      const isDone = st.done.includes(lessonId);
      parts.push(`<path d="${d}" class="c-dend${isDone ? '' : ' off'}${lessonId === newLesson ? ' grow" pathLength="100' : ''}"${isDone ? ` style="stroke:${color}"` : ''}/>`);
    });
    const filled = st.done.length > 0;
    const hl = id === highlightUnit;
    out.push(`<g class="c-neuron${hl ? ' hl' : ''}">${parts.join('')}`
      + (st.mastery >= MASTERED ? `<circle cx="${f(n.x)}" cy="${f(n.y)}" r="${f(soma + 3)}" class="c-halo" style="stroke:${color}"/>` : '')
      + (hl ? `<circle cx="${f(n.x)}" cy="${f(n.y)}" r="${f(soma + 2)}" class="c-ping" style="stroke:${color}"/>` : '')
      + `<circle cx="${f(n.x)}" cy="${f(n.y)}" r="${f(soma)}" class="c-soma${filled ? '' : ' off'}" style="${filled ? `fill:${color};` : ''}stroke:${color}"/>`
      + `<title>${esc(n.unit.id)}: ${esc(n.unit.title)} — ${st.done.length}/${st.written.length} lessons</title></g>`);
  }

  // Circuit complete: signals run along every axon.
  if (summary.complete) {
    signals.forEach(({ i, color }, k) => out.push(
      `<circle r="2.6" fill="${color}" class="c-signal"><animateMotion dur="2.2s" begin="${(k * 0.37) % 2.2}s" repeatCount="indefinite"><mpath href="#ax${i}"/></animateMotion></circle>`));
  }

  const label = `Your circuit: ${summary.wired} of ${summary.total} neurons wired, ${summary.myelinated} myelinated${summary.complete ? '. Circuit complete.' : '.'}`;
  const el = svg(`<svg class="circuit" viewBox="40 28 ${VIEW_W - 60} ${VIEW_H - 28}" role="img" aria-label="${label}">${out.join('')}</svg>`);
  return { el, summary };
}

// Per-track progress for the legend.
export function trackProgress() {
  return content.tracks.map((t) => {
    const states = t.units.map((u) => unitState(u)).filter((s) => s.written.length);
    return { track: t, wired: states.filter((s) => s.done.length).length, total: states.length };
  });
}
