// Append to shared/rules.js (it already provides formatPrice, roundMoney, validateContact).

export const SHIPPING_THRESHOLD = 50;
export const SHIPPING_FEE = 4.99;

export const shippingFor = (subtotal) =>
  subtotal === 0 || subtotal >= SHIPPING_THRESHOLD ? 0 : SHIPPING_FEE;

export function validateCustomer(c = {}) {
  const str = (v) => (typeof v === 'string' ? v.trim() : '');
  const e = validateContact(c);
  if (!str(c.address)) e.address = 'Address is required';
  if (!str(c.city)) e.city = 'City is required';
  if (!/^\w{3,10}$/.test(str(c.zip))) e.zip = 'Enter a valid postal code';
  return e;
}
