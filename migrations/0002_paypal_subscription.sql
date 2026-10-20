-- One-time migration for the already-live `tenants` table (fresh installs
-- already get this column from schema.sql's CREATE TABLE). Re-running this
-- against a database that already has the column will error with
-- "duplicate column name" — that's expected, just don't re-run it.
ALTER TABLE tenants ADD COLUMN paypal_subscription_id TEXT;
