import type { Env } from "./index";
import { getUsageMonth } from "./auth";
import { getTier, formatBytes } from "./tiers";
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
  tursoBatch,
  type Stmt,
  type StmtResult,
} from "./turso";

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
  const [r] = await tursoBatch(env, [{ sql: `PRAGMA table_info(${quoteIdent(physical)})` }]);
  const nameIdx = r.columns.indexOf("name");
  const cols = new Set<string>(r.rows.map((row) => String(row[nameIdx])));
  if (cols.size === 0) throw new SqlError(`Table '${String(table)}' does not exist`, 404);
  return cols;
}

async function listTables(env: Env, tenantId: string): Promise<string[]> {
  const prefix = tenantPrefix(tenantId);
  const [r] = await tursoBatch(env, [
    { sql: `SELECT name FROM sqlite_master WHERE type = 'table' AND substr(name, 1, ?) = ? ORDER BY name`, args: [prefix.length, prefix] },
  ]);
  return r.rows.map((row) => stripPrefix(tenantId, String(row[0])));
}

/** Handles every /api/v1/sql/* route. Caller guarantees an authenticated tenant. */
export async function handleSqlRoute(request: Request, env: Env, tenantId: string, tierId: string, route: string): Promise<Response> {
  const plan = getTier(tierId);
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
      const results = await tursoBatch(env, [buildCreateTable(tenantId, body.table, body.columns)]);
      await recordUsage(env, tenantId, results, 0);
      return json({ success: true, table: body.table }, 201);
    }

    if (method === "DELETE" && route === "tables") {
      const columns = await getColumns(env, tenantId, body.table);
      const physical = physicalTable(tenantId, body.table);
      const probe: Stmt = {
        sql: `SELECT COALESCE(SUM(${[...columns].map((c) => `COALESCE(LENGTH(CAST(${quoteIdent(c)} AS BLOB)), 1)`).join(" + ")} + ${SQL_LIMITS.rowOverheadBytes}), 0) FROM ${quoteIdent(physical)}`,
      };
      const results = await tursoBatch(env, [probe, { sql: `DROP TABLE ${quoteIdent(physical)}` }]);
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
      const results = await tursoBatch(env, [stmt]);
      await recordUsage(env, tenantId, results, bytes);
      return json({ success: true, inserted: results[0].affectedRows, lastInsertRowid: results[0].lastInsertRowid }, 201);
    }

    if (method === "POST" && route === "select") {
      if (readsExhausted) return quotaError(plan.name, "rows read per month", String(plan.sqlRowsReadPerMonth), String(usage.rowsRead));
      const columns = await getColumns(env, tenantId, body.table);
      const results = await tursoBatch(env, [buildSelect(tenantId, body.table, body, columns)]);
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
      const results = await tursoBatch(env, stmts);
      const delta = results[1].affectedRows * newBytesPerRow - Number(results[0].rows[0]?.[0] || 0);
      await recordUsage(env, tenantId, results, delta);
      return json({ success: true, updated: results[1].affectedRows });
    }

    if (method === "DELETE" && route === "delete") {
      const columns = await getColumns(env, tenantId, body.table);
      const results = await tursoBatch(env, buildDelete(tenantId, body.table, body.where, columns));
      await recordUsage(env, tenantId, results, -Number(results[0].rows[0]?.[0] || 0));
      return json({ success: true, deleted: results[1].affectedRows });
    }

    return json({ error: `Unknown SQL route: ${method} /api/v1/sql/${route}` }, 404);
  } catch (err) {
    if (err instanceof SqlError) return json({ error: err.message }, err.status);
    console.error("SQL route error:", err);
    return json({ error: "Internal SQL error" }, 500);
  }
}
