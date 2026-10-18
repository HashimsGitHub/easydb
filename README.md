# EasyDB 
A MongoDB Alternative --  Cheaper, Faster, Better !

<img width="1672" height="941" alt="EasyDB_Hero-Image" src="https://github.com/user-attachments/assets/86a42d58-971c-470d-b275-0c5758360b37" />


## 1. Project Overview

**EasyDB** is a lightweight, zero-to-low cost NoSQL database that acts as a direct drop-in replacement for MongoDB. It allows developers and AI agents (via MCP and standard MongoDB drivers/Mongoose) to store unstructured JSON and binary files without expensive MongoDB Atlas fees.

### Core Architectural Stack:

* **Frontend/Edge Gateway:** **Cloudflare Workers** (TypeScript) handling global routing, API key validation, geo-routing, and translation of MongoDB protocol/REST payloads.
* **Fast Indexing & Transaction Layer:** **Cloudflare D1** (SQLite at the edge) acting as a lightning-fast metadata, indexing, and query lookup table.
* **Heavy Payload & Document Storage:** **Azure Table Storage** for cheap, infinite-scale NoSQL JSON document persistence.
* **Media / Binary Storage:** **Azure Blob Storage** for images, PDFs, and static assets with URLs indexed in D1.
* **Developer Experience:** Native support for MongoDB connection strings / Mongoose SDK, Model Context Protocol (MCP) servers, and agent skills (`skills.md`).

---

## 2. System Architecture Diagram

```
[ Developers / Mongoose / MCP Clients ]
                   │
                   ▼ (HTTPS / MongoDB Wire Format / REST)
       [ Cloudflare Workers Gateway ]
        ├── Geo-Routing & Latency Optimization
        ├── API Key Authentication & KV Rate Limiting
        └── Query Translation Layer
                   │
         ┌─────────┴─────────┐
         ▼                   ▼
  [ Cloudflare D1 ]   [ Azure Storage Account: smartlms ]
  (SQL Index, Tags,   ├── Azure Tables: easydb (JSON Payloads)
   Metadata, Lookups) └── Azure Blobs: easydb-media-content (Binaries / Media)
```

---

## 3. Storage Configuration

- **Storage Account:** `smartlms`
- **Table Name:** `easydb` (`https://smartlms.table.core.windows.net/easydb`)
- **Blob Container:** `easydb-media-content` (`https://smartlms.blob.core.windows.net/easydb-media-content`)
- **Hero Image:** `https://smartlms.blob.core.windows.net/easydb-media-content/EasyDB_Hero-Image.webp`
- **Logo / Icon:** `https://smartlms.blob.core.windows.net/easydb-media-content/EasyDB-icon.webp`
- **Live Production URL:** `https://easydb.hashim-hilal-0eb.workers.dev`

Environment variables in `.dev.vars`:
```ini
AZURE_STORAGE_ACCOUNT="smartlms"
AZURE_STORAGE_ACCESS_KEY="<key>"
AZURE_TABLE_NAME="easydb"
AZURE_CONTAINER_NAME="easydb-media-content"
```

---

## 4. Quick Start & Local Development

### Prerequisites
- Node.js (v18+)
- npm

### 1. Install Dependencies
```bash
npm install
```

### 2. Initialize the Local D1 Database
Execute the database schema locally:
```bash
npm run db:init
# or: npx wrangler d1 execute DB --local --file=./schema.sql
```

### 3. Start Local Development Server
Start the local worker instance on `http://localhost:8787`:
```bash
npm run dev
# or: npx wrangler dev
```

---

## 5. API Endpoints

All requests accept an optional `x-tenant-id` header (default: `default_tenant`).

### Document Storage (D1 Edge Index + Azure Table Storage)

| Action | Method | Path | Request Body Example | Description |
| :--- | :--- | :--- | :--- | :--- |
| **Health & Info** | `GET` | `/` or `/health` | - | Returns service status, hero image, and connected storage tiers |
| **Hero Image** | `GET` | `/api/v1/hero` | - | Redirects to EasyDB hero image in Azure Blob |
| **Insert** | `POST` | `/api/v1/insert` | `{"collection": "users", "id": "u1", "data": {"name": "Alice"}}` | Indexes in D1 & persists to Azure Table |
| **Find** | `POST` | `/api/v1/find` | `{"collection": "users", "id": "u1"}` | Reads fast from D1 (or pass `"source": "azure"` for direct Azure Table read) |
| **Update** | `PUT` | `/api/v1/update` | `{"collection": "users", "id": "u1", "data": {"name": "Alice B."}}` | Updates D1 index and Azure Table |
| **Delete** | `DELETE` | `/api/v1/delete` | `{"collection": "users", "id": "u1"}` | Deletes from both D1 and Azure Table |

### Media & Binary Storage (Azure Blob Storage + D1 Metadata)

| Action | Method | Path | Payload Example | Description |
| :--- | :--- | :--- | :--- | :--- |
| **Upload Media** | `POST` | `/api/v1/media/upload` | Multipart form, JSON with `base64Content`, or raw binary | Uploads to Azure Blob container & indexes metadata in D1 |
| **List Media** | `GET` | `/api/v1/media/list` | - | Lists indexed media files for tenant |
| **Delete Media** | `DELETE` | `/api/v1/media/delete?filename=sample.png` | - | Removes from Azure Blob container and D1 index |

---

## 6. Next Steps

1. **MCP Server Integration**: Implement Model Context Protocol (MCP) server so AI agents can query and manipulate EasyDB collections directly.
2. **MongoDB Wire Protocol**: Add wire protocol emulation for native Mongoose and MongoDB driver compatibility.
