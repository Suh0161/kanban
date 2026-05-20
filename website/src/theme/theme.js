/** localStorage key — must match public/theme-boot.js. */
export const THEME_STORAGE_KEY = 'elevate-website-theme';

const THEMES = ['dark', 'light'];

const THEME_COLORS = {
  dark: '#000000',
  light: '#ffffff',
};

export function getTheme() {
  try {
    const stored = localStorage.getItem(THEME_STORAGE_KEY);
    if (stored === 'light' || stored === 'dark') return stored;
  } catch {
    /* private mode / blocked storage */
  }
  return 'dark';
}

function updateThemeColorMeta(theme) {
  const content = THEME_COLORS[theme] ?? THEME_COLORS.dark;
  let meta = document.querySelector('meta[name="theme-color"]');
  if (!meta) {
    meta = document.createElement('meta');
    meta.setAttribute('name', 'theme-color');
    document.head.appendChild(meta);
  }
  meta.setAttribute('content', content);
}

/** Apply theme to DOM (attribute, color-scheme, meta). Does not write localStorage. */
export function applyTheme(theme) {
  const resolved = THEMES.includes(theme) ? theme : 'dark';
  document.documentElement.setAttribute('data-theme', resolved);
  document.documentElement.style.colorScheme = resolved;
  updateThemeColorMeta(resolved);
  return resolved;
}

/** Persist and apply theme. */
export function setTheme(theme) {
  const resolved = applyTheme(theme);
  try {
    localStorage.setItem(THEME_STORAGE_KEY, resolved);
  } catch {
    /* ignore */
  }
  return resolved;
}
