import { h, icon } from '../ui.js';
import { findStep } from '../content.js';
import { progress, BOX_DAYS, today } from '../progress.js';
import { runSession, finishScreen } from '../player.js';
import { go } from '../router.js';
import { statsBar } from './home.js';

const SESSION_SIZE = 15;
const BOX_COLORS = ['#D85A30', '#EF9F27', '#97C459', '#1D9E75', '#378ADD'];
const REVIEW_COLOR = '#EF9F27';

function liveItems(keys) {
  const items = [];
  for (const key of keys) {
    const found = findStep(key);
    if (found) items.push({ key, step: found.step, color: found.color });
    else progress.forget(key); // the question was removed or renamed in the content
  }
  return items;
}

export function renderReview(root) {
  const due = liveItems(progress.dueKeys());
  const all = Object.keys(progress.state.review);
  const counts = progress.boxCounts();
  const max = Math.max(1, ...Object.values(counts));
  const nextDate = progress.nextDueDate();

  const weakest = () => liveItems(Object.entries(progress.state.review)
    .sort((a, b) => a[1].box - b[1].box || a[1].due.localeCompare(b[1].due))
    .slice(0, 10).map(([k]) => k));

  const start = (items) => items.length && runSession(root, {
    mode: 'review',
    items,
    onExit: () => go('/review'),
    onDone: ({ graded, correct }) => {
      progress.addBonusXp(correct);
      progress.bumpStreak();
      finishScreen(root, {
        color: REVIEW_COLOR,
        title: 'Review done',
        stats: [['XP', `+${correct}`], ['Correct', `${correct}/${graded}`], ['Still due', progress.dueKeys().length]],
        button: 'Back to map',
        onContinue: () => go('/'),
      });
    },
  });

  root.replaceChildren(h('div', { class: 'screen', style: `--track:${REVIEW_COLOR};--on-track:#1c1c1b` },
    h('header', { class: 'topbar' },
      h('button', { class: 'icon-btn', 'aria-label': 'Back to map', onclick: () => go('/') }, icon('back')),
      h('h1', null, 'Review'),
      ...statsBar()),
    h('div', { class: 'stack' },
      h('div', { class: 'card' },
        h('div', { class: 'big-num' }, due.length),
        h('div', { class: 'muted' }, due.length === 1 ? 'question due today' : 'questions due today'),
        !due.length && nextDate && nextDate > today() ? h('p', { class: 'small muted', style: 'margin:8px 0 0' }, `Next one is due ${nextDate}.`) : null,
        !all.length ? h('p', { class: 'small muted', style: 'margin:8px 0 0' }, 'Questions show up here after you answer them in a lesson. Misses come back first.') : null),
      due.length ? h('button', { class: 'btn', onclick: () => start(due.slice(0, SESSION_SIZE)) }, `Start review (${Math.min(due.length, SESSION_SIZE)})`) : null,
      all.length ? h('button', { class: `btn${due.length ? ' secondary' : ''}`, onclick: () => start(weakest()) }, 'Practice weakest 10') : null,
      h('div', { class: 'card' },
        h('h2', { style: 'font-size:17px;margin:0' }, 'Memory boxes'),
        h('p', { class: 'small muted', style: 'margin:4px 0 0' }, 'Get a question right and it moves up a box and comes back later. Miss it and it drops to box 1.'),
        h('div', { class: 'boxes', role: 'list' },
          [1, 2, 3, 4, 5].map((b) => h('div', { class: 'col', role: 'listitem', 'aria-label': `Box ${b}: ${counts[b]} questions, repeats every ${BOX_DAYS[b]} days` },
            h('span', { class: 'n' }, counts[b]),
            h('span', { class: 'bar', style: `--b:${BOX_COLORS[b - 1]};height:${Math.round((counts[b] / max) * 90)}px` }),
            h('span', { class: 'k' }, `Box ${b}`, h('br'), `${BOX_DAYS[b]}d`))))))));
}
