CREATE TABLE IF NOT EXISTS mongo_documents (
    tenant_id TEXT NOT NULL,
    collection_name TEXT NOT NULL,
    doc_id TEXT NOT NULL,
    document_data TEXT NOT NULL,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (tenant_id, collection_name, doc_id)
);

CREATE INDEX IF NOT EXISTS idx_tenant_collection ON mongo_documents(tenant_id, collection_name);

CREATE TABLE IF NOT EXISTS media_files (
    tenant_id TEXT NOT NULL,
    file_name TEXT NOT NULL,
    blob_url TEXT NOT NULL,
    content_type TEXT,
    size INTEGER,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (tenant_id, file_name)
);

CREATE INDEX IF NOT EXISTS idx_media_tenant ON media_files(tenant_id);

CREATE TABLE IF NOT EXISTS tenants (
    tenant_id     TEXT PRIMARY KEY,
    email         TEXT,
    github_id     TEXT UNIQUE NOT NULL,
    github_login  TEXT NOT NULL,
    api_key_hash  TEXT NOT NULL,
    tier          TEXT DEFAULT 'free',
    doc_quota     INTEGER DEFAULT 1000,
    media_quota   INTEGER DEFAULT 20,
    created_at    DATETIME DEFAULT CURRENT_TIMESTAMP,
    last_seen_at  DATETIME
);

CREATE INDEX IF NOT EXISTS idx_tenants_github_id ON tenants(github_id);
