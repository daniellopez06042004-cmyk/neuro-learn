// Small DOM helpers shared by every screen. No framework: h() builds elements.

export function h(tag, props, ...kids) {
  const el = document.createElement(tag);
  for (const [k, v] of Object.entries(props || {})) {
    if (v == null || v === false) continue;
    if (k === 'class') el.className = v;
    else if (k === 'html') el.innerHTML = v;
    else if (k.startsWith('on') && typeof v === 'function') el.addEventListener(k.slice(2).toLowerCase(), v);
    else el.setAttribute(k, v === true ? '' : v);
  }
  for (const kid of kids.flat(Infinity)) {
    if (kid == null || kid === false) continue;
    el.append(kid instanceof Node ? kid : String(kid));
  }
  return el;
}

export function esc(s) {
  return String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

// Glossary links: [[term]] or, wiki-style, [[term|shown words]]. If only the
// second half is a glossary term, it's read the other way round.
let isTerm = () => false;
export function setTermLookup(fn) { isTerm = fn; }

// A span (not a button) so terms can sit inside answer buttons and tiles.
// app.js opens the definition on tap; inside a question it stays locked
// until the learner has answered (see [data-terms-locked]).
function termLink(a, b) {
  const [term, shown] = !b || isTerm(a.trim()) || !isTerm(b.trim()) ? [a, b || a] : [b, a];
  return `<span class="term" role="button" tabindex="0" data-term="${term.trim()}">${shown}</span>`;
}
const linkTerms = (escaped) => escaped.replace(/\[\[([^\]|]+)(?:\|([^\]]+))?\]\]/g, (_, a, b) => termLink(a, b));

// One line of question text (prompt, option, tile) with its glossary links.
export function inline(text, tag = 'span') {
  return h(tag, { html: linkTerms(esc(text)) });
}

// Text with the [[…]] markup removed, for places that need plain words.
export const plain = (text) => String(text ?? '').replace(/\[\[([^\]|]+)(?:\|([^\]]+))?\]\]/g, (_, a, b) => {
  const [, shown] = !b || isTerm(a.trim()) || !isTerm(b.trim()) ? [a, b || a] : [b, a];
  return shown;
});

// Tiny Markdown: **bold**, *italic*, `code`, "- " lists, blank-line paragraphs,
// and glossary links (above).
export function md(text, cls = 'md') {
  const inline = (s) => linkTerms(esc(s))
    .replace(/`([^`]+)`/g, '<code>$1</code>')
    .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
    .replace(/(^|[^*])\*([^*\s][^*]*)\*/g, '$1<em>$2</em>');
  const blocks = String(text ?? '').trim().split(/\n\s*\n/);
  const isItem = (l) => /^\s*[-•]\s+/.test(l);
  const html = blocks.map((b) => {
    // Split each block into runs of plain lines and runs of "- " list items.
    const runs = [];
    for (const l of b.split('\n')) {
      const kind = isItem(l) ? 'ul' : 'p';
      if (runs.at(-1)?.kind === kind) runs.at(-1).lines.push(l);
      else runs.push({ kind, lines: [l] });
    }
    return runs.map(({ kind, lines }) => kind === 'ul'
      ? '<ul>' + lines.map((l) => `<li>${inline(l.replace(/^\s*[-•]\s+/, ''))}</li>`).join('') + '</ul>'
      : `<p>${lines.map(inline).join('<br>')}</p>`).join('');
  }).join('');
  return h('div', { class: cls, html });
}

const PATHS = {
  x: '<path d="M6 6l12 12M18 6L6 18"/>',
  check: '<path d="M5 12.5l4.5 4.5L19 7"/>',
  back: '<path d="M15 5l-7 7 7 7"/>',
  bolt: '<path d="M13 3L5 13h6l-1 8 8-10h-6l1-8z"/>',
  lock: '<rect x="5" y="11" width="14" height="9" rx="2"/><path d="M8 11V8a4 4 0 0 1 8 0v3"/>',
  alert: '<path d="M12 4l9 16H3z"/><path d="M12 10v4M12 17v.5"/>',
  review: '<path d="M20 11a8 8 0 1 0-2.3 5.7"/><path d="M20 5v6h-6"/>',
  sliders: '<path d="M4 7h10M18 7h2M4 17h4M12 17h8"/><circle cx="16" cy="7" r="2"/><circle cx="10" cy="17" r="2"/>',
  share: '<path d="M12 3v12M8 7l4-4 4 4"/><path d="M5 12v7a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-7"/>',
  star: '<path d="M12 4l2.5 5.2 5.5.7-4 3.9 1 5.6L12 16.8 7 19.4l1-5.6-4-3.9 5.5-.7z"/>',
  neuron: '<circle cx="12" cy="12" r="3"/><path d="M12 9V3M9.6 13.8L5 19M14.4 13.8L19 19M15 12h6M3 10l6 1.5"/>',
  book: '<path d="M5 4.5A1.5 1.5 0 0 1 6.5 3H19v15H6.5A1.5 1.5 0 0 0 5 19.5z"/><path d="M5 19.5A1.5 1.5 0 0 0 6.5 21H19"/>',
  pulse: '<path d="M3 12h4l2.5-6 5 12 2.5-6h4"/>',
  slide: '<rect x="2.5" y="8" width="19" height="8" rx="1"/><path d="M8 8v8"/><circle cx="14.5" cy="12" r="1.6"/>',
  dots: '<circle cx="6" cy="12" r="1"/><circle cx="12" cy="12" r="1"/><circle cx="18" cy="12" r="1"/>',
};

export function icon(name, label) {
  const svg = `<svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" ${label ? `role="img" aria-label="${esc(label)}"` : 'aria-hidden="true"'}>${PATHS[name] || ''}</svg>`;
  const t = document.createElement('template');
  t.innerHTML = svg;
  return t.content.firstChild;
}

export function svg(markup) {
  const t = document.createElement('template');
  t.innerHTML = markup.trim();
  return t.content.firstChild;
}

// Pick readable text (white or near-black) for a fill color.
export function onColor(hex) {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex || '');
  if (!m) return '#ffffff';
  const n = parseInt(m[1], 16);
  const [r, g, b] = [(n >> 16) & 255, (n >> 8) & 255, n & 255].map((c) => {
    c /= 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });
  const lum = 0.2126 * r + 0.7152 * g + 0.0722 * b;
  return lum > 0.4 ? '#1c1c1b' : '#ffffff';
}

export function trackStyle(color) {
  return `--track:${color};--on-track:${onColor(color)}`;
}

export function shuffle(arr) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export function flagBadge(flag) {
  if (!flag) return null;
  const label = { uncertain: 'Uncertain', debated: 'Debated', simplified: 'Simplified' }[flag.level] || 'Note';
  return h('details', { class: 'flag-box' },
    h('summary', null, h('span', { class: 'flag' }, icon('alert'), label)),
    flag.note ? h('p', null, flag.note) : null);
}

export const isDev = ['localhost', '127.0.0.1', '[::1]'].includes(location.hostname) || new URLSearchParams(location.search).has('dev');
