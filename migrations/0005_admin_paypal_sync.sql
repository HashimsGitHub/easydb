ALTER TABLE tenants ADD COLUMN paypal_status TEXT;
ALTER TABLE tenants ADD COLUMN paypal_plan_id TEXT;
ALTER TABLE tenants ADD COLUMN paypal_payer_email TEXT;
ALTER TABLE tenants ADD COLUMN paypal_price_monthly REAL;
ALTER TABLE tenants ADD COLUMN paypal_currency TEXT;
ALTER TABLE tenants ADD COLUMN paypal_last_payment REAL;
ALTER TABLE tenants ADD COLUMN paypal_last_payment_at TEXT;
ALTER TABLE tenants ADD COLUMN paypal_next_billing_at TEXT;
ALTER TABLE tenants ADD COLUMN paypal_failed_payments INTEGER;
ALTER TABLE tenants ADD COLUMN paypal_collected_30d REAL;
ALTER TABLE tenants ADD COLUMN paypal_synced_at DATETIME;

CREATE TABLE IF NOT EXISTS admin_audit (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    at         DATETIME DEFAULT CURRENT_TIMESTAMP,
    action     TEXT NOT NULL,
    tenant_id  TEXT,
    detail     TEXT
);
