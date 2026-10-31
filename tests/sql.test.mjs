import assert from "node:assert/strict";
import { DatabaseSync } from "node:sqlite";
import { after, before, test } from "node:test";
import { readdir, readFile, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { build } from "esbuild";

const root = path.resolve(import.meta.dirname, "..");
const bundle = (name) => path.join(os.tmpdir(), `easydb-${name}-${process.pid}.mjs`);
let turso, sql, tiers, db;

class Stmt {
  constructor(d, q) { this.s = d.prepare(q); this.v = []; }
  bind(...v) { this.v = v; return this; }
  first() { return this.s.get(...this.v) ?? null; }
  all() { return { results: this.s.all(...this.v) }; }
  run() { return this.s.run(...this.v); }
}

async function loadDevVars() {
  try {
    const text = await readFile(path.join(root, ".dev.vars"), "utf8");
    return Object.fromEntries(text.split("\n").filter((l) => l.includes("=")).map((l) => [l.slice(0, l.indexOf("=")), l.slice(l.indexOf("=") + 1)]));
  } catch { return {}; }
}

before(async () => {
  const out = { turso: bundle("turso"), sql: bundle("sql"), tiers: bundle("tiers") };
  await Promise.all([
    build({ entryPoints: [path.join(root, "src/turso.ts")], outfile: out.turso, bundle: true, platform: "node", format: "esm" }),
    build({ entryPoints: [path.join(root, "src/sql.ts")], outfile: out.sql, bundle: true, platform: "node", format: "esm", loader: { ".md": "text", ".txt": "text" } }),
    build({ entryPoints: [path.join(root, "src/tiers.ts")], outfile: out.tiers, bundle: true, platform: "node", format: "esm" }),
  ]);
  [turso, sql, tiers] = await Promise.all(Object.values(out).map((f) => import(pathToFileURL(f))));
  db = new DatabaseSync(":memory:");
  for (const m of (await readdir(path.join(root, "migrations"))).filter((n) => n.endsWith(".sql")).sort()) {
    db.exec(await readFile(path.join(root, "migrations", m), "utf8"));
  }
});

after(async () => {
  db?.close();
  await Promise.all(["turso", "sql", "tiers"].map((n) => rm(bundle(n), { force: true })));
});

test("physical table names are tenant-scoped and identifiers are validated", () => {
  assert.notEqual(turso.physicalTable("alice", "users"), turso.physicalTable("bob", "users"));
  assert.ok(turso.physicalTable("alice", "users").startsWith(turso.tenantPrefix("alice")));
  for (const bad of ['users"; DROP TABLE x;--', "a b", "1abc", "", "a.b", 5]) {
    assert.throws(() => turso.physicalTable("alice", bad), /Invalid table name/);
  }
});

test("where builder parameterizes values and rejects unknown columns/operators", () => {
  const known = new Set(["id", "name"]);
  const w = turso.buildWhere({ id: { gt: 1 }, name: "x'; DROP TABLE y;--" }, known, true);
  assert.equal(w.sql, ' WHERE "id" > ? AND "name" = ?');
  assert.deepEqual(w.args, [1, "x'; DROP TABLE y;--"]);
  assert.throws(() => turso.buildWhere({ evil: 1 }, known, true), /Unknown column/);
  assert.throws(() => turso.buildWhere({ id: { "= 1 OR 1=1 --": 1 } }, known, true), /Unknown operator/);
  assert.throws(() => turso.buildWhere({}, known, true), /required/);
});

test("select caps limit and update/delete require a where clause", () => {
  const known = new Set(["id"]);
  assert.match(turso.buildSelect("t", "a", { limit: 999999 }, known).sql, /LIMIT 1000$/);
  assert.throws(() => turso.buildUpdate("t", "a", { id: 1 }, undefined, known), /required/);
  assert.throws(() => turso.buildDelete("t", "a", {}, known), /required/);
});

test("SQL quotas are defined for every tier and increase with plan", () => {
  const { free, developer, scale } = tiers.TIERS;
  for (const k of ["sqlStorageBytes", "sqlRowsReadPerMonth", "sqlRowsWrittenPerMonth", "maxSqlTables"]) {
    assert.ok(free[k] > 0 && developer[k] > free[k] && scale[k] > developer[k], k);
  }
});

const vars = await loadDevVars();
const live = vars.TURSO_DATABASE_URL && vars.TURSO_AUTH_TOKEN;

test("live Turso: CRUD, tenant isolation and quota accounting", { skip: !live }, async () => {
  const env = { DB: { prepare: (q) => new Stmt(db, q) }, TURSO_DATABASE_URL: vars.TURSO_DATABASE_URL, TURSO_AUTH_TOKEN: vars.TURSO_AUTH_TOKEN };
  const a = `alice_${Date.now()}`;
  const b = `bob_${Date.now()}`;
  const call = async (tenant, method, route, body, tier = "free") => {
    const res = await sql.handleSqlRoute(new Request(`https://x/api/v1/sql/${route}`, { method, body: body ? JSON.stringify(body) : undefined }), env, tenant, tier, route);
    return { status: res.status, body: await res.json() };
  };
  try {
    let r = await call(a, "POST", "tables", { table: "users", columns: [{ name: "id", type: "INTEGER", primaryKey: true }, { name: "name", type: "TEXT", notNull: true }] });
    assert.equal(r.status, 201, JSON.stringify(r.body));
    r = await call(a, "POST", "insert", { table: "users", rows: [{ id: 1, name: "Ann" }, { id: 2, name: "Ben" }] });
    assert.equal(r.status, 201, JSON.stringify(r.body));
    assert.equal(r.body.inserted, 2);

    r = await call(a, "POST", "select", { table: "users", where: { id: { gte: 1 } }, orderBy: "id", order: "desc" });
    assert.deepEqual(r.body.rows, [{ id: 2, name: "Ben" }, { id: 1, name: "Ann" }]);

    r = await call(a, "PUT", "update", { table: "users", set: { name: "Annie" }, where: { id: 1 } });
    assert.equal(r.body.updated, 1);
    r = await call(a, "POST", "select", { table: "users", where: { id: 1 } });
    assert.equal(r.body.rows[0].name, "Annie");

    // Isolation: bob cannot see, read, or write alice's table, even by guessing names.
    r = await call(b, "GET", "tables");
    assert.deepEqual(r.body.tables, []);
    r = await call(b, "POST", "select", { table: "users" });
    assert.equal(r.status, 404);
    r = await call(b, "POST", "select", { table: turso.physicalTable(a, "users") });
    assert.ok(r.status === 400 || r.status === 404);
    r = await call(b, "POST", "tables", { table: "users", columns: [{ name: "id", type: "INTEGER" }] });
    assert.equal(r.status, 201);
    r = await call(b, "POST", "select", { table: "users" });
    assert.equal(r.body.count, 0);

    r = await call(a, "GET", "usage");
    assert.ok(r.body.storage.usedBytes > 0 && r.body.rowsWritten.used > 0 && r.body.rowsRead.used > 0);
    const before = r.body.storage.usedBytes;

    r = await call(a, "DELETE", "delete", { table: "users", where: { id: 2 } });
    assert.equal(r.body.deleted, 1);
    r = await call(a, "GET", "usage");
    assert.ok(r.body.storage.usedBytes < before);

    // Quota: exhaust monthly writes directly and expect 429.
    db.prepare(`INSERT INTO tenant_sql_usage (tenant_id, usage_month, rows_written) VALUES (?, ?, ?) ON CONFLICT(tenant_id, usage_month) DO UPDATE SET rows_written = excluded.rows_written`)
      .run(a, new Date().toISOString().slice(0, 7), tiers.TIERS.free.sqlRowsWrittenPerMonth);
    r = await call(a, "POST", "insert", { table: "users", rows: [{ id: 9, name: "Z" }] });
    assert.equal(r.status, 429);
  } finally {
    for (const t of [a, b]) await call(t, "DELETE", "tables", { table: "users" });
  }
});
