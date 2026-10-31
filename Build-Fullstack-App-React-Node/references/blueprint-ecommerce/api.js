import express from 'express';
import { createOrder, findOrder, getProduct, listProducts, ping } from './repo.js';
import { validateCustomer } from '../shared/rules.js';

const router = express.Router();
router.use(express.json());

// Used by hosting platforms and deploy checks to confirm the app AND database are up.
router.get('/health', async (req, res) => {
  await ping();
  res.json({ ok: true });
});

router.get('/products', async (req, res) => {
  res.json(await listProducts());
});

router.get('/products/:id', async (req, res) => {
  const product = await getProduct(req.params.id);
  if (!product) return res.status(404).json({ error: 'Product not found' });
  res.json(product);
});

// No "list all orders" endpoint: it would expose everyone's name and address.
router.get('/orders/:id', async (req, res) => {
  const email = String(req.query.email ?? '');
  const order = email && (await findOrder(req.params.id, email));
  if (!order) return res.status(404).json({ error: 'No order found for that code and email' });
  res.json(order);
});

router.post('/orders', async (req, res) => {
  const { items, customer } = req.body ?? {};

  const errors = validateCustomer(customer);
  if (Object.keys(errors).length) {
    return res.status(400).json({ error: 'Please fix the highlighted fields', fields: errors });
  }
  if (!Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ error: 'Your cart is empty' });
  }
  if (!items.every((i) => typeof i?.id === 'string' && Number.isInteger(i.qty) && i.qty > 0)) {
    return res.status(400).json({ error: 'Invalid cart items' });
  }

  const order = await createOrder(items, {
    name: customer.name.trim(),
    email: customer.email.trim(),
    address: customer.address.trim(),
    city: customer.city.trim(),
    zip: customer.zip.trim(),
  });
  res.status(201).json(order);
});

router.use((req, res) => res.status(404).json({ error: 'Not found' }));

router.use((err, req, res, next) => {
  if (!err.status) console.error(err);
  res.status(err.status || 500).json({ error: err.status ? err.message : 'Something went wrong' });
});

export default router;
