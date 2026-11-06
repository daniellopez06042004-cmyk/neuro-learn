// One renderer per step type. Each returns a small controller:
//   el           — the step's content
//   interactive  — false for concept cards (just "Continue")
//   check()      — grades the current answer: { ok, answerText } or
//                  { notReady: "message" } or { selfGrade: true, guess }
//   lock()       — freezes the step and marks right/wrong after checking

import { h, md, inline, plain, icon, shuffle, flagBadge } from './ui.js';
import { imageUrl } from './content.js';

// A step with "variants" is one question in several versions (they share its
// id, so review history is one item). Show the base version first; on a
// retry or in review, show a different one than last time.
export function pickVariant(step, avoid = null) {
  const versions = [step, ...(step.variants || [])];
  if (versions.length === 1) return { step, index: 0 };
  let index = 0;
  if (avoid != null) {
    const others = versions.map((_, i) => i).filter((i) => i !== avoid);
    index = others[Math.floor(Math.random() * others.length)];
  }
  return { step: index === 0 ? step : { ...versions[index], id: step.id }, index };
}

export function createStep(step, ctx) {
  const build = { intro, concept, mcq, troubleshoot, predict, match, order }[step.type];
  const ctl = build(step, ctx);
  if (step.visual) ctl.el = [visual(step.visual), ...ctl.el]; // shown above the step
  return ctl;
}

// ---------- visuals (lesson-format.md: "visual" on any step) ----------

export function visual(v) {
  const src = imageUrl(v.src);
  let media;
  if (v.type === 'interactive') media = widget(v, src);
  else if (v.type === 'mp4') media = h('video', { src, muted: true, loop: true, autoplay: true, playsinline: true, 'aria-label': v.alt });
  else if (v.type === 'lottie') media = h('p', { class: 'visual-fallback' }, v.alt); // no animation player bundled
  else media = h('img', { src, alt: v.alt || '', loading: 'lazy' }); // svg, svg-anim, gif, image
  if (media.tagName === 'VIDEO') media.muted = true; // iOS only autoplays muted video
  return h('figure', { class: `visual visual-${v.type}` }, media, v.caption ? h('figcaption', null, v.caption) : null);
}

// An interactive HTML widget, in a sandboxed frame (scripts only: no storage,
// no access to the app). A tiny script added to it reports its height so the
// frame fits the content exactly.
function widget(v, src) {
  const frame = h('iframe', { class: 'visual-frame', title: v.alt || 'Interactive', sandbox: 'allow-scripts', style: 'height:360px' });
  const id = Math.random().toString(36).slice(2);
  const onMessage = (e) => {
    if (!frame.isConnected && frame.dataset.loaded) { window.removeEventListener('message', onMessage); return; }
    if (e.source === frame.contentWindow && e.data?.nlFrame === id) frame.style.height = `${Math.min(Math.max(e.data.h, 120), 1000)}px`;
  };
  window.addEventListener('message', onMessage);
  fetch(src).then((r) => (r.ok ? r.text() : Promise.reject(new Error(r.status)))).then((html) => {
    const probe = `<script>(()=>{const s=()=>parent.postMessage({nlFrame:${JSON.stringify(id)},h:Math.ceil(document.documentElement.getBoundingClientRect().height)},'*');new ResizeObserver(s).observe(document.documentElement);addEventListener('load',s);s();})();<\/script>`;
    // The app supports light and dark; a frame that doesn't say so gets an
    // opaque white backdrop in dark mode (under its dark-mode text colors).
    const scheme = '<meta name="color-scheme" content="light dark"><style>:root{color-scheme:light dark}</style>';
    html = /<head[^>]*>/i.test(html) ? html.replace(/<head[^>]*>/i, (m) => m + scheme) : scheme + html;
    frame.srcdoc = /<\/body>/i.test(html) ? html.replace(/<\/body>/i, `${probe}</body>`) : html + probe;
    frame.dataset.loaded = '1';
  }).catch(() => {
    window.removeEventListener('message', onMessage);
    frame.replaceWith(h('p', { class: 'visual-fallback' }, `${v.alt} (Couldn’t load this interactive. Open it once while online.)`));
  });
  return frame;
}

const letter = (i) => String.fromCharCode(65 + i);
// A small grey line naming the task, left out when the prompt already says it.
const kind = (text, prompt, word) => (word && word.test(prompt || '') ? null : h('p', { class: 'kind' }, text));
const prompt = (text) => { const el = inline(text, 'h2'); el.className = 'prompt'; return el; };
const sameSet = (a, b) => a.length === b.length && a.every((x) => b.includes(x));

// Not in lesson files: the player adds this first, from the lesson's own
// title, objective and confidence.
function intro(s) {
  const conf = { high: 'Well established', medium: 'Mostly established', low: 'Still uncertain' }[s.confidence];
  return {
    interactive: false,
    el: [
      kind(`${s.minutes ? `${s.minutes} min · ` : ''}${s.stepCount} ${s.countWord || 'steps'}`),
      h('h2', { class: 'concept-title' }, s.title),
      h('div', { class: 'objective' }, h('p', { class: 'objective-label' }, s.objectiveLabel || 'By the end you can'), md(s.objective, 'prose')),
      conf ? h('p', { class: 'small muted' }, `Confidence: ${conf}`) : null,
    ],
  };
}

function concept(s) {
  let figure = null;
  if (s.image) {
    const img = typeof s.image === 'string' ? { src: s.image } : s.image;
    figure = h('figure', null,
      h('img', { src: imageUrl(img.src), alt: img.alt || '', loading: 'lazy' }),
      img.caption ? h('figcaption', null, img.caption) : null);
  }
  return {
    interactive: false,
    el: [flagBadge(s.flag), figure, s.title ? h('h2', { class: 'concept-title' }, s.title) : null, md(s.body, 'prose')],
  };
}

// Options are shuffled every time a question appears, so neither position nor
// a remembered layout gives the answer away. "Both…", "Neither…", "All of…"
// and "None of…" stay at the bottom, where people expect them. Everything
// outside this function uses the original option indexes.
const PINNED = /^\s*(both|neither|all of|none of)\b/i;
function displayOrder(options) {
  const idx = options.map((_, i) => i);
  return [...shuffle(idx.filter((i) => !PINNED.test(plain(options[i])))), ...idx.filter((i) => PINNED.test(plain(options[i])))];
}

function choiceList(options, multi) {
  const sel = new Set();
  let locked = false;
  const order = displayOrder(options); // display position -> original index
  const btns = order.map((i, pos) => h('button', {
    class: `choice${multi ? ' multi' : ''}`,
    role: multi ? 'checkbox' : 'radio',
    'aria-checked': 'false',
    onclick: () => {
      if (locked) return;
      if (multi) sel.has(i) ? sel.delete(i) : sel.add(i);
      else { sel.clear(); sel.add(i); }
      btns.forEach((b, p) => b.setAttribute('aria-checked', String(sel.has(order[p]))));
    },
  }, h('span', { class: 'key', 'aria-hidden': 'true' }, letter(pos)), inline(options[i], 'span'), h('span', { class: 'mark' })));
  btns.forEach((b) => b.lastElementChild.previousElementSibling.classList.add('txt'));
  const el = h('div', { class: 'choices', role: multi ? 'group' : 'radiogroup' }, btns);
  return {
    el,
    selected: () => [...sel].sort((a, b) => a - b),
    letterOf: (i) => letter(order.indexOf(i)),
    lock(answer) {
      locked = true;
      el.classList.add('locked');
      btns.forEach((b, pos) => {
        const i = order[pos];
        const right = answer.includes(i), picked = sel.has(i);
        b.classList.toggle('right', right);
        b.classList.toggle('wrong', picked && !right);
        b.classList.toggle('dim', !right && !picked);
        b.classList.toggle('hit', right && picked);
        b.setAttribute('aria-disabled', 'true');
        const mark = b.querySelector('.mark');
        if (right) mark.replaceChildren(icon('check', 'correct answer'));
        else if (picked) mark.replaceChildren(icon('x', 'your answer, incorrect'));
      });
    },
  };
}

function gradeChoices(s, list) {
  const picked = list.selected();
  if (!picked.length) return { notReady: s.multi ? 'Pick at least one answer first' : 'Pick an answer first' };
  const shown = [...s.answer].sort((a, b) => list.letterOf(a).localeCompare(list.letterOf(b)));
  return { ok: sameSet(picked, s.answer), answerText: shown.map((i) => `${list.letterOf(i)}. ${s.options[i]}`).join('\n') };
}

function mcq(s) {
  const list = choiceList(s.options, s.multi);
  return {
    interactive: true,
    el: [flagBadge(s.flag), s.multi ? kind('Pick all that apply') : null, prompt(s.prompt), list.el],
    check: () => gradeChoices(s, list),
    lock: () => list.lock(s.answer),
  };
}

function dataTable(data) {
  if (!data || data.kind !== 'table' || !data.rows?.length) return null;
  const [head, ...body] = data.rows;
  return h('div', { class: 'data-table-wrap' },
    h('table', { class: 'data' },
      h('thead', null, h('tr', null, head.map((c) => h('th', { scope: 'col' }, c)))),
      h('tbody', null, body.map((r) => h('tr', null, r.map((c) => h('td', null, c)))))));
}

function troubleshoot(s) {
  const list = choiceList(s.options, s.multi);
  return {
    interactive: true,
    el: [flagBadge(s.flag), kind('Troubleshoot'), md(s.scenario, 'md setup'), dataTable(s.data), prompt(s.prompt), list.el],
    check: () => gradeChoices(s, list),
    lock: () => list.lock(s.answer),
  };
}

function predict(s) {
  const head = [flagBadge(s.flag), kind('Predict'), s.setup ? md(s.setup, 'md setup') : null, prompt(s.prompt || 'What do you predict?')];
  if (s.freeText) {
    const box = h('textarea', { class: 'free', placeholder: 'Type your prediction…', 'aria-label': 'Your prediction' });
    return {
      interactive: true,
      el: [...head, box],
      check: () => {
        const guess = box.value.trim();
        return guess ? { selfGrade: true, guess } : { notReady: 'Write your prediction first' };
      },
      lock: () => { box.readOnly = true; },
    };
  }
  const list = choiceList(s.options, s.multi);
  return {
    interactive: true,
    el: [...head, list.el],
    check: () => gradeChoices(s, list),
    lock: () => list.lock(s.answer),
  };
}

function match(s, ctx) {
  const lefts = s.pairs.map((p) => p[0]);
  let rights = shuffle(s.pairs.map((p) => p[1]));
  if (rights.length > 2 && rights.every((r, i) => r === s.pairs[i][1])) rights = [...rights.slice(1), rights[0]];
  const truth = new Map(s.pairs);
  let pickL = null, pickR = null, mistakes = 0, matched = 0;

  const tile = (text, side, i) => h('button', {
    class: 'tile', 'aria-pressed': 'false', 'data-side': side, 'data-i': i,
    onclick: (e) => {
      const b = e.currentTarget;
      if (b.classList.contains('matched')) return;
      if (side === 'L') pickL = pickL === i ? null : i; else pickR = pickR === i ? null : i;
      sync();
      if (pickL != null && pickR != null) tryPair();
    },
  }, inline(text));
  const L = lefts.map((t, i) => tile(t, 'L', i));
  const R = rights.map((t, i) => tile(t, 'R', i));
  const sync = () => {
    L.forEach((b, i) => b.setAttribute('aria-pressed', String(pickL === i)));
    R.forEach((b, i) => b.setAttribute('aria-pressed', String(pickR === i)));
  };
  const tryPair = () => {
    const a = L[pickL], b = R[pickR];
    if (truth.get(lefts[pickL]) === rights[pickR]) {
      for (const t of [a, b]) { t.classList.add('matched'); t.setAttribute('aria-pressed', 'false'); t.append(icon('check', 'matched')); }
      matched++;
    } else {
      mistakes++;
      for (const t of [a, b]) { t.classList.remove('nope'); void t.offsetWidth; t.classList.add('nope'); }
      setTimeout(() => { a.classList.remove('nope'); b.classList.remove('nope'); }, 400);
    }
    pickL = pickR = null;
    sync();
    if (matched === s.pairs.length) setTimeout(() => ctx.autoCheck(), 350);
  };

  return {
    interactive: true,
    el: [flagBadge(s.flag), kind('Match the pairs', s.prompt, /match|pair/i), prompt(s.prompt),
      h('div', { class: 'match' }, h('div', { class: 'col' }, L), h('div', { class: 'col' }, R))],
    check: () => matched < s.pairs.length
      ? { notReady: 'Match every pair first' }
      : { ok: mistakes === 0, answerText: s.pairs.map(([a, b]) => `${a} → ${b}`).join('\n'), note: mistakes ? `${mistakes} wrong ${mistakes === 1 ? 'try' : 'tries'} along the way.` : null },
    lock: () => {},
  };
}

function order(s) {
  let bank = shuffle(s.items.map((_, i) => i));
  if (bank.every((v, i) => v === i)) bank.reverse();
  const placed = [];
  let locked = false;
  const slots = h('div', { class: 'slots', 'aria-label': 'Your order' });
  const bankEl = h('div', { class: 'bank', 'aria-label': 'Steps to place' });

  const draw = () => {
    slots.replaceChildren(...(placed.length
      ? placed.map((idx, pos) => h('button', {
        class: 'tile', 'data-pos': pos,
        'aria-label': `Position ${pos + 1}: ${plain(s.items[idx])}. Tap to remove.`,
        onclick: () => { if (locked) return; placed.splice(pos, 1); bank.push(idx); draw(); },
      }, h('span', { class: 'n' }, pos + 1), inline(s.items[idx])))
      : [h('div', { class: 'hint' }, 'Tap the steps below in order')]));
    bankEl.replaceChildren(...bank.map((idx) => h('button', {
      class: 'tile',
      onclick: () => { if (locked) return; bank = bank.filter((b) => b !== idx); placed.push(idx); draw(); },
    }, inline(s.items[idx]))));
  };
  draw();

  return {
    interactive: true,
    el: [flagBadge(s.flag), kind('Put in order', s.prompt, /order/i), prompt(s.prompt), slots, bankEl],
    check: () => placed.length < s.items.length
      ? { notReady: 'Place every step first' }
      : { ok: placed.every((v, i) => v === i), answerText: s.items.map((t, i) => `${i + 1}. ${t}`).join('\n') },
    lock: () => {
      locked = true;
      [...slots.children].forEach((t, pos) => {
        const right = placed[pos] === pos;
        t.classList.add(right ? 'right' : 'wrong');
        t.append(icon(right ? 'check' : 'x', right ? 'right place' : 'wrong place'));
      });
    },
  };
}
