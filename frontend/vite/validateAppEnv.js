const REQUIRED_KEYS = ['VITE_API_BASE'];

function isAllowedApiBase(value, allowLocalHttp) {
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
 * Fail fast when app URL env vars are missing or unsafe.
 * Production builds require VITE_API_BASE with an https origin.
 * Dev allows http://localhost and omits unset vars (runtime fallback in client.js).
 */
export function validateAppEnv(env, { command, mode }) {
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

    if (!isAllowedApiBase(value, isDev)) {
      const hint = isDev
        ? 'use https:// or http://localhost in development'
        : 'use https:// in production builds';
      errors.push(`${key} must ${hint} (got "${value}")`);
    }
  }

  if (errors.length) {
    throw new Error(`Invalid Elevate app environment:\n${errors.map((e) => `  - ${e}`).join('\n')}`);
  }
}
