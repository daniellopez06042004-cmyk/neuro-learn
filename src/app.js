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

route('/', renderHome);
route('/unit/:id', renderUnit);
route('/lesson/:id', renderLesson);
route('/review', renderReview);
route('/settings', renderSettings);
route('/errors', renderErrors);
route('/circuit', renderCircuitView);
fallback(() => go('/', { replace: true }));

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
} catch (e) {
  renderFatal(document.getElementById('app'), e.message);
}
