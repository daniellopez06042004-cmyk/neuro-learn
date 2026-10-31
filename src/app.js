import { loadContent, content } from './content.js';
import { isDev } from './ui.js';
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
fallback(() => go('/', { replace: true }));

// Glossary terms ([[term]] in lesson text) open a definition sheet anywhere.
document.addEventListener('click', (e) => {
  const term = e.target.closest('.term');
  if (term) { e.preventDefault(); showTerm(term.dataset.term, term); }
});

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
