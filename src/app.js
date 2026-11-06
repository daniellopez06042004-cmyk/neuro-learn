import { loadContent, content, syncSlides } from './content.js';
import { isDev, setTermLookup } from './ui.js';
import { route, fallback, start, go } from './router.js';
import { renderHome } from './views/home.js';
import { renderUnit } from './views/unit.js';
import { renderLesson } from './views/lesson.js';
import { renderReview } from './views/review.js';
import { renderSettings } from './views/settings.js';
import { renderErrors, renderFatal } from './views/errors.js';
import { renderCircuitView } from './views/circuit.js';
import { renderStats } from './views/stats.js';
import { updateBadge } from './badge.js';
import { renderGlossary, showTerm } from './views/glossary.js';
import { renderPulse } from './views/pulse.js';
import { renderSlideBox } from './views/slidebox.js';
import { renderQuiz } from './views/quiz.js';
import { renderLibrary } from './views/library.js';
import { renderFigures } from './views/figures.js';

route('/', renderHome);
route('/unit/:id', renderUnit);
route('/lesson/:id', renderLesson);
route('/review', renderReview);
route('/settings', renderSettings);
route('/errors', renderErrors);
route('/circuit', renderCircuitView);
route('/progress', renderStats);
route('/glossary', renderGlossary);
route('/pulse', renderPulse);
route('/slides', renderSlideBox);
route('/quiz', renderQuiz);
route('/library', renderLibrary);
route('/figures', renderFigures);
fallback(() => go('/', { replace: true }));

// Glossary terms ([[term]] in lesson text) open a definition sheet anywhere,
// except in a question that hasn't been answered yet: there a tap on a term
// just counts as a tap on the answer around it.
const openTerm = (e) => {
  const term = e.target.closest('.term');
  if (!term || term.closest('[data-terms-locked]')) return;
  e.preventDefault();
  e.stopImmediatePropagation();
  showTerm(term.dataset.term, term);
};
document.addEventListener('click', openTerm);
document.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') openTerm(e); });

// Offline caching is off while developing so edits show up on reload.
// Add ?sw to the URL to test it locally anyway.
if ('serviceWorker' in navigator && (!isDev || location.search.includes('sw'))) {
  navigator.serviceWorker.register('./sw.js').then((reg) => {
    // Phones keep home-screen apps alive in the background, so look for a
    // new version every time the app comes back to the front.
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') reg.update().catch(() => {});
    });
  }).catch(() => {});

  // When a new version takes over, reload into it — right away, or as soon
  // as you finish the lesson or review you're in.
  let hadController = Boolean(navigator.serviceWorker.controller);
  let updateReady = false;
  const reloadIfIdle = () => {
    if (updateReady && !document.body.dataset.inSession) location.reload();
  };
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (!hadController) { hadController = true; return; } // first install, nothing to refresh
    updateReady = true;
    reloadIfIdle();
  });
  window.addEventListener('hashchange', reloadIfIdle);
}

try {
  await loadContent();
  syncSlides(); // units finished before the slide box existed earn their slides quietly
  setTermLookup((name) => content.glossary.has(name.toLowerCase()));
  for (const e of content.errors) console.error('[content]', e);
  // Fail loudly while developing: open straight to the list of problems.
  if (isDev && content.errors.length) history.replaceState(null, '', '#/errors');
  start();
  // Keep the icon's review count current as you study and as days roll over.
  updateBadge();
  window.addEventListener('hashchange', updateBadge);
  document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') updateBadge(); });
} catch (e) {
  renderFatal(document.getElementById('app'), e.message);
}
