// Creates tables and seeds missing rows. Safe to run more than once.
import { readFile } from 'node:fs/promises';
import { pool, withTransaction } from '../db.js';
import { resources } from '../db/seed.js';

const schema = await readFile(new URL('../db/schema.sql', import.meta.url), 'utf8');

await withTransaction(async (db) => {
  await db.query(schema);
  console.log('Tables ready');

  for (const [position, r] of resources.entries()) {
    await db.query(
      `INSERT INTO resources (id, name, category, description, image, position)
       VALUES ($1, $2, $3, $4, $5, $6)
       ON CONFLICT (id) DO NOTHING`,
      [r.id, r.name, r.category, r.description, r.image, position]
    );
  }
  console.log(`Seeded ${resources.length} resources (existing rows left unchanged)`);
});

await pool.end();
console.log('Database setup complete');
