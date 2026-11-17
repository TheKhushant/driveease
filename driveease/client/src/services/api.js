import axios from 'axios';

const TOKEN_KEY = 'driveease_admin_token';

export const tokenStore = {
  get: () => {
    try {
      return localStorage.getItem(TOKEN_KEY);
    } catch {
      return null;
    }
  },
  set: (t) => {
    try {
      localStorage.setItem(TOKEN_KEY, t);
    } catch {
      /* storage unavailable */
    }
  },
  clear: () => {
    try {
      localStorage.removeItem(TOKEN_KEY);
    } catch {
      /* storage unavailable */
    }
  },
};

export const api = axios.create({
  baseURL: (import.meta.env.VITE_API_URL || '/api').replace(/\/$/, ''),
  timeout: 30000,
});

api.interceptors.request.use((config) => {
  const token = tokenStore.get();
  if (token && (config.url.startsWith('/admin') || config.url.startsWith('/auth'))) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (res) => res,
  (err) => {
    const status = err.response?.status;
    const url = err.config?.url || '';
    if (status === 401 && url.startsWith('/admin')) {
      tokenStore.clear();
      window.dispatchEvent(new Event('driveease:unauthorized'));
    }
    return Promise.reject(err);
  },
);

/** Human-readable message from an axios error. */
export function errorMessage(err, fallback = 'Something went wrong') {
  const data = err?.response?.data;
  if (!err?.response) return 'Cannot reach the server. Check your connection and try again.';
  if (Array.isArray(data?.details) && data.details.length) {
    const d = data.details[0];
    const text = typeof d === 'string' ? d : `${d.message}`;
    return data.message && data.message !== 'Validation failed' ? `${data.message}: ${text}` : text;
  }
  return data?.message || fallback;
}

/** Field errors keyed by field name (for react-hook-form setError). */
export const fieldErrors = (err) =>
  Object.fromEntries((err?.response?.data?.details || []).filter((d) => d.field).map((d) => [d.field, d.message]));

/** Unwraps { success, data } responses. */
export const unwrap = (p) => p.then((r) => r.data.data);

export const get = (url, params) => unwrap(api.get(url, { params }));
export const post = (url, body) => unwrap(api.post(url, body));
export const put = (url, body) => unwrap(api.put(url, body));
export const patch = (url, body) => unwrap(api.patch(url, body));
export const del = (url) => unwrap(api.delete(url));
