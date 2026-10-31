import { betterAuth } from 'better-auth';
import { pool } from './db.js';

if (!process.env.BETTER_AUTH_SECRET) {
  console.error('BETTER_AUTH_SECRET is not set. Generate one with: openssl rand -base64 32');
  process.exit(1);
}

// Email + password sessions stored in the same Neon database (tables are in server/db/schema.sql).
export const auth = betterAuth({
  database: pool,
  baseURL: process.env.BETTER_AUTH_URL || process.env.RENDER_EXTERNAL_URL || `http://localhost:${Number(process.env.PORT) || 3000}`,
  basePath: '/api/auth',
  emailAndPassword: { enabled: true, minPasswordLength: 8 },
});
