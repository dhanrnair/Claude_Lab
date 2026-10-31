# Domain patterns

Pick the pattern that matches the domain, then adapt names. Every pattern shares the same rules:
**the server decides prices, availability and totals; the browser sends only ids, times and quantities.**
All SQL goes in `server/repo.js`; multi-step writes use `withTransaction`.

| Domain examples | Pattern |
|---|---|
| Tennis courts, salon chairs, meeting rooms, doctor slots | A. Fixed time slots |
| Rooms/courts booked for any start–end, hourly or daily | B. Free time ranges |
| Equipment rentals with several identical units | C. Quantity pool over dates |
| Shop, menu, tickets with limited stock | D. Catalog + stock (the eCommerce blueprint) |

## Shared tables

```sql
CREATE TABLE IF NOT EXISTS resources (          -- court / doctor / room / stylist / item
  id text PRIMARY KEY, name text NOT NULL, category text NOT NULL,
  description text NOT NULL, image text NOT NULL,
  price numeric(10,2) NOT NULL CHECK (price >= 0),   -- per slot / hour / day / unit
  timezone text NOT NULL DEFAULT 'UTC',               -- IANA zone the resource operates in
  position integer NOT NULL DEFAULT 0);
```

## A. Fixed time slots

Slots are generated (not stored) from opening hours in the resource's timezone; only *bookings* are stored.
A unique index makes double booking impossible with no explicit locking.

```sql
CREATE TABLE IF NOT EXISTS bookings (
  id text PRIMARY KEY,                          -- confirmation code, e.g. 'BK-' + randomUUID().slice(0,8).toUpperCase()
  resource_id text NOT NULL REFERENCES resources(id),
  slot_start timestamptz NOT NULL,
  slot_end   timestamptz NOT NULL,
  name text NOT NULL, email text NOT NULL, notes text,
  price numeric(10,2) NOT NULL,                 -- snapshot at booking time
  status text NOT NULL DEFAULT 'confirmed' CHECK (status IN ('confirmed','cancelled')),
  created_at timestamptz NOT NULL DEFAULT now());
-- Partial: a cancelled booking must free the slot.
CREATE UNIQUE INDEX IF NOT EXISTS bookings_slot_uniq
  ON bookings (resource_id, slot_start) WHERE status = 'confirmed';
```

Create: validate the slot is on the generated grid and in the future, `INSERT`, and map Postgres error
`23505` (unique_violation) to an error with `status = 409` and a friendly message ("That slot was just taken").
Availability endpoint: `GET /api/resources/:id/availability?date=YYYY-MM-DD` returns the grid with a `taken` flag per
slot, built from confirmed bookings for that day.

## B. Free time ranges

Needs `btree_gist`. **Not yet proven on Neon in this skill's history: run `db:setup` and the race test and confirm
it works; if the extension can't be enabled, fall back to locking the resource row `FOR UPDATE` and checking overlap in SQL.**

```sql
CREATE EXTENSION IF NOT EXISTS btree_gist;
-- in bookings: starts_at/ends_at timestamptz, CHECK (ends_at > starts_at), then:
ALTER TABLE bookings ADD CONSTRAINT bookings_no_overlap
  EXCLUDE USING gist (resource_id WITH =, tstzrange(starts_at, ends_at) WITH &&) WHERE (status = 'confirmed');
```
(`ADD CONSTRAINT` is not idempotent: wrap it in a `DO $$ ... IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = ...) $$` block.)
Map error `23P01` (exclusion_violation) to a 409. Compute price server-side from duration × rate.

## C. Quantity pool over dates

```sql
-- equipment(total_units integer), reservations(equipment_id, start_date date, end_date date, qty integer, status)
```
In one transaction: `SELECT ... FROM equipment WHERE id = $1 FOR UPDATE` (serialises requests per item), then
`SELECT COALESCE(SUM(qty),0) FROM reservations WHERE equipment_id=$1 AND status='confirmed' AND start_date <= $end AND end_date >= $start`;
reject if `already + qty > total_units`. (Strictly, availability is the *peak* overlap on any single day; for multi-day
requests check each day or document the simplification.)

## D. Catalog + stock

See `references/blueprint-ecommerce/` (verified; see its README: `createOrder`, `findOrder`, `schema.sql`, `Checkout.jsx`, `Orders.jsx`) (a working form with shared validation, server field errors and a submit-error line): merge duplicate cart lines,
`SELECT ... WHERE id = ANY($1) ORDER BY id FOR UPDATE` (fixed order avoids deadlocks), check stock, insert order + items
(snapshot name/price), decrement stock, all in one transaction. Totals from the DB only.

## Cross-cutting rules

- **Time**: store `timestamptz` (UTC). Generate and display slots in the resource's timezone with `Intl.DateTimeFormat`; never rely on the browser's clock to decide validity: reject past times on the server.
- **Privacy (a flaw in the eCommerce v1, fixed here)**: do NOT expose an unauthenticated "list all bookings/orders" endpoint; it leaks names, emails and addresses. Public endpoints return availability only. Creating, changing or cancelling requires a signed-in user (`requireUser`); a read-only lookup by **confirmation code + email** may stay public, but cancel/modify are owner-scoped by `user_id`. Signed-in users (Better Auth, in the template) may list their own bookings via a session-scoped endpoint. Admin/staff views need a role on top of auth; if roles are out of scope, leave admin lists out and say so.
- **Cancellation** sets `status='cancelled'` (keeps history, frees the slot via the partial index/constraint).
- **Seeding**: realistic data for the domain, `ON CONFLICT DO NOTHING`, `position` column for display order.
- **Client validation is a convenience**: the server re-validates everything using the same `shared/rules.js`.
