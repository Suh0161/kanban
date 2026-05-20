/**
 * Theme bootstrap for the Elevate marketing site.
 *
 * How it works:
 * 1. public/theme-boot.js runs before first paint, reads localStorage key
 *    `elevate-website-theme`, and sets `data-theme`, `color-scheme`, and
 *    `<meta name="theme-color">` to prevent a flash of the wrong theme.
 * 2. main.jsx calls initTheme() before React render to re-sync the DOM
 *    (covers private-mode / blocked storage where theme-boot.js may no-op).
 * 3. Navbar toggle uses useTheme() → setTheme() in theme.js, which writes the
 *    same localStorage key and updates the DOM + meta tag.
 *
 * CSS tokens: variables.css (:root dark defaults, [data-theme='light'] overrides).
 * Default when nothing is stored: dark.
 */
import { applyTheme, getTheme } from './theme.js';

/** Run once before React render to sync DOM with stored preference. */
export function initTheme() {
  applyTheme(getTheme());
}
