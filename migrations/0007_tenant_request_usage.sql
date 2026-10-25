CREATE TABLE IF NOT EXISTS tenant_request_usage (
    tenant_id TEXT NOT NULL,
    usage_month TEXT NOT NULL,
    request_count INTEGER NOT NULL DEFAULT 0,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (tenant_id, usage_month)
);

CREATE INDEX IF NOT EXISTS idx_tenant_request_usage_month
    ON tenant_request_usage(usage_month, tenant_id);
