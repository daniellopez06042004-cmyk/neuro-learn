import { h, md, icon } from '../ui.js';
import { content } from '../content.js';
import { go } from '../router.js';

const trackColor = (id) => content.tracks.find((t) => t.id === id)?.color;

function uniqueTerms() {
  return [...new Set(content.glossary.values())].sort((a, b) => a.term.localeCompare(b.term, undefined, { sensitivity: 'base' }));
}

// The glossary screen: every term, with search.
export function renderGlossary(root) {
  const list = h('ul', { class: 'glossary' });
  const search = h('input', { type: 'search', class: 'search', placeholder: 'Search terms', 'aria-label': 'Search the glossary' });
  const draw = () => {
    const q = search.value.trim().toLowerCase();
    const terms = uniqueTerms().filter((t) => !q || [t.term, ...(t.aliases || []), t.definition].some((s) => s.toLowerCase().includes(q)));
    list.replaceChildren(...(terms.length
      ? terms.map((t) => h('li', null,
        h('div', { class: 'g-term' }, trackColor(t.track) ? h('span', { class: 'dot', style: `background:${trackColor(t.track)}` }) : null, t.term),
        t.aliases?.length ? h('div', { class: 'small muted' }, `Also: ${t.aliases.join(', ')}`) : null,
        md(t.definition)))
      : [h('li', { class: 'muted' }, content.glossary.size ? 'No matching terms.' : 'No terms yet. Add them to content/glossary.json.')]));
  };
  search.addEventListener('input', draw);
  root.replaceChildren(h('div', { class: 'screen' },
    h('header', { class: 'topbar' },
      h('button', { class: 'icon-btn', 'aria-label': 'Back to map', onclick: () => go('/') }, icon('back')),
      h('h1', null, 'Glossary')),
    search, list));
  draw();
}

// Tapping a [[term]] in a lesson opens its definition in a sheet, without
// leaving the lesson.
export function showTerm(name, returnFocus) {
  const t = content.glossary.get(name.toLowerCase());
  document.querySelector('.term-sheet')?.remove();
  const close = () => { sheet.remove(); returnFocus?.focus(); };
  const sheet = h('div', { class: 'term-sheet', role: 'dialog', 'aria-modal': 'true', 'aria-label': t?.term || name, onclick: (e) => { if (e.target === sheet) close(); } },
    h('div', { class: 'term-card' },
      h('div', { class: 'term-head' },
        h('h2', null, t?.term || name),
        h('button', { class: 'icon-btn', 'aria-label': 'Close', onclick: close }, icon('x'))),
      t ? md(t.definition) : h('p', { class: 'muted' }, 'This term isn’t in the glossary yet.'),
      h('a', { href: '#/glossary', class: 'small', onclick: () => sheet.remove() }, 'Open the glossary')));
  sheet.addEventListener('keydown', (e) => { if (e.key === 'Escape') close(); });
  document.body.append(sheet);
  sheet.querySelector('.icon-btn').focus();
}
