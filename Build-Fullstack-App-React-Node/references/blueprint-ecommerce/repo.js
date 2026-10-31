// All database queries. Numeric columns are cast to float8 so they
// arrive in JavaScript as numbers rather than strings.
import { randomUUID } from 'node:crypto';
import { pool, withTransaction } from './db.js';
import { roundMoney, shippingFor } from '../shared/rules.js';

export async function ping() {
  await pool.query('SELECT 1');
}

const PRODUCT_COLUMNS = `id, name, category, price::float8 AS price, rating::float8 AS rating,
  stock, image, description`;

export async function listProducts() {
  const { rows } = await pool.query(`SELECT ${PRODUCT_COLUMNS} FROM products ORDER BY position, id`);
  return rows;
}

export async function getProduct(id) {
  const { rows } = await pool.query(`SELECT ${PRODUCT_COLUMNS} FROM products WHERE id = $1`, [id]);
  return rows[0] ?? null;
}

// Customers look up an order with its code AND the email used to place it.
export async function findOrder(id, email) {
  const { rows } = await pool.query(`
    SELECT o.id, o.created_at AS "createdAt",
           json_build_object('name', o.name, 'email', o.email, 'address', o.address,
                             'city', o.city, 'zip', o.zip) AS customer,
           o.subtotal::float8 AS subtotal, o.shipping::float8 AS shipping, o.total::float8 AS total,
           json_agg(json_build_object('id', i.product_id, 'name', i.name, 'image', i.image,
                                      'price', i.price::float8, 'qty', i.qty)
                    ORDER BY i.name) AS items
    FROM orders o
    JOIN order_items i ON i.order_id = o.id
    WHERE o.id = $1 AND lower(o.email) = lower($2)
    GROUP BY o.id`, [id, email]);
  return rows[0] ?? null;
}

class OrderError extends Error {
  status = 400;
}

// items: [{ id, qty }] (already shape-checked); customer: validated and trimmed.
export function createOrder(items, customer) {
  // Merge duplicate lines so each product appears once.
  const wanted = new Map();
  for (const { id, qty } of items) wanted.set(id, (wanted.get(id) ?? 0) + qty);
  const ids = [...wanted.keys()].sort();

  return withTransaction(async (db) => {
    // Lock the rows (in a fixed order, to avoid deadlocks) so two orders
    // can't both buy the last item.
    const { rows: products } = await db.query(
      `SELECT id, name, image, price::float8 AS price, stock
       FROM products WHERE id = ANY($1) ORDER BY id FOR UPDATE`,
      [ids]
    );

    const lines = ids.map((id) => {
      const product = products.find((p) => p.id === id);
      if (!product) throw new OrderError(`Unknown product: ${id}`);
      const qty = wanted.get(id);
      if (qty > product.stock) {
        throw new OrderError(
          product.stock === 0
            ? `${product.name} is out of stock`
            : `Only ${product.stock} of ${product.name} left in stock`
        );
      }
      return { id, name: product.name, image: product.image, price: product.price, qty };
    });

    const subtotal = roundMoney(lines.reduce((s, l) => s + l.price * l.qty, 0));
    const shipping = shippingFor(subtotal);
    const total = roundMoney(subtotal + shipping);
    const id = 'ORD-' + randomUUID().slice(0, 8).toUpperCase();

    const { rows: [{ createdAt }] } = await db.query(
      `INSERT INTO orders (id, name, email, address, city, zip, subtotal, shipping, total)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       RETURNING created_at AS "createdAt"`,
      [id, customer.name, customer.email, customer.address, customer.city, customer.zip,
       subtotal, shipping, total]
    );

    for (const l of lines) {
      await db.query(
        `INSERT INTO order_items (order_id, product_id, name, image, price, qty)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [id, l.id, l.name, l.image, l.price, l.qty]
      );
      await db.query('UPDATE products SET stock = stock - $2 WHERE id = $1', [l.id, l.qty]);
    }

    return { id, createdAt, items: lines, customer, subtotal, shipping, total };
  });
}
