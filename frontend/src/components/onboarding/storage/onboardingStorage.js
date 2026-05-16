const PREFIX = 'jokel-onboarding-done';

export function getOnboardingKey(user) {
  const id = user?.email || user?.name || '';
  return id ? `${PREFIX}:${id}` : PREFIX;
}

export function isOnboardingComplete(user) {
  try {
    return localStorage.getItem(getOnboardingKey(user)) === '1';
  } catch {
    return false;
  }
}

export function setOnboardingComplete(user) {
  try {
    localStorage.setItem(getOnboardingKey(user), '1');
  } catch {
    /* ignore quota */
  }
}

export function clearOnboardingComplete(user) {
  try {
    localStorage.removeItem(getOnboardingKey(user));
  } catch {
    /* ignore */
  }
}
