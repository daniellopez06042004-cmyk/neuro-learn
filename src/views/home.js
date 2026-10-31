import { h, icon, svg, trackStyle } from '../ui.js';
import { content, unitStats, unitUnlocked, dueCountForUnit } from '../content.js';
import { progress, settings } from '../progress.js';
import { layoutTrack, axonPath } from '../map.js';
import { go } from '../router.js';

export function statsBar() {
  const due = progress.dueKeys().length;
  const streak = progress.streak();
  return [
    h('span', { class: `stat${progress.didToday() ? ' hot' : ''}`, title: 'Day streak' },
      icon('bolt'), streak, h('span', { class: 'sr-only' }, `day streak${progress.didToday() ? ', done today' : ''}`)),
    h('span', { class: 'stat', title: 'Total XP' }, progress.totalXp(), h('span', { class: 'sr-only' }, ' XP'), h('span', { 'aria-hidden': 'true' }, ' xp')),
    h('a', { class: 'stat', href: '#/review', 'aria-label': `Review, ${due} due` },
      icon('review'), due ? h('span', { class: 'badge' }, due) : null),
  ];
}

function installTip() {
  const standalone = window.matchMedia('(display-mode: standalone)').matches || navigator.standalone;
  const ios = /iphone|ipad|ipod/i.test(navigator.userAgent);
  if (standalone || !ios || settings.get('hideInstallTip')) return null;
  const el = h('div', { class: 'banner', role: 'note' },
    icon('share'),
    h('p', null, 'Install this app: tap the Share button, then "Add to Home Screen". It works offline after that.'),
    h('button', { class: 'icon-btn', 'aria-label': 'Dismiss tip', onclick: () => { settings.set('hideInstallTip', true); el.remove(); } }, icon('x')));
  return el;
}

export function renderHome(root, params) {
  const tracks = content.tracks;
  let current = tracks.find((t) => t.id === settings.get('track')) || tracks[0];

  const mapHost = h('div');
  const chips = h('div', { class: 'chips', role: 'group', 'aria-label': 'Tracks' });

  const drawChips = () => {
    chips.replaceChildren(...tracks.map((t) => h('button', {
      class: 'chip', style: `--c:${t.color}`, 'aria-pressed': String(t === current),
      onclick: () => { current = t; settings.set('track', t.id); drawChips(); drawTrack(); },
    }, h('span', { class: 'dot' }), t.id, h('span', { class: 'sr-only' }, `: ${t.title}`))));
  };

  const drawTrack = () => {
    const t = current;
    mapHost.setAttribute('style', trackStyle(t.color));
    const done = t.units.filter((u) => unitStats(u).complete).length;
    mapHost.replaceChildren(
      h('div', { class: 'track-head' },
        h('div', { class: 'eyebrow' }, content.course.title),
        h('h2', null, t.title),
        h('p', null, `${done} of ${t.units.length} units done`)),
      t.units.length ? neuralMap(t, params.fired) : h('p', { class: 'muted' }, 'This track has no units yet.'));
  };

  root.replaceChildren(h('div', { class: 'screen' },
    h('header', { class: 'topbar' },
      h('h1', { class: 'sr-only' }, content.course.title),
      ...statsBar(),
      h('span', { style: 'flex:1' }),
      h('a', { class: 'icon-btn', href: '#/circuit', 'aria-label': 'Your circuit' }, icon('neuron')),
      h('a', { class: 'icon-btn', href: '#/settings', 'aria-label': 'Settings' }, icon('sliders'))),
    installTip(),
    chips,
    mapHost));
  drawChips();
  drawTrack();
}

function neuralMap(track, firedUnit) {
  const layout = layoutTrack(track);
  const firstOpen = track.units.find((u) => unitUnlocked(u) && unitStats(u).total && !unitStats(u).complete);
  const wrap = h('div', { class: 'map', style: `height:${layout.height}px` });

  const drawAxons = () => {
    const w = wrap.clientWidth || 360;
    const paths = layout.edges.map((e) => {
      const lit = unitStats(e.from.unit).complete;
      const cls = lit ? 'on' : e.kind === 'spine' ? 'spine' : 'off';
      const fire = lit && e.from.unit.id === firedUnit ? ' fire' : '';
      return `<path class="axon ${cls}${fire}" d="${axonPath(e.from, e.to, w)}"/>`;
    }).join('');
    wrap.querySelector('svg.axons')?.remove();
    wrap.prepend(svg(`<svg class="axons" aria-hidden="true">${paths}</svg>`));
  };

  for (const { unit, x, y } of layout.nodes) {
    const stats = unitStats(unit);
    const open = unitUnlocked(unit);
    const due = dueCountForUnit(unit);
    let state, sub;
    if (!unit.lessons.length || (!stats.total && open)) { state = 'empty'; sub = 'No lessons yet'; }
    else if (!open) {
      state = 'locked';
      sub = `Needs ${unit.prereqs.filter((p) => !unitStats(content.units.get(p)?.unit || { lessons: [] }).complete).join(', ')}`;
    }
    else if (stats.complete) { state = 'done'; sub = 'Done'; }
    else { state = unit === firstOpen ? 'next' : 'open'; sub = `${stats.done}/${stats.total} lessons`; }

    const frac = stats.total ? stats.done / stats.total : 0;
    const C = 2 * Math.PI * 33;
    const ring = state === 'next' || state === 'open'
      ? svg(`<svg class="ring" viewBox="0 0 70 70" aria-hidden="true"><circle class="fill" cx="35" cy="35" r="33" stroke-dasharray="${(frac * C).toFixed(1)} ${C.toFixed(1)}"/></svg>`)
      : null;

    const label = `${unit.id}: ${unit.title}. ${state === 'locked' ? 'Locked. ' : ''}${sub}.${due ? ` ${due} review due.` : ''}`;
    wrap.append(h('button', {
      class: `neuron ${state}${due ? ' due' : ''}${unit.id === firedUnit ? ' fired' : ''}`,
      style: `left:${(x * 100).toFixed(2)}%;top:${y}px`,
      'aria-label': label,
      onclick: () => go(`/unit/${encodeURIComponent(unit.id)}`),
    },
      h('span', { class: 'soma' },
        ring,
        state === 'locked' ? icon('lock') : state === 'done' ? icon('check') : unit.id,
        due ? h('span', { class: 'review-dot' }, icon('review')) : null),
      h('span', { class: 'tag' },
        h('span', { class: 'label' }, unit.title),
        h('span', { class: 'sub' }, sub))));
  }

  requestAnimationFrame(drawAxons);
  const ro = new ResizeObserver(() => drawAxons());
  ro.observe(wrap);
  return wrap;
}
