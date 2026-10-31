# AGENTS.md - guide for AI agents working on EasyDB

EasyDB (https://easy-db.cloud) is a one-stop backend for "vibe coders": a NoSQL document store, a relational SQL API and object storage behind one HTTP API. It is a single Cloudflare Worker (TypeScript). Keep it simple for end users: friendly messages, no raw errors shown on the website.

## Commands

```bash
npm ci                    # install
npm test                  # node --test (all tests, ~26)
npx tsc --noEmit -p .     # typecheck (CI runs this too)
npm run dev               # wrangler dev
npm run db:migrate:new    # new D1 migration (put it in migrations/)
```

CI (`.github/workflows/deploy.yml`): "Validate & Type Check" plus a preview deploy on PRs. Pushing to `main` deploys to production. Workflow: branch off `main`, open a PR, merge with a merge commit. Commits include the trailer `Co-authored-by: Copilot <223556219+Copilot@users.noreply.github.com>`.

## Layout

| Path | Purpose |
|---|---|
| `src/index.ts` | Worker entry: routing, NoSQL documents, media, cron, `Env` type |
| `src/auth.ts` | API keys, GitHub OAuth, `resolveTenantContext` (derives the tenant ID) |
| `src/tiers.ts` | Plan limits (free / developer / scale) |
| `src/sql.ts` | `/api/v1/sql/*` route handler, quota checks, `measureStorage` |
| `src/sqlclient.ts` | Turso (Hrana over HTTP) client: `sqlBatch`, `sqlTransaction`, `SqlError`, `SQL_LIMITS`, structured builders |
| `src/sqlrewrite.ts` | **Security-critical** raw-SQL tokenizer and tenant rewriter |
| `src/azure.ts` | Azure Table and Blob Storage (documents and media) |
| `src/paypal.ts`, `src/paypal-sync.ts` | PayPal subscriptions and sync |
| `src/frontend.ts` | Landing page, Playground, API reference, dashboard, admin HTML (one big template file) |
| `migrations/` | D1 schema migrations (usage counters, tenants, PayPal, SQL usage) |
| `agent-docs/` | `SKILL.md` and `llms.txt`, served to other AI agents. Keep in sync with the README |
| `tests/` | `node --test` suites (see below) |

Bindings (`wrangler.toml`): D1 `DB` (metadata, usage), KV `API_KEYS`. Secrets (`.dev.vars` locally, never commit): `SQL_DATABASE_URL`, `SQL_AUTH_TOKEN` (Turso), Azure storage key, PayPal and GitHub secrets.

## Tenant model

Every request resolves to a tenant ID, either from the API key or, with no key, the shared `demo_store` sandbox. A request sending an `x-tenant-id` other than `demo_store` without a key gets 403. Nothing client-supplied should be trusted as the tenant.

## SQL design (most important to understand)

- All tenants share one Turso database. A tenant's table `products` is physically `t<sha256(tenantId)[:16]>__products` (`tenantPrefix`, `physicalTable`). The prefix is the only isolation boundary.
- Routes: structured JSON (`/sql/tables`, `insert`, `select`, `update`, `delete`), `/sql/batch` (atomic list of structured operations) and `/sql/query` (native SQL, either `{sql, args}` or `{statements: [...]}` as one atomic transaction).
- Native SQL goes through `sqlrewrite.ts`: tokenize, reject anything unrecognised, rewrite table names to the tenant prefix. Allowed: SELECT, INSERT, REPLACE, UPDATE, DELETE, CREATE TABLE, ALTER TABLE, DROP TABLE. One statement per query, `?` placeholders only. Rejected: comments, `;`, named or numbered params, schema-qualified names, `sqlite_*`, table-valued functions, `load_extension`/`readfile`/`writefile` etc.
- Forbidden commands (CREATE/DROP DATABASE, TRUNCATE, PRAGMA, ATTACH, indexes, views, triggers, WITH, EXPLAIN, BEGIN/COMMIT...) return **403 with a friendly `{error, hint}`** from `explainForbidden`. Format problems return 400. Users may freely create, alter and drop their own tables.
- Transactions run as Hrana pipeline steps: BEGIN, each statement, COMMIT, with ROLLBACK as fallback. Error text strips tenant prefixes and numbers statements from 1.
- Quotas (rows read, rows written, table count, storage) are checked before the call; storage is re-measured after raw writes, so a write can overshoot by one request. Limits: 25 statements per request, 1000 rows per statement, 100 args.
- Known limits: a table or column named `index` or `view` is rejected. Storage accounting for structured routes is an estimate.

**If you change `sqlrewrite.ts`, run `tests/sql-tenant-isolation.test.mjs` and keep it passing.** Any new accepted syntax must either rewrite its table names or be rejected.

## Tests

- `sql-tenant-isolation.test.mjs`: uses SQLite `EXPLAIN` as an independent oracle to prove accepted statements only touch the attacker's own tables. About 140 attacks plus a 20k-statement deterministic fuzzer. It was mutation-tested: removing a rewrite rule makes it fail.
- `sql-batch-query.test.mjs`: functional tests for `/sql/query` and `/sql/batch` against a fake Hrana backend built on `node:sqlite`.
- `sql.test.mjs`: structured builders, plus a live Turso test that only runs when `.dev.vars` has `SQL_DATABASE_URL` and `SQL_AUTH_TOKEN`. It can fail on network timeouts.
- `admin.test.mjs`, `quota-accounting.test.mjs`: admin, quota and usage accounting.
- Tests bundle the TypeScript with esbuild. A one-off script that imports esbuild must live inside the repo (not `/tmp`).

## Conventions

- Playground and docs live in `src/frontend.ts`. The page is one template string, so inside it a literal newline in browser JS must be written `\\n`. After editing, render the page and check the inline scripts parse.
- Never show raw errors in the website demos. Use friendly messages (see `sqlTour`, `sqlTransactionDemo`).
- When behaviour changes, update `README.md`, `agent-docs/SKILL.md` and the API cards in `src/frontend.ts`.
- Prefer small, verified changes: run `npm test` and `npx tsc --noEmit -p .` before committing.
- Smoke-testing production: use the `demo_store` sandbox (5 tables max), use a throwaway table and drop it afterwards.
