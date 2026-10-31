// Single entry point: serves the API and the React app on one port.
// Development: Vite runs inside Express (hot reload).
// Production: Express serves the prebuilt files from dist/.
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import express from 'express';
import { toNodeHandler } from 'better-auth/node';
import { auth } from './auth.js';
import api from './api.js';

const isProd = process.env.NODE_ENV === 'production';
const port = Number(process.env.PORT) || 3000;
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

const app = express();
// Better Auth must be mounted before any body parser (it reads the raw request itself).
app.all('/api/auth/{*splat}', toNodeHandler(auth));
app.use('/api', api);

if (isProd) {
  const dist = path.join(root, 'dist');
  app.use(express.static(dist));
  app.get('/{*splat}', (req, res) => res.sendFile(path.join(dist, 'index.html')));
} else {
  const { createServer } = await import('vite');
  const vite = await createServer({ root, server: { middlewareMode: true }, appType: 'spa' });
  app.use(vite.middlewares);
}

app.listen(port, () => {
  console.log(`__APP_NAME__ running at http://localhost:${port} (${isProd ? 'production' : 'development'})`);
});
