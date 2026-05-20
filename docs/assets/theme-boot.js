/**
 * FOUC-prevention theme boot — runs before first paint.
 * Keep in sync with docs/assets/docs.js (STORAGE_KEY, theme colors).
 */
(function () {
  try {
    var t = localStorage.getItem('elevate-docs-theme');
    if (t === 'light' || t === 'dark') {
      document.documentElement.setAttribute('data-theme', t);
      document.documentElement.style.colorScheme = t;
      var meta = document.querySelector('meta[name="theme-color"]');
      if (meta) meta.setAttribute('content', t === 'light' ? '#ffffff' : '#000000');
    }
  } catch (_) {}
})();
