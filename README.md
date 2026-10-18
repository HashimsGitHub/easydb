# EasyDB (MongoDB Alternative on Azure + Cloudflare D1)

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
  [ Cloudflare D1 ]   [ Azure Storage Account ]
  (SQL Index, Tags,   ├── Azure Tables (JSON Payloads)
   Metadata, Lookups) └── Azure Blobs (Binaries / Media)
```

---

## 3. Quick Start & Local Development

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

## 4. API Endpoints

All requests accept an optional `x-tenant-id` header (default: `default_tenant`).

| Action | Method | Path | Request Body Example |
| :--- | :--- | :--- | :--- |
| **Insert** | `POST` | `/api/v1/insert` | `{"collection": "users", "id": "u1", "data": {"name": "Alice"}}` |
| **Find** | `POST` | `/api/v1/find` | `{"collection": "users"}` |
| **Update** | `PUT` | `/api/v1/update` | `{"collection": "users", "id": "u1", "data": {"name": "Alice B."}}` |
| **Delete** | `DELETE` | `/api/v1/delete` | `{"collection": "users", "id": "u1"}` |

---

## 5. Next Steps

1. **Azure Integration**: Bind Azure Blob & Table storage credentials securely via Wrangler secrets once local D1 CRUD is verified.
2. **MCP Integration**: Add Model Context Protocol server endpoints for direct AI agent access.
3. **Mongoose / Wire Compatibility**: Implement query parsing and wire protocol emulation.
