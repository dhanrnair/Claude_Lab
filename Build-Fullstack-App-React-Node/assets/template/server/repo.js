// All database queries live here. Cast numeric/decimal columns with ::float8
// so they arrive in JavaScript as numbers, not strings.
import { pool } from './db.js';

export async function ping() {
  await pool.query('SELECT 1');
}

export async function listResources() {
  const { rows } = await pool.query(
    'SELECT id, name, category, description, image FROM resources ORDER BY position, id'
  );
  return rows;
}

export async function getResource(id) {
  const { rows } = await pool.query(
    'SELECT id, name, category, description, image FROM resources WHERE id = $1',
    [id]
  );
  return rows[0] ?? null;
}
