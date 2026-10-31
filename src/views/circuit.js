import { h, icon } from '../ui.js';
import { renderCircuit, trackProgress } from '../circuit.js';
import { go } from '../router.js';

export function renderCircuitView(root) {
  const { el, summary } = renderCircuit();
  root.replaceChildren(h('div', { class: 'screen' },
    h('header', { class: 'topbar' },
      h('button', { class: 'icon-btn', 'aria-label': 'Back to map', onclick: () => go('/') }, icon('back')),
      h('h1', null, 'Your circuit')),
    h('div', { class: 'circuit-frame' }, el),
    h('div', { class: 'stats', style: 'margin-top:12px' },
      [['Wired', `${summary.wired}/${summary.total}`], ['Myelinated', summary.myelinated], ['Status', summary.complete ? 'Complete' : 'Growing']]
        .map(([k, v]) => h('div', { class: 'card' }, h('div', { class: 'v' }, v), h('div', { class: 'k' }, k)))),
    h('p', { class: 'small muted', style: 'margin:14px 0' },
      'Each unit is a neuron in its track’s brain region. Finishing a lesson grows a dendrite. Keep reviewing until its questions reach the top memory boxes and the axons thicken and myelinate. Master everything and signals run through the whole circuit.'),
    h('ul', { class: 'legend' }, trackProgress().map(({ track, wired, total }) =>
      h('li', null, h('span', { class: 'dot', style: `background:${track.color}` }), h('span', { class: 'name' }, track.title),
        h('span', { class: 'muted small' }, total ? `${wired}/${total} wired` : 'no lessons yet'))))));
}
