import { useState } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { useCart } from '../context/CartContext';
import { placeOrder } from '../services/api';
import { formatPrice, shippingFor, validateCustomer } from '../../shared/rules';

const EMPTY = { name: '', email: '', address: '', city: '', zip: '' };

export default function Checkout() {
  const { items, subtotal, clearCart } = useCart();
  const [form, setForm] = useState(EMPTY);
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [order, setOrder] = useState(null);
  const [submitError, setSubmitError] = useState('');

  if (order) {
    return (
      <div className="empty">
        <h2>🎉 Thank you, {order.customer.name}!</h2>
        <p>Your order <strong>{order.id}</strong> has been placed.</p>
        <p className="muted small">Keep this code. You will need it with your email to look the order up.</p>
        <p className="muted">Total paid: {formatPrice(order.total)}</p>
        <div className="row center">
          <Link to="/orders" className="button">Find an order</Link>
          <Link to="/" className="button secondary">Keep shopping</Link>
        </div>
      </div>
    );
  }

  if (items.length === 0) return <Navigate to="/cart" replace />;

  const shipping = shippingFor(subtotal);
  const total = subtotal + shipping;

  const handleSubmit = async (ev) => {
    ev.preventDefault();
    const e = validateCustomer(form);
    setErrors(e);
    setSubmitError('');
    if (Object.keys(e).length) return;
    setSubmitting(true);
    try {
      const placed = await placeOrder({ items, customer: form });
      clearCart();
      setOrder(placed);
    } catch (err) {
      setErrors(err.fields ?? {});
      setSubmitError(err.message);
      setSubmitting(false);
    }
  };

  const field = (name, label, type = 'text') => (
    <label className="field">
      <span>{label}</span>
      <input
        type={type}
        value={form[name]}
        onChange={(e) => setForm({ ...form, [name]: e.target.value })}
      />
      {errors[name] && <small className="error">{errors[name]}</small>}
    </label>
  );

  return (
    <div className="cart">
      <form onSubmit={handleSubmit} noValidate>
        <h1>Checkout</h1>
        {field('name', 'Full name')}
        {field('email', 'Email', 'email')}
        {field('address', 'Street address')}
        <div className="row">
          {field('city', 'City')}
          {field('zip', 'Postal code')}
        </div>
        <p className="muted small">This is a demo. No payment is taken.</p>
        {submitError && <p className="error">{submitError}</p>}
        <button type="submit" disabled={submitting}>
          {submitting ? 'Placing order…' : `Place order · ${formatPrice(total)}`}
        </button>
      </form>
      <aside className="summary">
        <h2>Order summary</h2>
        {items.map((i) => (
          <div key={i.id} className="summary-row">
            <span>{i.image} {i.name} × {i.qty}</span>
            <span>{formatPrice(i.qty * i.price)}</span>
          </div>
        ))}
        <div className="summary-row"><span>Shipping</span><span>{shipping ? formatPrice(shipping) : 'Free'}</span></div>
        <div className="summary-row total"><span>Total</span><span>{formatPrice(total)}</span></div>
      </aside>
    </div>
  );
}
