-- One-time migration for the already-live `tenants` table (fresh installs
-- already get these columns from schema.sql's CREATE TABLE). Re-running this
-- against a database that already has these columns will error with
-- "duplicate column name" — that's expected, just don't re-run it.
ALTER TABLE tenants ADD COLUMN api_key_last4 TEXT;
ALTER TABLE tenants ADD COLUMN key_rotated_at DATETIME;
