// The ONLY place the browser talks to the server.
async function request(path, options) {
  const res = await fetch('/api' + path, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    const err = new Error(body.error || `Request failed (${res.status})`);
    err.status = res.status;
    err.fields = body.fields; // per-field validation messages from the server
    throw err;
  }
  return body;
}

export const getResources = () => request('/resources');

export const getResource = (id) =>
  request(`/resources/${encodeURIComponent(id)}`).catch((err) => {
    if (err.status === 404) return null;
    throw err;
  });
