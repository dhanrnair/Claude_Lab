// Creates tables and seeds missing products. Safe to run more than once.
import { readFile } from 'node:fs/promises';
import { pool, withTransaction } from '../db.js';
import { products } from '../db/seed.js';

const schema = await readFile(new URL('../db/schema.sql', import.meta.url), 'utf8');

await withTransaction(async (db) => {
  await db.query(schema);
  console.log('Tables ready');

  for (const [position, p] of products.entries()) {
    await db.query(
      `INSERT INTO products (id, name, category, price, rating, stock, image, description, position)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       ON CONFLICT (id) DO NOTHING`,
      [p.id, p.name, p.category, p.price, p.rating, p.stock, p.image, p.description, position]
    );
  }
  console.log(`Products seeded (${products.length} in catalog; existing rows left unchanged)`);
});

await pool.end();
console.log('Database setup complete');
