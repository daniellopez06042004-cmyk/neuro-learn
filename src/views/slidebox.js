// The slide box: one specimen slide per finished unit, standing in a lab slide
// box. Drag a slide up (or tap it) to pull it out, then drag it onto the
// microscope stage to look through the eyepiece (pan, pinch-zoom, objectives);
// "Put it back" drops it into its groove. #/slides?add=A5 plays the moment a
// newly earned slide drops into the box.

import { h, icon } from '../ui.js';
import { content } from '../content.js';
import { progress } from '../progress.js';
import { go, onLeave } from '../router.js';
import { slideSVG, scopeView, loadAtlas } from '../slides.js';

const still = () => matchMedia('(prefers-reduced-motion: reduce)').matches;
const easeIO = (t) => (t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2);
const easeIn = (t) => t * t * t;
const easeOut = (t) => 1 - Math.pow(1 - t, 3);
const fmtDate = (d) => (d ? new Date(d + 'T12:00').toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' }) : '');

// Every unit in course order, split into the box's two columns at the track
// boundary that comes closest to half, so a track never straddles both.
function columns() {
  const units = content.tracks.flatMap((t) => t.units.map((u) => ({ unit: u, track: t })));
  let best = units.length, at = 0;
  for (const t of content.tracks) {
    at += t.units.length;
    if (Math.abs(at - units.length / 2) < Math.abs(best - units.length / 2)) best = at;
  }
  return [units.slice(0, best), units.slice(best)];
}

export function renderSlideBox(root, params) {
  let busy = false, mode = 'stain', viewing = null; // viewing: [unitId, atlas] while a slide is out
  const ac = new AbortController();
  onLeave(() => ac.abort());
  const sb = h('div', { class: 'sb-body' });
  const wrap = h('div', { class: 'sb-wrap' }, sb);
  root.replaceChildren(h('div', { class: 'screen slidebox' },
    h('header', { class: 'topbar' },
      h('button', { class: 'icon-btn sb-top-back', 'aria-label': 'Back', onclick: () => (viewing ? putBack(...viewing) : go('/')) }, icon('back')),
      h('h1', null, 'Slide box')),
    wrap));

  const earned = () => Object.fromEntries(Object.keys(progress.state.slides || {}).map((id) => [id, content.slides.get(id) || null]));
  const title = (id) => content.units.get(id)?.unit.title || id;

  // ---------- the box ----------
  function box(hide) {
    const got = earned(), codes = columns().flat().map(({ unit }) => unit.id).filter((id) => id in got);
    const lines = Array.from({ length: Math.max(10, codes.length + (codes.length % 2)) }, (_, k) => codes[k]);
    sb.replaceChildren(
      h('div', { class: 'sb-lid' },
        h('div', { class: 'sb-card' },
          h('div', { class: 'sb-card-hd' }, h('span', null, 'SLIDE INVENTORY'), h('span', null, `${codes.length} / ${content.units.size}`)),
          h('div', { class: 'sb-card-fields' }, h('span', null, 'Box No. ', h('b', null, '1')), h('span', null, 'Name ', h('b', null, 'Neuro Learn'))),
          h('div', { class: 'sb-inv' }, lines.map((id, k) => h('div', null, h('span', null, k + 1), id ? h('i', null, `${id} ${got[id]?.label || ''}`) : null))))),
      h('div', { class: 'sb-hinge' }),
      h('div', { class: 'sb-box' }, h('div', { class: 'sb-cols' }, columns().map((col) => h('div', { class: 'sb-col' }, col.map(({ unit }) => {
        const has = unit.id in got;
        return h('div', { class: 'sb-slot', 'data-unit': unit.id },
          h('div', { class: 'sb-rim' }, unit.id),
          h('div', { class: 'sb-groove' }, has ? h('div', { class: 'sb-s3', style: hide === unit.id ? 'visibility:hidden' : null },
            h('div', { class: 'sb-face', role: 'button', tabindex: '0', 'aria-label': `Pull out the ${unit.id} slide: ${unit.title}`, html: slideSVG(unit.id, got[unit.id], null) })) : null));
      }))))),
      h('p', { class: 'muted small sb-hint' }, codes.length ? 'Drag a slide up to pull it out.' : 'Finish a unit to earn its slide.'));
    sb.querySelectorAll('.sb-face').forEach((f) => {
      f.addEventListener('pointerdown', grab);
      f.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); pull(f.closest('.sb-slot').dataset.unit); } });
    });
    // Brain slides need their Allen section; redraw each one when it arrives.
    for (const [id, s] of Object.entries(got)) {
      if (s?.tissue !== 'brain-coronal') continue;
      loadAtlas(id, s).then((atlas) => { const f = sb.querySelector(`.sb-slot[data-unit="${id}"] .sb-face`); if (atlas && f) f.innerHTML = slideSVG(id, s, atlas); });
    }
  }

  // ---------- poses: where a slide is (x, y, width) and how far it's tipped back (a, degrees) ----------
  const W0 = () => sb.clientWidth;
  const rel = (r) => { const w = wrap.getBoundingClientRect(); return { x: r.left - w.left, y: r.top - w.top, w: r.width }; };
  const slotEl = (id) => sb.querySelector(`.sb-slot[data-unit="${id}"] .sb-s3`);
  const slotPose = (id) => { const r = rel(slotEl(id).getBoundingClientRect()); return { x: r.x, y: r.y - r.w / 3, w: r.w, a: 80 }; };
  const rectPose = (node) => ({ ...rel(node.getBoundingClientRect()), a: 0 });
  const lerp = (A, B, t) => ({ x: A.x + (B.x - A.x) * t, y: A.y + (B.y - A.y) * t, w: A.w + (B.w - A.w) * t, a: A.a + (B.a - A.a) * t });
  const lifted = (p) => ({ x: Math.max(4, p.x - p.w * 0.12), y: Math.max(4, p.y - 118), w: Math.min(W0(), p.w * 1.24), a: 0 });
  function fly(id, atlas) {
    const d = h('div', { class: 'sb-fly' }, h('div', { class: 'sb-fly-face', html: slideSVG(id, earned()[id], atlas, true) }));
    d.style.width = `${W0()}px`;
    d.style.height = `${W0() / 3}px`;
    wrap.append(d);
    return d;
  }
  function setPose(d, p) {
    d.style.transform = `translate(${p.x}px,${p.y}px) scale(${p.w / W0()})`;
    d.firstChild.style.transform = `rotateX(${p.a}deg)`;
    d.pose = p;
  }
  function tween(d, to, ms, ease = easeIO) {
    const from = d.pose;
    if (still()) { setPose(d, to); return Promise.resolve(); }
    return new Promise((res) => {
      const t0 = performance.now();
      const step = (now) => { const t = Math.min(1, (now - t0) / ms); setPose(d, lerp(from, to, ease(t))); t < 1 && !ac.signal.aborted ? requestAnimationFrame(step) : res(); };
      requestAnimationFrame(step);
    });
  }
  // A slide drops into its groove: over the slot, tips back, settles with a small bounce.
  async function drop(d, id) {
    const s = slotPose(id);
    await tween(d, { x: s.x, y: s.y - 70, w: s.w, a: 0 }, 380);
    await tween(d, { ...s, y: s.y + 3, a: 84 }, 230, easeIn);
    await tween(d, s, 140, easeOut);
    slotEl(id).style.visibility = '';
    d.remove();
    const rim = sb.querySelector(`.sb-slot[data-unit="${id}"] .sb-rim`);
    rim.classList.add('hot');
    setTimeout(() => rim.classList.remove('hot'), 1600);
  }

  // ---------- grab: drag up to pull a slide out; a tap pulls it out too ----------
  function grab(e) {
    if (busy) return;
    e.preventDefault();
    const face = e.currentTarget, id = face.closest('.sb-slot').dataset.unit, y0 = e.clientY, start = slotPose(id);
    let d = null, p = 0, moved = false;
    try { face.setPointerCapture(e.pointerId); } catch { /* synthetic events */ }
    const lift = () => { if (!d) { d = fly(id); setPose(d, start); face.parentNode.style.visibility = 'hidden'; } };
    const move = (ev) => {
      if (Math.abs(ev.clientY - y0) > 4) moved = true;
      if (!moved) return;
      lift();
      p = Math.min(1, -Math.min(0, ev.clientY - y0) / 110);
      setPose(d, lerp(start, lifted(start), easeOut(p)));
    };
    const up = async () => {
      face.removeEventListener('pointermove', move);
      face.removeEventListener('pointerup', up);
      face.removeEventListener('pointercancel', up);
      if (!moved || p > 0.35) { lift(); return pull(id, d); }
      busy = true;
      await tween(d, start, 220, easeIn);
      face.parentNode.style.visibility = '';
      d.remove();
      busy = false;
    };
    face.addEventListener('pointermove', move);
    face.addEventListener('pointerup', up);
    face.addEventListener('pointercancel', up);
  }
  async function pull(id, d) {
    busy = true;
    const atlas = await loadAtlas(id, earned()[id]);
    if (!d) { d = fly(id, atlas); setPose(d, slotPose(id)); slotEl(id).style.visibility = 'hidden'; }
    await tween(d, lifted(slotPose(id)), 260, easeOut);
    viewer(id, atlas, true);
    const big = sb.querySelector('.sb-big');
    await tween(d, rectPose(big), 320);
    big.style.visibility = '';
    d.remove();
    busy = false;
    root.querySelector('.sb-top-back')?.focus({ preventScroll: true });
  }
  async function putBack(id, atlas) {
    if (busy) return;
    busy = true;
    const big = sb.querySelector('.sb-onstage:not(.ghost)') || sb.querySelector('.sb-big'), d = fly(id, atlas);
    setPose(d, rectPose(big));
    big.style.visibility = 'hidden';
    viewing = null;
    box(id);
    await drop(d, id);
    busy = false;
    sb.querySelector(`.sb-slot[data-unit="${id}"] .sb-face`)?.focus({ preventScroll: true });
  }

  // ---------- the viewer: the slide held up over the microscope stage; once it's on the stage, the eyepiece ----------
  let onStage = false;
  const eye = { z: 1, cx: 50, cy: 30 }; // where the eyepiece is looking: zoom and centre, in section units (100 × 60)
  function viewer(id, atlas, hideBig = false) {
    const s = earned()[id], { unit, track } = content.units.get(id) || {};
    const scope = s && s.tissue !== 'request' ? scopeView(id, s, atlas, mode, track?.color) : null;
    if (!viewing || viewing[0] !== id) { onStage = false; Object.assign(eye, { z: 1, cx: 50, cy: 30 }); }
    viewing = [id, atlas];
    const slide = slideSVG(id, s, atlas, true);
    const read = s?.paper || s?.sources?.find((src) => src.doi);
    sb.replaceChildren(...[
      !scope ? h('div', { class: 'sb-big', style: hideBig ? 'visibility:hidden' : null, html: slide }) : [
        onStage ? null : h('div', { class: 'sb-big', role: 'button', tabindex: '0', 'aria-label': 'Put the slide on the microscope stage', style: hideBig ? 'visibility:hidden' : null, html: slide }),
        onStage ? null : h('p', { class: 'muted small sb-label' }, 'Drag the slide onto the stage, or tap it.'),
        h('div', { class: `sb-stage${onStage ? ' loaded' : ''}` },
          h('div', { class: 'sb-aperture' }),
          onStage ? h('div', { class: 'sb-onstage', html: slide }) : h('div', { class: 'sb-onstage ghost' }),
          h('div', { class: 'sb-clip left' }), h('div', { class: 'sb-clip right' })),
        onStage ? eyepiece(scope, s) : null,
        onStage && s.tissue === 'brain-coronal' ? h('div', { class: 'seg-row sb-modes', role: 'radiogroup', 'aria-label': 'Colouring' },
          [['stain', 'Stain'], ['atlas', 'Atlas regions']].map(([m, label]) => h('button', {
            class: 'seg', role: 'radio', 'aria-checked': String(mode === m), onclick: () => { mode = m; viewer(id, atlas); },
          }, label))) : null,
      ],
      h('div', { class: 'card sb-info' },
        h('p', { class: 'muted small' }, `${id} · earned ${fmtDate(progress.slideDate(id))}`),
        h('h2', null, unit?.title || id),
        s && s.tissue !== 'request'
          ? [h('p', null, h('strong', null, 'Stain: '), s.stain), h('p', null, s.caption)]
          : h('p', { class: 'muted' }, s ? 'This specimen is still being drawn. It will appear here after a content update.' : 'This slide hasn\'t been labelled yet. Its specimen arrives with a content update.'),
        read ? h('a', { class: 'btn secondary sb-paper', href: `https://doi.org/${encodeURI(read.doi)}`, target: '_blank', rel: 'noopener' },
          s.paper ? 'Read the paper' : 'Read about it', h('span', { class: 'sb-paper-ref' }, `${read.citation}${s.paper?.figure ? ` · ${s.paper.figure}` : ''}`)) : null,
        s?.sources?.length > (s?.paper ? 0 : 1) ? h('ul', { class: 'sb-sources' }, s.sources.filter((src) => src !== read).map((src) => h('li', null,
          src.doi ? h('a', { href: `https://doi.org/${encodeURI(src.doi)}`, target: '_blank', rel: 'noopener' }, src.citation) : src.citation))) : null,
        s?.tissue === 'brain-coronal' ? h('p', { class: 'muted small' }, 'Section: Allen Mouse Brain Atlas, © Allen Institute for Brain Science') : null,
        s?.tissue === 'cord' ? h('p', { class: 'muted small' }, 'Outline traced from the Allen Mouse Spinal Cord Atlas, © Allen Institute for Brain Science') : null),
      h('button', { class: 'btn secondary', onclick: () => putBack(id, atlas) }, 'Put it back in the box'),
    ].flat(2).filter(Boolean)); // replaceChildren doesn't flatten lists or skip nulls
    const big = sb.querySelector('.sb-big[role="button"]');
    if (big) {
      big.addEventListener('pointerdown', (e) => toStage(e, id, atlas));
      big.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); place(id, atlas); } });
    }
    if (!onStage) window.scrollTo(0, 0);
  }

  // Drag the held slide down onto the stage (a tap places it too); let go anywhere else and it floats back.
  function toStage(e, id, atlas) {
    if (busy) return;
    e.preventDefault();
    const big = e.currentTarget, x0 = e.clientX, y0 = e.clientY, start = rectPose(big);
    let d = null, moved = false;
    try { big.setPointerCapture(e.pointerId); } catch { /* synthetic events */ }
    const move = (ev) => {
      if (!moved && Math.hypot(ev.clientX - x0, ev.clientY - y0) < 5) return;
      moved = true;
      if (!d) { d = fly(id, atlas); setPose(d, start); big.style.visibility = 'hidden'; }
      setPose(d, { ...start, x: start.x + ev.clientX - x0, y: start.y + ev.clientY - y0 });
    };
    const up = async (ev) => {
      big.removeEventListener('pointermove', move);
      big.removeEventListener('pointerup', up);
      big.removeEventListener('pointercancel', up);
      const st = sb.querySelector('.sb-stage').getBoundingClientRect();
      if (!moved || (ev.clientY > st.top - 30 && ev.clientY < st.bottom + 30)) return place(id, atlas, d);
      busy = true;
      await tween(d, start, 240);
      big.style.visibility = '';
      d.remove();
      busy = false;
    };
    big.addEventListener('pointermove', move);
    big.addEventListener('pointerup', up);
    big.addEventListener('pointercancel', up);
  }
  async function place(id, atlas, d) {
    busy = true;
    const big = sb.querySelector('.sb-big');
    if (!d) { d = fly(id, atlas); setPose(d, rectPose(big)); }
    big.style.visibility = 'hidden';
    await tween(d, rectPose(sb.querySelector('.sb-onstage')), 360);
    onStage = true;
    viewer(id, atlas);
    d.remove();
    busy = false;
    sb.querySelector('.sb-eye')?.scrollIntoView({ block: 'nearest', behavior: still() ? 'auto' : 'smooth' });
  }

  // The eyepiece: a round field of view onto the section. Drag to move around, pinch (or the wheel) to zoom,
  // or pick an objective. The section is vector art, so it stays sharp at every zoom; the channel names, the
  // magnification and a scale bar re-sized to the zoom are drawn on top.
  function eyepiece(scope, s) {
    const OBJ = [[1, '4×'], [2.5, '10×'], [10, '40×']], ZMAX = 12;
    const lum = ((n) => (0.3 * (n >> 16) + 0.59 * (n >> 8 & 255) + 0.11 * (n & 255)) / 255)(parseInt(scope.bg.slice(1), 16));
    const ink = scope.dark || lum > 0.5 ? '#222' : '#EAF3DE'; // dark labels on brightfield sections, light on fluorescence
    const umPerUnit = scope.scale ? parseFloat(scope.scale[1]) / scope.scale[0] : 0;
    const field = h('div', { class: 'sb-eye', tabindex: '0', role: 'img', 'aria-label': `${s.stain}: ${s.caption} Drag to move around, pinch to zoom.`,
      html: `<svg class="sb-eye-tissue" viewBox="0 0 100 100" preserveAspectRatio="xMidYMid meet"><rect x="-400" y="-400" width="900" height="860" fill="${scope.bg}"/>${scope.tissue}</svg><svg class="sb-eye-over" viewBox="0 0 100 100" aria-hidden="true"></svg>` });
    const tis = field.firstChild, over = field.lastChild;
    const objs = h('div', { class: 'seg-row sb-objectives', role: 'radiogroup', 'aria-label': 'Objective' },
      OBJ.map(([z, label]) => h('button', { class: 'seg', role: 'radio', 'data-z': z, onclick: () => zoomTo(z) }, label)));
    const T = (x, y, str, col, anchor = 'middle') => `<text x="${x}" y="${y}" font-size="4.6" font-weight="600" font-family="-apple-system,system-ui,sans-serif" fill="${col}" text-anchor="${anchor}" paint-order="stroke" stroke="${scope.bg}" stroke-width="0.8">${str}</text>`;
    function draw() {
      const w = 100 / eye.z;
      eye.cx = Math.max(0, Math.min(100, eye.cx)); eye.cy = Math.max(0, Math.min(60, eye.cy));
      tis.setAttribute('viewBox', `${eye.cx - w / 2} ${eye.cy - w / 2} ${w} ${w}`);
      let o = '';
      if (scope.channels) {
        const total = scope.channels.reduce((a, c) => a + c.length * 2.9 + 4, -4);
        let x = 50 - total / 2;
        scope.channels.forEach((c, i) => { o += T(x, 17, c, scope.colors[i], 'start'); x += c.length * 2.9 + 4; });
      }
      if (umPerUnit) { // the longest round length that fits in about a third of the field
        const fieldUm = w * umPerUnit, um = [1, 2, 5, 10, 20, 50, 100, 200, 500, 1000, 2000].filter((n) => n <= fieldUm * 0.34).pop() || 1;
        const len = um / umPerUnit / w * 100;
        o += `<line x1="${50 - len / 2}" y1="85" x2="${50 + len / 2}" y2="85" stroke="${ink}" stroke-width="1.1"/>` + T(50, 82, `${um} µm`, ink);
      }
      o += T(50, 93, `${Math.round(4 * eye.z)}×`, ink);
      over.innerHTML = o;
      const near = OBJ.reduce((a, b) => (Math.abs(Math.log(b[0] / eye.z)) < Math.abs(Math.log(a[0] / eye.z)) ? b : a));
      objs.querySelectorAll('button').forEach((b) => b.setAttribute('aria-checked', String(Number(b.dataset.z) === near[0] && Math.abs(Math.log(near[0] / eye.z)) < 0.15)));
    }
    function zoomTo(z) {
      const z0 = eye.z, t0 = performance.now();
      if (still()) { eye.z = z; draw(); return; }
      const step = (now) => { const t = Math.min(1, (now - t0) / 320); eye.z = z0 * Math.pow(z / z0, easeIO(t)); draw(); if (t < 1 && !ac.signal.aborted) requestAnimationFrame(step); };
      requestAnimationFrame(step);
    }
    // pan with one finger, pinch with two; positions are converted from pixels to section units
    const pts = new Map();
    let pinch = null;
    const units = () => 100 / eye.z / field.clientWidth;
    field.addEventListener('pointerdown', (e) => { field.setPointerCapture?.(e.pointerId); pts.set(e.pointerId, [e.clientX, e.clientY]); if (pts.size === 2) { const [a, b] = [...pts.values()]; pinch = { d: Math.hypot(a[0] - b[0], a[1] - b[1]), z: eye.z }; } });
    field.addEventListener('pointermove', (e) => {
      const p = pts.get(e.pointerId);
      if (!p) return;
      if (pts.size === 1) { const k = units(); eye.cx -= (e.clientX - p[0]) * k; eye.cy -= (e.clientY - p[1]) * k; }
      pts.set(e.pointerId, [e.clientX, e.clientY]);
      if (pts.size === 2 && pinch) { const [a, b] = [...pts.values()]; eye.z = Math.max(1, Math.min(ZMAX, pinch.z * Math.hypot(a[0] - b[0], a[1] - b[1]) / pinch.d)); }
      draw();
    });
    const lift = (e) => { pts.delete(e.pointerId); if (pts.size < 2) pinch = null; };
    field.addEventListener('pointerup', lift);
    field.addEventListener('pointercancel', lift);
    field.addEventListener('wheel', (e) => { e.preventDefault(); eye.z = Math.max(1, Math.min(ZMAX, eye.z * Math.exp(-e.deltaY * 0.002))); draw(); }, { passive: false });
    field.addEventListener('keydown', (e) => {
      const k = 6 / eye.z, moves = { ArrowLeft: [-k, 0], ArrowRight: [k, 0], ArrowUp: [0, -k], ArrowDown: [0, k] };
      if (moves[e.key]) { eye.cx += moves[e.key][0]; eye.cy += moves[e.key][1]; draw(); e.preventDefault(); }
      else if (e.key === '+' || e.key === '=') zoomTo(Math.min(ZMAX, eye.z * 1.6));
      else if (e.key === '-') zoomTo(Math.max(1, eye.z / 1.6));
    });
    draw();
    return [h('p', { class: 'muted small sb-label' }, 'Through the eyepiece · drag to move, pinch to zoom'), field, objs];
  }

  // ---------- a newly earned slide: shown above the box, then dropped into its slot ----------
  async function earn(id) {
    busy = true;
    const atlas = await loadAtlas(id, earned()[id]);
    box(id);
    const btn = h('button', { class: 'btn' }, 'Add to box');
    const spot = h('div', { class: 'sb-spot' });
    const ov = h('div', { class: 'sb-earn', role: 'dialog', 'aria-label': `New slide: ${title(id)}` },
      h('p', { class: 'sb-new' }, `New slide · ${id}`), h('h2', null, title(id)), spot, btn);
    wrap.append(ov);
    const d = fly(id, atlas), at = rectPose(spot);
    setPose(d, { ...at, y: at.y + 60, a: 30 });
    if (!still()) d.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 350, fill: 'forwards' });
    await tween(d, at, 450, easeOut);
    busy = false;
    btn.focus({ preventScroll: true });
    btn.onclick = async () => {
      if (busy) return;
      busy = true;
      ov.remove();
      await drop(d, id);
      busy = false;
    };
  }

  box();
  if (params.add && progress.slideDate(params.add)) {
    history.replaceState(null, '', '#/slides');
    earn(params.add);
  }
}

// The "new slide" card on the finish screen.
export function newSlideCard(unitId) {
  const s = content.slides.get(unitId) || null;
  const card = h('a', { class: 'sb-newcard', href: `#/slides?add=${encodeURIComponent(unitId)}` },
    h('span', { class: 'sb-new' }, 'New slide for your slide box'),
    h('span', { class: 'sb-newcard-slide', html: slideSVG(unitId, s, null, true) }),
    h('span', { class: 'sb-newcard-go' }, 'Add it to the box ›'));
  loadAtlas(unitId, s).then((atlas) => { if (atlas) card.querySelector('.sb-newcard-slide').innerHTML = slideSVG(unitId, s, atlas, true); });
  return card;
}

export const slideBoxReady = () => content.slides.size > 0;
