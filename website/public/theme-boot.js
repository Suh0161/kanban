/**
 * FOUC-prevention theme boot — runs before first paint.
 * Keep in sync with src/theme/theme.js (THEME_STORAGE_KEY, THEME_COLORS).
 */
(function () {
  try {
    var t = localStorage.getItem('elevate-website-theme');
    if (t === 'light' || t === 'dark') {
      document.documentElement.setAttribute('data-theme', t);
      document.documentElement.style.colorScheme = t;
      var meta = document.querySelector('meta[name="theme-color"]');
      if (meta) meta.setAttribute('content', t === 'light' ? '#ffffff' : '#000000');
    }
  } catch (_) {}
})();
