// The "living membrane" progress trace at the top of the lesson player.
// Drawn on a canvas every frame: the resting line ahead flickers, the head
// dot breathes, each answer fires an action potential (a miss is a bump that
// never reaches threshold), and a pulse keeps travelling down the finished
// axon. setCharge() raises the head toward threshold while you swipe.

const SHAPES = {
  ok: [[0, 0], [0.3, 0], [0.4, 6], [0.46, 32], [0.52, 22], [0.6, -6], [0.75, -2.5], [0.9, 0], [1, 0]],
  miss: [[0, 0], [0.3, 0], [0.42, 8], [0.52, 5], [0.7, 1], [1, 0]],
  read: [[0, 0], [0.3, 0], [0.4, 4], [0.46, 18], [0.52, 12], [0.6, -3], [0.8, 0], [1, 0]],
};
const THRESHOLD = 11;
const H = 40, BASE = 28, SCALE = 0.75;
const DRAW_MS = 450, GLOW_MS = 900, PULSE_MS = 2600;

function shapeAt(shape, t) {
  for (let k = 1; k < shape.length; k++) {
    if (t <= shape[k][0]) {
      const [t0, v0] = shape[k - 1], [t1, v1] = shape[k];
      return v0 + ((v1 - v0) * (t - t0)) / (t1 - t0);
    }
  }
  return 0;
}

function mix(hexA, hexB, t) {
  const p = (hex) => { const n = parseInt(hex.replace('#', ''), 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255]; };
  if (!/^#[0-9a-f]{6}$/i.test(hexA)) return hexA;
  const a = p(hexA), b = p(hexB);
  return `rgb(${a.map((c, i) => Math.round(c + (b[i] - c) * t)).join(',')})`;
}

export function createTrace(host, signal) {
  const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const canvas = document.createElement('canvas');
  canvas.className = 'trace';
  canvas.setAttribute('role', 'img');
  host.replaceChildren(canvas);
  const ctx = canvas.getContext('2d');

  const s = { results: [], total: 1, anim: null, v: 0, vTarget: 0, th: 0, thTarget: 0 };
  let W = 0, dpr = 1, colors = {};

  function resize() {
    dpr = window.devicePixelRatio || 1;
    W = Math.max(160, Math.round(host.clientWidth));
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
    colors = { track, bad: get('--bad'), rest: get('--line-strong'), warn: get('--warn-line'), pulse: mix(track, dark ? '#ffffff' : '#000000', dark ? 0.65 : 0.35) };
  }

  // Draws step i's spike up to fraction `upto`, returns the pen position.
  function spikePath(i, kind, upto, X0, seg) {
    ctx.beginPath();
    let x = X0 + seg * i, y = BASE;
    const n = 80;
    for (let k = 0; k <= n; k++) {
      const t = Math.min(k / n, upto);
      x = X0 + seg * (i + t);
      y = BASE - shapeAt(SHAPES[kind], t) * SCALE;
      if (k) ctx.lineTo(x, y); else ctx.moveTo(x, y);
      if (t === upto) break;
    }
    return [x, y];
  }

  function draw(now) {
    if (!W) resize();
    const X0 = 4, X1 = W - 6, seg = (X1 - X0) / s.total, n = s.results.length;
    const headX = X0 + seg * n;
    const still = reduceMotion ? 0 : 1;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, W, H);
    ctx.lineJoin = 'round';
    ctx.lineCap = 'round';

    // Threshold line fades in while you're charging a swipe.
    s.th += (s.thTarget - s.th) * 0.15;
    if (s.th > 0.02) {
      const ty = BASE - THRESHOLD * SCALE;
      ctx.globalAlpha = s.th;
      ctx.setLineDash([3, 4]);
      ctx.strokeStyle = colors.warn;
      ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(X0, ty); ctx.lineTo(X1, ty); ctx.stroke();
      ctx.setLineDash([]);
      ctx.globalAlpha = 1;
    }

    // Resting membrane ahead of you: a gentle flicker.
    ctx.strokeStyle = colors.rest;
    ctx.lineWidth = 2;
    ctx.beginPath();
    for (let x = headX; x <= X1; x += 2) {
      const y = BASE + still * (Math.sin(x * 0.35 + now / 170) * 0.9 + Math.sin(x * 0.9 - now / 90) * 0.5);
      if (x === headX) ctx.moveTo(x, y); else ctx.lineTo(x, y);
    }
    ctx.stroke();

    // Finished steps: each one a spike (or a failed bump for a miss).
    let beam = null;
    s.results.forEach((kind, i) => {
      const animating = s.anim && s.anim.i === i;
      const p = animating && still ? Math.min(1, (now - s.anim.start) / DRAW_MS) : 1;
      const tip = spikePath(i, kind, p, X0, seg);
      ctx.strokeStyle = kind === 'miss' ? colors.bad : colors.track;
      ctx.lineWidth = 2.4;
      ctx.stroke();
      if (animating && p < 1) beam = tip;
      if (animating && p === 1 && kind !== 'miss' && still) {
        const age = (now - s.anim.start - DRAW_MS) / GLOW_MS;
        if (age < 1) {
          spikePath(i, kind, 1, X0, seg);
          ctx.globalAlpha = 0.3 * (1 - age);
          ctx.lineWidth = 7;
          ctx.strokeStyle = colors.track;
          ctx.stroke();
          ctx.globalAlpha = 1;
        }
      }
    });

    // A pulse keeps travelling down the axon you've built.
    if (still && n) {
      const px = X0 + ((now % PULSE_MS) / PULSE_MS) * (headX - X0);
      ctx.save();
      ctx.beginPath(); ctx.rect(px - 9, 0, 18, H); ctx.clip();
      s.results.forEach((kind, i) => {
        spikePath(i, kind, 1, X0, seg);
        ctx.strokeStyle = colors.pulse;
        ctx.lineWidth = 3;
        ctx.stroke();
      });
      ctx.restore();
    }

    // Head of the trace: breathes at rest, rises as you charge a swipe.
    if (beam) {
      ctx.fillStyle = colors.pulse;
      ctx.beginPath(); ctx.arc(beam[0], beam[1], 3, 0, 7); ctx.fill();
    } else {
      s.v += (s.vTarget - s.v) * 0.16;
      const hy = BASE - s.v * SCALE;
      const fired = s.v > THRESHOLD;
      if (s.v > 0.4) {
        ctx.strokeStyle = fired ? colors.pulse : colors.track;
        ctx.lineWidth = 2.4;
        ctx.beginPath(); ctx.moveTo(headX - 6, BASE); ctx.lineTo(headX, hy); ctx.stroke();
      }
      ctx.fillStyle = fired ? colors.pulse : colors.track;
      ctx.beginPath(); ctx.arc(headX, hy, 3.6 + still * Math.sin(now / 280) * 1.1, 0, 7); ctx.fill();
    }

    if (!signal.aborted) requestAnimationFrame(draw);
  }

  const ro = new ResizeObserver(resize);
  ro.observe(host);
  signal.addEventListener('abort', () => ro.disconnect());
  readColors();
  requestAnimationFrame(draw);

  return {
    setTotal(total, step) {
      s.total = Math.max(1, total);
      canvas.setAttribute('aria-label', `Step ${Math.min(step, total)} of ${total}`);
    },
    push(kind) {
      s.results.push(kind);
      s.anim = { i: s.results.length - 1, start: performance.now() };
      s.v = s.vTarget = 0;
    },
    // p: 0 = resting, 1 = at threshold, >1 = past it
    setCharge(p) {
      s.vTarget = Math.max(0, p) * (THRESHOLD + 5);
      s.thTarget = p > 0 ? 0.9 : 0;
    },
    fire() {
      s.vTarget = THRESHOLD + 10;
      setTimeout(() => { s.vTarget = 0; s.thTarget = 0; }, 220);
    },
    refreshColors: readColors,
    THRESHOLD,
  };
}
