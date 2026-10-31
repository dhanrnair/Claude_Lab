import { Pool } from '@neondatabase/serverless';

if (!process.env.DATABASE_URL) {
  console.error('DATABASE_URL is not set. Copy .env.example to .env and add your Neon connection string.');
  process.exit(1);
}

// Pool (WebSocket) rather than the HTTP neon() driver: interactive transactions need a connection.
export const pool = new Pool({ connectionString: process.env.DATABASE_URL });

// Runs fn inside a transaction, committing on success and rolling back on error.
export async function withTransaction(fn) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const result = await fn(client);
    await client.query('COMMIT');
    return result;
  } catch (err) {
    await client.query('ROLLBACK').catch(() => {});
    throw err;
  } finally {
    client.release();
  }
}
