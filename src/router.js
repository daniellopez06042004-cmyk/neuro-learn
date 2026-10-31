// Hash routes (#/unit/C1) so the app works from any folder, including a
// GitHub Pages sub-path, with no server configuration.

const routes = [];
let notFound = null;

export function route(pattern, view) {
  const keys = [];
  const re = new RegExp('^' + pattern.replace(/:(\w+)/g, (_, k) => (keys.push(k), '([^/]+)')) + '/?$');
  routes.push({ re, keys, view });
}
export function fallback(view) { notFound = view; }

export function go(path, { replace = false } = {}) {
  const hash = '#' + path;
  if (replace) history.replaceState(null, '', hash);
  else if (location.hash !== hash) { location.hash = hash; return; }
  render();
}

// Screens register cleanup (key listeners etc.) that runs when you navigate away.
let cleanups = [];
export function onLeave(fn) { cleanups.push(fn); }

export function render() {
  cleanups.forEach((fn) => fn());
  cleanups = [];
  const raw = location.hash.slice(1) || '/';
  const [path, query] = raw.split('?');
  const params = Object.fromEntries(new URLSearchParams(query || ''));
  const root = document.getElementById('app');
  for (const r of routes) {
    const m = r.re.exec(path);
    if (m) {
      r.keys.forEach((k, i) => (params[k] = decodeURIComponent(m[i + 1])));
      window.scrollTo(0, 0);
      r.view(root, params);
      return;
    }
  }
  notFound?.(root, params);
}

export function start() {
  window.addEventListener('hashchange', render);
  render();
}
