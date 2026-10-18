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
