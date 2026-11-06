import { h, icon } from '../ui.js';
import { content } from '../content.js';
import { progress } from '../progress.js';
import { go } from '../router.js';
import { unreadPulse } from './pulse.js';
import { slideBoxReady } from './slidebox.js';
import { allFigures } from './figures.js';

// Everything you can look things up in, behind one button on the home screen.
export function renderLibrary(root) {
  const figs = allFigures(), live = figs.filter((f) => f.live).length;
  const terms = new Set([...content.glossary.values()]).size;
  const earned = [...content.slides.keys()].filter((u) => progress.slideDate(u)).length;
  const unread = unreadPulse();
  const tile = (href, ic, title, sub, badge) => h('a', { class: 'lib-tile', href },
    h('span', { class: 'lib-icon' }, icon(ic)),
    h('span', { class: 'lib-text' }, h('span', { class: 'lib-title' }, title), h('span', { class: 'small muted' }, sub)),
    badge ? h('span', { class: 'badge', 'aria-label': `${badge} new` }, badge) : null,
    h('span', { class: 'lib-chev', 'aria-hidden': 'true' }, '›'));
  root.replaceChildren(h('div', { class: 'screen' },
    h('header', { class: 'topbar' },
      h('button', { class: 'icon-btn', 'aria-label': 'Back to map', onclick: () => go('/') }, icon('back')),
      h('h1', null, 'Library')),
    h('nav', { class: 'lib', 'aria-label': 'Library' },
      tile('#/figures', 'figure', 'Figures', `${figs.length} diagrams and models · ${live} live`),
      slideBoxReady() ? tile('#/slides', 'slide', 'Slide box', earned ? `${earned} of ${content.slides.size} slides earned` : 'Finish a unit to earn your first slide') : null,
      tile('#/glossary', 'book', 'Glossary', `${terms} terms`),
      content.pulse.length ? tile('#/pulse', 'pulse', 'Field Pulse', `${content.pulse.length} recent papers`, unread) : null)));
}
