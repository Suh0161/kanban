const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:3001/api/v1';

export function getApiBase() {
  return API_BASE;
}

function getToken() {
  return localStorage.getItem('jokel-token');
}

export async function apiFetch(path, options = {}) {
  const url = `${API_BASE}${path}`;
  const headers = {
    'Content-Type': 'application/json',
    ...options.headers,
  };
  const token = getToken();
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const res = await fetch(url, { ...options, headers });

  if (res.status === 401) {
    throw new Error('Unauthorized');
  }

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || `HTTP ${res.status}`);
  }

  if (res.status === 204) {
    return null;
  }

  return res.json();
}

export function apiGet(path) {
  return apiFetch(path, { method: 'GET' });
}

export async function apiGetList(url, params = {}) {
  const query = new URLSearchParams(params).toString();
  const fullUrl = query ? `${url}?${query}` : url;
  return apiFetch(fullUrl, { method: 'GET' });
}

export async function apiGetBoard(workspaceId, params = {}) {
  const query = new URLSearchParams();
  if (params.search) query.set('search', params.search);
  if (params.priority) query.set('priority', params.priority);
  if (params.tags && params.tags.length > 0) query.set('tags', params.tags.join(','));
  const qs = query.toString();
  const url = `/board/${workspaceId}${qs ? `?${qs}` : ''}`;
  return apiFetch(url, { method: 'GET' });
}

export function apiPost(path, body) {
  return apiFetch(path, { method: 'POST', body: JSON.stringify(body) });
}

export function apiPatch(path, body) {
  return apiFetch(path, { method: 'PATCH', body: JSON.stringify(body) });
}

export function apiDelete(path) {
  return apiFetch(path, { method: 'DELETE' });
}
