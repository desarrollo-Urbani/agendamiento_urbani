const BASE_URL = (import.meta.env.VITE_API_URL || '').replace(/\/$/, '');

export async function api(path, options = {}) {
  const res = await fetch(`${BASE_URL}${path}`, {
    headers: { 'Content-Type': 'application/json' },
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
    throw new Error(body.error || body.message || 'API error');
  }

  return body;
}
