---
name: Build-Fullstack-App-React-Node
description: Scaffold, verify and deploy a full-stack app (React + Vite, Node + Express, Neon Postgres) as ONE deployable for any domain: tennis court or meeting-room booking, doctor appointments, salon slots, equipment rentals, shops, and similar. Use when the user wants to build a new full-stack/booking/reservation/scheduling/catalog app from an idea, or says "scaffold", "new app", "build me an app for ...", or "deploy this app" (including "deploy to Render").
---

# Build-Fullstack-App-React-Node

Builds a working full-stack app for the user's domain on a fixed, proven shape: **React 18 + Vite front end, Express 5 API, Neon serverless Postgres, Better Auth for user accounts, one Node process on one port, one deployable.** The shape comes from the eCommerce portal built in `~/Dhanya/ECommerce`; its reusable parts are in `assets/template/` and the domain-specific parts are kept as reference in `references/blueprint-ecommerce/`.

The user explicitly wants **a single artifact**: no separate frontend and backend to run, maintain or deploy. Never split them.

Read as needed: `references/domain-patterns.md` (which data model and concurrency pattern fits the domain), `references/deploy.md` (only when deploying).

## Workflow

### 0. Preflight (look before acting)

- Resolve the target folder as an **absolute path** and `ls -la` it and its parent. Folder names are case-insensitive on macOS and the user may type a different case or a sibling name; say which folder you actually chose. Never assume a folder is empty: check.
- `bash <skill>/scripts/ensure-node.sh`. If it reports MISSING, ask the user before running it with `--install` (it installs the official Node LTS into `~/.local/node`, checksum-verified, no admin needed). If Node is at `~/.local/node/bin` but not on PATH, prefix every command with `export PATH=~/.local/node/bin:$PATH;` (shell state does not persist between calls).
- Check for running servers (`lsof -i :3000 -sTCP:LISTEN`). Stop ones you started earlier; **never kill one that belongs to another project**: run the new app on a different port instead (`PORT=3100 npm run dev`) and use that port in every URL. Stop any server before changing how it stores data.

### 1. Understand the domain (ask little)

Ask only what changes the design, with `AskUserQuestion`, and offer defaults: what is being booked/sold; who the users are (customers only, or customers + staff); whether prices/payments are involved (default: show prices, **no real payments**, say "demo"); booking style (fixed slots / free ranges / quantity over dates / stock) mapped to a pattern in `domain-patterns.md`. If the user already described the domain, don't re-ask; state your assumptions in one short list and proceed.

### 2. Scaffold

`bash <skill>/scripts/scaffold.sh <abs-target-dir> "<App Name>"` (refuses a non-empty target), then `npm install` there. The template already runs: `/api/health`, Better Auth sign up/in/out (email + password, sessions in Neon), generic `resources` list, Express+Vite wiring, DB pool with transactions, idempotent `db:setup`, Dockerfile, README and CLAUDE.md.

### 3. Build the domain

Replace the placeholder `resources` domain completely (no leftover placeholder code); keep the architecture. For a shop/catalog, start from `references/blueprint-ecommerce/` (its README lists where each file goes). **Keep `GET /api/health` (it must query the DB): deploy checks depend on it, and it is easy to lose when replacing `server/api.js`.**

- `server/db/schema.sql`: idempotent tables for the domain, with a `position` column for display order (text ids sort wrongly) and DB-level guarantees (CHECKs, partial unique index or exclusion constraint) so races are impossible, not just unlikely.
- `server/db/seed.js`: realistic seed data, inserted with `ON CONFLICT DO NOTHING`.
- `server/repo.js`: **all SQL**; cast numeric columns `::float8`; multi-step writes in `withTransaction` with `FOR UPDATE` (fixed lock order) or a constraint violation mapped to HTTP 409.
- `server/api.js`: routes, input validation, errors with `.status` for user-facing messages. Express 5 forwards async rejections to the error handler; no try/catch needed.
- `shared/rules.js`: validation + money helpers used by **both** browser and server (no Node/browser-only APIs).
- `src/services/api.js`: the only browser→server code; `src/pages/*`: every fetching page handles loading, **error** and empty states (never stuck on "Loading…"); forms validate client-side with the shared rules and show server errors (field-level via `err.fields`, plus one general line).
- Keep UI plain and responsive; reuse `src/styles.css` classes.

Rules that came out of the eCommerce build (apply every time):

1. **Server is the source of truth.** The client sends ids/times/quantities; the server computes price, totals, availability from the DB. Test that a tampered price is ignored.
2. **Concurrency is a DB concern.** Last unit / same slot requested twice at once must yield exactly one success and one clear 409/400 message.
3. **Authentication is mandatory for transactions.** Every write that creates, changes or cancels a booking/order/reservation calls `requireUser(req)` first (401 "Please sign in" otherwise) and stores `user_id` from the session, never from the client. Only read-only browsing (catalog, availability, search, flight/product detail) is public. Cancel/modify endpoints are owner-scoped (`WHERE id = $1 AND user_id = $2`; wrong owner = the same 404 as unknown id), so there is **no guest cancel/modify by code + email**. UI: signed-out visitors see "Sign in to book/buy" (linking to `/signin` with `state={{ from: <current path> }}`, which `Account.jsx` honours) instead of the submit button, and a successful transaction navigates to the user's own list with a confirmation banner. If the user explicitly wants guest checkout, ask and treat it as a deliberate exception.
4. **Privacy by default.** No unauthenticated endpoint that lists personal data (the eCommerce v1 `GET /api/orders` did; don't repeat it). A read-only lookup by confirmation code + email may stay public (same 404 for wrong code and wrong email), but it never modifies anything. Signed-in users may list **their own** records via an endpoint that calls `requireUser(req)` and filters by `session.user.id`; never accept a user id from the client. Add a `user_id text REFERENCES "user"(id)` to each user-owned table (nullable by default; make it `NOT NULL` for tables whose rows can only be created by signed-in users; use `ON DELETE SET NULL` for records that must outlive the account, `CASCADE` otherwise). Authorization failures on someone else's record return the same 404 as "not found". Roles/admin are not in the template: if the domain needs staff features, add a role column on the user (Better Auth `additionalFields` or the `admin` plugin) and say so, otherwise omit admin features and tell the user.
5. **Secrets.** `DATABASE_URL` and `BETTER_AUTH_SECRET` live only in `.env` (git-ignored, `chmod 600`) or platform secrets. Generate the auth secret yourself (`openssl rand -base64 32`), never reuse one across apps, and set a fresh one in production. Ask the user to paste `DATABASE_URL` into `.env` themselves rather than into chat. If they paste it in chat anyway, write it to `.env`, never repeat it back, and recommend rotating the password (Neon console → Roles → reset).
6. **No hidden state in the DB assumptions.** `db:setup` must be safe to run repeatedly and must not overwrite existing rows; schema changes to existing tables are appended `ALTER ... IF NOT EXISTS`.

### 4. Database

Neon cannot run locally; it needs the user's connection string (Neon console → project → **Connect**). For a test, prefer a **new project/database**: a Neon *branch* copies the parent's data (including real customer rows), so before testing, count existing rows in every table and treat them as untouchable. Write `.env` from `.env.example`, ask the user to fill in `DATABASE_URL`, and wait. Replace the `BETTER_AUTH_SECRET` placeholder line with a generated value (edit that line; if you append to `.env`, make sure the file ends with a newline first, or the secret gets glued onto the `DATABASE_URL` line). Compare the host in `.env` with other projects' `.env` (print host only, never the password) to be sure it's the intended database. Then `npm run db:setup`, **run it a second time** and confirm nothing duplicated.

### 5. Verify (don't claim what you didn't run)

- `npm run build` succeeds; start the server; hit every route with `curl` (success, 404, validation error, malformed JSON).
- Exercise each write path against the real DB, including: invalid input, tampered price, unknown ids, over-capacity, and the **concurrency race** (two simultaneous requests for the last unit/slot via `Promise.all`, expect one 2xx and one 4xx).
- **Clean up test data** you created: track every id you create, delete only those, restore stock/slots, then **reconcile** (per-product stock = seed − units in remaining orders; row counts = counts you recorded before testing). A bare "cleanup done" line proves nothing. Never leave test records in the user's database, and never delete rows you didn't create.
- **Auth:** every write endpoint returns 401 without a cookie (including cancel/modify), public reads still return 200; sign up and get-session via `curl` (`POST /api/auth/sign-up/email` needs an `origin: http://localhost:<port>` header; keep cookies with `-c/-b`); a protected route returns 401 without a cookie and 200 with it; with **two users**, user B cannot read or modify user A's records (expect the not-found response). Track the test users you create (and their rows) and delete only those during cleanup.
- You can't see the browser. Say plainly that the UI was built and served but not clicked through, unless you actually drove it.

### 6. Launch

Start `npm run dev` in the background (with `PORT=...` if 3000 is taken), wait for `/api/health`, `open` the URL, and tell the user the URL (and that it only works on their machine while the server runs). If the user later says "launch the app", re-check the server is up first rather than starting a duplicate.

### 7. Document

Update the generated `README.md` and `CLAUDE.md` for the real domain: commands, the non-obvious architecture facts (what a future session can't see from one file), the pattern chosen, and known gaps (email verification, password reset, social login, roles/admin, payments). The template has none of those: Better Auth is email + password only, because there is no mail sender.

### 8. Deploy (only when asked)

Follow `references/deploy.md` (Step A GitHub via `scripts/github-push.sh`, then the Render Blueprint, then `scripts/verify-deploy.sh`); **Render is the default target** (the template includes `render.yaml`, a Blueprint for one web service). Deploying is outward-facing: confirm the platform and get explicit go-ahead before running anything that creates resources or sets secrets. Proven once (Skyline Air), but two steps are inherently manual and must be handed to the user as numbered instructions: adding the SSH public key in GitHub's UI, and Render's New > Blueprint wizard (with the user entering `DATABASE_URL`). Don't claim the deploy is "fully automated". Verify as you go and report exactly what was and wasn't confirmed (live `/api/health`, home page, protected route; sign-up/write only if cleanable).

### 9. Report

Short and honest: URL, what was tested and how, what was not tested, assumptions made, security caveats (password rotation if pasted, auth gaps such as no email verification or password reset), and the next sensible steps. Don't pad.

## Gotchas

- **Better Auth:** mount `toNodeHandler(auth)` at `app.all('/api/auth/{*splat}', ...)` **before** `express.json()` / the `/api` router, or sign-in requests hang. It uses the shared Neon `pool` (kysely wraps a `pg`-compatible pool; `pg` must be installed). Its tables are created by `schema.sql` (not the Better Auth CLI), with default camelCase quoted column names; if you add plugins or `additionalFields`, add the matching columns via appended `ALTER ... IF NOT EXISTS`. It rejects cross-origin POSTs, so when testing with curl send an `origin` header; behind a proxy/in production set `BETTER_AUTH_URL` to the public origin.
- `vite.config.js` exists only for the React plugin/build; do not add a dev proxy or a second server.
- Express 5 catch-all is `'/{*splat}'`, not `'*'`.
- Use the Neon **Pool** (WebSocket), not the HTTP `neon()` driver: it can't do interactive transactions.
- `node --env-file-if-exists=.env` needs Node 22+; scripts rely on it.
- `Dockerfile` uses `npm ci`: commit `package-lock.json`.
- **Git push has no TTY** (not even via `!`): HTTPS auth prompts fail with `could not read Username`. Use SSH (`scripts/github-push.sh`); a default key may belong to a different GitHub account than the repo owner, so generate a per-owner key + `github-<owner>` host alias. Use `git push -u origin main` for the first push.
- **Render:** `NODE_ENV=production` there makes plain `npm ci` skip Vite, so the build command uses `npm ci --include=dev`. Free instances sleep when idle, and `preDeployCommand` is paid-only (hence `db:setup` in the build command). Set `BETTER_AUTH_URL` to the public https origin or sign-in cookies/origin checks fail.
- Scripts need only bash, curl, perl, tar and shasum (plus python3 inside `ensure-node.sh --install`).
