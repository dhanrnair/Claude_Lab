# Deploying

**Proven end-to-end once:** Skyline Air (airline booking) went GitHub (SSH) -> Render Blueprint -> live, and the
read-only smoke test passed. Sign-up/booking on the live URL was *not* exercised by the agent. Platform specifics can
drift: check the platform's current docs and report honestly which steps were verified.

## Automation boundary (be honest about this)

Automated by the agent: Node check, GitHub SSH key + alias + remote + push (`scripts/github-push.sh`), build checks,
post-deploy smoke test (`scripts/verify-deploy.sh`). **Manual, by the user (cannot be automated from here):**
adding the public key in GitHub's web UI, and Render's New > Blueprint wizard (needs their Render account, and
`DATABASE_URL` is a secret they enter themselves). No `gh` or `render` CLI is installed by default; don't pretend
otherwise. If the user later provides a Render API key / installs `gh`, those steps can be scripted, but that is
untested. Hand the user an exact, numbered list for each manual step, then wait.

## Step A: Get the code on GitHub (do this first)

Observed pitfalls, in order of occurrence:
1. `git push` over HTTPS fails with `could not read Username` / `Device not configured`: there is **no TTY**, not even
   in the `!` shell, so token/password prompts can't work and no credential is stored. Don't ask the user to paste a
   token. Use SSH.
2. `git push` also fails with "no upstream branch": use `git push -u origin main`.
3. An existing `~/.ssh/id_ed25519` may authenticate as a **different GitHub account** than the repo owner
   (`Permission to <owner>/<repo>.git denied to <other>`). One key can only be on one account, so make a second key.

Procedure (run from the project root; owner/repo come from `git remote -v` or the user):
```bash
bash <skill>/scripts/github-push.sh <owner> <repo> check    # which account does the default key map to?
bash <skill>/scripts/github-push.sh <owner> <repo> keygen   # only if MISMATCH: new key + ~/.ssh/config alias, prints PUBLIC key
# USER: sign in to GitHub as <owner> > Settings > SSH and GPG keys > New SSH key > paste the printed line. Wait for "done".
bash <skill>/scripts/github-push.sh <owner> <repo> push     # verifies alias == owner, sets origin, git push -u origin main
```
If `check` says MATCH, skip `keygen` and run `push` only after pointing the remote at `git@github.com:<owner>/<repo>.git`.
Confirm with the user before `push`. Default to a **private** repo when creating one. Print only the public key.

**Default platform: Render** (Option 0 below; the template ships a `render.yaml`). Offer it first, but still confirm.

Deploying publishes the app and its database access to the internet. **Never deploy, create cloud resources, or set
secrets without the user's explicit go-ahead in this conversation**, and confirm the target platform first.

## What is being deployed

One Node process (`npm start`) serving `/api` and the built React app. Requirements: Node 22+, env var
`DATABASE_URL`, optional `PORT` (most platforms inject it; the server reads it).

Build-and-run recipe (works on any Node host):

```bash
npm ci
npm run db:setup     # idempotent; first deploy and after schema changes
npm run build
npm start
```

## Option 0: Render (default; Blueprint in `render.yaml`)

The template's `render.yaml` defines one Node web service (API + built React app) with `healthCheckPath: /api/health`,
`NODE_VERSION=22`, a generated `BETTER_AUTH_SECRET`, and prompts for `DATABASE_URL` and `BETTER_AUTH_URL`.

1. Render deploys from a Git repo: the project needs to be pushed to GitHub/GitLab (`package-lock.json` committed; `.env` is git-ignored). Creating the repo and pushing is outward-facing: ask first, and make the repo **private** unless told otherwise.
2. Render dashboard → **New → Blueprint** → select the repo. Enter `DATABASE_URL` (Neon pooled string) when prompted. The user enters it in the Render UI themselves; never print or log it.
3. Build command is `npm ci --include=dev && npm run db:setup && npm run build`. `--include=dev` is needed because Render sets `NODE_ENV=production` and Vite is a devDependency. `db:setup` runs in the build because `preDeployCommand` is paid-plan only; on a paid plan move it to `preDeployCommand: npm run db:setup`.
4. After the first deploy, set `BETTER_AUTH_URL` to the service's public URL (`https://<name>.onrender.com`; if unset, `server/auth.js` falls back to Render's `RENDER_EXTERNAL_URL`). Redeploy if you change it.
5. Verify: `bash <skill>/scripts/verify-deploy.sh https://<name>.onrender.com` (read-only: health 200, home 200, SPA
   fallback 200, protected route 401). Then ask the user to sign up and make one booking in the browser, because the
   agent shouldn't create production users/rows it can't delete. If it must test writes itself, track and delete every id.

Manual wizard handoff (give the user exactly this): dashboard.render.com > sign in with GitHub as the repo owner >
New > Blueprint > pick the repo > enter `DATABASE_URL` (Neon **pooled** string, host has `-pooler`, entered in the UI
only) and `BETTER_AUTH_URL` (`https://<service-name>.onrender.com`, the `name:` in `render.yaml`) > Apply.
`BETTER_AUTH_SECRET` is generated by Render. If the assigned URL differs from `BETTER_AUTH_URL`, fix it and redeploy.
`db:setup` runs in the build against whatever database `DATABASE_URL` names, so have the user confirm it's the intended one.

Render facts to expect: free web services sleep after ~15 min idle (first request takes a while, and a cold start + Neon wake-up is slower still); the service listens on the injected `PORT` (the server already reads it); the HTTPS URL is terminated by Render's proxy, which is why the public origin matters for Better Auth cookies. **Not yet verified end-to-end**: re-check Render's current docs for `render.yaml` fields before relying on them, and report what was actually confirmed.

## Option 1: Docker image (most portable)

The template includes a multi-stage `Dockerfile` (needs `package-lock.json` committed, because it uses `npm ci`).
`docker build -t app . && docker run -p 3000:3000 -e DATABASE_URL=... app` to test. Platforms that accept a
Dockerfile: Fly.io, Google Cloud Run, Render (Docker runtime), Railway, Azure Container Apps, etc. Run `npm run db:setup` once from
a trusted machine (it only needs `DATABASE_URL`), or as the platform's release/pre-deploy command.

## Option 2: Other Node buildpack hosts (Railway, Heroku-style)

Build command `npm ci && npm run build` (dev dependencies, i.e. Vite, are required for the build step, so don't set
production-only installs before it). Start command `npm start`. Pre-deploy/release command `npm run db:setup`.

## Checklist

1. Confirm platform with the user; check the CLI is installed and logged in (`<cli> whoami`); if not, ask the user to log in with `! <cli> login`.
2. `DATABASE_URL` (and `BETTER_AUTH_SECRET`) go in the platform's secret/env settings. Never in the repo, the image, or a command line that gets logged.
3. Use Neon's pooled connection string (host contains `-pooler`) for serverless/many-instance platforms.
4. Run `db:setup` against the production database once, then deploy.
5. After deploy: `curl https://<url>/api/health` must return `{"ok":true}`, then load the home page and exercise one write path (the race/duplicate test from SKILL.md, then clean up the test data).
6. Report the live URL, what was verified, and what was not.

## Before real users

- Set `BETTER_AUTH_SECRET` (fresh `openssl rand -base64 32`) and `BETTER_AUTH_URL` (the public https origin) as platform secrets/env; sign-in fails or cookies misbehave without the right origin. Verify sign-up + get-session on the live URL, then delete the test user.
- Roles/admin are not in the template: add them before exposing any admin endpoints.
- Add rate limiting on write endpoints (e.g. `express-rate-limit`) and a body-size limit (Express's JSON parser defaults to 100kb).
- Neon free-tier databases suspend when idle; the first request after idle is slower.
- Rotate any credential that was ever pasted into a chat or committed.
