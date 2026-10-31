import assert from "node:assert/strict";
import { DatabaseSync } from "node:sqlite";
import { after, before, test } from "node:test";
import { rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { build } from "esbuild";

// Isolation oracle: SQLite itself, not the rewriter's tokenizer. For every statement the
// rewriter accepts we ask SQLite (EXPLAIN) which b-tree pages it will touch and check that
// each belongs to the attacker's own tables, then run it for real (inside a rolled-back
// transaction) and verify the victim's schema and rows are byte-for-byte unchanged.

const root = path.resolve(import.meta.dirname, "..");
const out = path.join(os.tmpdir(), `easydb-iso-${process.pid}.mjs`);
let rewrite, sqlclient, db;
const VICTIM = "victim_tenant";
const ATTACKER = "attacker_tenant";
const SECRET = "TOP_SECRET_VICTIM_DATA";

before(async () => {
  const outs = { rewrite: out, client: out.replace(".mjs", "-c.mjs") };
  await Promise.all([
    build({ entryPoints: [path.join(root, "src/sqlrewrite.ts")], outfile: outs.rewrite, bundle: true, platform: "node", format: "esm" }),
    build({ entryPoints: [path.join(root, "src/sqlclient.ts")], outfile: outs.client, bundle: true, platform: "node", format: "esm" }),
  ]);
  rewrite = await import(pathToFileURL(outs.rewrite));
  sqlclient = await import(pathToFileURL(outs.client));
  db = new DatabaseSync(":memory:");
  const v = (t) => `"${sqlclient.physicalTable(VICTIM, t)}"`;
  const a = (t) => `"${sqlclient.physicalTable(ATTACKER, t)}"`;
  db.exec(`
    CREATE TABLE ${v("users")} (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT, secret TEXT);
    INSERT INTO ${v("users")} (name, secret) VALUES ('v1', '${SECRET}'), ('v2', '${SECRET}');
    CREATE TABLE ${v("orders")} (id INTEGER PRIMARY KEY, uid INTEGER, note TEXT);
    INSERT INTO ${v("orders")} VALUES (1, 1, '${SECRET}');
    CREATE TABLE ${v("users2")} (id INTEGER PRIMARY KEY, name TEXT);
    INSERT INTO ${v("users2")} VALUES (1, '${SECRET}');
    CREATE TABLE ${a("users")} (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT);
    INSERT INTO ${a("users")} (name) VALUES ('a1');
    CREATE TABLE ${a("mine")} (id INTEGER PRIMARY KEY, name TEXT);
    INSERT INTO ${a("mine")} VALUES (1, 'a');
  `);
});

after(async () => {
  db?.close();
  await Promise.all([out, out.replace(".mjs", "-c.mjs")].map((f) => rm(f, { force: true })));
});

const attackerPrefix = () => sqlclient.tenantPrefix(ATTACKER);
const victimPrefix = () => sqlclient.tenantPrefix(VICTIM);

// Everything outside the attacker's namespace: schema entries, rows and AUTOINCREMENT counters.
function snapshot() {
  const mine = (n) => String(n).startsWith(attackerPrefix());
  const master = db.prepare("SELECT type, name, tbl_name, sql FROM sqlite_master ORDER BY name").all().map((m) => ({ ...m }));
  const foreign = master.filter((m) => !mine(m.tbl_name) && m.name !== "sqlite_sequence");
  const data = {};
  for (const m of foreign) {
    if (m.type === "table") data[m.name] = db.prepare(`SELECT rowid, * FROM "${m.name}" ORDER BY rowid`).all().map((x) => ({ ...x }));
  }
  const seq = db.prepare("SELECT name, seq FROM sqlite_sequence ORDER BY name").all().filter((x) => !mine(x.name)).map((x) => ({ ...x }));
  return JSON.stringify({ foreign, data, seq });
}

// Every foreign key of every attacker table must point back into the attacker's own namespace.
function foreignKeyEscapes() {
  const bad = [];
  for (const m of db.prepare("SELECT name FROM sqlite_master WHERE type = 'table'").all()) {
    if (!m.name.startsWith(attackerPrefix())) continue;
    for (const fk of db.prepare(`PRAGMA foreign_key_list("${m.name}")`).all()) {
      if (!String(fk.table).startsWith(attackerPrefix())) bad.push(`${m.name} -> ${fk.table}`);
    }
  }
  return bad;
}

// Tables (by name) that a statement will read or write, according to SQLite's own plan.
function touchedTables(sqlText, args) {
  const pages = new Map([[1, "sqlite_master"]]);
  for (const m of db.prepare("SELECT name, tbl_name, rootpage FROM sqlite_master WHERE rootpage > 0").all()) pages.set(Number(m.rootpage), m.tbl_name);
  const touched = new Set();
  for (const op of db.prepare("EXPLAIN " + sqlText).all(...args)) {
    let page, dbIndex;
    // P5 bit 0x10 (OPFLAG_P2ISREG): P2 is a register holding a page of a table being created, not a page number.
    if (["OpenRead", "OpenWrite", "ReopenIdx"].includes(op.opcode)) {
      if (Number(op.p5) & 0x10) continue;
      [page, dbIndex] = [Number(op.p2), Number(op.p3)];
    }
    else if (op.opcode === "Destroy") [page, dbIndex] = [Number(op.p1), Number(op.p3)];
    else if (op.opcode === "Clear") [page, dbIndex] = [Number(op.p1), Number(op.p2)];
    else continue;
    if (page === 1 && dbIndex <= 1) touched.add("sqlite_master"); // schema table of main or temp
    else if (dbIndex === 0) touched.add(pages.get(page) ?? `<page ${page}>`);
    else touched.add(`<attached db ${dbIndex}>`);
  }
  return touched;
}

/** Rewrites as the attacker; returns null when the rewriter (correctly) refuses. */
function attempt(q, args = []) {
  let rw;
  try {
    rw = rewrite.rewriteSql(ATTACKER, q, args);
  } catch (e) {
    assert.ok(typeof e.status === "number" && /^(Not allowed|'sql'|Query has|At most)/.test(e.message), `unexpected error for ${q}: ${e}`);
    return null;
  }
  const before = snapshot();
  const result = { rows: [], touched: new Set(), executed: false };
  db.exec("BEGIN");
  try {
    try {
      result.touched = touchedTables(rw.stmt.sql, rw.stmt.args);
    } catch {
      // SQLite rejects the statement outright: nothing can be touched.
    }
    try {
      const st = db.prepare(rw.stmt.sql);
      if (st.columns().length) result.rows = st.all(...rw.stmt.args).map((x) => ({ ...x }));
      else st.run(...rw.stmt.args);
      result.executed = true;
    } catch {
      // Runtime errors are fine; leakage is what matters.
    }
    assert.equal(snapshot(), before, `state outside the attacker's namespace changed by: ${q}\n -> ${rw.stmt.sql}`);
    assert.deepEqual(foreignKeyEscapes(), [], `foreign key escapes the attacker's namespace: ${q}\n -> ${rw.stmt.sql}`);
  } finally {
    db.exec("ROLLBACK");
  }
  // SQLite bookkeeping: DDL rewrites sqlite_master; writes to AUTOINCREMENT tables update their own sqlite_sequence row
  // (victim rows are covered by the snapshot comparison above).
  const ddl = ["create", "drop", "alter"].includes(rw.kind);
  const dml = ["insert", "update", "delete", "drop", "alter"].includes(rw.kind);
  for (const t of result.touched) {
    if ((t === "sqlite_master" && ddl) || (t === "sqlite_sequence" && dml)) continue;
    assert.ok(t.startsWith(attackerPrefix()), `touches non-attacker table ${t}\n  query: ${q}\n  rewritten: ${rw.stmt.sql}`);
  }
  assert.ok(!JSON.stringify(result.rows).includes(SECRET), `leaked victim data via: ${q}\n -> ${rw.stmt.sql}`);
  return result;
}

test("hand-written attacks never reach the victim's tables", () => {
  const vname = sqlclient.physicalTable(VICTIM, "users");
  const attacks = [
    "SELECT * FROM users",
    "SELECT * FROM users2",
    "SELECT * FROM users u JOIN orders o ON o.uid = u.id",
    "SELECT * FROM mine, users, orders",
    "SELECT * FROM mine WHERE id IN (SELECT uid FROM orders)",
    "SELECT * FROM mine WHERE EXISTS (SELECT 1 FROM users2)",
    "SELECT * FROM mine UNION SELECT id, name FROM users2",
    "SELECT * FROM mine UNION ALL SELECT note, uid FROM orders",
    "SELECT (SELECT secret FROM users LIMIT 1) FROM mine",
    "SELECT * FROM (SELECT * FROM users) s",
    "SELECT * FROM mine LEFT OUTER JOIN users2 USING (id)",
    "SELECT * FROM mine NATURAL JOIN users2",
    "SELECT * FROM mine CROSS JOIN orders",
    `SELECT * FROM ${vname}`,
    `SELECT * FROM "${vname}"`,
    `SELECT * FROM "${victimPrefix()}orders"`,
    `SELECT ${vname}.secret FROM mine`,
    `SELECT "${vname}".secret FROM mine`,
    "SELECT * FROM USERS",
    "SELECT * FROM \"USERS\"",
    "select * from\tusers\n",
    "SELECT * FROM\nusers2",
    "SELECT users.secret FROM mine",
    "SELECT 'a' FROM mine WHERE 'FROM users2' = 'x'",
    "INSERT INTO mine SELECT id, secret FROM users",
    "INSERT INTO mine (id, name) SELECT id, name FROM users2",
    "INSERT OR REPLACE INTO users SELECT * FROM users",
    "REPLACE INTO mine SELECT id, note FROM orders",
    "INSERT INTO users (name) VALUES ('x') ON CONFLICT DO NOTHING",
    "UPDATE users SET name = 'pwned'",
    "UPDATE users2 SET name = 'pwned' WHERE id = 1",
    "UPDATE mine SET name = (SELECT secret FROM users LIMIT 1)",
    "UPDATE mine SET name = o.note FROM orders o WHERE o.id = mine.id",
    "UPDATE OR REPLACE users SET name = 'x'",
    "DELETE FROM users",
    "DELETE FROM mine WHERE id IN (SELECT id FROM users2)",
    "DELETE FROM orders",
    "DROP TABLE users2",
    "DROP TABLE IF EXISTS orders",
    `DROP TABLE ${vname}`,
    "ALTER TABLE users2 RENAME TO stolen",
    "ALTER TABLE mine RENAME TO users2",
    `ALTER TABLE mine RENAME TO ${sqlclient.physicalTable(VICTIM, "orders")}`,
    `ALTER TABLE mine RENAME TO ${victimPrefix()}fresh_name`,
    `ALTER TABLE mine RENAME TO "${victimPrefix()}fresh_name"`,
    "ALTER TABLE mine RENAME TO squatted",
    `CREATE TABLE ${victimPrefix()}fresh_name (a)`,
    `CREATE TABLE "${victimPrefix()}fresh_name" AS SELECT 1`,
    `CREATE TABLE fk3 (a REFERENCES ${vname}(id))`,
    `CREATE TABLE fk4 (a, FOREIGN KEY (a) REFERENCES "${vname}"(id))`,
    "CREATE TABLE fk5 (a REFERENCES nonexistent(id))",
    "ALTER TABLE mine ADD COLUMN r INTEGER REFERENCES users2(id)",
    "ALTER TABLE users2 ADD COLUMN pwned TEXT",
    "ALTER TABLE users2 DROP COLUMN name",
    "ALTER TABLE orders RENAME COLUMN note TO n",
    "CREATE TABLE copy AS SELECT * FROM users",
    "CREATE TABLE copy2 AS SELECT * FROM users2 UNION SELECT * FROM mine",
    "CREATE TABLE users2 (id)",
    "CREATE TABLE IF NOT EXISTS users2 (id)",
    "CREATE TABLE fk (a INTEGER REFERENCES users2(id))",
    "CREATE TABLE fk2 (a, FOREIGN KEY (a) REFERENCES orders(id) ON DELETE CASCADE)",
    `CREATE TABLE ${vname}_x (a)`,
    "SELECT * FROM sqlite_master",
    "SELECT * FROM sqlite_schema",
    "SELECT * FROM sqlite_temp_master",
    "SELECT * FROM sqlite_sequence",
    "SELECT name FROM main.sqlite_master",
    "SELECT * FROM pragma_table_info('x')",
    "SELECT * FROM main.users",
    "SELECT * FROM temp.users",
    "SELECT * FROM mine WHERE id IN users2",
    "SELECT * FROM (users2)",
    "SELECT * FROM users2 INDEXED BY x",
    "SELECT DISTINCT FROM users2",
    "SELECT 1 IS DISTINCT FROM 2 FROM users2",
    "SELECT * FROM mine WHERE name IS NOT DISTINCT FROM (SELECT secret FROM users LIMIT 1)",
    "SELECT * FROM mine; SELECT * FROM users",
    "SELECT * FROM mine;SELECT * FROM users",
    "SELECT * FROM mine -- \n, users",
    "SELECT * FROM mine /* */ , users",
    "SELECT * FROM mine WHERE name = 'x'' OR 1=1 --'",
    "SELECT * FROM mine WHERE name = ? OR 1=1",
    "SELECT * FROM `users`",
    "SELECT * FROM [users]",
    "SELECT * FROM mine WHERE id = :x",
    "SELECT * FROM mine WHERE id = @x",
    "SELECT * FROM mine WHERE id = $x",
    "SELECT * FROM mine\u2028, users",
    "SELECT * FROM mine\f, users",
    "SELECT * FROM mine\0, users",
    "SELECT * FROM mine\u00a0, users",
    "SELECT * FROM mine WHERE id = 0x1 FROM users",
    "SELECT * FROM mine WHERE 1 UNION SELECT * FROM users2",
    "SELECT * FROM mine GROUP BY id HAVING id IN (SELECT id FROM users)",
    "SELECT * FROM mine ORDER BY (SELECT id FROM users LIMIT 1)",
    "SELECT * FROM mine LIMIT (SELECT id FROM users LIMIT 1)",
    "SELECT * FROM mine WHERE id = (SELECT max(id) FROM users2 WHERE name IN (SELECT note FROM orders))",
    "SELECT group_concat(secret) FROM users",
    "SELECT * FROM mine a, mine b, users2 c, orders d",
    "SELECT * FROM mine AS a JOIN users2 AS b ON a.id = b.id JOIN orders ON orders.id = a.id",
    "SELECT * FROM mine JOIN (SELECT * FROM users2) s ON s.id = mine.id",
    "SELECT * FROM mine, (SELECT * FROM users2) s",
    "SELECT * FROM mine WHERE id IN (1, 2), users",
    "SELECT load_extension('x') FROM mine",
    "SELECT readfile('/etc/passwd')",
    "SELECT * FROM mine WHERE name LIKE ? ESCAPE '\\'",
    "SELECT CASE WHEN 1 THEN (SELECT secret FROM users LIMIT 1) END FROM mine",
    "SELECT * FROM mine RETURNING *",
    "DELETE FROM mine WHERE id = 1 RETURNING (SELECT secret FROM users LIMIT 1)",
    "INSERT INTO mine VALUES (9, (SELECT secret FROM users LIMIT 1)) RETURNING *",
    "INSERT INTO mine VALUES (9, 'x') RETURNING (SELECT secret FROM users2)",
    "WITH x AS (SELECT * FROM users) SELECT * FROM x",
    "ATTACH DATABASE ':memory:' AS evil",
    "PRAGMA writable_schema = 1",
    "VACUUM INTO '/tmp/x'",
  ];
  let accepted = 0;
  for (const q of attacks) if (attempt(q)) accepted++;
  assert.ok(accepted > 40, `corpus should exercise accepted statements too (accepted ${accepted})`);
});

test("attacker's own statements still work against their own prefix", () => {
  let r = attempt("SELECT * FROM users");
  assert.deepEqual(r.rows, [{ id: 1, name: "a1" }]);
  r = attempt("SELECT m.name, u.name AS n2 FROM mine m JOIN users u ON u.id = m.id");
  assert.deepEqual(r.rows, [{ name: "a", n2: "a1" }]);
  r = attempt("INSERT INTO mine SELECT id + 10, name FROM users");
  assert.ok(r.executed);
  assert.ok(r.touched.size > 0 && [...r.touched].every((t) => t.startsWith(attackerPrefix())));
});

// Deterministic fuzzer: random token soup biased toward SQL structure and hostile names.
function rng(seed) {
  let s = seed >>> 0;
  return () => ((s = (Math.imul(s, 1664525) + 1013904223) >>> 0) / 2 ** 32);
}

test("fuzz: no accepted statement can touch the victim (20k random statements)", () => {
  const r = rng(0xC0FFEE);
  const pick = (a) => a[Math.floor(r() * a.length)];
  const names = [
    "users", "users2", "orders", "mine", "USERS", "x", "a", "b", "sqlite_master", "sqlite_sequence", "main", "temp",
    sqlclient.physicalTable(VICTIM, "users"), sqlclient.physicalTable(VICTIM, "orders"), victimPrefix() + "users2", victimPrefix() + "fresh", "fresh",
  ];
  const ident = () => {
    const n = pick(names);
    const m = r();
    return m < 0.15 ? `"${n}"` : m < 0.2 ? `"${n}".id` : m < 0.25 ? `${n}.id` : n;
  };
  const sel = (d = 0) => {
    const parts = ["SELECT", pick(["*", "id", "name", "1", "secret", "count(*)", `(${d < 2 ? sel(d + 1) : "1"})`]), "FROM", ident()];
    const t = r();
    if (t < 0.3) parts.push(pick(["JOIN", "LEFT JOIN", "CROSS JOIN", "NATURAL JOIN", ","]), ident());
    if (r() < 0.2) parts.push("AS", pick(["a", "b", "u"]));
    if (r() < 0.3) parts.push("WHERE", "id", pick(["IN", "=", ">", "IS DISTINCT FROM", "NOT IN"]), pick(["(" + (d < 2 ? sel(d + 1) : "1") + ")", "1", "?", "users2", `(${ident()})`]));
    if (r() < 0.15) parts.push(pick(["UNION", "UNION ALL", "EXCEPT", "INTERSECT"]), d < 2 ? sel(d + 1) : "SELECT 1");
    if (r() < 0.1) parts.push(pick(["ORDER BY id", "GROUP BY id", "LIMIT 1", "LIMIT 1, 2"]));
    return parts.join(pick([" ", " ", "  ", "\n", "\t"]));
  };
  const gen = () => {
    const k = r();
    if (k < 0.4) return sel();
    if (k < 0.5) return `INSERT INTO ${ident()} ${pick(["", "(id, name)"])} ${r() < 0.5 ? sel() : "VALUES (1, 'x')"}`;
    if (k < 0.55) return `${pick(["REPLACE", "INSERT OR REPLACE", "INSERT OR IGNORE"])} INTO ${ident()} ${sel()}`;
    if (k < 0.65) return `UPDATE ${pick(["", "OR REPLACE ", "OR IGNORE "])}${ident()} SET name = ${pick(["'x'", `(${sel()})`, "1"])}${pick(["", ` FROM ${ident()}`, ` WHERE id IN (${sel()})`])}`;
    if (k < 0.72) return `DELETE FROM ${ident()}${pick(["", ` WHERE id IN (${sel()})`, " WHERE 1"])}`;
    if (k < 0.78) return `DROP TABLE ${pick(["", "IF EXISTS "])}${ident()}`;
    if (k < 0.86) return `CREATE TABLE ${pick(["", "IF NOT EXISTS "])}${ident()} ${pick(["(a)", "(a INTEGER REFERENCES " + ident() + ")", "AS " + sel(), "(a, FOREIGN KEY (a) REFERENCES " + ident() + "(id))"])}`;
    if (k < 0.95) return `ALTER TABLE ${ident()} ${pick(["RENAME TO " + ident(), "ADD COLUMN z TEXT", "DROP COLUMN name", "RENAME COLUMN name TO n2"])}`;
    const junk = ["SELECT", "FROM", "JOIN", ",", "(", ")", ";", "'", '"', "--", "/*", "*/", "users2", ident(), "INTO", "WHERE", "AS", "IN", "WITH", "ATTACH", "PRAGMA", ".", "1", "?"];
    return Array.from({ length: 3 + Math.floor(r() * 12) }, () => pick(junk)).join(" ");
  };
  let accepted = 0;
  let ran = 0;
  for (let i = 0; i < 20000; i++) {
    const q = gen();
    const nArgs = (q.match(/\?/g) || []).length;
    const res = attempt(q, Array(nArgs).fill(1));
    if (res) {
      accepted++;
      if (res.executed) ran++;
    }
  }
  assert.ok(accepted > 3000, `fuzzer should get many statements past the validator (got ${accepted})`);
  assert.ok(ran > 1000, `and many should be valid SQL that actually executes (got ${ran})`);
});
