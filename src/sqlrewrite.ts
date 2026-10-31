// Raw-SQL validator + tenant rewriter.
//
// Raw SQL is tokenized (never regex-replaced), checked against a strict allow-list and
// every table reference is rewritten to the caller's private physical name. Anything the
// tokenizer or the grammar rules do not recognise is rejected, so unknown syntax fails
// closed rather than reaching another tenant's tables.

import { SQL_LIMITS, SqlError, SqlValue, tenantPrefix, type Stmt } from "./sqlclient";

type Kind = "select" | "insert" | "update" | "delete" | "create" | "drop" | "alter";

export interface RewrittenSql {
  stmt: Stmt;
  kind: Kind;
}

interface Tok {
  type: "word" | "qident" | "string" | "number" | "param" | "punct";
  text: string;
  start: number;
  end: number;
  upper: string;
}

const START_KINDS: Record<string, Kind> = {
  SELECT: "select",
  INSERT: "insert",
  REPLACE: "insert",
  UPDATE: "update",
  DELETE: "delete",
  CREATE: "create",
  DROP: "drop",
  ALTER: "alter",
};

const BLOCKED_WORDS = new Set([
  "ATTACH", "DETACH", "PRAGMA", "VACUUM", "REINDEX", "TRIGGER", "VIEW", "VIRTUAL",
  "TEMP", "TEMPORARY", "INDEXED", "WITH", "EXPLAIN", "ANALYZE", "BEGIN", "COMMIT", "ROLLBACK",
  "SAVEPOINT", "RELEASE", "INDEX",
]);

const BLOCKED_FUNCTIONS = new Set(["load_extension", "readfile", "writefile", "edit", "fts3_tokenizer", "zeroblob", "randomblob"]);

const FROM_TERMINATORS = new Set([
  "WHERE", "GROUP", "ORDER", "LIMIT", "HAVING", "UNION", "EXCEPT", "INTERSECT", "WINDOW", "RETURNING", "SELECT", "SET", "VALUES",
]);

const IDENT = /^[A-Za-z_][A-Za-z0-9_]{0,62}$/;
const NUMBER = /^(?:0[xX][0-9a-fA-F]+|(?:\d+(?:\.\d*)?|\.\d+)(?:[eE][+-]?\d+)?)/;
const PUNCT = "(),.;*+-/%=<>!|&~^";

const ALLOWED_HINT =
  "EasyDB runs one SELECT, INSERT, UPDATE, DELETE, CREATE TABLE, ALTER TABLE or DROP TABLE per statement. " +
  "You can create and drop your own tables freely. Send several statements in one request with {\"statements\": [...]}.";

function fail(message: string, hint = ALLOWED_HINT, status = 400): never {
  throw new SqlError(`Not allowed: ${message}`, status, hint);
}

function forbid(message: string, hint: string): never {
  return fail(message, hint, 403);
}

const DB_HINT = "Your account already has its own private database, so there is nothing to create or drop. Use CREATE TABLE / DROP TABLE for your own tables, and GET /api/v1/sql/tables to list them.";

// Friendly, command-specific explanations for statements people commonly try.
function explainForbidden(toks: Tok[]): void {
  const w0 = toks[0]?.type === "word" ? toks[0].upper : "";
  const w1 = toks[1]?.type === "word" ? toks[1].upper : "";
  if ((w0 === "CREATE" || w0 === "DROP") && (w1 === "DATABASE" || w1 === "SCHEMA")) {
    forbid(`${w0} ${w1} is not available. EasyDB manages the database for you.`, DB_HINT);
  }
  switch (w0) {
    case "TRUNCATE":
      forbid("TRUNCATE is not available.", "Use DELETE FROM your_table to remove all rows, or DROP TABLE your_table to remove the table itself.");
    case "PRAGMA":
    case "ATTACH":
    case "DETACH":
    case "VACUUM":
    case "REINDEX":
    case "ANALYZE":
      forbid(`${w0} is an administrative command and is not available.`, "EasyDB handles storage, indexing and maintenance for you. See GET /api/v1/sql/usage for storage and quota numbers.");
    case "BEGIN":
    case "COMMIT":
    case "ROLLBACK":
    case "SAVEPOINT":
    case "RELEASE":
    case "END":
      forbid(`${w0} is not needed - transactions are built in.`, "Send your statements together as {\"statements\": [{\"sql\": \"...\"}, ...]}. They all succeed or none are saved.");
    case "EXPLAIN":
      forbid("EXPLAIN is not available.", ALLOWED_HINT);
    case "GRANT":
    case "REVOKE":
      forbid(`${w0} is not available. Access control is handled by your API key.`, "Each API key only ever sees its own tables.");
    case "WITH":
      forbid("WITH (common table expressions) is not available.", "Use a subquery instead, e.g. SELECT * FROM (SELECT ...) or WHERE id IN (SELECT ...).");
    case "CREATE":
      if (["INDEX", "UNIQUE", "VIEW", "TRIGGER", "VIRTUAL", "TEMP", "TEMPORARY"].includes(w1)) {
        forbid(`CREATE ${w1} is not available - only CREATE TABLE is.`, "Mark columns PRIMARY KEY or UNIQUE inside CREATE TABLE if you need fast lookups, and run your own queries instead of views or triggers.");
      }
      break;
    case "DROP":
      if (["INDEX", "VIEW", "TRIGGER"].includes(w1)) forbid(`DROP ${w1} is not available - only DROP TABLE is.`, "Use DROP TABLE your_table to remove one of your own tables.");
      break;
  }
}

function tokenize(sql: string): Tok[] {
  const toks: Tok[] = [];
  let i = 0;
  const push = (type: Tok["type"], start: number, end: number) =>
    toks.push({ type, text: sql.slice(start, end), start, end, upper: sql.slice(start, end).toUpperCase() });
  while (i < sql.length) {
    const c = sql[i];
    if (c === " " || c === "\t" || c === "\n" || c === "\r") {
      i++;
    } else if (c === "'" || c === '"') {
      let j = i + 1;
      for (;;) {
        if (j >= sql.length) fail("unterminated quoted string or identifier");
        if (sql[j] === c) {
          if (sql[j + 1] === c) j += 2;
          else break;
        } else j++;
      }
      push(c === "'" ? "string" : "qident", i, j + 1);
      i = j + 1;
    } else if (/[A-Za-z_]/.test(c)) {
      let j = i + 1;
      while (j < sql.length && /[A-Za-z0-9_$]/.test(sql[j])) j++;
      push("word", i, j);
      i = j;
    } else if (/\d/.test(c) || (c === "." && /\d/.test(sql[i + 1] || ""))) {
      const m = NUMBER.exec(sql.slice(i))!;
      push("number", i, i + m[0].length);
      i += m[0].length;
      if (/[A-Za-z_]/.test(sql[i] || "")) fail("malformed number");
    } else if (c === "?") {
      if (/\d/.test(sql[i + 1] || "")) fail("numbered parameters are not supported; use ?");
      push("param", i, i + 1);
      i++;
    } else if (c === "-" && sql[i + 1] === "-") {
      fail("SQL comments (-- and /* */) are not allowed.", "Remove the comment and send the plain statement.");
    } else if (c === "/" && sql[i + 1] === "*") {
      fail("SQL comments (-- and /* */) are not allowed.", "Remove the comment and send the plain statement.");
    } else if (PUNCT.includes(c)) {
      push("punct", i, i + 1);
      i++;
    } else {
      fail(`unsupported character '${c}'`);
    }
  }
  return toks;
}

export function rewriteSql(tenantId: string, rawSql: unknown, rawArgs: unknown): RewrittenSql {
  if (typeof rawSql !== "string" || !rawSql.trim()) throw new SqlError("'sql' must be a non-empty string");
  if (rawSql.length > SQL_LIMITS.maxSqlBytes) throw new SqlError(`'sql' exceeds ${SQL_LIMITS.maxSqlBytes} characters`, 413);
  if (rawArgs !== undefined && rawArgs !== null && !Array.isArray(rawArgs)) throw new SqlError("'args' must be an array");
  const args = (rawArgs ?? []) as SqlValue[];
  if (args.length > 100) throw new SqlError("At most 100 args are allowed");

  const prefix = tenantPrefix(tenantId);
  let toks = tokenize(rawSql);
  if (toks.length && toks[toks.length - 1].text === ";" && toks[toks.length - 1].type === "punct") toks = toks.slice(0, -1);
  if (toks.length === 0) throw new SqlError("'sql' must be a non-empty string");
  if (toks.some((t) => t.type === "punct" && t.text === ";")) fail("only one statement per query is allowed.", "Send several statements together as {\"statements\": [{\"sql\": \"...\"}, ...]} - they run in one transaction.");

  explainForbidden(toks);
  const first = toks[0];
  const kind = first.type === "word" ? START_KINDS[first.upper] : undefined;
  if (!kind) fail(`${first.text.slice(0, 30)} is not a supported command.`);
  if (kind === "create" || kind === "drop" || kind === "alter") {
    if (toks[1]?.type !== "word" || toks[1].upper !== "TABLE") forbid(`${first.upper} ${(toks[1]?.text || "").slice(0, 30)} is not available - only ${first.upper} TABLE is.`, ALLOWED_HINT);
  }

  const isWord = (t: Tok | undefined, w: string) => t?.type === "word" && t.upper === w;
  const replacements = new Map<number, string>();
  const tables = new Set<string>();
  const spans = new Map<number, number>();
  const physical = (name: string) => `"${prefix}${name}"`;

  const rewriteTable = (idx: number, opts: { parenAfter: boolean; subquery: boolean }) => {
    const t = toks[idx];
    if (!t) fail("expected a table name");
    if (t.type === "punct" && t.text === "(" && opts.subquery && isWord(toks[idx + 1], "SELECT")) return;
    if (t.type !== "word" && t.type !== "qident") fail("expected a table name");
    const name = t.type === "qident" ? t.text.slice(1, -1) : t.text;
    if (/^sqlite_/i.test(name)) forbid("EasyDB's internal tables are not available.", "List your tables with GET /api/v1/sql/tables, or inspect columns with SELECT * FROM your_table LIMIT 1.");
    if (!IDENT.test(name)) fail(`invalid table name '${name}'.`, "Table names must start with a letter or underscore and contain only letters, numbers and underscores (max 63 characters).");
    const next = toks[idx + 1];
    if (next?.type === "punct" && next.text === ".") fail("schema-qualified names like main.users are not allowed.", "Use the plain table name, e.g. users - it is automatically yours.");
    if (next?.type === "punct" && next.text === "(" && !opts.parenAfter) forbid("table-valued functions are not available.", "Select from your own tables instead.");
    replacements.set(t.start, physical(name));
    tables.add(name.toLowerCase());
    spans.set(t.start, t.end);
  };
  const fromStack: boolean[] = [false];
  let params = 0;
  for (let i = 0; i < toks.length; i++) {
    const t = toks[i];
    const depth = fromStack.length - 1;
    const next = toks[i + 1];

    if ((t.type === "word" || t.type === "qident") && next?.type === "punct" && next.text === "(") {
      const fn = (t.type === "qident" ? t.text.slice(1, -1) : t.text).toLowerCase();
      if (BLOCKED_FUNCTIONS.has(fn)) forbid(`function '${fn}' is not available.`, "Use standard functions such as COUNT, SUM, AVG, MIN, MAX, LOWER, UPPER, LENGTH, ROUND, DATE or COALESCE.");
    }

    if (t.type === "param") {
      params++;
    } else if (t.type === "punct") {
      if (t.text === "(") fromStack.push(false);
      else if (t.text === ")") {
        if (fromStack.length === 1) fail("unbalanced parentheses");
        fromStack.pop();
      } else if (t.text === "," && fromStack[depth]) {
        rewriteTable(i + 1, { parenAfter: false, subquery: true });
      }
    } else if (t.type === "word") {
      if (BLOCKED_WORDS.has(t.upper)) forbid(`'${t.upper}' is not available inside a query.`, ALLOWED_HINT);
      if (FROM_TERMINATORS.has(t.upper)) fromStack[depth] = false;
      switch (t.upper) {
        case "FROM":
          if (isWord(toks[i - 1], "DISTINCT")) break;
          rewriteTable(i + 1, { parenAfter: false, subquery: true });
          fromStack[depth] = true;
          break;
        case "JOIN":
          rewriteTable(i + 1, { parenAfter: false, subquery: true });
          fromStack[depth] = true;
          break;
        case "INTO":
          rewriteTable(i + 1, { parenAfter: true, subquery: false });
          break;
        case "REFERENCES":
          rewriteTable(i + 1, { parenAfter: true, subquery: false });
          break;
        case "IN":
          if (next && (next.type === "word" || next.type === "qident")) fail("'IN table_name' is not supported.", "Write IN (SELECT column FROM table_name) instead.");
          break;
        case "UPDATE":
          if (i === 0) {
            let j = 1;
            if (isWord(toks[j], "OR")) j += 2;
            rewriteTable(j, { parenAfter: false, subquery: false });
          }
          break;
        case "RENAME":
          if (isWord(toks[0], "ALTER") && isWord(next, "TO")) rewriteTable(i + 2, { parenAfter: false, subquery: false });
          break;
        case "TABLE":
          if (i === 1) {
            let j = 2;
            if (isWord(toks[j], "IF")) j += isWord(toks[j + 1], "NOT") ? 3 : 2;
            rewriteTable(j, { parenAfter: true, subquery: false });
          }
          break;
      }
    }
  }
  if (fromStack.length !== 1) fail("unbalanced parentheses");
  if (params !== args.length) throw new SqlError(`Query has ${params} '?' placeholders but ${args.length} args were given`);

  // Qualified column references such as users.name must follow the table's rewritten name.
  for (let i = 0; i < toks.length; i++) {
    const t = toks[i];
    if ((t.type !== "word" && t.type !== "qident") || spans.has(t.start)) continue;
    if (toks[i + 1]?.text !== "." || toks[i - 1]?.text === ".") continue;
    const name = t.type === "qident" ? t.text.slice(1, -1) : t.text;
    if (IDENT.test(name) && tables.has(name.toLowerCase())) {
      replacements.set(t.start, physical(name));
      spans.set(t.start, t.end);
    }
  }

  let out = "";
  let pos = 0;
  for (const start of [...spans.keys()].sort((a, b) => a - b)) {
    out += rawSql.slice(pos, start) + replacements.get(start);
    pos = spans.get(start)!;
  }
  out += rawSql.slice(pos, toks[toks.length - 1].end);
  return { stmt: { sql: out, args }, kind };
}
