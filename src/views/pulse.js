import { h, md, icon } from '../ui.js';
import { content } from '../content.js';
import { settings } from '../progress.js';
import { go } from '../router.js';

// Papers newer than the last time you opened Field Pulse.
export function unreadPulse() {
  const seen = settings.get('pulseSeen') || '';
  return content.pulse.filter((p) => p.date > seen).length;
}

// Field Pulse: recent papers with checked DOIs, newest first.
export function renderPulse(root) {
  const seen = settings.get('pulseSeen') || '';
  if (content.pulse.length) settings.set('pulseSeen', content.pulse[0].date);
  const trackOf = (id) => content.tracks.find((t) => t.id === id);

  root.replaceChildren(h('div', { class: 'screen' },
    h('header', { class: 'topbar' },
      h('button', { class: 'icon-btn', 'aria-label': 'Back to library', onclick: () => go('/library') }, icon('back')),
      h('h1', null, 'Field Pulse')),
    h('p', { class: 'muted small', style: 'margin:0 0 14px' }, 'Recent papers that keep the frontier units current. Every one has a checked DOI.'),
    content.pulse.length
      ? h('div', { class: 'stack' }, content.pulse.map((p) => {
        const t = trackOf(p.track);
        return h('article', { class: 'card pulse-card', style: t ? `--track:${t.color}` : '' },
          h('div', { class: 'pulse-meta' },
            p.date > seen ? h('span', { class: 'pulse-new' }, 'New') : null,
            h('span', null, p.date),
            t ? h('span', { class: 'pulse-track' }, h('span', { class: 'dot', style: `background:${t.color}` }), t.title) : null),
          h('h2', { class: 'pulse-title' }, p.title),
          h('p', { class: 'small', style: 'margin:0 0 10px' },
            h('a', { href: `https://doi.org/${encodeURI(p.doi)}`, target: '_blank', rel: 'noopener' }, p.citation)),
          md(p.summary),
          p.whyItMatters ? [h('p', { class: 'pulse-why' }, 'Why it matters'), md(p.whyItMatters)] : null,
          p.tags?.length ? h('p', { class: 'pulse-tags' }, p.tags.map((tag) => h('span', null, tag))) : null);
      }))
      : h('div', { class: 'card' },
        h('strong', null, 'No papers yet'),
        h('p', { class: 'small muted', style: 'margin:6px 0 0' }, 'Add papers to content/pulse.json once their DOIs are checked. Each one needs a title, citation, DOI and a short summary.'))));
}
