CREATE TABLE IF NOT EXISTS products (
  id          text PRIMARY KEY,
  name        text NOT NULL,
  category    text NOT NULL,
  price       numeric(10, 2) NOT NULL CHECK (price >= 0),
  rating      numeric(2, 1) NOT NULL DEFAULT 0,
  stock       integer NOT NULL CHECK (stock >= 0),
  image       text NOT NULL,
  description text NOT NULL,
  position    integer NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS orders (
  id         text PRIMARY KEY,
  created_at timestamptz NOT NULL DEFAULT now(),
  name       text NOT NULL,
  email      text NOT NULL,
  address    text NOT NULL,
  city       text NOT NULL,
  zip        text NOT NULL,
  subtotal   numeric(10, 2) NOT NULL,
  shipping   numeric(10, 2) NOT NULL,
  total      numeric(10, 2) NOT NULL
);

CREATE TABLE IF NOT EXISTS order_items (
  order_id   text NOT NULL REFERENCES orders (id) ON DELETE CASCADE,
  product_id text NOT NULL REFERENCES products (id),
  name       text NOT NULL,
  image      text NOT NULL,
  price      numeric(10, 2) NOT NULL,
  qty        integer NOT NULL CHECK (qty > 0),
  PRIMARY KEY (order_id, product_id)
);

CREATE INDEX IF NOT EXISTS orders_created_at_idx ON orders (created_at DESC);
