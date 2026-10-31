CREATE TABLE IF NOT EXISTS tenant_sql_storage (
    tenant_id TEXT PRIMARY KEY,
    storage_bytes INTEGER NOT NULL DEFAULT 0,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS tenant_sql_usage (
    tenant_id TEXT NOT NULL,
    usage_month TEXT NOT NULL,
    rows_read INTEGER NOT NULL DEFAULT 0,
    rows_written INTEGER NOT NULL DEFAULT 0,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (tenant_id, usage_month)
);
