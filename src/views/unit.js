import { h, icon, trackStyle } from '../ui.js';
import { content, unitLessons, unitStats, unitUnlocked, lessonUnlocked, nextLessonIn } from '../content.js';
import { progress } from '../progress.js';
import { go } from '../router.js';
import { statsBar } from './home.js';

export function renderUnit(root, { id, fired }) {
  const found = content.units.get(id);
  if (!found) return go('/', { replace: true });
  const { unit, track } = found;
  const stats = unitStats(unit);
  const next = nextLessonIn(unit);
  const open = unitUnlocked(unit);

  const rows = unitLessons(unit).map((l, i) => {
    const done = progress.isComplete(l.id);
    let state, meta;
    if (l.status === 'missing') { state = 'missing'; meta = 'Not written yet'; }
    else if (l.status === 'broken') { state = 'broken'; meta = 'This lesson has errors'; }
    else if (done) { state = 'done'; meta = `Done · ${l.data.minutes ?? '?'} min · tap to replay`; }
    else if (!lessonUnlocked(unit, l.id)) { state = 'locked'; meta = 'Finish the previous lesson first'; }
    else { state = l.id === next ? 'next' : 'open'; meta = `${l.data.minutes ?? '?'} min · ${l.data.xp ?? 10} xp`; }

    const title = l.data?.title || l.id;
    const canPlay = state === 'done' || state === 'next' || state === 'open';
    return h('li', { class: done ? 'lit' : '' },
      h('button', {
        class: `lesson-row ${state}${l.id === fired ? ' fired' : ''}`,
        'aria-disabled': canPlay ? null : 'true',
        'aria-label': `Lesson ${i + 1}: ${title}. ${meta}.`,
        onclick: () => canPlay && go(`/lesson/${encodeURIComponent(l.id)}`),
      },
        h('span', { class: 'soma' }, done ? icon('check') : state === 'locked' ? icon('lock') : state === 'broken' ? icon('alert') : i + 1),
        h('span', { class: 'info' },
          h('span', { class: 't' }, title),
          h('br'),
          h('span', { class: `m${state === 'broken' ? ' err' : ''}` }, meta))),
      state === 'broken' ? h('ul', { class: 'error-list' }, l.errors.map((e) => h('li', null, e))) : null);
  });

  root.replaceChildren(h('div', { class: 'screen', style: trackStyle(track.color) },
    h('header', { class: 'topbar' },
      h('button', { class: 'icon-btn', 'aria-label': 'Back to map', onclick: () => go('/') }, icon('back')),
      h('h1', { class: 'sr-only' }, unit.title),
      h('span', { style: 'flex:1' }),
      ...statsBar()),
    h('div', { class: 'unit-head' },
      h('div', { class: 'eyebrow' }, `${track.title} · ${unit.id}`),
      h('h2', null, unit.title),
      unit.summary ? h('p', null, unit.summary) : null,
      h('p', { class: 'small', style: 'margin-top:8px' }, `${stats.done} of ${stats.total} written lessons done`)),
    !open ? h('div', { class: 'banner' }, icon('lock'), h('p', null, `Finish ${unit.prereqs.join(' and ')} to unlock this unit.`)) : null,
    unit.lessons.length
      ? h('ol', { class: 'chain' }, rows)
      : h('p', { class: 'muted' }, 'No lessons yet. Add lesson ids to this unit in course.json.'),
    open && next ? h('a', { class: 'btn', href: `#/lesson/${encodeURIComponent(next)}`, style: 'margin-top:18px' },
      stats.done ? 'Continue' : 'Start unit') : null));
}
