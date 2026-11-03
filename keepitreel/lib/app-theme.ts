import { normalizeTheme } from './model';
import { readState, subscribe } from './store';
import { applyTheme, darkMediaQuery } from './theme';

// Synchronous cache avoids painting the opposite theme while Chrome storage loads.
// Chrome storage remains the source of truth and keeps open extension pages in sync.
const cacheKey = 'keepitreel-theme';
let preference = normalizeTheme(undefined);
try { preference = normalizeTheme(localStorage.getItem(cacheKey)); } catch { /* Storage may be unavailable. */ }
const paint = () => applyTheme(document.documentElement, preference);
paint();
let changes = 0;
const update = (value: unknown) => {
  preference = normalizeTheme(value);
  try { localStorage.setItem(cacheKey, preference); } catch { /* Theme still works without the cache. */ }
  paint();
};
subscribe(state => { changes++; update(state.settings.theme); });
void readState().then(state => { if (!changes) update(state.settings.theme); }).catch(() => undefined);
matchMedia(darkMediaQuery).addEventListener('change', paint);
