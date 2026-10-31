import { h, icon } from '../ui.js';
import { progress, settings, today } from '../progress.js';
import { go } from '../router.js';

const GOALS = [10, 20, 30, 50];
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

// Today's goal, streaks, and a month calendar of the days you studied.
export function renderStats(root, params) {
  const log = progress.dayLog();
  const goal = progress.dailyGoal();
  const xpToday = progress.xpToday();
  const [ty, tm] = today().split('-').map(Number);
  let year = Number(params.y) || ty, month = Number(params.m) || tm; // month is 1–12

  const goalButtons = h('div', { class: 'seg-row', role: 'radiogroup', 'aria-label': 'Daily goal' },
    GOALS.map((g) => h('button', {
      class: 'seg', role: 'radio', 'aria-checked': String(g === goal),
      onclick: () => { settings.set('dailyGoal', g); renderStats(root, params); },
    }, `${g} xp`)));

  const mastered = Object.values(progress.state.review).filter((r) => r.box >= 4).length;
  const frac = Math.min(1, xpToday / goal);

  root.replaceChildren(h('div', { class: 'screen' },
    h('header', { class: 'topbar' },
      h('button', { class: 'icon-btn', 'aria-label': 'Back to map', onclick: () => go('/') }, icon('back')),
      h('h1', null, 'Your progress')),
    h('div', { class: 'stack' },
      h('div', { class: 'card' },
        h('div', { class: 'goal-head' },
          h('strong', null, 'Today'),
          h('span', { class: frac >= 1 ? 'goal-met' : 'muted' }, frac >= 1 ? `Goal met · ${xpToday} xp` : `${xpToday} / ${goal} xp`)),
        h('div', { class: 'goal-bar', role: 'progressbar', 'aria-valuemin': '0', 'aria-valuemax': String(goal), 'aria-valuenow': String(Math.min(xpToday, goal)), 'aria-label': 'Daily goal' },
          h('span', { style: `width:${(frac * 100).toFixed(1)}%` })),
        h('p', { class: 'small muted', style: 'margin:12px 0 6px' }, 'Daily goal'),
        goalButtons),
      h('div', { class: 'stats' },
        [['Day streak', progress.streak()], ['Best streak', progress.bestStreak()], ['Total xp', progress.totalXp()]]
          .map(([k, v]) => h('div', { class: 'card' }, h('div', { class: 'v' }, v), h('div', { class: 'k' }, k)))),
      calendar(year, month, log, goal, (y, m) => go(`/progress?y=${y}&m=${m}`, { replace: true })),
      h('div', { class: 'stats' },
        [['Lessons done', Object.keys(progress.state.completed).length], ['In review', Object.keys(progress.state.review).length], ['Mastered', mastered]]
          .map(([k, v]) => h('div', { class: 'card' }, h('div', { class: 'v' }, v), h('div', { class: 'k' }, k)))))));
}

function calendar(year, month, log, goal, nav) {
  const first = new Date(year, month - 1, 1);
  const days = new Date(year, month, 0).getDate();
  const lead = (first.getDay() + 6) % 7; // weeks start on Monday
  const t = today();
  const pad = (n) => String(n).padStart(2, '0');
  const cells = [];
  for (let i = 0; i < lead; i++) cells.push(h('span', { class: 'cal-day empty', 'aria-hidden': 'true' }));
  for (let d = 1; d <= days; d++) {
    const date = `${year}-${pad(month)}-${pad(d)}`;
    const xp = log[date] || 0;
    const level = xp <= 0 ? '' : xp >= goal ? ' met' : ' some';
    cells.push(h('span', {
      class: `cal-day${level}${date === t ? ' today' : ''}`,
      role: 'gridcell',
      'aria-label': `${MONTHS[month - 1]} ${d}: ${xp ? `${xp} xp${xp >= goal ? ', goal met' : ''}` : 'no study'}`,
    }, d));
  }
  const prev = month === 1 ? [year - 1, 12] : [year, month - 1];
  const next = month === 12 ? [year + 1, 1] : [year, month + 1];
  const isCurrent = `${year}-${pad(month)}` >= t.slice(0, 7);
  const studied = Object.keys(log).filter((d) => d.startsWith(`${year}-${pad(month)}`) && log[d] > 0).length;
  return h('div', { class: 'card' },
    h('div', { class: 'cal-head' },
      h('button', { class: 'icon-btn', 'aria-label': 'Previous month', onclick: () => nav(...prev) }, icon('back')),
      h('strong', null, `${MONTHS[month - 1]} ${year}`),
      h('button', { class: 'icon-btn flip', 'aria-label': 'Next month', disabled: isCurrent, onclick: () => nav(...next) }, icon('back'))),
    h('div', { class: 'cal-grid', role: 'grid', 'aria-label': `${MONTHS[month - 1]} ${year}` },
      ['M', 'T', 'W', 'T', 'F', 'S', 'S'].map((w) => h('span', { class: 'cal-wd', 'aria-hidden': 'true' }, w)),
      cells),
    h('p', { class: 'small muted', style: 'margin:10px 0 0' }, `${studied} day${studied === 1 ? '' : 's'} studied this month`,
      h('span', { class: 'cal-key' }, h('i', { class: 'some' }), 'some', h('i', { class: 'met' }), 'goal met')));
}

