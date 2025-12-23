/**
 * authFetch - helper to attach Firebase ID token for protected requests.
 * Usage:
 *   import { authFetch } from '../utils/authFetch.js';
 *   await authFetch('/query', { method: 'POST', body: JSON.stringify({...}) });
 */
export async function authFetch(url, opts = {}) {
  const headers = Object.assign({}, opts.headers || {});

  try {
    if (typeof window !== 'undefined' && window.firebaseAuth && window.firebaseAuth.currentUser) {
      const token = await window.firebaseAuth.currentUser.getIdToken();
      if (token) headers['Authorization'] = `Bearer ${token}`;
    }
  } catch (err) {
    // ignore token attach errors; backend will respond 401 if needed
    console.warn('authFetch: could not attach token', err && err.message ? err.message : err);
  }

  if (!headers['Content-Type']) headers['Content-Type'] = 'application/json';

  // If url is absolute, use it as-is; otherwise prefix with backend base if present
  const isAbsolute = /^https?:\/\//i.test(url);
  const base = (typeof window !== 'undefined' && window.__BACKEND_API_URL__) ? window.__BACKEND_API_URL__ : '';
  const finalUrl = isAbsolute ? url : (base ? `${base}${url}` : url);

  const res = await fetch(finalUrl, { ...opts, headers });
  return res;
}


