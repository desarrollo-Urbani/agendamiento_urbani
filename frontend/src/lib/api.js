const BASE_URL = (import.meta.env.VITE_API_URL || 'http://localhost:3100').replace(/\/$/, '');

// Token de Supabase Auth que se inyecta automáticamente en cada request.
// Se actualiza desde AuthContext cuando la sesión cambia.
let _bearerToken = null;

export function setAuthToken(token) {
  _bearerToken = token || null;
}

export async function api(path, options = {}) {
  const headers = {
    'Content-Type': 'application/json',
    ...(options.headers || {})
  };
  if (_bearerToken && !headers['Authorization']) {
    headers['Authorization'] = `Bearer ${_bearerToken}`;
  }

  const res = await fetch(`${BASE_URL}${path}`, {
    credentials: 'include',
    ...options,
    headers
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
