import { useState } from 'react';
import { findOrder } from '../services/api';
import { formatPrice } from '../../shared/rules';

// Orders contain names and addresses, so there is no public list: look one up by code + email.
export default function Orders() {
  const [code, setCode] = useState('');
  const [email, setEmail] = useState('');
  const [order, setOrder] = useState(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async (ev) => {
    ev.preventDefault();
    setBusy(true); setError(''); setOrder(null);
    try {
      setOrder(await findOrder(code.trim().toUpperCase(), email.trim()));
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <h1>Find your order</h1>
      <form onSubmit={submit} className="cart" style={{ gridTemplateColumns: '1fr' }}>
        <label className="field"><span>Order code</span>
          <input value={code} onChange={(e) => setCode(e.target.value)} placeholder="ORD-XXXXXXXX" required /></label>
        <label className="field"><span>Email used at checkout</span>
          <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required /></label>
        <button type="submit" disabled={busy}>{busy ? 'Searching…' : 'Find order'}</button>
      </form>
      {error && <p className="error">{error}</p>}
      {order && (
        <div className="order">
          <div className="order-head">
            <strong>{order.id}</strong>
            <span className="muted">{new Date(order.createdAt).toLocaleString()}</span>
            <strong>{formatPrice(order.total)}</strong>
          </div>
          <ul>{order.items.map((i) => <li key={i.id}>{i.image} {i.name} × {i.qty}</li>)}</ul>
        </div>
      )}
    </>
  );
}
