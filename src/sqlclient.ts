// SQL HTTP client + tenant-isolated structured SQL builder.
//
// Isolation model: every tenant table lives in ONE shared SQL database under
// a physical name `t<sha256(tenantId)[0..16]>__<table>`. Callers never send raw
// SQL; they send JSON that is validated here, identifiers are checked against a
// strict allow-pattern, values are always bound parameters, and the physical
// prefix is applied server-side from the authenticated tenant. A tenant can
// therefore only ever name tables inside its own prefix.

import { createHash } from "node:crypto";

export interface SqlEnv {
  SQL_DATABASE_URL?: string;
  SQL_AUTH_TOKEN?: string;
}

export type SqlValue = string | number | boolean | null;

export class SqlError extends Error {
  constructor(message: string, public status = 400) {
    super(message);
  }
}

export const SQL_LIMITS = {
  maxBodyBytes: 1024 * 1024,
  maxInsertRows: 100,
  maxSelectRows: 1000,
  maxColumns: 50,
  maxConditions: 20,
  maxInListSize: 100,
  maxValueBytes: 256 * 1024,
  rowOverheadBytes: 16,
};

const IDENT = /^[A-Za-z_][A-Za-z0-9_]{0,62}$/;
const COLUMN_TYPES = new Set(["TEXT", "INTEGER", "REAL", "NUMERIC", "BLOB"]);

export function assertIdent(name: unknown, what: string): string {
  if (typeof name !== "string" || !IDENT.test(name)) {
    throw new SqlError(`Invalid ${what}: must match ${IDENT.source}`);
  }
  return name;
}

export function quoteIdent(name: string): string {
  return `"${name}"`;
}

export function tenantPrefix(tenantId: string): string {
  return `t${createHash("sha256").update(tenantId).digest("hex").slice(0, 16)}__`;
}

export function physicalTable(tenantId: string, table: unknown): string {
  return tenantPrefix(tenantId) + assertIdent(table, "table name");
}

export function byteLength(value: SqlValue): number {
  if (value === null) return 1;
  if (typeof value === "string") return new TextEncoder().encode(value).length;
  return 8;
}

function toArg(value: SqlValue): any {
  if (value === null) return { type: "null" };
  if (typeof value === "boolean") return { type: "integer", value: value ? "1" : "0" };
  if (typeof value === "number") {
    if (!Number.isFinite(value)) throw new SqlError("Numeric values must be finite");
    return Number.isInteger(value) ? { type: "integer", value: String(value) } : { type: "float", value };
  }
  if (typeof value === "string") {
    if (byteLength(value) > SQL_LIMITS.maxValueBytes) {
      throw new SqlError(`Value exceeds ${SQL_LIMITS.maxValueBytes} bytes`, 413);
    }
    return { type: "text", value };
  }
  throw new SqlError("Values must be string, number, boolean or null");
}

function fromCell(cell: any): any {
  switch (cell?.type) {
    case "null":
      return null;
    case "integer": {
      const n = Number(cell.value);
      return Number.isSafeInteger(n) ? n : cell.value;
    }
    case "float":
      return cell.value;
    case "blob":
      return { $blob: cell.base64 };
    default:
      return cell?.value ?? null;
  }
}

export interface StmtResult {
  columns: string[];
  rows: any[][];
  affectedRows: number;
  lastInsertRowid: string | null;
  rowsRead: number;
  rowsWritten: number;
}

export interface Stmt {
  sql: string;
  args?: SqlValue[];
}

/** Runs statements sequentially in one request; each step runs only if the previous succeeded. */
export async function sqlBatch(env: SqlEnv, stmts: Stmt[]): Promise<StmtResult[]> {
  if (!env.SQL_DATABASE_URL || !env.SQL_AUTH_TOKEN) {
    throw new SqlError("SQL is not configured on this server", 503);
  }
  const base = env.SQL_DATABASE_URL.replace(/^libsql:\/\//, "https://").replace(/\/$/, "");
  const steps = stmts.map((s, i) => ({
    stmt: { sql: s.sql, args: (s.args || []).map(toArg) },
    ...(i > 0 ? { condition: { type: "ok", step: i - 1 } } : {}),
  }));

  const res = await fetch(`${base}/v2/pipeline`, {
    method: "POST",
    headers: { Authorization: `Bearer ${env.SQL_AUTH_TOKEN}`, "Content-Type": "application/json" },
    body: JSON.stringify({ requests: [{ type: "batch", batch: { steps } }, { type: "close" }] }),
  });
  if (!res.ok) {
    console.error("SQL backend HTTP error", res.status, await res.text().catch(() => ""));
    throw new SqlError("SQL backend unavailable", 502);
  }
  const payload: any = await res.json();
  const first = payload.results?.[0];
  if (first?.type !== "ok") {
    console.error("SQL backend pipeline error", JSON.stringify(first));
    throw new SqlError("SQL backend error", 502);
  }
  const { step_results, step_errors } = first.response.result;
  const failed = (step_errors as any[]).find((e) => e);
  if (failed) throw new SqlError(`SQL error: ${String(failed.message).replace(/t[0-9a-f]{16}__/g, "")}`, 400);

  return (step_results as any[]).map((r) => ({
    columns: (r.cols || []).map((c: any) => c.name),
    rows: (r.rows || []).map((row: any[]) => row.map(fromCell)),
    affectedRows: r.affected_row_count ?? 0,
    lastInsertRowid: r.last_insert_rowid ?? null,
    rowsRead: r.rows_read ?? 0,
    rowsWritten: r.rows_written ?? 0,
  }));
}

// ── Builders (pure; no I/O) ────────────────────────────────────────────

export interface ColumnDef {
  name: string;
  type: string;
  primaryKey?: boolean;
  notNull?: boolean;
  unique?: boolean;
}

export function buildCreateTable(tenantId: string, table: unknown, columns: unknown): Stmt {
  const physical = physicalTable(tenantId, table);
  if (!Array.isArray(columns) || columns.length === 0 || columns.length > SQL_LIMITS.maxColumns) {
    throw new SqlError(`'columns' must be an array of 1-${SQL_LIMITS.maxColumns} column definitions`);
  }
  const seen = new Set<string>();
  const defs = (columns as ColumnDef[]).map((c) => {
    const name = assertIdent(c?.name, "column name");
    if (seen.has(name.toLowerCase())) throw new SqlError(`Duplicate column '${name}'`);
    seen.add(name.toLowerCase());
    const type = String(c.type || "TEXT").toUpperCase();
    if (!COLUMN_TYPES.has(type)) throw new SqlError(`Unsupported column type '${c.type}'. Use: ${[...COLUMN_TYPES].join(", ")}`);
    return `${quoteIdent(name)} ${type}${c.primaryKey ? " PRIMARY KEY" : ""}${c.notNull ? " NOT NULL" : ""}${c.unique ? " UNIQUE" : ""}`;
  });
  return { sql: `CREATE TABLE ${quoteIdent(physical)} (${defs.join(", ")})` };
}

function checkColumns(known: Set<string>, names: string[]) {
  for (const n of names) {
    if (!known.has(n)) throw new SqlError(`Unknown column '${n}'`);
  }
}

const OPS: Record<string, string> = { eq: "=", ne: "!=", gt: ">", gte: ">=", lt: "<", lte: "<=", like: "LIKE" };

export function buildWhere(where: unknown, known: Set<string>, required: boolean): { sql: string; args: SqlValue[] } {
  const entries = where && typeof where === "object" && !Array.isArray(where) ? Object.entries(where as object) : [];
  if (where !== undefined && where !== null && (typeof where !== "object" || Array.isArray(where))) {
    throw new SqlError("'where' must be an object");
  }
  if (required && entries.length === 0) throw new SqlError("'where' with at least one condition is required");
  if (entries.length > SQL_LIMITS.maxConditions) throw new SqlError(`At most ${SQL_LIMITS.maxConditions} conditions allowed`);

  const parts: string[] = [];
  const args: SqlValue[] = [];
  for (const [col, cond] of entries) {
    assertIdent(col, "column name");
    checkColumns(known, [col]);
    const q = quoteIdent(col);
    if (cond === null) {
      parts.push(`${q} IS NULL`);
    } else if (typeof cond === "object" && !Array.isArray(cond)) {
      const ops = Object.entries(cond as object);
      if (ops.length === 0) throw new SqlError(`Empty condition for '${col}'`);
      for (const [op, v] of ops) {
        if (op === "in") {
          if (!Array.isArray(v) || v.length === 0 || v.length > SQL_LIMITS.maxInListSize) {
            throw new SqlError(`'in' requires an array of 1-${SQL_LIMITS.maxInListSize} values`);
          }
          parts.push(`${q} IN (${v.map(() => "?").join(", ")})`);
          args.push(...(v as SqlValue[]));
        } else if (OPS[op]) {
          if (v === null) {
            if (op !== "eq" && op !== "ne") throw new SqlError(`'${op}' does not accept null`);
            parts.push(`${q} IS ${op === "ne" ? "NOT " : ""}NULL`);
          } else {
            parts.push(`${q} ${OPS[op]} ?`);
            args.push(v as SqlValue);
          }
        } else {
          throw new SqlError(`Unknown operator '${op}'. Use: eq, ne, gt, gte, lt, lte, like, in`);
        }
      }
    } else if (Array.isArray(cond)) {
      throw new SqlError(`Use {"in": [...]} for list matching on '${col}'`);
    } else {
      parts.push(`${q} = ?`);
      args.push(cond as SqlValue);
    }
  }
  return { sql: parts.length ? ` WHERE ${parts.join(" AND ")}` : "", args };
}

function rowBytesExpr(cols: string[]): string {
  if (cols.length === 0) return "0";
  return cols.map((c) => `COALESCE(LENGTH(CAST(${quoteIdent(c)} AS BLOB)), 1)`).join(" + ");
}

export function buildInsert(tenantId: string, table: unknown, rows: unknown, known: Set<string>): { stmt: Stmt; bytes: number } {
  const physical = physicalTable(tenantId, table);
  if (!Array.isArray(rows) || rows.length === 0 || rows.length > SQL_LIMITS.maxInsertRows) {
    throw new SqlError(`'rows' must be an array of 1-${SQL_LIMITS.maxInsertRows} objects`);
  }
  const cols = Object.keys(rows[0] ?? {});
  if (cols.length === 0) throw new SqlError("Rows must contain at least one column");
  cols.forEach((c) => assertIdent(c, "column name"));
  checkColumns(known, cols);

  const args: SqlValue[] = [];
  let bytes = 0;
  for (const row of rows) {
    const keys = Object.keys(row ?? {});
    if (keys.length !== cols.length || !keys.every((k) => cols.includes(k))) {
      throw new SqlError("All rows must have the same columns");
    }
    bytes += SQL_LIMITS.rowOverheadBytes;
    for (const c of cols) {
      const v = row[c] as SqlValue;
      args.push(v);
      bytes += byteLength(v);
    }
  }
  const placeholders = `(${cols.map(() => "?").join(", ")})`;
  return {
    stmt: {
      sql: `INSERT INTO ${quoteIdent(physical)} (${cols.map(quoteIdent).join(", ")}) VALUES ${rows.map(() => placeholders).join(", ")}`,
      args,
    },
    bytes,
  };
}

export interface SelectOptions {
  columns?: unknown;
  where?: unknown;
  orderBy?: unknown;
  order?: unknown;
  limit?: unknown;
  offset?: unknown;
}

export function buildSelect(tenantId: string, table: unknown, opts: SelectOptions, known: Set<string>): Stmt {
  const physical = physicalTable(tenantId, table);
  let cols = "*";
  if (opts.columns !== undefined) {
    if (!Array.isArray(opts.columns) || opts.columns.length === 0) throw new SqlError("'columns' must be a non-empty array");
    opts.columns.forEach((c) => assertIdent(c, "column name"));
    checkColumns(known, opts.columns as string[]);
    cols = (opts.columns as string[]).map(quoteIdent).join(", ");
  }
  const w = buildWhere(opts.where, known, false);
  let sql = `SELECT ${cols} FROM ${quoteIdent(physical)}${w.sql}`;
  if (opts.orderBy !== undefined) {
    assertIdent(opts.orderBy, "orderBy column");
    checkColumns(known, [opts.orderBy as string]);
    sql += ` ORDER BY ${quoteIdent(opts.orderBy as string)} ${String(opts.order).toLowerCase() === "desc" ? "DESC" : "ASC"}`;
  }
  const limit = opts.limit === undefined ? 100 : Number(opts.limit);
  if (!Number.isInteger(limit) || limit < 1) throw new SqlError("'limit' must be a positive integer");
  sql += ` LIMIT ${Math.min(limit, SQL_LIMITS.maxSelectRows)}`;
  if (opts.offset !== undefined) {
    const offset = Number(opts.offset);
    if (!Number.isInteger(offset) || offset < 0) throw new SqlError("'offset' must be a non-negative integer");
    sql += ` OFFSET ${offset}`;
  }
  return { sql, args: w.args };
}

/** Returns [sizeProbe, update]. delta = affected * newBytes - probe. */
export function buildUpdate(
  tenantId: string,
  table: unknown,
  set: unknown,
  where: unknown,
  known: Set<string>
): { stmts: [Stmt, Stmt]; newBytesPerRow: number } {
  const physical = physicalTable(tenantId, table);
  const entries = set && typeof set === "object" && !Array.isArray(set) ? Object.entries(set as object) : [];
  if (entries.length === 0) throw new SqlError("'set' must be an object with at least one column");
  entries.forEach(([c]) => assertIdent(c, "column name"));
  checkColumns(known, entries.map(([c]) => c));
  const w = buildWhere(where, known, true);
  const setCols = entries.map(([c]) => c);
  const newBytesPerRow = entries.reduce((sum, [, v]) => sum + byteLength(v as SqlValue), 0);
  return {
    stmts: [
      { sql: `SELECT COALESCE(SUM(${rowBytesExpr(setCols)}), 0) FROM ${quoteIdent(physical)}${w.sql}`, args: w.args },
      {
        sql: `UPDATE ${quoteIdent(physical)} SET ${setCols.map((c) => `${quoteIdent(c)} = ?`).join(", ")}${w.sql}`,
        args: [...entries.map(([, v]) => v as SqlValue), ...w.args],
      },
    ],
    newBytesPerRow,
  };
}

/** Returns [sizeProbe, delete]. */
export function buildDelete(tenantId: string, table: unknown, where: unknown, known: Set<string>): [Stmt, Stmt] {
  const physical = physicalTable(tenantId, table);
  const w = buildWhere(where, known, true);
  return [
    {
      sql: `SELECT COALESCE(SUM(${rowBytesExpr([...known])} + ${SQL_LIMITS.rowOverheadBytes}), 0) FROM ${quoteIdent(physical)}${w.sql}`,
      args: w.args,
    },
    { sql: `DELETE FROM ${quoteIdent(physical)}${w.sql}`, args: w.args },
  ];
}

export function stripPrefix(tenantId: string, physical: string): string {
  const p = tenantPrefix(tenantId);
  return physical.startsWith(p) ? physical.slice(p.length) : physical;
}
