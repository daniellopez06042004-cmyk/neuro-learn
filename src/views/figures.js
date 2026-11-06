import { h, icon, trackStyle, plain } from '../ui.js';
import { content, playable, imageUrl } from '../content.js';
import { visual } from '../steps.js';
import { go, onLeave } from '../router.js';
import { settings } from '../progress.js';

// Every figure in the course, in course order: each lesson step's visual,
// with where it comes from. Live models are marked as such.
export function allFigures() {
  const out = [];
  for (const track of content.tracks) {
    for (const unit of track.units) {
      for (const id of unit.lessons) {
        if (!playable(id)) continue;
        const lesson = content.lessons.get(id).data;
        for (const step of lesson.steps) {
          const v = step.visual;
          if (!v?.src) continue;
          out.push({ v, track, unit, lesson, step, live: v.type === 'interactive' });
        }
      }
    }
  }
  return out;
}

export function renderFigures(root) {
  const figures = allFigures();
  let track = settings.get('figTrack') || 'all', liveOnly = false;
  const search = h('input', { type: 'search', class: 'search', placeholder: 'Search figures', 'aria-label': 'Search figures' });
  const chips = h('div', { class: 'chips', role: 'group', 'aria-label': 'Filter by track' });
  const grid = h('div', { class: 'fig-grid' });
  const count = h('p', { class: 'small muted fig-count', 'aria-live': 'polite' });

  const drawChips = () => chips.replaceChildren(
    h('button', { class: 'chip', style: '--c:var(--text)', 'aria-pressed': String(track === 'all'), onclick: () => pick('all') }, 'All'),
    ...content.tracks.filter((t) => figures.some((f) => f.track === t)).map((t) =>
      h('button', { class: 'chip', style: `--c:${t.color}`, 'aria-pressed': String(track === t.id), onclick: () => pick(t.id) },
        h('span', { class: 'dot' }), t.id, h('span', { class: 'sr-only' }, `: ${t.title}`))),
    h('button', { class: 'chip', style: '--c:var(--warn-line)', 'aria-pressed': String(liveOnly), onclick: () => { liveOnly = !liveOnly; drawChips(); draw(); } },
      icon('pulse'), 'Live'));
  const pick = (id) => { track = id; settings.set('figTrack', id); drawChips(); draw(); };

  const draw = () => {
    const q = search.value.trim().toLowerCase();
    const shown = figures.filter((f) => (track === 'all' || f.track.id === track) && (!liveOnly || f.live)
      && (!q || [f.v.caption, f.v.alt, f.lesson.title, f.unit.title, f.step.title].some((s) => s && plain(s).toLowerCase().includes(q))));
    count.textContent = `${shown.length} figure${shown.length === 1 ? '' : 's'}`;
    const groups = [];
    for (const f of shown) {
      if (groups.at(-1)?.unit !== f.unit) groups.push({ unit: f.unit, track: f.track, items: [] });
      groups.at(-1).items.push(f);
    }
    grid.replaceChildren(...(groups.length ? groups.flatMap((g) => [
      h('h2', { class: 'fig-unit', style: trackStyle(g.track.color) }, h('span', { class: 'fig-id' }, g.unit.id), g.unit.title),
      h('div', { class: 'fig-row' }, g.items.map(card)),
    ]) : [h('p', { class: 'muted' }, figures.length ? 'No figures match.' : 'No figures yet.')]));
  };
  search.addEventListener('input', draw);

  root.replaceChildren(h('div', { class: 'screen' },
    h('header', { class: 'topbar' },
      h('button', { class: 'icon-btn', 'aria-label': 'Back to library', onclick: () => go('/library') }, icon('back')),
      h('h1', null, 'Figures')),
    search, chips, count, grid));
  drawChips();
  draw();
}

function card(f) {
  const label = plain(f.v.caption || f.step.title || f.lesson.title);
  return h('button', { class: `fig-card${f.live ? ' live' : ''}`, style: trackStyle(f.track.color), onclick: (e) => openFigure(f, e.currentTarget), 'aria-label': `${f.live ? 'Live model: ' : ''}${label}` },
    h('span', { class: 'fig-thumb' }, f.live
      ? [h('span', { class: 'fig-live' }, icon('pulse'), 'Live'), h('span', { class: 'fig-live-title' }, plain(f.step.title || f.lesson.title))]
      : h('img', { src: imageUrl(f.v.src), alt: '', loading: 'lazy' })),
    h('span', { class: 'fig-cap' }, label));
}

// Full view: the figure as it appears in the lesson (live models run), plus
// where it's from.
function openFigure(f, returnFocus) {
  document.querySelector('.fig-viewer')?.remove();
  const close = () => { viewer.remove(); document.removeEventListener('keydown', onKey); returnFocus?.focus(); };
  const onKey = (e) => { if (e.key === 'Escape') close(); };
  const viewer = h('div', { class: 'fig-viewer', role: 'dialog', 'aria-modal': 'true', 'aria-label': plain(f.v.caption || f.lesson.title), style: trackStyle(f.track.color), onclick: (e) => { if (e.target === viewer) close(); } },
    h('div', { class: 'fig-sheet' },
      h('div', { class: 'term-head' },
        h('p', { class: 'small muted', style: 'margin:0' }, `${f.unit.id} · ${f.lesson.title}`),
        h('button', { class: 'icon-btn', 'aria-label': 'Close', onclick: close }, icon('x'))),
      visual(f.v),
      h('a', { class: 'btn secondary', href: `#/unit/${encodeURIComponent(f.unit.id)}` }, `Go to ${f.unit.id}: ${f.unit.title}`)));
  document.addEventListener('keydown', onKey);
  onLeave(() => { viewer.remove(); document.removeEventListener('keydown', onKey); });
  document.body.append(viewer);
  viewer.querySelector('.icon-btn').focus();
}
