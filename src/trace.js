// The lesson's membrane potential, drawn live on a canvas at the top of the
// player. One potential for the whole lesson: every step you swipe past adds
// an EPSP that sums toward threshold; a miss adds an IPSP (and the question
// comes back, so threshold moves further away). The last swipe reaches
// threshold and finale() expands the scope and fires a full-size action
// potential. Everything jitters gently like a living membrane.
//
// Real proportions: rest −70 mV, threshold −55 mV, peak +35 mV, so the
// spike is ~7× taller than the whole EPSP climb.

const REST = -70, THRESHOLD = -55, PEAK = 35, AHP = -78;
const PX_PER_MV = 18 / 15;          // the EPSP climb (rest → threshold) is 18px
const PAD_BOTTOM = 12;
const DRAW_MS = 420, AP_MS = 650, PULSE_MS = 2600;
const AP_SLOTS = 2;                 // the spike gets a wider slice of the trace

// mV over the course of the action potential (t: 0 → 1)
const AP_SHAPE = [[0, THRESHOLD], [0.1, THRESHOLD + 3], [0.2, PEAK], [0.3, 5], [0.42, AHP], [0.6, AHP + 3], [1, REST]];

const levelToMv = (L) => REST + L * (THRESHOLD - REST);
const ease = (u) => (1 - Math.exp(-14 * u)) * (1 + 0.3 * Math.exp(-5 * u)); // fast rise, small overshoot

function interp(points, t) {
  for (let k = 1; k < points.length; k++) {
    if (t <= points[k][0]) {
      const [t0, v0] = points[k - 1], [t1, v1] = points[k];
      return v0 + ((v1 - v0) * (t - t0)) / (t1 - t0);
    }
  }
  return points[points.length - 1][1];
}

// mV for an event at fraction t of its slot
function eventMv(e, t) {
  if (e.kind === 'ap') return interp(AP_SHAPE, t);
  if (t < 0.3) return levelToMv(e.a);
  const u = (t - 0.3) / 0.7;
  const L = e.a + (e.b - e.a) * ease(u);
  // An IPSP always dips visibly, even when the level ends where it started.
  return levelToMv(e.kind === 'ipsp' ? L - 0.22 * Math.sin(Math.PI * Math.min(u * 1.6, 1)) : L);
}

function mix(hexA, hexB, t) {
  if (!/^#[0-9a-f]{6}$/i.test(hexA)) return hexA;
  const p = (hex) => { const n = parseInt(hex.slice(1), 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255]; };
  const a = p(hexA), b = p(hexB);
  return `rgb(${a.map((c, i) => Math.round(c + (b[i] - c) * t)).join(',')})`;
}

export function createTrace(host, signal) {
  const still = matchMedia('(prefers-reduced-motion: reduce)').matches ? 0 : 1;
  const canvas = document.createElement('canvas');
  canvas.className = 'trace';
  canvas.setAttribute('role', 'img');
  host.replaceChildren(canvas);
  const ctx = canvas.getContext('2d');

  const s = { events: [], slots: 3, anim: null, level: 0, from: 0, to: 0, charge: 0, chargeT: 0 };
  let W = 0, H = 0, dpr = 1, colors = {};

  function resize() {
    dpr = window.devicePixelRatio || 1;
    W = Math.max(160, Math.round(host.clientWidth));
    H = Math.max(30, Math.round(host.clientHeight));
    canvas.width = W * dpr;
    canvas.height = H * dpr;
    canvas.style.width = `${W}px`;
    canvas.style.height = `${H}px`;
  }

  function readColors() {
    const cs = getComputedStyle(host);
    const get = (n) => cs.getPropertyValue(n).trim();
    const dark = matchMedia('(prefers-color-scheme: dark)').matches;
    const track = get('--track');
    colors = { track, bad: get('--bad'), rest: get('--line-strong'), warn: get('--warn-line'), faint: get('--faint'), pulse: mix(track, dark ? '#ffffff' : '#000000', dark ? 0.65 : 0.35) };
  }

  const jitter = (x, now) => still * (Math.sin(x * 0.35 + now / 170) * 0.8 + Math.sin(x * 0.9 - now / 90) * 0.45 + Math.sin(x * 2.1 + now / 60) * 0.25);

  function draw(now) {
    if (!W) resize();
    const yOf = (mv) => H - PAD_BOTTOM - (mv - REST) * PX_PER_MV;
    const X0 = 4, X1 = W - 6, seg = (X1 - X0) / s.slots;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, W, H);
    ctx.lineJoin = 'round';
    ctx.lineCap = 'round';

    // Threshold: always visible, it's where you're heading.
    const ty = yOf(THRESHOLD);
    ctx.setLineDash([3, 4]);
    ctx.strokeStyle = colors.warn;
    ctx.globalAlpha = 0.75;
    ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(X0, ty); ctx.lineTo(X1, ty); ctx.stroke();
    ctx.setLineDash([]);
    ctx.globalAlpha = 1;

    // History: one continuous line of summed potentials.
    const pts = [[X0, yOf(REST) + jitter(X0, now)]];
    const missRuns = [];
    let x = X0, beam = null;
    s.events.forEach((e, i) => {
      const width = seg * (e.kind === 'ap' ? AP_SLOTS : 1);
      const animating = s.anim && s.anim.i === i;
      const dur = e.kind === 'ap' ? AP_MS : DRAW_MS;
      const p = animating && still ? Math.min(1, (now - s.anim.start) / dur) : 1;
      const run = [];
      const n = e.kind === 'ap' ? 120 : 40;
      for (let k = 1; k <= n; k++) {
        const t = Math.min(k / n, p);
        const px = x + width * t;
        const mv = eventMv(e, t);
        const py = yOf(mv) + jitter(px, now) * (e.kind === 'ap' ? 0.4 : 1);
        pts.push([px, py]);
        run.push([px, py]);
        if (t === p) break;
      }
      if (e.kind === 'ipsp') missRuns.push(run);
      if (animating && p < 1) beam = pts[pts.length - 1];
      x += width;
    });
    const headX = x;
    s.peakAt = { x: headX + seg * AP_SLOTS * 0.2, y: yOf(PEAK) }; // where the spike will top out
    const stroke =(points, color, width) => {
      ctx.strokeStyle = color;
      ctx.lineWidth = width;
      ctx.beginPath();
      points.forEach(([px, py], k) => (k ? ctx.lineTo(px, py) : ctx.moveTo(px, py)));
      ctx.stroke();
    };
    stroke(pts, colors.track, 2.4);
    missRuns.forEach((run) => stroke(run, colors.bad, 2.4));

    // A pulse travels down everything you've built so far.
    if (still && s.events.length) {
      const px = X0 + ((now % PULSE_MS) / PULSE_MS) * (headX - X0);
      ctx.save();
      ctx.beginPath(); ctx.rect(px - 9, 0, 18, H); ctx.clip();
      stroke(pts, colors.pulse, 3);
      ctx.restore();
    }

    if (beam) {
      ctx.fillStyle = colors.pulse;
      ctx.beginPath(); ctx.arc(beam[0], beam[1], 3.2, 0, 7); ctx.fill();
    } else if (!s.done) {
      // Resting membrane ahead, at the current level.
      const restY = yOf(levelToMv(s.level));
      ctx.strokeStyle = colors.rest;
      ctx.lineWidth = 2;
      ctx.beginPath();
      for (let xx = headX; xx <= X1; xx += 2) {
        const yy = restY + jitter(xx, now);
        if (xx === headX) ctx.moveTo(xx, yy); else ctx.lineTo(xx, yy);
      }
      ctx.stroke();
      // Head: breathes, and rises toward the next level while you swipe.
      s.charge += (s.chargeT - s.charge) * 0.18;
      const L = s.from + (s.to - s.from) * Math.min(1, s.charge);
      const hy = yOf(levelToMv(L)) + jitter(headX, now);
      const armed = s.charge >= 0.98;
      if (s.charge > 0.02) {
        ctx.strokeStyle = armed ? colors.pulse : colors.track;
        ctx.lineWidth = 2.4;
        ctx.beginPath(); ctx.moveTo(headX, restY); ctx.lineTo(headX + 3, hy); ctx.stroke();
      }
      ctx.fillStyle = armed ? colors.pulse : colors.track;
      ctx.beginPath();
      ctx.arc(headX + (s.charge > 0.02 ? 3 : 0), hy, 3.6 + still * Math.sin(now / 280) * 1.1, 0, 7);
      ctx.fill();
    }

    if (!signal.aborted) requestAnimationFrame(draw);
  }

  const ro = new ResizeObserver(resize);
  ro.observe(host);
  signal.addEventListener('abort', () => ro.disconnect());
  readColors();
  requestAnimationFrame(draw);

  const push = (e) => {
    s.events.push(e);
    s.anim = { i: s.events.length - 1, start: performance.now() };
  };

  return {
    // steps: how many swipes this lesson needs right now; misses so far
    layout(steps, misses, step) {
      s.slots = Math.max(1, steps + misses + AP_SLOTS);
      canvas.setAttribute('aria-label', `Step ${Math.min(step, steps)} of ${steps}`);
    },
    epsp(a, b) { push({ kind: 'epsp', a, b }); s.level = s.from = s.to = b; s.charge = s.chargeT = 0; },
    ipsp(a, b) { push({ kind: 'ipsp', a, b }); s.level = s.from = s.to = b; },
    // p: 0 = resting, 1 = reached the next level
    setCharge(p, from, to) { s.chargeT = Math.max(0, p); s.from = from; s.to = to; },

    // Expand the scope and fire. onPeak runs as the spike tops out.
    finale({ onPeak } = {}) {
      return new Promise((resolve) => {
        s.done = true;
        host.classList.add('expanded');
        const fire = () => {
          const at = { ...s.peakAt };
          push({ kind: 'ap', a: 1, b: 0 });
          setTimeout(() => onPeak?.(at), still ? AP_MS * 0.2 : 0);
          setTimeout(resolve, still ? AP_MS + 1300 : 600);
        };
        setTimeout(fire, still ? 420 : 0);
      });
    },
    refreshColors: readColors,
  };
}
