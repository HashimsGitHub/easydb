import type { Env } from "./index";
import { getUsageMonth } from "./auth";
import { rewriteSql } from "./sqlrewrite";
import { getTier, formatBytes, SANDBOX_SQL } from "./tiers";
import {
  SQL_LIMITS,
  SqlError,
  buildCreateTable,
  buildDelete,
  buildInsert,
  buildSelect,
  buildUpdate,
  physicalTable,
  quoteIdent,
  stripPrefix,
  tenantPrefix,
  sqlBatch,
  sqlTransaction,
  type Stmt,
  type StmtResult,
} from "./sqlclient";

function json(data: any, status = 200): Response {
  return new Response(JSON.stringify(data, null, 2), { status, headers: { "Content-Type": "application/json" } });
}

interface Usage {
  storageBytes: number;
  rowsRead: number;
  rowsWritten: number;
}

async function loadUsage(env: Env, tenantId: string): Promise<Usage> {
  const month = getUsageMonth();
  const [storage, monthly] = await Promise.all([
    env.DB.prepare(`SELECT storage_bytes FROM tenant_sql_storage WHERE tenant_id = ?`).bind(tenantId).first<{ storage_bytes: number }>(),
    env.DB.prepare(`SELECT rows_read, rows_written FROM tenant_sql_usage WHERE tenant_id = ? AND usage_month = ?`)
      .bind(tenantId, month)
      .first<{ rows_read: number; rows_written: number }>(),
  ]);
  return {
    storageBytes: storage?.storage_bytes || 0,
    rowsRead: monthly?.rows_read || 0,
    rowsWritten: monthly?.rows_written || 0,
  };
}

async function recordUsage(env: Env, tenantId: string, results: StmtResult[], storageDelta: number): Promise<void> {
  const read = results.reduce((s, r) => s + r.rowsRead, 0);
  const written = results.reduce((s, r) => s + r.rowsWritten, 0);
  const month = getUsageMonth();
  await env.DB.prepare(
    `INSERT INTO tenant_sql_usage (tenant_id, usage_month, rows_read, rows_written) VALUES (?, ?, ?, ?)
     ON CONFLICT(tenant_id, usage_month) DO UPDATE
       SET rows_read = rows_read + excluded.rows_read, rows_written = rows_written + excluded.rows_written, updated_at = CURRENT_TIMESTAMP`
  ).bind(tenantId, month, read, written).run();
  if (storageDelta !== 0) {
    await env.DB.prepare(
      `INSERT INTO tenant_sql_storage (tenant_id, storage_bytes) VALUES (?, MAX(0, ?))
       ON CONFLICT(tenant_id) DO UPDATE SET storage_bytes = MAX(0, storage_bytes + ?), updated_at = CURRENT_TIMESTAMP`
    ).bind(tenantId, storageDelta, storageDelta).run();
  }
}

function quotaError(planName: string, what: string, limit: string, current: string): Response {
  return json(
    {
      error: `Quota Exceeded: The '${planName}' plan allows ${limit} of ${what}; this limit has been reached. Upgrade your plan or wait for next month's reset.`,
      quota: { limit, current, status: "LIMIT_REACHED" },
    },
    429
  );
}

async function getColumns(env: Env, tenantId: string, table: unknown): Promise<Set<string>> {
  const physical = physicalTable(tenantId, table);
  const [r] = await sqlBatch(env, [{ sql: `PRAGMA table_info(${quoteIdent(physical)})` }]);
  const nameIdx = r.columns.indexOf("name");
  const cols = new Set<string>(r.rows.map((row) => String(row[nameIdx])));
  if (cols.size === 0) throw new SqlError(`Table '${String(table)}' does not exist`, 404);
  return cols;
}

async function listTables(env: Env, tenantId: string): Promise<string[]> {
  const prefix = tenantPrefix(tenantId);
  const [r] = await sqlBatch(env, [
    { sql: `SELECT name FROM sqlite_master WHERE type = 'table' AND substr(name, 1, ?) = ? ORDER BY name`, args: [prefix.length, prefix] },
  ]);
  return r.rows.map((row) => stripPrefix(tenantId, String(row[0])));
}

/** Actual bytes stored in the tenant's tables, using the same size model as the structured routes. */
async function measureStorage(env: Env, tenantId: string): Promise<number> {
  const tables = await listTables(env, tenantId);
  if (tables.length === 0) return 0;
  const esc = (n: string) => `"${n.replace(/"/g, '""')}"`;
  const infos = await sqlBatch(env, tables.map((t) => ({ sql: `PRAGMA table_info(${esc(physicalTable(tenantId, t))})` })));
  const probes: Stmt[] = tables.flatMap((t, i) => {
    const cols = infos[i].rows.map((row) => String(row[infos[i].columns.indexOf("name")]));
    if (cols.length === 0) return [];
    const size = cols.map((c) => `COALESCE(LENGTH(CAST(${esc(c)} AS BLOB)), 1)`).join(" + ");
    return [{ sql: `SELECT COALESCE(SUM(${size} + ${SQL_LIMITS.rowOverheadBytes}), 0) FROM ${esc(physicalTable(tenantId, t))}` }];
  });
  if (probes.length === 0) return 0;
  const sizes = await sqlBatch(env, probes);
  return sizes.reduce((sum, r) => sum + Number(r.rows[0]?.[0] || 0), 0);
}

function rowsAs(r: StmtResult, format: unknown): any[] {
  const rows = r.rows.slice(0, SQL_LIMITS.maxSelectRows);
  return format === "array" ? rows : rows.map((row) => Object.fromEntries(r.columns.map((c, i) => [c, row[i]])));
}

/** Handles every /api/v1/sql/* route. tierId "sandbox" applies the shared demo_store limits. */
export async function handleSqlRoute(request: Request, env: Env, tenantId: string, tierId: string, route: string): Promise<Response> {
  const plan = tierId === "sandbox" ? SANDBOX_SQL : getTier(tierId);
  try {
    const usage = await loadUsage(env, tenantId);
    const method = request.method;

    if (method === "GET" && route === "usage") {
      return json({
        success: true,
        plan: plan.name,
        storage: { usedBytes: usage.storageBytes, limitBytes: plan.sqlStorageBytes },
        rowsRead: { used: usage.rowsRead, limit: plan.sqlRowsReadPerMonth },
        rowsWritten: { used: usage.rowsWritten, limit: plan.sqlRowsWrittenPerMonth },
        tables: { used: (await listTables(env, tenantId)).length, limit: plan.maxSqlTables },
      });
    }

    if (method === "GET" && route === "tables") {
      const tables = await listTables(env, tenantId);
      return json({ success: true, count: tables.length, tables });
    }

    let body: any = {};
    if (method !== "GET") {
      const text = await request.text();
      if (text.length > SQL_LIMITS.maxBodyBytes) throw new SqlError("Request body too large", 413);
      try {
        body = text ? JSON.parse(text) : {};
      } catch {
        throw new SqlError("Body must be valid JSON");
      }
      if (!body || typeof body !== "object" || Array.isArray(body)) throw new SqlError("Body must be a JSON object");
    }

    const readsExhausted = usage.rowsRead >= plan.sqlRowsReadPerMonth;
    const writesExhausted = usage.rowsWritten >= plan.sqlRowsWrittenPerMonth;
    const storageFull = usage.storageBytes >= plan.sqlStorageBytes;

    if (method === "POST" && route === "tables") {
      if (writesExhausted) return quotaError(plan.name, "rows written per month", String(plan.sqlRowsWrittenPerMonth), String(usage.rowsWritten));
      const existing = await listTables(env, tenantId);
      if (existing.length >= plan.maxSqlTables) {
        return quotaError(plan.name, "SQL tables", String(plan.maxSqlTables), String(existing.length));
      }
      const results = await sqlBatch(env, [buildCreateTable(tenantId, body.table, body.columns)]);
      await recordUsage(env, tenantId, results, 0);
      return json({ success: true, table: body.table }, 201);
    }

    if (method === "DELETE" && route === "tables") {
      const columns = await getColumns(env, tenantId, body.table);
      const physical = physicalTable(tenantId, body.table);
      const probe: Stmt = {
        sql: `SELECT COALESCE(SUM(${[...columns].map((c) => `COALESCE(LENGTH(CAST(${quoteIdent(c)} AS BLOB)), 1)`).join(" + ")} + ${SQL_LIMITS.rowOverheadBytes}), 0) FROM ${quoteIdent(physical)}`,
      };
      const results = await sqlBatch(env, [probe, { sql: `DROP TABLE ${quoteIdent(physical)}` }]);
      await recordUsage(env, tenantId, results, -Number(results[0].rows[0]?.[0] || 0));
      return json({ success: true, dropped: body.table });
    }

    if (method === "POST" && route === "insert") {
      if (writesExhausted) return quotaError(plan.name, "rows written per month", String(plan.sqlRowsWrittenPerMonth), String(usage.rowsWritten));
      const columns = await getColumns(env, tenantId, body.table);
      const { stmt, bytes } = buildInsert(tenantId, body.table, body.rows ?? (body.row ? [body.row] : undefined), columns);
      if (storageFull || usage.storageBytes + bytes > plan.sqlStorageBytes) {
        return quotaError(plan.name, "SQL storage", formatBytes(plan.sqlStorageBytes), formatBytes(usage.storageBytes));
      }
      const results = await sqlBatch(env, [stmt]);
      await recordUsage(env, tenantId, results, bytes);
      return json({ success: true, inserted: results[0].affectedRows, lastInsertRowid: results[0].lastInsertRowid }, 201);
    }

    if (method === "POST" && route === "select") {
      if (readsExhausted) return quotaError(plan.name, "rows read per month", String(plan.sqlRowsReadPerMonth), String(usage.rowsRead));
      const columns = await getColumns(env, tenantId, body.table);
      const results = await sqlBatch(env, [buildSelect(tenantId, body.table, body, columns)]);
      await recordUsage(env, tenantId, results, 0);
      const r = results[0];
      return json({
        success: true,
        count: r.rows.length,
        rows: r.rows.map((row) => Object.fromEntries(r.columns.map((c, i) => [c, row[i]]))),
      });
    }

    if (method === "PUT" && route === "update") {
      if (writesExhausted) return quotaError(plan.name, "rows written per month", String(plan.sqlRowsWrittenPerMonth), String(usage.rowsWritten));
      const columns = await getColumns(env, tenantId, body.table);
      const { stmts, newBytesPerRow } = buildUpdate(tenantId, body.table, body.set, body.where, columns);
      // Growth is only known after the probe, so pre-check against a worst-case of one row.
      if (usage.storageBytes + newBytesPerRow > plan.sqlStorageBytes) {
        return quotaError(plan.name, "SQL storage", formatBytes(plan.sqlStorageBytes), formatBytes(usage.storageBytes));
      }
      const results = await sqlBatch(env, stmts);
      const delta = results[1].affectedRows * newBytesPerRow - Number(results[0].rows[0]?.[0] || 0);
      await recordUsage(env, tenantId, results, delta);
      return json({ success: true, updated: results[1].affectedRows });
    }

    if (method === "DELETE" && route === "delete") {
      const columns = await getColumns(env, tenantId, body.table);
      const results = await sqlBatch(env, buildDelete(tenantId, body.table, body.where, columns));
      await recordUsage(env, tenantId, results, -Number(results[0].rows[0]?.[0] || 0));
      return json({ success: true, deleted: results[1].affectedRows });
    }

    if (method === "POST" && route === "query") {
      const list = Array.isArray(body.statements) ? body.statements : [{ sql: body.sql, args: body.args }];
      if (list.length === 0 || list.length > SQL_LIMITS.maxBatchOps) {
        throw new SqlError(`'statements' must contain 1-${SQL_LIMITS.maxBatchOps} statements`);
      }
      const parsed = list.map((s: any) => rewriteSql(tenantId, s?.sql, s?.args));
      const reads = parsed.some((p: any) => p.kind === "select");
      const writes = parsed.some((p: any) => p.kind !== "select");
      const grows = parsed.some((p: any) => ["insert", "update", "create", "alter"].includes(p.kind));
      const creates = parsed.filter((p: any) => p.kind === "create").length;
      if (reads && readsExhausted) return quotaError(plan.name, "rows read per month", String(plan.sqlRowsReadPerMonth), String(usage.rowsRead));
      if (writes && writesExhausted) return quotaError(plan.name, "rows written per month", String(plan.sqlRowsWrittenPerMonth), String(usage.rowsWritten));
      if (grows && storageFull) return quotaError(plan.name, "SQL storage", formatBytes(plan.sqlStorageBytes), formatBytes(usage.storageBytes));
      if (creates > 0) {
        const existing = await listTables(env, tenantId);
        if (existing.length + creates > plan.maxSqlTables) {
          return quotaError(plan.name, "SQL tables", String(plan.maxSqlTables), String(existing.length));
        }
      }
      const results = await sqlTransaction(env, parsed.map((p: any) => p.stmt));
      // Raw SQL has no per-row size estimate, so storage is re-measured after any write.
      const delta = writes ? (await measureStorage(env, tenantId)) - usage.storageBytes : 0;
      await recordUsage(env, tenantId, results, delta);
      const shaped = results.map((r) => ({
        columns: r.columns,
        rows: rowsAs(r, body.format),
        count: Math.min(r.rows.length, SQL_LIMITS.maxSelectRows),
        truncated: r.rows.length > SQL_LIMITS.maxSelectRows,
        rowsAffected: r.affectedRows,
        lastInsertRowid: r.lastInsertRowid,
      }));
      return json(Array.isArray(body.statements) ? { success: true, results: shaped } : { success: true, ...shaped[0] });
    }

    if (method === "POST" && route === "batch") {
      const ops = body.operations;
      if (!Array.isArray(ops) || ops.length === 0 || ops.length > SQL_LIMITS.maxBatchOps) {
        throw new SqlError(`'operations' must be an array of 1-${SQL_LIMITS.maxBatchOps} operations`);
      }
      const known = new Map<string, Set<string>>();
      const columnsFor = async (table: unknown) => {
        const key = String(table);
        if (!known.has(key)) known.set(key, await getColumns(env, tenantId, table));
        return known.get(key)!;
      };
      const stmts: Stmt[] = [];
      const plan_: { op: string; at: number; bytes: number; table?: string }[] = [];
      let creates = 0;
      for (const o of ops) {
        const op = o?.op;
        const at = stmts.length;
        if (op === "createTable") {
          const stmt = buildCreateTable(tenantId, o.table, o.columns);
          known.set(String(o.table), new Set((o.columns as any[]).map((c) => c.name)));
          stmts.push(stmt);
          creates++;
          plan_.push({ op, at, bytes: 0, table: o.table });
        } else if (op === "insert") {
          const { stmt, bytes } = buildInsert(tenantId, o.table, o.rows ?? (o.row ? [o.row] : undefined), await columnsFor(o.table));
          stmts.push(stmt);
          plan_.push({ op, at, bytes });
        } else if (op === "select") {
          stmts.push(buildSelect(tenantId, o.table, o, await columnsFor(o.table)));
          plan_.push({ op, at, bytes: 0 });
        } else if (op === "update") {
          const { stmts: u, newBytesPerRow } = buildUpdate(tenantId, o.table, o.set, o.where, await columnsFor(o.table));
          stmts.push(...u);
          plan_.push({ op, at, bytes: newBytesPerRow });
        } else if (op === "delete") {
          stmts.push(...buildDelete(tenantId, o.table, o.where, await columnsFor(o.table)));
          plan_.push({ op, at, bytes: 0 });
        } else {
          throw new SqlError(`Unknown operation '${String(op)}'. Use createTable, insert, select, update or delete`);
        }
      }
      const reads = plan_.some((p) => p.op === "select");
      const writes = plan_.some((p) => p.op !== "select");
      const growth = plan_.filter((p) => p.op === "insert" || p.op === "update").reduce((s, p) => s + p.bytes, 0);
      if (reads && readsExhausted) return quotaError(plan.name, "rows read per month", String(plan.sqlRowsReadPerMonth), String(usage.rowsRead));
      if (writes && writesExhausted) return quotaError(plan.name, "rows written per month", String(plan.sqlRowsWrittenPerMonth), String(usage.rowsWritten));
      if (growth > 0 && (storageFull || usage.storageBytes + growth > plan.sqlStorageBytes)) {
        return quotaError(plan.name, "SQL storage", formatBytes(plan.sqlStorageBytes), formatBytes(usage.storageBytes));
      }
      if (creates > 0) {
        const existing = await listTables(env, tenantId);
        if (existing.length + creates > plan.maxSqlTables) {
          return quotaError(plan.name, "SQL tables", String(plan.maxSqlTables), String(existing.length));
        }
      }
      const results = await sqlTransaction(env, stmts);
      let delta = 0;
      const out = plan_.map((p) => {
        if (p.op === "createTable") return { op: p.op, table: p.table };
        if (p.op === "insert") {
          delta += p.bytes;
          return { op: p.op, inserted: results[p.at].affectedRows, lastInsertRowid: results[p.at].lastInsertRowid };
        }
        if (p.op === "select") {
          const r = results[p.at];
          return { op: p.op, count: r.rows.length, rows: rowsAs(r, undefined) };
        }
        const before = Number(results[p.at].rows[0]?.[0] || 0);
        const affected = results[p.at + 1].affectedRows;
        if (p.op === "update") {
          delta += affected * p.bytes - before;
          return { op: p.op, updated: affected };
        }
        delta -= before;
        return { op: p.op, deleted: affected };
      });
      await recordUsage(env, tenantId, results, delta);
      return json({ success: true, results: out }, 201);
    }

    return json({ error: `Unknown SQL route: ${method} /api/v1/sql/${route}` }, 404);
  } catch (err) {
    if (err instanceof SqlError) return json(err.hint ? { error: err.message, hint: err.hint } : { error: err.message }, err.status);
    console.error("SQL route error:", err);
    return json({ error: "Internal SQL error" }, 500);
  }
}
