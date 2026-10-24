ALTER TABLE tenants ADD COLUMN api_key_last4 TEXT;
ALTER TABLE tenants ADD COLUMN key_rotated_at DATETIME;
