// Focus-mode player: one step per screen, a spike-train progress trace on top,
// and a feedback sheet after each answer. Used for lessons and for review.

import { h, md, icon, flagBadge, trackStyle } from './ui.js';
import { createStep } from './steps.js';
import { progress } from './progress.js';
import { onLeave } from './router.js';

const PRAISE = ['Correct', 'Nice', 'Exactly', 'Spot on'];

/**
 * items: [{ key: "lessonId:stepId", step, color }]
 * mode:  'lesson' re-asks a missed question once at the end; 'review' doesn't.
 */
export function runSession(root, { items, mode, onExit, onDone }) {
  const queue = items.map((it) => ({ ...it, retry: false }));
  const results = []; // 'ok' | 'miss' | 'read', one per finished position
  let pos = 0, graded = 0, correct = 0, finished = false;
  let primary = null; // the button Enter should press

  const ac = new AbortController();
  onLeave(() => ac.abort());
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && primary && !(e.target instanceof HTMLTextAreaElement) && !(e.target instanceof HTMLButtonElement)) {
      e.preventDefault();
      primary.click();
    }
  }, { signal: ac.signal });

  const trace = h('div', { class: 'trace-host', style: 'flex:1' });
  const stage = h('div', { class: 'stage' });
  const dock = h('div', { class: 'dock' });
  const shell = h('div', { class: 'player' },
    h('div', { class: 'player-top' },
      h('button', {
        class: 'icon-btn', 'aria-label': mode === 'review' ? 'End review' : 'Quit lesson',
        onclick: () => {
          if (pos > 0 && !finished && !confirm(mode === 'review' ? 'End this review? Answers so far are saved.' : "Quit this lesson? You'll need to restart it to finish.")) return;
          ac.abort();
          onExit();
        },
      }, icon('x')),
      trace),
    stage, dock);
  root.replaceChildren(shell);

  // --- progress trace: each finished step leaves a spike (or a dip for a miss)
  function drawTrace(animateLast) {
    const W = Math.max(180, Math.round(trace.clientWidth || 280)), H = 40, base = 24;
    const seg = W / queue.length;
    const parts = results.map((r, i) => {
      const x0 = i * seg, xs = x0 + seg * 0.55;
      const shape = r === 'miss'
        ? `L${xs} ${base} L${xs + 3} ${base - 3} L${xs + 7} ${H - 2} L${xs + 13} ${base}`
        : r === 'read'
          ? `L${xs} ${base} L${xs + 3} ${base - 11} L${xs + 6} ${base + 3} L${xs + 9} ${base}`
          : `L${xs} ${base} L${xs + 3} 3 L${xs + 7} ${base + 6} L${xs + 11} ${base}`;
      const cls = `done${r === 'miss' ? ' miss' : ''}${animateLast && i === results.length - 1 ? ' new' : ''}`;
      return `<path class="${cls}" d="M${x0} ${base} ${shape} L${(i + 1) * seg} ${base}"/>`;
    }).join('');
    const headX = Math.min(W - 3, results.length * seg);
    trace.innerHTML = `<svg class="trace" viewBox="0 0 ${W} ${H}" role="img" aria-label="Step ${Math.min(pos + 1, queue.length)} of ${queue.length}">
      <path class="base" d="M0 ${base} L${W} ${base}"/>${parts}<circle class="head" cx="${headX}" cy="${base}" r="4"/></svg>`;
  }

  function setDock(...kids) {
    dock.className = 'dock';
    dock.replaceChildren(...kids);
  }

  function showStep() {
    const item = queue[pos];
    shell.setAttribute('style', trackStyle(item.color));
    const ctl = createStep(item.step, { autoCheck: () => check(ctl, item) });
    stage.replaceChildren(h('div', { class: 'stage-inner' }, ctl.el));
    stage.scrollTop = 0;
    drawTrace(false);

    if (!ctl.interactive) {
      primary = h('button', { class: 'btn', onclick: () => { results.push('read'); drawTrace(true); next(); } }, 'Continue');
      setDock(primary);
    } else {
      const hint = h('p', { class: 'hint-msg', role: 'alert' });
      primary = h('button', { class: 'btn', onclick: () => check(ctl, item, hint) }, 'Check');
      setDock(hint, primary);
      hint.hidden = true;
    }
    stage.querySelector('h2, .prompt')?.setAttribute('tabindex', '-1');
    stage.querySelector('h2, .prompt')?.focus({ preventScroll: true });
  }

  function check(ctl, item, hint) {
    if (dock.classList.contains('sheet')) return;
    const r = ctl.check();
    if (r.notReady) {
      if (hint) { hint.textContent = r.notReady; hint.hidden = false; }
      return;
    }
    ctl.lock();
    if (r.selfGrade) return selfGrade(item, r);
    grade(item, r.ok);
    feedback(item, r);
  }

  function grade(item, ok) {
    if (!item.retry) {
      graded++;
      if (ok) correct++;
      progress.recordAnswer(item.key, ok);
      if (!ok && mode === 'lesson') queue.push({ ...item, retry: true });
    }
    results.push(ok ? 'ok' : 'miss');
    drawTrace(true);
  }

  function feedback(item, r) {
    const s = item.step;
    const isPredict = s.type === 'predict';
    const verdict = r.ok
      ? (isPredict ? 'Good prediction' : PRAISE[Math.floor(Math.random() * PRAISE.length)])
      : (isPredict ? "That's not what happens" : 'Not quite');
    const body = h('div', { class: 'body' },
      !r.ok && r.answerText ? h('p', { class: 'answer' }, h('span', { class: 'sr-only' }, 'Correct answer: '), ...r.answerText.split('\n').flatMap((l, i) => (i ? [h('br'), l] : [l]))) : null,
      r.note ? h('p', { class: 'small muted' }, r.note) : null,
      isPredict ? h('h3', null, 'What happens') : null,
      md(isPredict ? s.reveal : s.explanation),
      s.followUp ? [h('h3', null, 'Think about it'), md(s.followUp)] : null,
      s.flag ? flagBadge(s.flag) : null,
      !r.ok && mode === 'lesson' && !item.retry ? h('p', { class: 'small muted', style: 'margin-top:10px' }, "You'll see this one again at the end.") : null);
    sheet(r.ok ? 'good' : 'miss', h('p', { class: 'verdict' }, icon(r.ok ? 'check' : 'x'), verdict), body,
      primary = h('button', { class: `btn ${r.ok ? 'ok' : 'bad'}`, onclick: next }, 'Continue'));
  }

  function selfGrade(item, r) {
    const s = item.step;
    const choose = (ok) => { grade(item, ok); next(); };
    primary = null;
    sheet('neutral', h('p', { class: 'verdict' }, 'Compare with what happens'),
      h('div', { class: 'body' },
        h('h3', null, 'You predicted'), h('p', { class: 'your-guess' }, r.guess),
        h('h3', null, 'What happens'), md(s.reveal),
        s.flag ? flagBadge(s.flag) : null),
      h('div', { class: 'row-btns' },
        h('button', { class: 'btn bad', onclick: () => choose(false) }, icon('x'), 'I missed it'),
        h('button', { class: 'btn ok', onclick: () => choose(true) }, icon('check'), 'I got it')));
  }

  function sheet(tone, ...kids) {
    dock.className = `dock sheet ${tone}`;
    dock.replaceChildren(...kids);
    if (primary) dock.append(h('p', { class: 'swipe', 'aria-hidden': 'true' }, 'or swipe up'));
    dock.querySelector('.verdict')?.setAttribute('tabindex', '-1');
    dock.querySelector('.verdict')?.focus({ preventScroll: true });
  }

  // Swipe up anywhere to continue once feedback is showing.
  let startY = null;
  shell.addEventListener('touchstart', (e) => { startY = e.touches[0].clientY; }, { passive: true, signal: ac.signal });
  shell.addEventListener('touchend', (e) => {
    if (startY == null) return;
    const dy = e.changedTouches[0].clientY - startY;
    startY = null;
    if (dy < -70 && dock.classList.contains('sheet') && primary && !stage.contains(e.target)) primary.click();
  }, { passive: true, signal: ac.signal });

  function next() {
    pos++;
    if (pos >= queue.length) {
      finished = true;
      ac.abort();
      onDone({ graded, correct });
    } else {
      showStep();
    }
  }

  showStep();
}

export function finishScreen(root, { color, title, stats, button, onContinue }) {
  root.replaceChildren(h('div', { class: 'finish', style: trackStyle(color) },
    h('div', { class: 'center' },
      h('div', { html: `<svg class="burst" viewBox="0 0 160 160" aria-hidden="true">
        <circle class="wave" cx="80" cy="80" r="40"/><circle class="wave" cx="80" cy="80" r="40"/><circle class="wave" cx="80" cy="80" r="40"/>
        <path class="dend" d="M80 52 L80 14"/><path class="dend" d="M56 94 L24 124"/><path class="dend" d="M104 94 L136 124"/>
        <path class="dend" d="M54 70 L18 58"/><path class="dend" d="M106 70 L142 58"/>
        <circle class="core" cx="80" cy="80" r="30"/></svg>` }),
      h('h2', { tabindex: '-1' }, title),
      h('div', { class: 'stats' }, stats.map(([k, v]) => h('div', { class: 'card' }, h('div', { class: 'v' }, v), h('div', { class: 'k' }, k))))),
    h('button', { class: 'btn', onclick: onContinue }, button)));
  root.querySelector('h2').focus();
}
