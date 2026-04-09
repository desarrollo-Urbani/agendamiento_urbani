const BASE_URL = (import.meta.env.VITE_API_URL || 'http://localhost:3100').replace(/\/$/, '');

export async function api(path, options = {}) {
  const res = await fetch(`${BASE_URL}${path}`, {
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...(options.headers || {})
    },
    ...options
  });

  let body = null;
  try {
    body = await res.json();
  } catch (_error) {
    if (!res.ok) {
      throw new Error(`Request failed with status ${res.status}`);
    }
    return null;
  }

  if (!res.ok) {
    const err = new Error(body.error || body.message || 'API error');
    err.status = res.status;
    err.code = body.code;
    throw err;
  }

  return body;
}
