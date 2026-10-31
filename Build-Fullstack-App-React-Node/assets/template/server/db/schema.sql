-- Idempotent: safe to run on every `npm run db:setup`.
-- There is no migration tool. To change an existing table, append an
-- `ALTER TABLE ... ADD COLUMN IF NOT EXISTS ...` below; editing a CREATE
-- TABLE above does nothing to a database that already has the table.

-- Placeholder domain table. Replace/extend with your domain's tables.
CREATE TABLE IF NOT EXISTS resources (
  id          text PRIMARY KEY,
  name        text NOT NULL,
  category    text NOT NULL,
  description text NOT NULL,
  image       text NOT NULL,
  position    integer NOT NULL DEFAULT 0   -- default display order (text ids sort wrongly: p1, p10, p2)
);

-- Better Auth tables (default names/columns for the email+password setup in server/auth.js).
CREATE TABLE IF NOT EXISTS "user" (
  id              text PRIMARY KEY,
  name            text NOT NULL,
  email           text NOT NULL UNIQUE,
  "emailVerified" boolean NOT NULL DEFAULT false,
  image           text,
  "createdAt"     timestamptz NOT NULL DEFAULT now(),
  "updatedAt"     timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS session (
  id          text PRIMARY KEY,
  "expiresAt" timestamptz NOT NULL,
  token       text NOT NULL UNIQUE,
  "createdAt" timestamptz NOT NULL DEFAULT now(),
  "updatedAt" timestamptz NOT NULL DEFAULT now(),
  "ipAddress" text,
  "userAgent" text,
  "userId"    text NOT NULL REFERENCES "user"(id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS session_user_idx ON session ("userId");
CREATE TABLE IF NOT EXISTS account (
  id                      text PRIMARY KEY,
  "accountId"             text NOT NULL,
  "providerId"            text NOT NULL,
  "userId"                text NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
  "accessToken"           text,
  "refreshToken"          text,
  "idToken"               text,
  "accessTokenExpiresAt"  timestamptz,
  "refreshTokenExpiresAt" timestamptz,
  scope                   text,
  password                text,
  "createdAt"             timestamptz NOT NULL DEFAULT now(),
  "updatedAt"             timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS account_user_idx ON account ("userId");
CREATE TABLE IF NOT EXISTS verification (
  id          text PRIMARY KEY,
  identifier  text NOT NULL,
  value       text NOT NULL,
  "expiresAt" timestamptz NOT NULL,
  "createdAt" timestamptz NOT NULL DEFAULT now(),
  "updatedAt" timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS verification_identifier_idx ON verification (identifier);

-- Domain tables that belong to a user should add: user_id text REFERENCES "user"(id) ON DELETE CASCADE
