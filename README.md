<div align="center">

# EasyDB 
### The Edge-Native NoSQL & Media Database
**A MongoDB Alternative — Cheaper, Faster, Better!**


**The direct, zero-cluster MongoDB alternative with sub-15ms edge lookups, infinite document scale, and built-in binary media storage.**

[![Live Status](https://img.shields.io/badge/Status-Live%20v1.0-emerald?style=for-the-badge)](https://easydb.hashim-hilal-0eb.workers.dev)
[![Architecture](https://img.shields.io/badge/Architecture-Edge%20Serverless-cyan?style=for-the-badge)](https://easydb.hashim-hilal-0eb.workers.dev)
[![Cost](https://img.shields.io/badge/Idle%20Cost-%240.00%2Fmo-teal?style=for-the-badge)](https://easydb.hashim-hilal-0eb.workers.dev)
[![AI Ready](https://img.shields.io/badge/AI%20%26%20MCP-Ready-purple?style=for-the-badge)](https://easydb.hashim-hilal-0eb.workers.dev)

<br/>

![EasyDB Hero Architecture](https://easydb.hashim-hilal-0eb.workers.dev/api/v1/hero)

<br/>

[**Explore Live Playground**](https://easydb.hashim-hilal-0eb.workers.dev#demo) • [**API Reference**](#api-reference) • [**Comparison Matrix**](#why-easydb-vs-mongodb-atlas) • [**Product Roadmap**](#product-roadmap)

---

</div>

## 1. Executive Summary & Problem Space

Modern web applications, mobile platforms, and AI agents require high-velocity unstructured data persistence and media storage. However, the existing database landscape forces teams to navigate complex trade-offs:

- **MongoDB Atlas is Expensive & Heavy:** Dedicated clusters (M10, M20) cost **\$60 to \$500+/month** even when completely idle, require complex VPC peering, and suffer from high cross-region latency.
- **Fragmented Data Architecture:** Teams must stitch together separate vendors—a document database (MongoDB) + an object storage service (AWS S3) + a CDN + a caching layer—multiplying DevOps overhead and security surface area.
- **AI Agent Inefficiency:** Large Language Models and AI agents need fast, lightweight HTTP/REST endpoints rather than heavyweight language-specific database drivers.

### The Solution: EasyDB
**EasyDB** unifies schemaless JSON document persistence and binary media assets into a single, high-performance edge database engine. 

- **Sub-15ms Global Latency:** Runs directly across 300+ global edge locations worldwide close to end users.
- **All-in-One Engine:** Manage your JSON collections and media files (images, PDFs, assets up to 100MB) from a single endpoint.
- **Zero Idle Fees:** True pay-as-you-grow serverless economics with zero cluster provisioning or idle VM costs.

---

## 2. Core Capabilities

### ⚡ Sub-Millisecond Edge Query Acceleration
Every collection and document is accelerated by EasyDB's proprietary edge indexing catalog, routing and serving document lookups in sub-milliseconds without cold starts or cluster spin-up delays.

### 📦 Infinite Schemaless JSON Document Store
Store rich, nested JSON documents without migrations or predefined schemas. Perfect for rapid prototyping, e-Commerce catalogs, dynamic user profiles, and high-velocity IoT telemetry.

### 🖼️ Built-In Binary Media Cloud
Upload images, PDFs, videos, and documents directly to EasyDB (up to 100MB per file). Assets are automatically indexed and served with direct, accelerated download streaming—eliminating the need to configure AWS S3 buckets or IAM permissions.

### 🏢 Built-In Multi-Tenancy & Quota Safeguards
Native tenant isolation ensures complete data separation for multi-tenant SaaS applications. Built-in quota guardrails protect against runaway resource consumption.

### 🤖 AI Agent & MCP First
Designed from the ground up for modern AI workflows, enabling autonomous agents to query, write, and manage datasets via lightweight REST interfaces and Model Context Protocol (MCP) integrations.

---

## 3. Why EasyDB vs. MongoDB Atlas?

| Capability | EasyDB (Next-Gen) | Traditional MongoDB Atlas |
| :--- | :--- | :--- |
| **Deployment Model** | **100% Serverless Edge** (300+ Global Cities) | Regional VM Nodes (M10, M20, M30) |
| **Global Query Latency** | **< 15ms** worldwide | 80ms – 250ms+ cross-region |
| **Binary & Media Storage** | **Native Built-In Media Cloud** (up to 100MB) | Requires separate AWS S3 + CloudFront |
| **Base Monthly Cost** | **\$0.00** (Pay only for actual usage) | \$60 – \$500+/mo baseline idle fees |
| **Setup & Provisioning** | **Instant (Zero provisioning)** | 5 – 15 minutes cluster provisioning |
| **Multi-Tenancy** | **Native header-level tenant isolation** | Requires manual multi-db / collection routing |
| **AI Agent / MCP Support** | **Native REST & Direct Tool Calling** | Requires heavy Python/Node.js drivers |

---

## 4. Interactive Live Playground

EasyDB includes a built-in real-time interactive playground live on production:

👉 **[Launch EasyDB Live Playground](https://easydb.hashim-hilal-0eb.workers.dev#demo)**

### Live E-Commerce Test Dataset
Developers and evaluators can immediately test EasyDB using a pre-configured e-Commerce product catalog containing realistic products with IDs, categories, pricing, stock levels, and descriptions:

- **1-Click Seed:** Click `🚀 Seed eCommerce Demo (6 Products)` to insert sample items into your collection.
- **Real-Time CRUD:** Execute live `Insert`, `Find`, `Update`, and `Delete` requests with millisecond response timing.
- **Media Testing:** Upload and download binary files up to 100MB with client-side safeguards.

---

## 5. API Reference

All requests interact with EasyDB via clean, developer-friendly REST endpoints.

### 📄 NoSQL Document APIs

#### 1. Insert / Upsert Document
```bash
curl -X POST https://easydb.hashim-hilal-0eb.workers.dev/api/v1/insert \
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
curl -X POST https://easydb.hashim-hilal-0eb.workers.dev/api/v1/find \
  -H "x-tenant-id: demo_store" \
  -H "Content-Type: application/json" \
  -d '{ "collection": "products" }'
```

#### 3. Update Existing Document
```bash
curl -X PUT https://easydb.hashim-hilal-0eb.workers.dev/api/v1/update \
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
curl -X DELETE https://easydb.hashim-hilal-0eb.workers.dev/api/v1/delete \
  -H "x-tenant-id: demo_store" \
  -H "Content-Type: application/json" \
  -d '{
    "collection": "products",
    "id": "prod_001"
  }'
```

---

### 🖼️ Binary Media Storage APIs (Max 100MB)

#### 5. Upload Media File
```bash
curl -X POST https://easydb.hashim-hilal-0eb.workers.dev/api/v1/media/upload \
  -H "x-tenant-id: demo_store" \
  -F "file=@product-showcase.jpg"
```

#### 6. Download Media File
```bash
curl -OJ "https://easydb.hashim-hilal-0eb.workers.dev/api/v1/media/download?filename=product-showcase.jpg" \
  -H "x-tenant-id: demo_store"
```

#### 7. List Tenant Media Files
```bash
curl -X GET "https://easydb.hashim-hilal-0eb.workers.dev/api/v1/media/list" \
  -H "x-tenant-id: demo_store"
```

#### 8. Delete Media File
```bash
curl -X DELETE "https://easydb.hashim-hilal-0eb.workers.dev/api/v1/media/delete?filename=product-showcase.jpg" \
  -H "x-tenant-id: demo_store"
```

---

## 6. Public Preview Sandbox Safeguards

To prevent abuse during the open evaluation phase, the public sandbox operates with the following guardrails:

- **Locked Tenant:** All public evaluation requests are scoped to the `demo_store` partition.
- **Document Quota:** Maximum **100 documents** per evaluation instance.
- **Media Quota:** Maximum **5 files** (up to 100MB per file).
- **Self-Service Onboarding:** Dedicated custom tenant provisioning with configurable quotas and API key authentication will be available in the upcoming release.

---

## 7. Product Roadmap

- [x] **Phase 1: Global Edge Engine** — Distributed NoSQL JSON engine and unified binary media cloud.
- [x] **Phase 2: Developer Experience & Live Demo** — Interactive real-time playground with e-Commerce dataset.
- [x] **Phase 3: Sandbox Guardrails** — Automated quota management and tenant protection.
- [ ] **Phase 4: Self-Service Tenant Registration** — API key generation, automated tenant provisioning, and custom quotas.
- [ ] **Phase 5: Model Context Protocol (MCP) Server** — Native AI agent tool integration for autonomous data workflows.
- [ ] **Phase 6: MongoDB Wire Protocol Emulation** — Direct compatibility with native MongoDB drivers, Compass, and Mongoose SDK.

---

## 8. Live Links & Resources

- **Production URL:** [https://easydb.hashim-hilal-0eb.workers.dev](https://easydb.hashim-hilal-0eb.workers.dev)
- **Service Health:** [https://easydb.hashim-hilal-0eb.workers.dev/health](https://easydb.hashim-hilal-0eb.workers.dev/health)
- **Branded Logo Asset:** [https://easydb.hashim-hilal-0eb.workers.dev/api/v1/icon](https://easydb.hashim-hilal-0eb.workers.dev/api/v1/icon)
- **Hero Graphic:** [https://easydb.hashim-hilal-0eb.workers.dev/api/v1/hero](https://easydb.hashim-hilal-0eb.workers.dev/api/v1/hero)

---

<div align="center">
  <p>© 2026 EasyDB. All rights reserved.</p>
</div>
