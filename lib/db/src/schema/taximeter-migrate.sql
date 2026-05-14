-- Taxi meter pro schema migration
-- Run once against the DATABASE_URL to create required tables.

CREATE TABLE IF NOT EXISTS taxi_users (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name          TEXT NOT NULL,
  phone         TEXT NOT NULL UNIQUE,
  device_id     TEXT,
  status        TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','active','expired')),
  expiry_date   TIMESTAMPTZ,
  registered_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS admin_totp (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  secret     TEXT NOT NULL,
  enabled    BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
