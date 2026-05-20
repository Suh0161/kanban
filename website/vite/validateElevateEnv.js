const REQUIRED_KEYS = ['VITE_SITE_URL', 'VITE_APP_URL', 'VITE_DOCS_URL'];

function isAllowedUrl(value, allowLocalHttp) {
  let url;
  try {
    url = new URL(value);
  } catch {
    return false;
  }
  if (url.protocol === 'https:') return true;
  if (allowLocalHttp && url.protocol === 'http:' && url.hostname === 'localhost') {
    return true;
  }
  return false;
}

/**
 * Fail fast when marketing-site URL env vars are missing or unsafe.
 * Production builds require all three https origins.
 * Dev allows http://localhost and omits unset vars (runtime fallbacks in urls.js).
 */
export function validateElevateEnv(env, { command, mode }) {
  const isDev = mode === 'development';
  const requireAll = command === 'build' && mode === 'production';
  const errors = [];

  for (const key of REQUIRED_KEYS) {
    const value = env[key]?.trim();

    if (!value) {
      if (requireAll) {
        errors.push(`${key} is required for production builds (see .env.example)`);
      }
      continue;
    }

    if (!isAllowedUrl(value, isDev)) {
      const hint = isDev
        ? 'use https:// or http://localhost in development'
        : 'use https:// in production builds';
      errors.push(`${key} must ${hint} (got "${value}")`);
    }
  }

  if (errors.length) {
    throw new Error(`Invalid Elevate website environment:\n${errors.map((e) => `  - ${e}`).join('\n')}`);
  }
}
