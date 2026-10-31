import express from 'express';
import { fromNodeHeaders } from 'better-auth/node';
import { auth } from './auth.js';
import { getResource, listResources, ping } from './repo.js';

const router = express.Router();
router.use(express.json());

// Session helpers. getSession returns null for guests; requireUser throws 401.
// Take the user id from here, NEVER from the request body or query.
export const getSession = (req) => auth.api.getSession({ headers: fromNodeHeaders(req.headers) });
export async function requireUser(req) {
  const session = await getSession(req);
  if (!session) throw Object.assign(new Error('Please sign in'), { status: 401 });
  return session.user;
}

// RULE: any route that creates, changes or cancels something starts with
//   const user = await requireUser(req);
// and scopes SQL by user.id. Only read-only browsing routes may stay public.

// Express 5 forwards rejected async handlers to the error handler below: no try/catch needed.
router.get('/health', async (req, res) => {
  await ping();
  res.json({ ok: true });
});

router.get('/resources', async (req, res) => {
  res.json(await listResources());
});

router.get('/resources/:id', async (req, res) => {
  const resource = await getResource(req.params.id);
  if (!resource) return res.status(404).json({ error: 'Not found' });
  res.json(resource);
});

router.use((req, res) => res.status(404).json({ error: 'Not found' }));

// Errors with a .status are intentional and their message is shown to users.
// Anything else is logged and returned as a generic 500 (never leak internals).
router.use((err, req, res, next) => {
  if (!err.status) console.error(err);
  res.status(err.status || 500).json({ error: err.status ? err.message : 'Something went wrong' });
});

export default router;
