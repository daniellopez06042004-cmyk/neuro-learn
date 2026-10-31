// Focus-mode player: one step per screen, a living-membrane progress trace on
// top, and a feedback sheet after each answer. Used for lessons and review.
// To move on, swipe left: dragging charges the neuron, and crossing
// threshold fires you to the next step (the Continue button does the same).

import { h, md, icon, flagBadge, trackStyle } from './ui.js';
import { createStep } from './steps.js';
import { createTrace } from './trace.js';
import { progress } from './progress.js';
import { onLeave } from './router.js';

const PRAISE = ['Correct', 'Nice', 'Exactly', 'Spot on'];
const FIRE_AT = 0.33; // drag this fraction of the screen width to fire

/**
 * items: [{ key: "lessonId:stepId", step, color }]
 * mode:  'lesson' re-asks a missed question once at the end; 'review' doesn't.
 */
export function runSession(root, { items, mode, onExit, onDone }) {
  const queue = items.map((it) => ({ ...it, retry: false }));
  let pos = 0, graded = 0, correct = 0, finished = false;
  let primary = null;       // the button Enter should press
  let canAdvance = false;   // true once Continue is on screen
  let pendingRead = false;  // concept card: its spike fires on the way out
  let advancing = false;

  const ac = new AbortController();
  const { signal } = ac;
  onLeave(() => ac.abort());
  // Tells the updater not to reload mid-lesson (see app.js).
  document.body.dataset.inSession = '1';
  signal.addEventListener('abort', () => delete document.body.dataset.inSession);
  document.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowLeft' && canAdvance && !(e.target instanceof HTMLTextAreaElement)) {
      e.preventDefault();
      advance();
    } else if (e.key === 'Enter' && primary && !(e.target instanceof HTMLTextAreaElement) && !(e.target instanceof HTMLButtonElement)) {
      e.preventDefault();
      primary.click();
    }
  }, { signal });

  const traceHost = h('div', { class: 'trace-host' });
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
      traceHost),
    stage, dock);
  root.replaceChildren(shell);
  shell.setAttribute('style', trackStyle(queue[0].color));
  const trace = createTrace(traceHost, signal);

  function setDock(...kids) {
    dock.className = 'dock';
    dock.replaceChildren(...kids);
  }

  function showStep() {
    const item = queue[pos];
    shell.setAttribute('style', trackStyle(item.color));
    trace.refreshColors();
    trace.setTotal(queue.length, pos + 1);
    const ctl = createStep(item.step, { autoCheck: () => check(ctl, item) });
    stage.replaceChildren(h('div', { class: 'stage-inner' }, ctl.el));
    stage.scrollTop = 0;
    stage.className = 'stage fire-in';
    stage.style.removeProperty('--dx');

    if (!ctl.interactive) {
      pendingRead = true;
      canAdvance = true;
      primary = h('button', { class: 'btn', onclick: advance }, 'Continue');
      setDock(primary, swipeHint());
    } else {
      canAdvance = false;
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
    trace.setTotal(queue.length, pos + 1);
    trace.push(ok ? 'ok' : 'miss');
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
    primary = h('button', { class: `btn ${r.ok ? 'ok' : 'bad'}`, onclick: advance }, 'Continue');
    canAdvance = true;
    sheet(r.ok ? 'good' : 'miss', h('p', { class: 'verdict' }, icon(r.ok ? 'check' : 'x'), verdict), body, primary, swipeHint());
  }

  function selfGrade(item, r) {
    const s = item.step;
    const choose = (ok) => { grade(item, ok); advance(); };
    primary = null;
    canAdvance = false;
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
    dock.querySelector('.verdict')?.setAttribute('tabindex', '-1');
    dock.querySelector('.verdict')?.focus({ preventScroll: true });
  }

  function swipeHint() {
    return h('p', { class: 'swipe', 'aria-hidden': 'true' }, h('span', { class: 'nudge' }, '←'), h('span', { class: 'swipe-text' }, ' Swipe left to continue'));
  }

  // ---- Charge and fire: drag left to charge the neuron, past threshold fires.
  let drag = null;
  const fireDistance = () => shell.clientWidth * FIRE_AT;

  shell.addEventListener('pointerdown', (e) => {
    if (advancing || e.button > 0 || e.target.closest('.player-top, textarea')) return;
    drag = { id: e.pointerId, x: e.clientX, y: e.clientY, dx: 0, active: false };
  }, { signal });

  shell.addEventListener('pointermove', (e) => {
    if (!drag || e.pointerId !== drag.id) return;
    const dx = e.clientX - drag.x, dy = e.clientY - drag.y;
    if (!drag.active) {
      if (Math.abs(dy) > 14 && Math.abs(dy) > Math.abs(dx)) { drag = null; return; } // a scroll
      if (Math.abs(dx) < 12) return;
      if (!canAdvance) {
        if (dx < -40) { answerFirst(); drag = null; }
        return;
      }
      drag.active = true;
      shell.setPointerCapture(e.pointerId);
      stage.className = 'stage dragging';
    }
    drag.dx = dx < 0 ? dx : dx * 0.15;
    const p = -drag.dx / fireDistance();
    stage.style.transform = `translateX(${drag.dx * 0.5}px)`;
    trace.setCharge(p);
    const armed = p >= 1;
    if (armed !== dock.classList.contains('armed')) {
      dock.classList.toggle('armed', armed);
      const t = dock.querySelector('.swipe-text');
      if (t) t.textContent = armed ? ' Release to fire' : ' Swipe left to continue';
    }
  }, { signal });

  const endDrag = () => {
    const d = drag;
    drag = null;
    if (!d?.active) return;
    if (-d.dx >= fireDistance()) return advance(d.dx * 0.5);
    stage.className = 'stage spring';
    stage.style.transform = '';
    trace.setCharge(0);
    dock.classList.remove('armed');
    const t = dock.querySelector('.swipe-text');
    if (t) t.textContent = ' Swipe left to continue';
  };
  shell.addEventListener('pointerup', endDrag, { signal });
  shell.addEventListener('pointercancel', endDrag, { signal });

  function answerFirst() {
    stage.className = 'stage';
    void stage.offsetWidth;
    stage.className = 'stage shake';
    const hint = dock.querySelector('.hint-msg');
    if (hint) { hint.textContent = 'Answer first, then swipe'; hint.hidden = false; }
  }

  function advance(fromX = 0) {
    if (advancing || !canAdvance && !pendingRead && primary) return;
    advancing = true;
    canAdvance = false;
    if (pendingRead) { pendingRead = false; trace.push('read'); }
    trace.fire();
    stage.style.transform = '';
    stage.style.setProperty('--dx', `${fromX}px`);
    stage.className = 'stage fire-out';
    dock.classList.add('leaving');
    let done = false;
    const go = () => { if (done) return; done = true; advancing = false; next(); };
    stage.addEventListener('animationend', go, { once: true });
    setTimeout(go, 600); // in case the animation never runs
  }

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
