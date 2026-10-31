import { h, icon } from '../ui.js';
import { content } from '../content.js';
import { go } from '../router.js';

// Shown on launch when developing (localhost or ?dev) if any content is
// malformed, and from Settings anytime. Each line names the file and field.
export function renderErrors(root) {
  root.replaceChildren(h('div', { class: 'screen errors-screen' },
    h('header', { class: 'topbar' },
      h('button', { class: 'icon-btn', 'aria-label': 'Back to map', onclick: () => go('/') }, icon('back')),
      h('h1', null, 'Content problems')),
    content.errors.length
      ? [h('p', { class: 'muted' }, `${content.errors.length} problem${content.errors.length === 1 ? '' : 's'} found. Lessons with errors are skipped until they're fixed.`),
        h('ol', null, content.errors.map((e) => h('li', null, e)))]
      : h('p', null, 'No problems. Every lesson file matches the format.'),
    h('a', { class: 'btn', href: '#/', style: 'margin-top:16px' }, 'Open the app anyway')));
}

export function renderFatal(root, message) {
  root.replaceChildren(h('div', { class: 'screen errors-screen' },
    h('h1', null, "Couldn't start"),
    h('pre', null, message),
    h('button', { class: 'btn', onclick: () => location.reload() }, 'Try again')));
}
