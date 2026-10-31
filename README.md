<div align="center">

# EasyDB 
### NoSQL, SQL & Object Storage in One Edge Database


**One serverless API for JSON documents (NoSQL), relational SQL tables and object storage — with sub-15ms edge lookups and zero idle fees.**

[![Live Status](https://img.shields.io/badge/Status-Live%20v2.0-emerald?style=for-the-badge)](https://easy-db.cloud)
[![Architecture](https://img.shields.io/badge/Architecture-Edge%20Serverless-cyan?style=for-the-badge)](https://easy-db.cloud)
[![Cost](https://img.shields.io/badge/Idle%20Cost-%240.00%2Fmo-teal?style=for-the-badge)](https://easy-db.cloud)
[![AI Ready](https://img.shields.io/badge/AI%20Agent-Ready-purple?style=for-the-badge)](https://easy-db.cloud)

<br/>

![EasyDB Hero Architecture](https://easy-db.cloud/api/v1/hero)

<br/>

[**Explore Live Playground**](https://easy-db.cloud#demo) • [**API Reference**](#api-reference) • [**Pricing**](https://easy-db.cloud/pricing) • [**Comparison Matrix**](#why-easydb-vs-mongodb-atlas) • [**Product Roadmap**](#product-roadmap)

---

</div>

## 1. Executive Summary & Problem Space

Modern web applications, mobile platforms, and AI agents require high-velocity unstructured data persistence and media storage. However, the existing database landscape forces teams to navigate complex trade-offs:

- **MongoDB Atlas is Expensive & Heavy:** Dedicated clusters (M10, M20) cost **\$60 to \$500+/month** even when completely idle, require complex VPC peering, and suffer from high cross-region latency.
- **Fragmented Data Architecture:** Teams must stitch together separate vendors—a document database (MongoDB) + an object storage service (AWS S3) + a CDN + a caching layer—multiplying DevOps overhead and security surface area.
- **AI Agent Inefficiency:** Large Language Models and AI agents need fast, lightweight HTTP/REST endpoints rather than heavyweight language-specific database drivers.

### The Solution: EasyDB
**EasyDB** unifies schemaless JSON documents (NoSQL), relational SQL tables and object storage (files & media) into a single, high-performance edge database engine. 

- **Sub-15ms Global Latency:** Runs directly across 300+ global edge locations worldwide close to end users.
- **All-in-One Engine:** Manage JSON collections, SQL tables and object storage (images, PDFs, assets up to 100MB) from a single endpoint.
- **Zero Idle Fees:** True pay-as-you-grow serverless economics with zero cluster provisioning or idle VM costs.

---

## 2. Core Capabilities

### ⚡ Sub-Millisecond Edge Query Acceleration
Every collection and document is accelerated by EasyDB's proprietary edge indexing catalog, routing and serving document lookups in sub-milliseconds without cold starts or cluster spin-up delays.

### 📦 Infinite Schemaless JSON Document Store
Store rich, nested JSON documents without migrations or predefined schemas. Perfect for rapid prototyping, e-Commerce catalogs, dynamic user profiles, and high-velocity IoT telemetry.

### 🗄️ Relational SQL
Create typed tables and run inserts, filtered/ordered/paged selects, updates and deletes over REST. Every tenant gets a private SQL namespace; raw SQL is never accepted, so one tenant can never reach another's tables. Per-plan storage, table-count and monthly row-read/write quotas apply.

### 🖼️ Built-In Object Storage
Upload images, PDFs, videos, and documents directly to EasyDB (up to 100MB per file). Assets are automatically indexed and served with direct, accelerated download streaming—eliminating the need to configure AWS S3 buckets or IAM permissions.

### 🏢 Built-In Multi-Tenancy, Auth & Quota Safeguards
Every tenant gets a cryptographically isolated data partition, provisioned via GitHub OAuth sign-in and authenticated with a static API secret — never a client-trusted header. Plan-based request, storage, file size, and collection guardrails are scoped by the authenticated tenant ID. Request counts are atomic and monthly; storage estimates use the indexed document and media metadata and are intentionally approximate because Azure is the durable storage backend.

### 🤖 AI Agent First
Designed from the ground up for modern AI workflows, enabling autonomous agents to query, write, and manage datasets via lightweight REST interfaces, backed by a ready-made `SKILL.md` and `llms.txt`.

**Using Claude Code, Codex, Copilot or Cursor?** Download [`SKILL.md`](https://easy-db.cloud/SKILL.md) (source: [`agent-docs/SKILL.md`](agent-docs/SKILL.md)) from [easy-db.cloud/agents](https://easy-db.cloud/agents) and hand it to your agent. An [`llms.txt`](https://easy-db.cloud/llms.txt) index is served for AI tool discovery.

---

## 3. Why EasyDB vs. a Multi-Vendor Stack?

| Capability | EasyDB (v2.0) | Typical Multi-Vendor Stack |
| :--- | :--- | :--- |
| **Deployment Model** | **100% Serverless Edge** (300+ Global Cities) | Regional VM Nodes (M10, M20, M30) |
| **Global Query Latency** | **< 15ms** worldwide | 80ms – 250ms+ cross-region |
| **NoSQL + SQL + Object Storage** | **All three, one API key** | Three vendors, three SDKs |
| **Object Storage** | **Built-in** (up to 100MB per file) | Requires separate S3-style bucket + CDN |
| **Base Monthly Cost** | **\$0.00** (Pay only for actual usage) | \$60 – \$500+/mo baseline idle fees |
| **Setup & Provisioning** | **Instant (Zero provisioning)** | 5 – 15 minutes cluster provisioning |
| **Multi-Tenancy** | **GitHub OAuth-provisioned, API-key-authenticated isolation** | Requires manual multi-db / collection routing |
| **AI Agent Support** | **Plain REST + Ready-made SKILL.md** | Requires heavy Python/Node.js drivers |

---

## 4. Interactive Live Playground

EasyDB includes a built-in real-time interactive playground live on production:

👉 **[Launch EasyDB Live Playground](https://easy-db.cloud#demo)**

### Live E-Commerce Test Dataset
Developers and evaluators can immediately test EasyDB using a pre-configured e-Commerce product catalog containing realistic products with IDs, categories, pricing, stock levels, and descriptions:

- **1-Click Seed:** Click `🚀 Seed eCommerce Demo (6 Products)` to insert sample items into your collection.
- **Real-Time CRUD:** Execute live `Insert`, `Find`, `Update`, and `Delete` requests with millisecond response timing.
- **SQL Testing:** Click `🚀 Seed SQL Demo` on the SQL tab, then run `Insert`, `Select` (with `where` filters), `Update` and `Delete` against a live table.
- **Object Storage Testing:** Upload and download binary files up to 100MB with client-side safeguards.

---

## 5. API Reference

All requests interact with EasyDB via clean, developer-friendly REST endpoints.

### 📄 NoSQL Document APIs

#### 1. Insert / Upsert Document
```bash
curl -X POST https://easy-db.cloud/api/v1/insert \
  -H "x-tenant-id: demo_store" \
  -H "Content-Type: application/json" \
  -d '{
    "collection": "products",
    "id": "prod_001",
    "data": {
      "productId": "PROD-001",
      "name": "Wireless Noise-Cancelling Headphones",
      "category": "Electronics",
      "price": 149.99,
      "quantity": 85,
      "description": "Over-ear headphones with 30hr battery and ANC.",
      "inStock": true
    }
  }'
```

#### 2. Query Collection Documents
```bash
curl -X POST https://easy-db.cloud/api/v1/find \
  -H "x-tenant-id: demo_store" \
  -H "Content-Type: application/json" \
  -d '{ "collection": "products" }'
```

#### 3. Update Existing Document
```bash
curl -X PUT https://easy-db.cloud/api/v1/update \
  -H "x-tenant-id: demo_store" \
  -H "Content-Type: application/json" \
  -d '{
    "collection": "products",
    "id": "prod_001",
    "data": { "price": 129.99, "quantity": 90 }
  }'
```

#### 4. Delete Document
```bash
curl -X DELETE https://easy-db.cloud/api/v1/delete \
  -H "x-tenant-id: demo_store" \
  -H "Content-Type: application/json" \
  -d '{
    "collection": "products",
    "id": "prod_001"
  }'
```

---

### 🗄️ Relational SQL APIs

All SQL routes accept `x-tenant-id: demo_store` (shared sandbox) or `Authorization: Bearer <key>` (your private tenant). Raw SQL is not accepted; values are always bound parameters.

```bash
# Create a table (types: TEXT, INTEGER, REAL, NUMERIC, BLOB)
curl -X POST https://easy-db.cloud/api/v1/sql/tables -H "x-tenant-id: demo_store" -H "Content-Type: application/json" \
  -d '{"table":"products","columns":[{"name":"id","type":"INTEGER","primaryKey":true},{"name":"name","type":"TEXT","notNull":true},{"name":"price","type":"REAL"}]}'

# Insert rows (max 100 per call)
curl -X POST https://easy-db.cloud/api/v1/sql/insert -H "x-tenant-id: demo_store" -H "Content-Type: application/json" \
  -d '{"table":"products","rows":[{"id":1,"name":"Headphones","price":149.99}]}'

# Select (operators: eq, ne, gt, gte, lt, lte, like, in)
curl -X POST https://easy-db.cloud/api/v1/sql/select -H "x-tenant-id: demo_store" -H "Content-Type: application/json" \
  -d '{"table":"products","where":{"price":{"gt":100}},"orderBy":"price","order":"desc","limit":10}'

# Update / Delete (a where clause is required)
curl -X PUT https://easy-db.cloud/api/v1/sql/update -H "x-tenant-id: demo_store" -H "Content-Type: application/json" \
  -d '{"table":"products","set":{"price":139.99},"where":{"id":1}}'
curl -X DELETE https://easy-db.cloud/api/v1/sql/delete -H "x-tenant-id: demo_store" -H "Content-Type: application/json" \
  -d '{"table":"products","where":{"id":1}}'
```

Also: `GET /api/v1/sql/tables` (list), `DELETE /api/v1/sql/tables` (drop), `GET /api/v1/sql/usage` (registered keys).

### 🖼️ Object Storage APIs (Max 100MB)

#### 5. Upload Media File
```bash
curl -X POST https://easy-db.cloud/api/v1/media/upload \
  -H "x-tenant-id: demo_store" \
  -F "file=@product-showcase.jpg"
```

#### 6. Download Media File
```bash
curl -OJ "https://easy-db.cloud/api/v1/media/download?filename=product-showcase.jpg" \
  -H "x-tenant-id: demo_store"
```

#### 7. List Tenant Media Files
```bash
curl -X GET "https://easy-db.cloud/api/v1/media/list" \
  -H "x-tenant-id: demo_store"
```

#### 8. Delete Media File
```bash
curl -X DELETE "https://easy-db.cloud/api/v1/media/delete?filename=product-showcase.jpg" \
  -H "x-tenant-id: demo_store"
```

---

### 🔐 Authentication & Registration APIs

Registered developers authenticate with `Authorization: Bearer <api_secret>` instead of `x-tenant-id`, and get their own isolated tenant, quotas, and media namespace.

#### 9. Register / Sign In with GitHub
```
GET https://easy-db.cloud/api/v1/auth/github/login
```
Redirects to GitHub OAuth. On first login this provisions a new tenant and shows your `edb_live_...` API secret **once** — save it immediately.

#### 10. Verify Key / Inspect Account
```bash
curl https://easy-db.cloud/api/v1/auth/me \
  -H "Authorization: Bearer edb_live_your_secret_key"
```

#### 11. Update Contact Email
```bash
curl -X POST https://easy-db.cloud/api/v1/auth/email \
  -H "Authorization: Bearer edb_live_your_secret_key" \
  -H "Content-Type: application/json" \
  -d '{ "email": "you@example.com" }'
```

#### 12. Rotate a Lost or Compromised API Secret
```bash
curl -X POST https://easy-db.cloud/api/v1/auth/rotate-key \
  -H "Authorization: Bearer edb_live_your_current_secret_key"
```

### 📊 Developer Dashboard

```
https://easy-db.cloud/dashboard
```
Log in with GitHub and manage your account in the browser: see your tenant ID, a masked hint of your current API secret, one-click key rotation (the real recovery path if you've lost your key — no Bearer access required), live usage against your plan's quotas, and a side-by-side comparison of all three pricing tiers.

#### 16. Admin Console
```
https://easy-db.cloud/admin
```
Username/password protected. Shows MRR/ARR, tenants (ID, email, plan, usage), and lets you block/unblock, delete, change plan, tag/annotate tenants and export CSV. Configure credentials as Worker secrets and apply the new migration:
```bash
npx wrangler secret put ADMIN_USERNAME
npx wrangler secret put ADMIN_PASSWORD
npm run db:migrate:remote
```
Sign-in is locked per IP after 5 failed attempts for 15 minutes.

**PayPal is the source of truth for billing.** D1 only caches it: every PayPal subscription/payment webhook re-reads the subscription from PayPal, and a 15-minute scheduled job refreshes any stale ones, so plans, prices and payment status follow PayPal automatically (the dashboard's *Refresh from PayPal* button is optional). Subscribe the webhook to `BILLING.SUBSCRIPTION.*` and `PAYMENT.SALE.COMPLETED`. Subscriptions created in a different PayPal environment than the one configured (Sandbox vs Live) are cleared automatically and the tenant returns to Free, so switching only requires changing the PayPal wiring (`PAYPAL_API_BASE`, client ID/secret, plan IDs, webhook ID).

---

## 6. Pricing & Quota Tiers

EasyDB runs on serverless Cloudflare Workers + D1 + Azure Table/Blob Storage, so marginal costs stay low enough to pass on as a generous free tier and aggressively cheap paid tiers versus managed multi-vendor stacks.

| Feature | 🟢 Free | ⚡ Developer | 🚀 Scale |
| --- | --- | --- | --- |
| **Price** | $0/mo | $9/mo | $29/mo |
| **Requests / month** | 100,000 | 2,000,000 | 10,000,000 |
| **NoSQL Document Storage** | 500 MB | 10 GB | 50 GB |
| **Object Storage** | 1 GB | 25 GB | 250 GB |
| **SQL Storage** | 50 MB | 1 GB | 5 GB |
| **SQL Rows Read / month** | 5M | 100M | 1B |
| **SQL Rows Written / month** | 100k | 2M | 10M |
| **SQL Tables** | Up to 10 | Up to 50 | Up to 200 |
| **Max File Upload Size** | 10 MB | 50 MB | 250 MB |
| **Collections** | Up to 10 | Up to 50 | Unlimited |
| **Support** | Community | Email | Priority |

NoSQL/SQL/object storage, max file size, collection and table limits, SQL row read/write counts and the monthly request count are all enforced live, with current usage shown on the dashboard.

Upgrading is a one-click PayPal Subscriptions checkout from the [Pricing](/pricing) page or your [Dashboard](/dashboard) — no card details ever touch EasyDB's servers. On successful payment, PayPal notifies EasyDB via a verified webhook and your tenant is upgraded automatically within seconds. *(Currently running against PayPal Sandbox while in testing.)*

---

## 7. Public Preview Sandbox Safeguards

To prevent abuse during the open evaluation phase, the public sandbox operates with the following guardrails:

- **Locked Tenant:** All public evaluation requests are scoped to the `demo_store` partition.
- **Document Quota:** Maximum **100 documents** per evaluation instance.
- **Media Quota:** Maximum **5 files** (up to 100MB per file).
- **SQL Quota:** Up to **5 tables**, 256 KB of data and 20,000 rows written per month, shared by all sandbox visitors.
- **Self-Service Onboarding:** Want your own isolated tenant instead of the shared sandbox? [Sign in with GitHub](https://easy-db.cloud/api/v1/auth/github/login) to get a dedicated tenant, your own API secret, and plan-based quotas — no sandbox limits.

---

## 8. Product Roadmap

- [x] **Phase 1: Global Edge Engine** — Distributed NoSQL JSON engine and unified binary media cloud.
- [x] **Phase 2: Developer Experience & Live Demo** — Interactive real-time playground with e-Commerce dataset.
- [x] **Phase 3: Sandbox Guardrails** — Automated quota management and tenant protection.
- [x] **Phase 4: Self-Service Tenant Registration** — GitHub OAuth sign-in, automated tenant provisioning, and API secret issuance.
- [x] **Phase 4.5: Developer Dashboard** — session-based login/logout, one-click API key rotation, live usage vs. plan quotas, and subscription plan visibility.
- [x] **Phase 4.75: PayPal Subscription Billing** — one-click upgrade checkout, webhook-verified automatic tier activation/downgrade. *(Currently Sandbox; Live mode pending a few config changes once validated.)*
- [x] **Phase 4.8: Admin Operations Dashboard** — tenant and PayPal billing overview, subscription dates, SQL usage, 50/70/100% quota notifications, tenant pause/resume, and provider-console links.

---

## 9. Database Schema Migrations

EasyDB's D1 schema lives in `migrations/*.sql` and is managed with Wrangler's built-in migration tool — not a hand-run `schema.sql`, which previously let the production database drift out of sync with the code (a missing `paypal_subscription_id` column silently broke PayPal tier upgrades for this exact reason).

- Create a new migration: `npm run db:migrate:new -- <short_description>` (scaffolds the next numbered file in `migrations/`).
- Apply to your local dev database: `npm run db:migrate:local`.
- Apply to production: `npm run db:migrate:remote` — also runs automatically as part of the `deploy` GitHub Actions job on every push to `main`, before the Worker itself is deployed, so local and production schemas can no longer silently diverge.

## 10. Live Links & Resources

- **Production URL:** [https://easy-db.cloud](https://easy-db.cloud)
- **Pricing & Plans:** [https://easy-db.cloud/pricing](https://easy-db.cloud/pricing)
- **Developer Dashboard:** [https://easy-db.cloud/dashboard](https://easy-db.cloud/dashboard) *(sign in with GitHub)*
- **Service Status:** [https://easy-db.cloud/#status](https://easy-db.cloud/#status)
- **Branded Logo Asset:** [https://easy-db.cloud/api/v1/icon](https://easy-db.cloud/api/v1/icon)
- **Hero Graphic:** [https://easy-db.cloud/api/v1/hero](https://easy-db.cloud/api/v1/hero)

---

<div align="center">
  <p>© 2026 EasyDB. All rights reserved.</p>
</div>
