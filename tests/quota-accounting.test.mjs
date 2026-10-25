import assert from "node:assert/strict";
import { DatabaseSync } from "node:sqlite";
import { after, before, test } from "node:test";
import { readdir, readFile, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { build } from "esbuild";

const root = path.resolve(import.meta.dirname, "..");
const authBundle = path.join(os.tmpdir(), `easydb-auth-test-${process.pid}.mjs`);
const tiersBundle = path.join(os.tmpdir(), `easydb-tiers-test-${process.pid}.mjs`);
const workerBundle = path.join(os.tmpdir(), `easydb-worker-test-${process.pid}.mjs`);
let database;
let auth;
let tiers;
let worker;
let requestUsageMigration;

class TestD1Statement {
  constructor(database, sql) {
    this.statement = database.prepare(sql);
    this.values = [];
  }

  bind(...values) {
    this.values = values;
    return this;
  }

  first() {
    return this.statement.get(...this.values) ?? null;
  }

  all() {
    return { results: this.statement.all(...this.values) };
  }

  run() {
    return this.statement.run(...this.values);
  }
}

class TestD1Database {
  constructor(database) {
    this.database = database;
  }

  prepare(sql) {
    return new TestD1Statement(this.database, sql);
  }
}

class TestKVNamespace {
  values = new Map();

  async get(key, options) {
    const value = this.values.get(key) ?? null;
    return options?.type === "json" && value ? JSON.parse(value) : value;
  }

  async put(key, value) {
    this.values.set(key, value);
  }
}

before(async () => {
  await Promise.all([
    build({ entryPoints: [path.join(root, "src/auth.ts")], outfile: authBundle, bundle: true, platform: "node", format: "esm", target: "node22" }),
    build({ entryPoints: [path.join(root, "src/tiers.ts")], outfile: tiersBundle, bundle: true, platform: "node", format: "esm", target: "node22" }),
    build({
      entryPoints: [path.join(root, "src/index.ts")],
      outfile: workerBundle,
      bundle: true,
      platform: "node",
      format: "esm",
      target: "node22",
      loader: { ".md": "text", ".txt": "text" },
      plugins: [{
        name: "small-test-quotas",
        setup(build) {
          build.onLoad({ filter: /\/src\/tiers\.ts$/ }, async ({ path: tiersPath }) => {
            let source = await readFile(tiersPath, "utf8");
            for (const [from, to] of [
              ["docStorageBytes: 500 * MB", "docStorageBytes: 64"],
              ["mediaStorageBytes: 1 * GB", "mediaStorageBytes: 16"],
              ["maxUploadBytes: 10 * MB", "maxUploadBytes: 8"],
            ]) {
              assert.ok(source.includes(from), `Expected test quota source to contain '${from}'`);
              source = source.replace(from, to);
            }
            return { contents: source, loader: "ts" };
          });
        },
      }],
    }),
  ]);
  [auth, tiers, worker] = await Promise.all([
    import(pathToFileURL(authBundle)),
    import(pathToFileURL(tiersBundle)),
    import(pathToFileURL(workerBundle)),
  ]);

  database = new DatabaseSync(":memory:");
  const migrations = (await readdir(path.join(root, "migrations")))
    .filter((name) => name.endsWith(".sql"))
    .sort();
  for (const migration of migrations) {
    const sql = await readFile(path.join(root, "migrations", migration), "utf8");
    database.exec(sql);
    if (migration === "0007_tenant_request_usage.sql") requestUsageMigration = sql;
  }
});

after(async () => {
  database?.close();
  await Promise.all([
    rm(authBundle, { force: true }),
    rm(tiersBundle, { force: true }),
    rm(workerBundle, { force: true }),
  ]);
});

function createEnv() {
  return { DB: new TestD1Database(database), API_KEYS: new TestKVNamespace() };
}

function createTenant(tenantId, tier = "free") {
  database.prepare(
    `INSERT INTO tenants (tenant_id, github_id, github_login, api_key_hash, tier) VALUES (?, ?, ?, ?, ?)`
  ).run(tenantId, `github-${tenantId}`, tenantId, `hash-${tenantId}`, tier);
}

function createWorkerEnv() {
  return {
    ...createEnv(),
    AZURE_STORAGE_ACCOUNT: "test",
    AZURE_STORAGE_ACCESS_KEY: Buffer.from("test-storage-key").toString("base64"),
    AZURE_TABLE_NAME: "easydb",
    AZURE_CONTAINER_NAME: "media",
  };
}

async function addApiTenant(env, tenantId, tier = "free") {
  createTenant(tenantId, tier);
  const apiKey = `test-key-${tenantId}`;
  await env.API_KEYS.put(apiKey, JSON.stringify({
    tenantId,
    email: null,
    githubLogin: tenantId,
    status: "active",
    tier,
  }));
  return apiKey;
}

function apiRequest(env, apiKey, method, pathname, body, headers = {}) {
  return worker.default.fetch(
    new Request(`https://easydb.test${pathname}`, {
      method,
      headers: { Authorization: `Bearer ${apiKey}`, ...headers },
      body,
    }),
    env
  );
}

test("Worker routes enforce update and media quotas and isolate each tenant", async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async () => new Response(null, { status: 201 });
  try {
    const env = createWorkerEnv();
    const alphaKey = await addApiTenant(env, "tenant-route-alpha");
    const betaKey = await addApiTenant(env, "tenant-route-beta");

    const insertResponse = await apiRequest(
      env,
      alphaKey,
      "POST",
      "/api/v1/insert",
      JSON.stringify({ collection: "items", id: "shared", data: { value: "x" } }),
      { "Content-Type": "application/json" }
    );
    assert.equal(insertResponse.status, 200);

    const oversizedUpdate = await apiRequest(
      env,
      alphaKey,
      "PUT",
      "/api/v1/update",
      JSON.stringify({ collection: "items", id: "shared", data: { value: "x".repeat(100) } }),
      { "Content-Type": "application/json" }
    );
    assert.equal(oversizedUpdate.status, 429);
    assert.equal((await oversizedUpdate.json()).quota.status, "LIMIT_REACHED");

    const allowedUpdate = await apiRequest(
      env,
      alphaKey,
      "PUT",
      "/api/v1/update",
      JSON.stringify({ collection: "items", id: "shared", data: { value: "y" } }),
      { "Content-Type": "application/json" }
    );
    assert.equal(allowedUpdate.status, 200);
    assert.equal(
      database.prepare(
        `SELECT document_data FROM mongo_documents WHERE tenant_id = ? AND doc_id = ?`
      ).get("tenant-route-alpha", "shared").document_data,
      '{"value":"y"}'
    );

    const betaInsert = await apiRequest(
      env,
      betaKey,
      "POST",
      "/api/v1/insert",
      JSON.stringify({ collection: "items", id: "shared", data: { value: "beta" } }),
      { "Content-Type": "application/json" }
    );
    assert.equal(betaInsert.status, 200);
    const betaFind = await apiRequest(
      env,
      betaKey,
      "POST",
      "/api/v1/find",
      JSON.stringify({ collection: "items", id: "shared" }),
      { "Content-Type": "application/json" }
    );
    assert.equal((await betaFind.json()).documents[0].value, "beta");

    async function upload(apiKey, filename, size) {
      const form = new FormData();
      form.append("file", new Blob([new Uint8Array(size)]), filename);
      return apiRequest(env, apiKey, "POST", "/api/v1/media/upload", form);
    }

    assert.equal((await upload(alphaKey, "one.bin", 8)).status, 200);
    assert.equal((await upload(alphaKey, "two.bin", 8)).status, 200);
    assert.equal((await upload(alphaKey, "too-large.bin", 9)).status, 413);
    const overStorage = await upload(alphaKey, "third.bin", 1);
    assert.equal(overStorage.status, 429);

    assert.equal((await upload(alphaKey, "one.bin", 1)).status, 200);
    assert.equal(
      database.prepare(
        `SELECT SUM(size) AS total FROM media_files WHERE tenant_id = ?`
      ).get("tenant-route-alpha").total,
      9
    );

    const account = await apiRequest(env, alphaKey, "GET", "/api/v1/auth/me");
    const accountBody = await account.json();
    assert.equal(accountBody.tenantId, "tenant-route-alpha");
    assert.ok(accountBody.usage.requestsThisMonth > 0);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("request increments are atomic, tenant-scoped, and stop at the configured limit", async () => {
  createTenant("tenant-alpha");
  createTenant("tenant-beta");
  const env = createEnv();
  const freeTier = auth.getTier("free");
  const originalLimit = freeTier.requestsPerMonth;
  freeTier.requestsPerMonth = 12;
  try {
    const requests = await Promise.all(
      Array.from({ length: 30 }, () => auth.recordRequestUsage(env, "tenant-alpha", "free"))
    );

    assert.equal(requests.filter((result) => result?.allowed).length, 12);
    assert.equal(requests.filter((result) => result?.allowed === false).length, 18);
    assert.ok(requests.filter((result) => result?.allowed === false).every((result) => result.currentRequests === 12));
    assert.equal(await auth.getMonthlyUsage(env, "tenant-alpha"), 12);
    assert.equal(await auth.getMonthlyUsage(env, "tenant-beta"), 0);
  } finally {
    freeTier.requestsPerMonth = originalLimit;
  }
});

test("legacy KV usage is carried into the new tenant/month counter", async () => {
  createTenant("tenant-legacy");
  const env = createEnv();
  const month = auth.getUsageMonth();
  env.API_KEYS.values.set(`usage:tenant-legacy:${month}`, "99999");

  assert.deepEqual(await auth.recordRequestUsage(env, "tenant-legacy", "free"), {
    allowed: true,
    currentRequests: 100000,
    tier: "free",
  });
  assert.deepEqual(await auth.recordRequestUsage(env, "tenant-legacy", "free"), {
    allowed: false,
    currentRequests: 100000,
    tier: "free",
  });
  assert.equal(await auth.getMonthlyUsage(env, "tenant-legacy"), 100000);
});

test("current D1 plan is used instead of a stale API-key tier", async () => {
  createTenant("tenant-plan", "developer");
  const result = await auth.recordRequestUsage(createEnv(), "tenant-plan", "free");
  assert.equal(result?.tier, "developer");
  assert.equal(result?.allowed, true);
});

test("KV preserves availability and approximate limits when D1 usage tracking fails", async () => {
  const originalError = console.error;
  const freeTier = auth.getTier("free");
  const originalLimit = freeTier.requestsPerMonth;
  console.error = () => {};
  freeTier.requestsPerMonth = 2;
  try {
    const env = {
      DB: { prepare() { throw new Error("D1 unavailable"); } },
      API_KEYS: new TestKVNamespace(),
    };

    assert.deepEqual(await auth.recordRequestUsage(env, "tenant-fallback", "free"), {
      allowed: true,
      currentRequests: 1,
      tier: "free",
    });
    assert.deepEqual(await auth.recordRequestUsage(env, "tenant-fallback", "free"), {
      allowed: true,
      currentRequests: 2,
      tier: "free",
    });
    assert.deepEqual(await auth.recordRequestUsage(env, "tenant-fallback", "free"), {
      allowed: false,
      currentRequests: 2,
      tier: "free",
    });
  } finally {
    console.error = originalError;
    freeTier.requestsPerMonth = originalLimit;
  }
});

test("storage projection accounts for replacements without double-counting old content", () => {
  assert.equal(tiers.projectedStorageBytes(100, 40, 30), 90);
  assert.equal(tiers.projectedStorageBytes(100, 40, 50), 110);
  assert.equal(tiers.projectedStorageBytes(20, 40, 5), 5);
});

test("document usage SQL measures UTF-8 bytes rather than characters", () => {
  const document = '{"name":"café 🌍"}';
  database.prepare(
    `INSERT INTO mongo_documents (tenant_id, collection_name, doc_id, document_data) VALUES (?, ?, ?, ?)`
  ).run("tenant-unicode", "items", "unicode", document);

  const row = database.prepare(
    `SELECT LENGTH(CAST(document_data AS BLOB)) AS bytes
     FROM mongo_documents WHERE tenant_id = ? AND collection_name = ? AND doc_id = ?`
  ).get("tenant-unicode", "items", "unicode");

  assert.equal(row.bytes, Buffer.byteLength(document, "utf8"));
  assert.ok(row.bytes > [...document].length);
});

test("migration replay is safe and preserves tenant/month uniqueness", () => {
  database.exec(requestUsageMigration);
  const migration = database.prepare(
    `INSERT INTO tenant_request_usage (tenant_id, usage_month, request_count) VALUES (?, ?, ?)`
  );
  migration.run("tenant-unique", "2026-10", 3);
  assert.throws(() => migration.run("tenant-unique", "2026-10", 4));
  assert.equal(
    database.prepare(
      `SELECT request_count FROM tenant_request_usage WHERE tenant_id = ? AND usage_month = ?`
    ).get("tenant-unique", "2026-10").request_count,
    3
  );
});
