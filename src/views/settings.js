import { h, icon } from '../ui.js';
import { content } from '../content.js';
import { progress, settings } from '../progress.js';
import { go } from '../router.js';

export function renderSettings(root) {
  const unlock = h('input', {
    type: 'checkbox', role: 'switch', id: 'unlock-all',
    onchange: (e) => settings.set('unlockAll', e.target.checked),
  });
  unlock.checked = !!settings.get('unlockAll');

  const lessons = [...content.lessons.values()];
  const ready = lessons.filter((l) => l.status === 'ok').length;
  const broken = lessons.filter((l) => l.status === 'broken').length;

  root.replaceChildren(h('div', { class: 'screen' },
    h('header', { class: 'topbar' },
      h('button', { class: 'icon-btn', 'aria-label': 'Back to map', onclick: () => go('/') }, icon('back')),
      h('h1', null, 'Settings')),
    h('div', { class: 'stack' },
      h('div', { class: 'card' },
        h('div', { class: 'toggle-row' },
          h('label', { for: 'unlock-all' }, h('strong', null, 'Unlock everything'), h('br'),
            h('span', { class: 'small muted' }, 'Skip prereqs and open every unit and lesson.')),
          h('span', { class: 'switch' }, unlock))),
      h('div', { class: 'card small' },
        h('p', { style: 'margin:0' }, `${ready} lessons ready · ${lessons.length - ready - broken} not written yet${broken ? ` · ${broken} with errors` : ''}`),
        content.errors.length ? h('a', { href: '#/errors' }, `See ${content.errors.length} content problems`) : null),
      h('div', { class: 'card' },
        h('p', { style: 'margin:0 0 12px' }, h('strong', null, 'Reset progress'), h('br'),
          h('span', { class: 'small muted' }, 'Clears XP, streak, finished lessons and review boxes on this device. Lessons stay.')),
        h('button', {
          class: 'btn secondary',
          onclick: () => { if (confirm('Reset all progress on this device? This can’t be undone.')) { progress.reset(); go('/'); } },
        }, 'Reset progress')))));
}
