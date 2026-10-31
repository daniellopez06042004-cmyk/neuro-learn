import { h, icon, svg, trackStyle } from '../ui.js';
import { content, unitStats, unitUnlocked, dueCountForUnit, blockingPrereqs } from '../content.js';
import { progress, settings, today, addDays } from '../progress.js';
import { layoutTrack, axonPath } from '../map.js';
import { go } from '../router.js';
import { unreadPulse } from './pulse.js';

export function statsBar() {
  const due = progress.dueKeys().length;
  const streak = progress.streak();
  const goal = progress.dailyGoal(), xpToday = progress.xpToday(), frac = Math.min(1, xpToday / goal);
  return [
    // Streak, with a ring that fills toward today's XP goal.
    h('a', {
      class: `stat${progress.didToday() ? ' hot' : ''}${frac >= 1 ? ' goal-done' : ''}`, href: '#/progress',
      'aria-label': `${streak} day streak, ${xpToday} of ${goal} xp today. Open your progress.`,
    }, svg(`<svg class="goal-ring" viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="10" class="gr-bg"/><circle cx="12" cy="12" r="10" class="gr-fg" stroke-dasharray="${(frac * 62.83).toFixed(2)} 62.83" transform="rotate(-90 12 12)"/><path d="M13 6L8 13h4l-1 5 5-7h-4l1-5z" class="gr-bolt"/></svg>`), streak),
    h('a', { class: 'stat', href: '#/progress', 'aria-label': `${progress.totalXp()} XP total` }, progress.totalXp(), h('span', { 'aria-hidden': 'true' }, ' xp')),
    h('a', { class: 'stat', href: '#/review', 'aria-label': `Review, ${due} due` },
      icon('review'), due ? h('span', { class: 'badge' }, due) : null),
  ];
}

// Once you have some progress, nudge you to back it up every two weeks.
function backupTip() {
  const done = Object.keys(progress.state.completed).length;
  const last = settings.get('lastBackup') || settings.get('backupTipSnoozed');
  if (done < 3 || (last && last > addDays(today(), -14))) return null;
  const el = h('div', { class: 'banner', role: 'note' },
    icon('review'),
    h('p', null, 'Your progress lives only on this phone. ', h('a', { href: '#/settings' }, 'Save a backup'), ' to Files or iCloud.'),
    h('button', { class: 'icon-btn', 'aria-label': 'Remind me later', onclick: () => { settings.set('backupTipSnoozed', today()); el.remove(); } }, icon('x')));
  return el;
}

function shortcuts() {
  const unread = unreadPulse();
  return h('nav', { class: 'shortcuts', 'aria-label': 'More' },
    h('a', { class: 'pill', href: '#/pulse' }, 'Field Pulse', unread ? h('span', { class: 'badge' }, `${unread} new`) : null),
    h('a', { class: 'pill', href: '#/glossary' }, 'Glossary'),
    h('a', { class: 'pill', href: '#/progress' }, 'Progress'));
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
  // Your last track, else the first one that has lessons to play.
  let current = tracks.find((t) => t.id === settings.get('track'))
    || tracks.find((t) => t.units.some((u) => unitStats(u).total)) || tracks[0];

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
    backupTip(),
    shortcuts(),
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
      sub = `Needs ${blockingPrereqs(unit).join(', ')}`;
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
