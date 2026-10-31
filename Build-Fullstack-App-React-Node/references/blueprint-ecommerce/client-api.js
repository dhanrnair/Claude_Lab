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

// ---- shop ----
export const getProducts = () => request('/products');

export const getProduct = (id) =>
  request(`/products/${encodeURIComponent(id)}`).catch((err) => {
    if (err.status === 404) return null;
    throw err;
  });

export const placeOrder = ({ items, customer }) =>
  request('/orders', {
    method: 'POST',
    body: JSON.stringify({ items: items.map(({ id, qty }) => ({ id, qty })), customer }),
  });

export const findOrder = (id, email) =>
  request(`/orders/${encodeURIComponent(id)}?email=${encodeURIComponent(email)}`);

// The cart stays in the browser until there are user accounts.
const CART_KEY = 'shop.cart';
export function loadCart() {
  try { return JSON.parse(localStorage.getItem(CART_KEY)) ?? []; } catch { return []; }
}
export function saveCart(items) {
  localStorage.setItem(CART_KEY, JSON.stringify(items));
}
