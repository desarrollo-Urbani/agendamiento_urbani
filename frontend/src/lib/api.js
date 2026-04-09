const BASE_URL = (import.meta.env.VITE_API_URL || '').replace(/\/$/, '');
let cachedBaseUrl = BASE_URL;

function candidateBaseUrls() {
  const list = [];
  if (cachedBaseUrl) list.push(cachedBaseUrl);
  if (BASE_URL && !list.includes(BASE_URL)) list.push(BASE_URL);
  if (!BASE_URL || /localhost:3000$/i.test(BASE_URL)) {
    for (let p = 3000; p <= 3010; p += 1) {
      const candidate = `http://localhost:${p}`;
      if (!list.includes(candidate)) list.push(candidate);
    }
  }
  if (!list.length) list.push('');
  return list;
}

async function fetchWithFallback(path, options) {
  const bases = candidateBaseUrls();
  let lastError = null;

  for (const base of bases) {
    try {
      const res = await fetch(`${base}${path}`, options);
      if (res.ok || res.status !== 502) {
        cachedBaseUrl = base;
      }
      return res;
    } catch (error) {
      lastError = error;
    }
  }

  throw lastError || new Error('No se pudo conectar con la API');
}

export async function api(path, options = {}) {
  const res = await fetchWithFallback(path, {
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
