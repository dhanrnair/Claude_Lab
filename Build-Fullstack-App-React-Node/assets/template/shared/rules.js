// Rules used by BOTH the browser and the server so they always agree.
// Keep this file free of Node-only and browser-only APIs.
export const formatPrice = (n) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(n);

export const roundMoney = (n) => Math.round(n * 100) / 100;

// Returns { field: 'message' } for every invalid field; {} when valid.
export function validateContact(c = {}) {
  const str = (v) => (typeof v === 'string' ? v.trim() : '');
  const e = {};
  if (!str(c.name)) e.name = 'Name is required';
  if (!/^\S+@\S+\.\S+$/.test(str(c.email))) e.email = 'Enter a valid email';
  return e;
}
