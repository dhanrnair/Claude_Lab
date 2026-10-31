# eCommerce blueprint (catalog + stock pattern)

Verified working: this exact code was generated through the skill and tested against Neon (ordering, tampered price,
over-stock, last-item race, code+email order lookup, setup run twice).

| File | Goes to | Notes |
|---|---|---|
| `schema.sql` | `server/db/schema.sql` | products, orders, order_items |
| `repo.js` | `server/repo.js` | `createOrder` transaction with `FOR UPDATE`; `findOrder` (code + email); `ping` |
| `api.js` | `server/api.js` | includes `/api/health`; no list-all-orders endpoint |
| `setup-db.js` | `server/scripts/setup-db.js` | seeds from `server/db/seed.js` (`export const products`) |
| `rules-additions.js` | append to `shared/rules.js` | shipping rule + `validateCustomer` |
| `client-api.js` | append to `src/services/api.js` | shop calls + localStorage cart |
| `Checkout.jsx`, `Orders.jsx` | `src/pages/` | shared validation; server field errors; order lookup form |

**Predates mandatory auth:** this blueprint is guest checkout (`POST /orders` open, order lookup by code + email). When adopting it, apply SKILL.md rule 3: add `const user = await requireUser(req)` to `POST /orders`, add `user_id text NOT NULL REFERENCES "user"(id)` to `orders`, pass `user.id` into `createOrder`, add a session-scoped `GET /api/my/orders`, and make `Checkout.jsx` show "Sign in to buy" when signed out.

Other pages (Home, ProductDetail, Cart, CartContext, ProductCard) are plain React; write them fresh for the domain.
After copying, delete the template's placeholder `resources` code (`seed.js` rows, `repo.js`/`api.js` resource functions,
`resources` table in `schema.sql`, `Home.jsx`, `getResources`/`getResource` in `src/services/api.js`).
