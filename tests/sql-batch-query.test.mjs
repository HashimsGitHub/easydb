import assert from "node:assert/strict";
import { DatabaseSync } from "node:sqlite";
import { after, before, test } from "node:test";
import { readdir, readFile, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { build } from "esbuild";

const root = path.resolve(import.meta.dirname, "..");
const bundle = (name) => path.join(os.tmpdir(), `easydb-bq-${name}-${process.pid}.mjs`);
let sqlclient, sql, rewrite, d1, remote;
const realFetch = globalThis.fetch;

class Stmt {
  constructor(d, q) { this.s = d.prepare(q); this.v = []; }
  bind(...v) { this.v = v; return this; }
  first() { return this.s.get(...this.v) ?? null; }
  all() { return { results: this.s.all(...this.v) }; }
  run() { return this.s.run(...this.v); }
}

const fromArg = (a) => (a.type === "null" ? null : a.type === "integer" ? Number(a.value) : a.value);
const toCell = (v) =>
  v === null ? { type: "null" } : typeof v === "number" ? (Number.isInteger(v) ? { type: "integer", value: String(v) } : { type: "float", value: v }) : { type: "text", value: String(v) };

// Minimal Hrana v2 pipeline emulation on top of an in-memory SQLite database.
function fakeFetch() {
  return async (_url, init) => {
    const { steps } = JSON.parse(init.body).requests[0].batch;
    const ok = [];
    const step_results = [];
    const step_errors = [];
    const holds = (c) => (!c ? true : c.type === "ok" ? ok[c.step] === true : c.type === "not" ? !holds(c.cond) : false);
    for (const [i, step] of steps.entries()) {
      ok[i] = false;
      step_results[i] = null;
      step_errors[i] = null;
      if (!holds(step.condition)) continue;
      try {
        const st = remote.prepare(step.stmt.sql);
        const args = step.stmt.args.map(fromArg);
        if (st.columns().length > 0) {
          const rows = st.all(...args);
          step_results[i] = {
            cols: st.columns().map((c) => ({ name: c.name })),
            rows: rows.map((r) => Object.values(r).map(toCell)),
            affected_row_count: 0,
            last_insert_rowid: null,
            rows_read: rows.length,
            rows_written: 0,
          };
        } else {
          const r = st.run(...args);
          const dml = /^\s*(INSERT|UPDATE|DELETE|REPLACE)/i.test(step.stmt.sql);
          const changes = dml ? Number(r.changes) : 0;
          step_results[i] = { cols: [], rows: [], affected_row_count: changes, last_insert_rowid: String(r.lastInsertRowid), rows_read: 0, rows_written: changes };
        }
        ok[i] = true;
      } catch (e) {
        step_errors[i] = { message: e.message };
      }
    }
    return new Response(JSON.stringify({ results: [{ type: "ok", response: { type: "batch", result: { step_results, step_errors } } }, { type: "ok" }] }), { status: 200 });
  };
}

before(async () => {
  const out = { sqlclient: bundle("sqlclient"), sql: bundle("sql"), rewrite: bundle("rewrite") };
  await Promise.all([
    build({ entryPoints: [path.join(root, "src/sqlclient.ts")], outfile: out.sqlclient, bundle: true, platform: "node", format: "esm" }),
    build({ entryPoints: [path.join(root, "src/sql.ts")], outfile: out.sql, bundle: true, platform: "node", format: "esm", loader: { ".md": "text", ".txt": "text" } }),
    build({ entryPoints: [path.join(root, "src/sqlrewrite.ts")], outfile: out.rewrite, bundle: true, platform: "node", format: "esm" }),
  ]);
  [sqlclient, sql, rewrite] = await Promise.all(Object.values(out).map((f) => import(pathToFileURL(f))));
  d1 = new DatabaseSync(":memory:");
  for (const m of (await readdir(path.join(root, "migrations"))).filter((n) => n.endsWith(".sql")).sort()) {
    d1.exec(await readFile(path.join(root, "migrations", m), "utf8"));
  }
  remote = new DatabaseSync(":memory:");
  globalThis.fetch = fakeFetch();
});

after(async () => {
  globalThis.fetch = realFetch;
  d1?.close();
  remote?.close();
  await Promise.all(["sqlclient", "sql", "rewrite"].map((n) => rm(bundle(n), { force: true })));
});

const env = () => ({ DB: { prepare: (q) => new Stmt(d1, q) }, SQL_DATABASE_URL: "libsql://fake.example", SQL_AUTH_TOKEN: "x" });
const call = async (tenant, method, route, body, tier = "developer") => {
  const res = await sql.handleSqlRoute(new Request(`https://x/api/v1/sql/${route}`, { method, body: body ? JSON.stringify(body) : undefined }), env(), tenant, tier, route);
  return { status: res.status, body: await res.json() };
};

// ── Option 2: raw SQL rewriter ─────────────────────────────────────────

test("raw SQL: table references are rewritten to the tenant's private names", () => {
  const p = sqlclient.tenantPrefix("alice");
  const rw = (q, a = []) => rewrite.rewriteSql("alice", q, a);
  assert.equal(rw("INSERT INTO users (name) VALUES (?)", ["A"]).stmt.sql, `INSERT INTO "${p}users" (name) VALUES (?)`);
  assert.equal(rw("SELECT * FROM users u JOIN orders o ON o.uid = u.id, extra").stmt.sql, `SELECT * FROM "${p}users" u JOIN "${p}orders" o ON o.uid = u.id, "${p}extra"`);
  assert.equal(rw("SELECT users.name FROM users").stmt.sql, `SELECT "${p}users".name FROM "${p}users"`);
  assert.equal(rw('CREATE TABLE IF NOT EXISTS "t1" (id INTEGER PRIMARY KEY, o REFERENCES orders(id))').stmt.sql, `CREATE TABLE IF NOT EXISTS "${p}t1" (id INTEGER PRIMARY KEY, o REFERENCES "${p}orders"(id))`);
  assert.equal(rw("UPDATE OR REPLACE users SET a = 1 FROM other WHERE 1;").stmt.sql, `UPDATE OR REPLACE "${p}users" SET a = 1 FROM "${p}other" WHERE 1`);
  assert.equal(rw("SELECT * FROM users WHERE id IN (SELECT uid FROM orders)").stmt.sql, `SELECT * FROM "${p}users" WHERE id IN (SELECT uid FROM "${p}orders")`);
  assert.equal(rw("SELECT 'FROM users', a IS DISTINCT FROM b FROM users").stmt.sql, `SELECT 'FROM users', a IS DISTINCT FROM b FROM "${p}users"`);
  assert.equal(rw("ALTER TABLE users RENAME TO people").stmt.sql, `ALTER TABLE "${p}users" RENAME TO "${p}people"`);
  assert.equal(rw("ALTER TABLE users ADD COLUMN age INTEGER").stmt.sql, `ALTER TABLE "${p}users" ADD COLUMN age INTEGER`);
  assert.equal(rw("ALTER TABLE users RENAME COLUMN name TO full_name").stmt.sql, `ALTER TABLE "${p}users" RENAME COLUMN name TO full_name`);
  assert.equal(rw("ALTER TABLE users DROP COLUMN age").kind, "alter");
  assert.equal(rw("DELETE FROM users WHERE id = ?", [1]).kind, "delete");
  assert.equal(rw("DROP TABLE IF EXISTS users").kind, "drop");
});

test("raw SQL: dangerous or ambiguous statements are rejected", () => {
  const bad = [
    "PRAGMA table_info(x)", "ATTACH DATABASE 'x' AS y", "VACUUM", "ALTER VIEW a RENAME TO b", "ALTER TABLE a RENAME TO main.b", "ALTER TABLE sqlite_master RENAME TO b", "CREATE VIEW v AS SELECT 1",
    "CREATE INDEX i ON a(b)", "CREATE TEMP TABLE a(b)", "BEGIN", "WITH x AS (SELECT 1) SELECT * FROM x",
    "SELECT 1; DROP TABLE users", "SELECT 1 -- hi", "SELECT 1 /* hi */", "SELECT * FROM main.users", "SELECT * FROM a.b.c",
    "SELECT * FROM pragma_table_info('x')", "SELECT * FROM json_each('[1]')", "SELECT * FROM (a JOIN b)",
    "SELECT * FROM users WHERE id IN other", "SELECT * FROM users INDEXED BY i", "SELECT load_extension('x')",
    'SELECT "readfile"(\'/etc/passwd\')', "SELECT randomblob(1000000000)", "SELECT * FROM `users`", "SELECT * FROM [users]",
    "SELECT * FROM \"bad name\"", "SELECT :x", "SELECT ?1", "SELECT * FROM", "SELECT (1", "", "   ", "EXPLAIN SELECT 1",
  ];
  for (const q of bad) assert.throws(() => rewrite.rewriteSql("alice", q, []), /Not allowed|non-empty|Query has/, q);
  assert.throws(() => rewrite.rewriteSql("alice", "SELECT ?", []), /placeholders/);
  assert.throws(() => rewrite.rewriteSql("alice", "SELECT 1", [1]), /placeholders/);
  assert.throws(() => rewrite.rewriteSql("alice", "SELECT 1", "x"), /array/);
});

// ── Option 2: /sql/query end to end ────────────────────────────────────

test("/sql/query: the sqlite-style flow works and is tenant isolated", async () => {
  const a = `alice_${Date.now()}`;
  const b = `bob_${Date.now()}`;
  let r = await call(a, "POST", "query", { sql: "CREATE TABLE IF NOT EXISTS users (id INTEGER PRIMARY KEY, name TEXT)" });
  assert.equal(r.status, 200, JSON.stringify(r.body));
  r = await call(a, "POST", "query", { sql: "INSERT INTO users (name) VALUES (?)", args: ["Alice"] });
  assert.equal(r.body.rowsAffected, 1);
  r = await call(a, "POST", "query", { sql: "SELECT * FROM users" });
  assert.deepEqual(r.body.rows, [{ id: 1, name: "Alice" }]);
  r = await call(a, "POST", "query", { sql: "SELECT * FROM users", format: "array" });
  assert.deepEqual(r.body.rows, [[1, "Alice"]]);

  // The structured API sees the raw-SQL table and vice versa.
  r = await call(a, "GET", "tables");
  assert.deepEqual(r.body.tables, ["users"]);
  r = await call(a, "POST", "select", { table: "users" });
  assert.equal(r.body.count, 1);

  // Bob cannot reach Alice's data by any name.
  r = await call(b, "POST", "query", { sql: "SELECT * FROM users" });
  assert.equal(r.status, 400);
  assert.match(r.body.error, /no such table/);
  assert.doesNotMatch(r.body.error, /t[0-9a-f]{16}__/);
  r = await call(b, "POST", "query", { sql: `SELECT * FROM ${sqlclient.physicalTable(a, "users")}` });
  assert.equal(r.status, 400);
  r = await call(b, "POST", "query", { sql: "SELECT name FROM sqlite_master" });
  assert.equal(r.status, 403);
  r = await call(b, "GET", "tables");
  assert.deepEqual(r.body.tables, []);

  // Storage is re-measured after raw writes and shrinks after deletes.
  r = await call(a, "GET", "usage");
  const used = r.body.storage.usedBytes;
  assert.ok(used > 0 && r.body.rowsWritten.used > 0 && r.body.rowsRead.used > 0);
  await call(a, "POST", "query", { sql: "DELETE FROM users" });
  r = await call(a, "GET", "usage");
  assert.ok(r.body.storage.usedBytes < used);
});

test("/sql/query: statements run atomically and roll back on failure", async () => {
  const t = `tx_${Date.now()}`;
  await call(t, "POST", "query", { sql: "CREATE TABLE acct (id INTEGER PRIMARY KEY, bal INTEGER NOT NULL)" });
  await call(t, "POST", "query", { sql: "INSERT INTO acct VALUES (1, 100), (2, 0)" });

  let r = await call(t, "POST", "query", {
    statements: [
      { sql: "UPDATE acct SET bal = bal - ? WHERE id = 1", args: [40] },
      { sql: "UPDATE acct SET bal = bal + ? WHERE id = 2", args: [40] },
      { sql: "SELECT id, bal FROM acct ORDER BY id" },
    ],
  });
  assert.equal(r.status, 200, JSON.stringify(r.body));
  assert.deepEqual(r.body.results[2].rows, [{ id: 1, bal: 60 }, { id: 2, bal: 40 }]);

  r = await call(t, "POST", "query", {
    statements: [{ sql: "UPDATE acct SET bal = 0 WHERE id = 1" }, { sql: "INSERT INTO acct VALUES (3, NULL)" }],
  });
  assert.equal(r.status, 400);
  assert.match(r.body.error, /Statement 2/);
  r = await call(t, "POST", "query", { sql: "SELECT bal FROM acct WHERE id = 1" });
  assert.equal(r.body.rows[0].bal, 60, "first statement must be rolled back");
});

test("/sql/query: quotas and limits are enforced", async () => {
  const t = `q_${Date.now()}`;
  let r = await call(t, "POST", "query", { statements: Array.from({ length: 26 }, () => ({ sql: "SELECT 1" })) });
  assert.equal(r.status, 400);
  r = await call(t, "POST", "query", { sql: "SELECT 1; SELECT 2" });
  assert.equal(r.status, 400);

  const sandboxLimit = (await call(t, "GET", "usage", undefined, "sandbox")).body.tables.limit;
  assert.ok(sandboxLimit >= 1 && sandboxLimit <= 10);
  for (let i = 0; i < sandboxLimit; i++) {
    r = await call(t, "POST", "query", { sql: `CREATE TABLE t${i} (a)` }, "sandbox");
    assert.equal(r.status, 200, JSON.stringify(r.body));
  }
  r = await call(t, "POST", "query", { sql: "CREATE TABLE one_too_many (a)" }, "sandbox");
  assert.equal(r.status, 429);

  d1.prepare(`INSERT INTO tenant_sql_usage (tenant_id, usage_month, rows_written) VALUES (?, ?, ?) ON CONFLICT(tenant_id, usage_month) DO UPDATE SET rows_written = excluded.rows_written`)
    .run(t, new Date().toISOString().slice(0, 7), 1e12);
  r = await call(t, "POST", "query", { sql: "INSERT INTO t0 VALUES (1)" }, "sandbox");
  assert.equal(r.status, 429);
});

test("raw SQL: forbidden commands get a plain-English explanation and hint", async () => {
  const t = `msg_${Date.now()}`;
  const cases = [
    ["CREATE DATABASE shop", 403, /CREATE DATABASE is not available/, /own private database/],
    ["DROP DATABASE shop", 403, /DROP DATABASE is not available/, /DROP TABLE/],
    ["DROP SCHEMA main", 403, /DROP SCHEMA is not available/, /own private database/],
    ["ALTER INDEX i RENAME TO j", 403, /ALTER INDEX is not available/, /ALTER TABLE/],
    ["TRUNCATE TABLE users", 403, /TRUNCATE is not available/, /DELETE FROM/],
    ["PRAGMA table_info(users)", 403, /administrative command/, /usage/],
    ["ATTACH DATABASE 'x' AS y", 403, /administrative command/, /usage/],
    ["BEGIN", 403, /transactions are built in/, /statements/],
    ["CREATE INDEX i ON users(name)", 403, /only CREATE TABLE is/, /PRIMARY KEY or UNIQUE/],
    ["CREATE VIEW v AS SELECT 1", 403, /only CREATE TABLE is/, /views or triggers/],
    ["WITH x AS (SELECT 1) SELECT * FROM x", 403, /common table expressions/, /subquery/],
    ["GRANT ALL ON users TO bob", 403, /Access control/, /API key/],
    ["SELECT * FROM sqlite_master", 403, /internal tables/, /GET \/api\/v1\/sql\/tables/],
    ["SELECT load_extension('x')", 403, /load_extension/, /COUNT/],
    ["SELECT 1; SELECT 2", 400, /one statement per query/, /statements/],
    ["SELECT 1 -- hi", 400, /comments/, /Remove the comment/],
    ["SELECT * FROM main.users", 400, /schema-qualified/, /plain table name/],
    ["SELECT * FROM users WHERE id IN other", 400, /IN table_name/, /IN \(SELECT/],
    ["FLY TO moon", 400, /not a supported command/, /ALTER TABLE or DROP TABLE/],
  ];
  for (const [q, status, msg, hint] of cases) {
    const r = await call(t, "POST", "query", { sql: q });
    assert.equal(r.status, status, q);
    assert.match(r.body.error, msg, q);
    assert.match(r.body.hint, hint, q);
  }
  // The same explanation is returned for statements inside a transaction.
  const r = await call(t, "POST", "query", { statements: [{ sql: "SELECT 1" }, { sql: "DROP DATABASE x" }] });
  assert.equal(r.status, 403);
  assert.match(r.body.error, /DROP DATABASE/);
});

test("raw SQL: users can alter their own tables", async () => {
  const t = `alt_${Date.now()}`;
  const other = `alt2_${Date.now()}`;
  const q = async (sqlText, tenant = t, args) => call(tenant, "POST", "query", { sql: sqlText, args });
  assert.equal((await q("CREATE TABLE users (id INTEGER PRIMARY KEY, name TEXT)")).status, 200);
  await q("INSERT INTO users (name) VALUES (?)", t, ["Ann"]);
  assert.equal((await q("ALTER TABLE users ADD COLUMN age INTEGER")).status, 200);
  assert.equal((await q("ALTER TABLE users RENAME COLUMN name TO full_name")).status, 200);
  assert.equal((await q("UPDATE users SET age = ? WHERE id = 1", t, [30])).status, 200);
  let r = await q("SELECT full_name, age FROM users");
  assert.deepEqual(r.body.rows, [{ full_name: "Ann", age: 30 }]);
  assert.equal((await q("ALTER TABLE users DROP COLUMN age")).status, 200);
  assert.equal((await q("ALTER TABLE users RENAME TO people")).status, 200);
  r = await call(t, "GET", "tables");
  assert.deepEqual(r.body.tables, ["people"]);
  r = await q("SELECT * FROM people");
  assert.deepEqual(r.body.rows, [{ id: 1, full_name: "Ann" }]);

  // Another tenant cannot alter or rename into this tenant's tables.
  r = await q("ALTER TABLE people ADD COLUMN x TEXT", other);
  assert.equal(r.status, 400);
  assert.match(r.body.error, /no such table/);
  await q("CREATE TABLE mine (a)", other);
  r = await q("ALTER TABLE mine RENAME TO people", other);
  assert.equal(r.status, 200);
  assert.deepEqual((await call(t, "POST", "query", { sql: "SELECT * FROM people" })).body.rows, [{ id: 1, full_name: "Ann" }]);
});

test("raw SQL: users can still create and drop their own tables", async () => {
  const t = `own_${Date.now()}`;
  let r = await call(t, "POST", "query", { sql: "CREATE TABLE notes (id INTEGER PRIMARY KEY, body TEXT)" });
  assert.equal(r.status, 200, JSON.stringify(r.body));
  r = await call(t, "GET", "tables");
  assert.deepEqual(r.body.tables, ["notes"]);
  r = await call(t, "POST", "query", { sql: "DROP TABLE notes" });
  assert.equal(r.status, 200, JSON.stringify(r.body));
  r = await call(t, "GET", "tables");
  assert.deepEqual(r.body.tables, []);
  r = await call(t, "POST", "query", { sql: "DROP TABLE IF EXISTS notes" });
  assert.equal(r.status, 200);
});

// ── Option 1: /sql/batch ───────────────────────────────────────────────

test("/sql/batch: structured operations run in one atomic transaction", async () => {
  const t = `batch_${Date.now()}`;
  let r = await call(t, "POST", "batch", {
    operations: [
      { op: "createTable", table: "items", columns: [{ name: "id", type: "INTEGER", primaryKey: true }, { name: "qty", type: "INTEGER", notNull: true }] },
      { op: "insert", table: "items", rows: [{ id: 1, qty: 5 }, { id: 2, qty: 7 }] },
      { op: "update", table: "items", set: { qty: 6 }, where: { id: 1 } },
      { op: "delete", table: "items", where: { id: 2 } },
      { op: "select", table: "items", orderBy: "id" },
    ],
  });
  assert.equal(r.status, 201, JSON.stringify(r.body));
  assert.equal(r.body.results[1].inserted, 2);
  assert.equal(r.body.results[2].updated, 1);
  assert.equal(r.body.results[3].deleted, 1);
  assert.deepEqual(r.body.results[4].rows, [{ id: 1, qty: 6 }]);

  // Storage accounting matches running the same operations one request at a time.
  r = await call(t, "GET", "usage");
  const s = `single_${Date.now()}`;
  await call(s, "POST", "tables", { table: "items", columns: [{ name: "id", type: "INTEGER", primaryKey: true }, { name: "qty", type: "INTEGER", notNull: true }] });
  await call(s, "POST", "insert", { table: "items", rows: [{ id: 1, qty: 5 }, { id: 2, qty: 7 }] });
  await call(s, "PUT", "update", { table: "items", set: { qty: 6 }, where: { id: 1 } });
  await call(s, "DELETE", "delete", { table: "items", where: { id: 2 } });
  const single = await call(s, "GET", "usage");
  assert.equal(r.body.storage.usedBytes, single.body.storage.usedBytes);
  assert.equal(r.body.rowsWritten.used, single.body.rowsWritten.used);

  // A failing operation rolls back everything before it.
  r = await call(t, "POST", "batch", {
    operations: [
      { op: "insert", table: "items", row: { id: 10, qty: 1 } },
      { op: "insert", table: "items", row: { id: 1, qty: 1 } },
    ],
  });
  assert.equal(r.status, 400);
  assert.match(r.body.error, /Statement 2/);
  r = await call(t, "POST", "select", { table: "items" });
  assert.equal(r.body.count, 1);

  // Validation errors never reach the database.
  r = await call(t, "POST", "batch", { operations: [{ op: "drop", table: "items" }] });
  assert.equal(r.status, 400);
  r = await call(t, "POST", "batch", { operations: [{ op: "select", table: "missing" }] });
  assert.equal(r.status, 404);
  r = await call(t, "POST", "batch", { operations: [] });
  assert.equal(r.status, 400);
  r = await call(`other_${t}`, "POST", "batch", { operations: [{ op: "select", table: "items" }] });
  assert.equal(r.status, 404);
});
