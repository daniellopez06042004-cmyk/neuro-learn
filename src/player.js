// Focus-mode player: one step per screen, the lesson's membrane potential on
// top, and a feedback sheet after each answer. Used for lessons and review.
// To move on, swipe left: dragging charges the next EPSP, and releasing past
// the line lands it. The last one reaches threshold and the neuron fires.

import { h, md, inline, icon, flagBadge, trackStyle } from './ui.js';
import { createStep, pickVariant } from './steps.js';
import { createScene } from './themes.js';
import { light, fire } from './haptics.js';
import { sounds } from './sound.js';
import { progress } from './progress.js';
import { onLeave } from './router.js';
import { renderCircuit } from './circuit.js';

const PRAISE = ['Correct', 'Nice', 'Exactly', 'Spot on'];
const FIRE_AT = 0.33; // drag this fraction of the screen width to fire

/**
 * items: [{ key: "lessonId:stepId", step, color }]
 * mode:  'lesson' re-asks a missed question once at the end; 'review' and 'quiz' don't.
 * theme: which progress scene sits on top (themes.js); 'ap' is the membrane potential.
 */
export function runSession(root, { items, mode, theme = 'ap', onExit, onDone }) {
  const queue = items.map((it) => ({ ...it, retry: false }));
  let pos = 0, graded = 0, correct = 0, misses = 0, finished = false;
  let primary = null;       // the button Enter should press
  let canAdvance = false;   // true once Continue is on screen
  let pendingRead = false;  // concept card: nothing to answer before swiping
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
    } else if (e.key === 'Enter' && primary && !(e.target instanceof HTMLTextAreaElement) && !(e.target instanceof HTMLButtonElement) && !e.target.closest?.('.term')) {
      e.preventDefault();
      primary.click();
    }
  }, { signal });

  const traceHost = h('div', { class: 'trace-host' });
  let stage = h('div', { class: 'stage' }); // replaced by a fresh one on each step (see advance)
  const dock = h('div', { class: 'dock' });
  const shell = h('div', { class: 'player' },
    h('div', { class: 'player-top' },
      h('button', {
        class: 'icon-btn', 'aria-label': { review: 'End review', quiz: 'Leave quiz' }[mode] || 'Quit lesson',
        onclick: () => {
          const ask = { review: 'End this review? Answers so far are saved.', quiz: 'Leave the quiz? Answers so far are saved; finish it later this week.' }[mode] || "Quit this lesson? You'll need to restart it to finish.";
          if (pos > 0 && !finished && !confirm(ask)) return;
          ac.abort();
          onExit();
        },
      }, icon('x')),
      traceHost),
    stage, dock);
  root.replaceChildren(shell);
  shell.setAttribute('style', trackStyle(queue[0].color));
  const trace = createScene(theme, traceHost, signal);

  function setDock(...kids) {
    dock.className = 'dock';
    dock.replaceChildren(...kids);
  }

  function showStep() {
    const item = queue[pos];
    shell.setAttribute('style', trackStyle(item.color));
    trace.refreshColors();
    trace.layout(queue.length, misses, pos + 1);
    // Which version of the question to show (see pickVariant): the base the
    // first time, a different one on a retry or in review.
    const picked = pickVariant(item.step, item.avoid);
    item.shown = picked.index;
    item.current = picked.step;
    const ctl = createStep(item.current, { autoCheck: () => check(ctl, item) });
    // In a question, glossary terms stay inert until it's answered, so a
    // definition can't give the answer away (app.js checks this attribute).
    stage.replaceChildren(h('div', { class: 'stage-inner', 'data-terms-locked': ctl.interactive ? '' : null }, ctl.el));
    stage.scrollTop = 0;
    stage.className = 'stage fire-in';
    stage.style.removeProperty('--dx');
    // Options arrive one after another (styles.css staggers them by --i).
    stage.querySelectorAll('.choice, .tile').forEach((el, i) => el.style.setProperty('--i', Math.min(i, 8)));
    // After the entrance, tiles re-drawn by a tap (order, label) shouldn't fade in again.
    const entering = stage;
    setTimeout(() => entering.classList.remove('fire-in'), 650);

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
    stage.querySelector('[data-terms-locked]')?.removeAttribute('data-terms-locked');
    if (r.selfGrade) return selfGrade(item, r);
    grade(item, r.ok);
    feedback(item, r);
  }

  // The potential sits at (steps done / steps in the lesson).
  const level = (n = pos) => n / queue.length;

  function grade(item, ok) {
    const before = level();
    if (!item.retry) {
      graded++;
      if (ok) correct++;
      // Quiz questions only join review when you miss them.
      if (!ok || mode !== 'quiz') progress.recordAnswer(item.key, ok, item.shown);
      if (!ok && mode === 'lesson') queue.push({ ...item, retry: true, avoid: item.shown });
    }
    (ok ? sounds.right : sounds.wrong)();
    if (!ok) {
      // An IPSP: the potential dips, and a re-queued question moves threshold further away.
      misses++;
      trace.layout(queue.length, misses, pos + 1);
      trace.ipsp(before, level());
    }
  }

  function feedback(item, r) {
    const s = item.current;
    const isPredict = s.type === 'predict';
    const verdict = r.ok
      ? (isPredict ? 'Good prediction' : PRAISE[Math.floor(Math.random() * PRAISE.length)])
      : (isPredict ? "That's not what happens" : 'Not quite');
    const body = h('div', { class: 'body' },
      !r.ok && r.answerText ? h('p', { class: 'answer' }, h('span', { class: 'sr-only' }, 'Correct answer: '), ...r.answerText.split('\n').flatMap((l, i) => (i ? [h('br'), inline(l)] : [inline(l)]))) : null,
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
    const s = item.current;
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
    trace.setCharge(p, level(), level(pos + 1));
    const armed = p >= 1;
    if (armed !== dock.classList.contains('armed')) {
      dock.classList.toggle('armed', armed);
      const t = dock.querySelector('.swipe-text');
      const lastStep = pos + 1 >= queue.length;
      if (t) t.textContent = !armed ? ' Swipe left to continue' : lastStep ? ' Release to fire' : ' Release to continue';
      if (armed) light();
    }
  }, { signal });

  const endDrag = () => {
    const d = drag;
    drag = null;
    if (!d?.active) return;
    if (-d.dx >= fireDistance()) return advance(d.dx * 0.5);
    stage.className = 'stage spring';
    stage.style.transform = '';
    trace.setCharge(0, level(), level(pos + 1));
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
    pendingRead = false;
    trace.epsp(level(), level(pos + 1));
    if (pos + 1 >= queue.length) return finale();
    light();
    sounds.epsp();
    stage.style.transform = '';
    // The old step slides out on top while the next one comes in under it, so
    // there's no empty beat between them.
    const old = stage, scroll = old.scrollTop;
    const box = shell.getBoundingClientRect(), r = old.getBoundingClientRect();
    Object.assign(old.style, { left: `${r.left - box.left}px`, top: `${r.top - box.top}px`, width: `${r.width}px`, height: `${r.height}px` });
    old.style.setProperty('--dx', `${fromX}px`);
    old.className = 'stage stage-ghost fire-out';
    old.setAttribute('aria-hidden', 'true');
    old.inert = true;
    old.scrollTop = scroll;
    stage = h('div', { class: 'stage' });
    old.before(stage);
    const drop = () => old.remove();
    old.addEventListener('animationend', (e) => { if (e.target === old) drop(); });
    setTimeout(drop, 500); // in case the animation never runs
    dock.classList.add('leaving');
    setTimeout(() => { advancing = false; next(); }, 70);
  }

  // Last step: threshold reached. Expand the scope, fire, light up the screen.
  async function finale() {
    finished = true;
    stage.style.transform = '';
    shell.classList.add('firing');
    await trace.finale({
      onPeak: (at, [title, sub] = ['Threshold reached', 'The neuron fired']) => {
        fire();
        sounds.fire();
        const host = traceHost.getBoundingClientRect(), box = shell.getBoundingClientRect();
        const x = `${host.left - box.left + at.x}px`, y = `${host.top - box.top + at.y}px`;
        const fx = h('div', { class: 'fx', style: `--x:${x};--y:${y}`, 'aria-hidden': 'true' },
          h('div', { class: 'fx-flash' }), h('div', { class: 'fx-wave' }),
          h('div', { class: 'fx-ring' }), h('div', { class: 'fx-ring r2' }), h('div', { class: 'fx-ring r3' }));
        shell.append(fx, h('p', { class: 'fx-label', role: 'status' }, title, h('span', null, sub)));
        shell.classList.add('jolt');
      },
    });
    next();
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

// After a lesson or review: your circuit (with what you just grew), then stats.
function sourceList(sources) {
  if (!sources?.length) return null;
  return h('section', { class: 'sources' },
    h('h3', null, 'Sources'),
    h('ul', null, sources.map((s) => h('li', null,
      s.doi ? h('a', { href: `https://doi.org/${encodeURI(s.doi)}`, target: '_blank', rel: 'noopener' }, s.citation) : s.citation,
      s.note ? h('span', { class: 'note' }, s.note) : null))));
}

export function finishScreen(root, { color, title, stats, button, onContinue, highlightUnit, newLesson, sources, top }) {
  const { el, summary } = renderCircuit({ highlightUnit, newLesson });
  root.replaceChildren(h('div', { class: 'finish', style: trackStyle(color) },
    h('div', { class: 'center' },
      top,
      h('a', { class: 'circuit-link', href: '#/circuit', 'aria-label': 'Open your circuit' }, el),
      h('p', { class: 'circuit-caption' }, summary.complete
        ? 'Circuit complete. Every neuron is wired and myelinated.'
        : `${summary.wired} of ${summary.total} neurons wired · ${summary.myelinated} myelinated`),
      h('h2', { tabindex: '-1' }, title),
      h('div', { class: 'stats' }, stats.map(([k, v]) => h('div', { class: 'card' }, h('div', { class: 'v' }, v), h('div', { class: 'k' }, k)))),
      sourceList(sources)),
    h('button', { class: 'btn', onclick: onContinue }, button)));
  root.querySelector('h2').focus();
}
