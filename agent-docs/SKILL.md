---
name: easydb
description: Use when the user wants to store, query, update or delete JSON documents or upload/download media files with EasyDB (easy-db.cloud), a serverless edge NoSQL + media REST API. Covers auth, every endpoint, quotas and common mistakes.
---

# EasyDB

EasyDB is a REST API at `https://easy-db.cloud` for schemaless JSON documents (grouped in collections) and binary media files. No SDK or driver is needed: use plain HTTPS with `curl` or `fetch`.

## Setup: pick an auth mode

| Mode | Header | Use for |
| --- | --- | --- |
| Sandbox | `x-tenant-id: demo_store` | Trying the API with no signup. Shared and public: never store private data. |
| Registered | `Authorization: Bearer edb_live_...` | Real projects. Private tenant, plan quotas. |

- Any `x-tenant-id` other than `demo_store` returns 403. Do not invent tenant IDs.
- If an `Authorization: Bearer` header is sent it is used instead of `x-tenant-id`.
- Sandbox limits: 100 documents and 5 media files in total.
- API keys come from signing in with GitHub at `https://easy-db.cloud/api/v1/auth/github/login` (browser only). The key is shown once. **You cannot create a key yourself: ask the user for it.**
- Read the key from an environment variable such as `EASYDB_API_KEY`. Never hardcode it, print it or commit it.

Check a key and see its quotas:

```bash
curl https://easy-db.cloud/api/v1/auth/me -H "Authorization: Bearer $EASYDB_API_KEY"
```

## Document endpoints

All take `Content-Type: application/json`. `collection` defaults to `"items"` if omitted. Collections are created implicitly on first insert.

| Action | Request | Body |
| --- | --- | --- |
| Insert / upsert | `POST /api/v1/insert` | `{"collection","id","data":{...}}` |
| Find | `POST /api/v1/find` | `{"collection"}` or `{"collection","id"}` |
| Update | `PUT /api/v1/update` | `{"collection","id","data":{...}}` |
| Delete | `DELETE /api/v1/delete` | `{"collection","id"}` |

```bash
BASE=https://easy-db.cloud
AUTH="Authorization: Bearer $EASYDB_API_KEY"   # or: "x-tenant-id: demo_store"

curl -X POST $BASE/api/v1/insert -H "$AUTH" -H "Content-Type: application/json" \
  -d '{"collection":"products","id":"prod_001","data":{"name":"Headphones","price":149.99}}'
# -> {"success":true,"insertedId":"prod_001","azureSynced":true}

curl -X POST $BASE/api/v1/find -H "$AUTH" -H "Content-Type: application/json" \
  -d '{"collection":"products"}'
# -> {"success":true,"count":1,"documents":[{"_id":"prod_001","name":"Headphones","price":149.99,"_updatedAt":"..."}]}

curl -X PUT $BASE/api/v1/update -H "$AUTH" -H "Content-Type: application/json" \
  -d '{"collection":"products","id":"prod_001","data":{"name":"Headphones","price":129.99}}'

curl -X DELETE $BASE/api/v1/delete -H "$AUTH" -H "Content-Type: application/json" \
  -d '{"collection":"products","id":"prod_001"}'
```

Behavior to rely on:

- **Insert is an upsert.** The same `id` overwrites the existing document. If `id` is omitted a UUID is generated and returned as `insertedId`.
- **Update replaces the whole document, it does not merge.** To change one field, `find` the document first, modify it, then send the complete object back in `data`.
- **Find has no filters, sorting or pagination.** It returns every document in the collection (or one, by `id`). Filter client-side. Keep collections reasonably small.
- Returned documents carry `_id` and `_updatedAt` metadata fields. Do not send them back inside `data`.
- Update does not report an error if the `id` does not exist.
- `azureSynced: false` means the fast index write succeeded but the durable copy failed. It is not an API failure.

## Media endpoints

Files are stored per tenant and identified by filename. Uploading the same name overwrites.

```bash
# Upload: multipart (field name must be "file")
curl -X POST $BASE/api/v1/media/upload -H "$AUTH" -F "file=@photo.jpg"
# Also accepted: raw binary body with ?filename=photo.jpg and a Content-Type header,
# or JSON {"fileName":"photo.jpg","base64Content":"...","contentType":"image/jpeg"}

curl "$BASE/api/v1/media/list" -H "$AUTH"
curl -OJ "$BASE/api/v1/media/download?filename=photo.jpg" -H "$AUTH"
curl -X DELETE "$BASE/api/v1/media/delete?filename=photo.jpg" -H "$AUTH"
```

- Download and delete take `filename` as a **query parameter**, not a JSON body.
- Fetch files only through `/media/download`; the underlying storage location is not exposed.
- If no filename is available on a raw upload, one like `asset_<timestamp>` is generated.

## Plans and quotas (registered keys)

| Plan | Requests / month | Document storage | Media storage | Max file size | Collections |
| --- | --- | --- | --- | --- | --- |
| Free | 100,000 | 500 MB | 1 GB | 10 MB | 10 |
| Developer ($9) | 2,000,000 | 10 GB | 25 GB | 50 MB | 50 |
| Scale ($29) | 10,000,000 | 50 GB | 250 GB | 250 MB | unlimited |

Exceeding any limit returns **HTTP 429** with a `quota` object (`status: "LIMIT_REACHED"`). Do not retry in a loop: tell the user, delete data, or suggest an upgrade at `https://easy-db.cloud/pricing`. Exact limits for a key are available from `GET /api/v1/auth/me`.

## Errors

| Status | Meaning |
| --- | --- |
| 400 | Missing field (for example no `id` on update/delete, no `filename`). |
| 401 | `Authorization` header expected but missing (account endpoints). |
| 403 | Invalid or revoked API key, or a non-`demo_store` `x-tenant-id`. |
| 404 | Media file not found. |
| 429 | Quota exceeded (see above). |

Error bodies are JSON: `{"error":"..."}`.

## Guidance for agents

1. Ask the user whether to use the sandbox or their API key before writing any data.
2. Start with `GET /api/v1/auth/me` (registered) or a `find` on a test collection (sandbox) to confirm access.
3. Put the base URL and key in environment variables so generated code is portable.
4. Do not call the account, billing or dashboard endpoints (`/api/v1/auth/*` except `/me`, `/api/v1/billing/*`, `/dashboard`). They are for humans in a browser, and rotating a key invalidates the current one.
5. Never delete or overwrite data the user did not ask you to change.

## More

- Docs and live playground: https://easy-db.cloud
- Pricing: https://easy-db.cloud/pricing
- Agent resources: https://easy-db.cloud/agents
