import fs from "node:fs";
import path from "node:path";

const MIGRATIONS_DIR = path.join(process.cwd(), "supabase", "migrations");

/** Tables managed by migrations 0001-0009 (excludes Supabase internals). */
const EXPECTED_TABLES = new Set([
  "admin_profiles",
  "exhibitor_applications",
  "sponsor_inquiries",
  "visitor_registrations",
  "contact_messages",
  "news_posts",
  "communication_log",
  "communication_recipients",
  "activity_logs",
  "entity_notes",
]);

const SQL_KEYWORDS = new Set([
  "primary",
  "unique",
  "check",
  "constraint",
  "foreign",
  "references",
  "not",
  "null",
  "default",
  "on",
  "delete",
  "cascade",
  "set",
]);

function migrationFiles() {
  return fs
    .readdirSync(MIGRATIONS_DIR)
    .filter((f) => /^000[1-9]_.*\.sql$/.test(f))
    .sort();
}

function parseCreateTableColumns(body) {
  const columns = new Set();
  for (const line of body.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("--")) continue;
    const match = /^(\w+)\s+/i.exec(trimmed);
    if (!match) continue;
    const name = match[1].toLowerCase();
    if (SQL_KEYWORDS.has(name)) continue;
    columns.add(match[1]);
  }
  return columns;
}

/**
 * Build the expected schema manifest by parsing migration SQL files 0001-0009.
 * Returns shape compatible with get_schema_audit_state() live JSON.
 */
export function buildExpectedManifest() {
  const tables = new Map();
  const policies = new Set();
  const rlsEnabled = new Set();
  const realtimeTables = new Set();
  const indexes = new Set();
  const constraints = new Set();

  for (const file of migrationFiles()) {
    const sql = fs.readFileSync(path.join(MIGRATIONS_DIR, file), "utf8");

    for (const match of sql.matchAll(/create table if not exists public\.(\w+)\s*\(([\s\S]*?)\);/gi)) {
      const table = match[1];
      if (!tables.has(table)) tables.set(table, new Set());
      for (const col of parseCreateTableColumns(match[2])) {
        tables.get(table).add(col);
      }
    }

    for (const match of sql.matchAll(
      /alter table public\.(\w+)\s+add column if not exists\s+([\s\S]*?);/gi,
    )) {
      const table = match[1];
      if (!tables.has(table)) tables.set(table, new Set());
      for (const colMatch of match[2].matchAll(/(\w+)\s+(?:text|uuid|boolean|integer|timestamptz|jsonb)/gi)) {
        tables.get(table).add(colMatch[1]);
      }
    }

    for (const match of sql.matchAll(/create policy "([^"]+)" on public\.(\w+)/gi)) {
      policies.add(`${match[2]}|${match[1]}`);
    }

    for (const match of sql.matchAll(/alter table public\.(\w+) enable row level security/gi)) {
      rlsEnabled.add(match[1]);
    }

    for (const match of sql.matchAll(/create index if not exists (\w+) on public\.(\w+)/gi)) {
      indexes.add(`${match[2]}|${match[1]}`);
    }

    for (const match of sql.matchAll(
      /alter table public\.(\w+)\s+add constraint (\w+)\s+check/gi,
    )) {
      constraints.add(`${match[1]}|${match[2]}|c`);
    }

    if (file.includes("0006")) {
      for (const t of [
        "exhibitor_applications",
        "sponsor_inquiries",
        "visitor_registrations",
        "contact_messages",
      ]) {
        realtimeTables.add(t);
      }
    }
  }

  return {
    policies: [...policies].sort().map((key) => {
      const [table, name] = key.split("|");
      return { table, name };
    }),
    tables: [...EXPECTED_TABLES]
      .sort()
      .map((table) => ({
        table,
        columns: [...(tables.get(table) ?? new Set())].sort(),
      })),
    rls_enabled: [...rlsEnabled].sort(),
    realtime_tables: [...realtimeTables].sort(),
    indexes: [...indexes].sort().map((key) => {
      const [table, name] = key.split("|");
      return { table, name };
    }),
    constraints: [...constraints].sort().map((key) => {
      const [table, name, type] = key.split("|");
      return { table, name, type };
    }),
  };
}

export function diffManifest(expected, live) {
  const issues = [];

  const expectedPolicyKeys = new Set(expected.policies.map((p) => `${p.table}|${p.name}`));
  const livePolicyKeys = new Set((live.policies ?? []).map((p) => `${p.table}|${p.name}`));
  for (const key of expectedPolicyKeys) {
    if (!livePolicyKeys.has(key)) issues.push({ kind: "missing_policy", detail: key });
  }

  for (const expTable of expected.tables) {
    const liveTable = (live.tables ?? []).find((t) => t.table === expTable.table);
    if (!liveTable) {
      issues.push({ kind: "missing_table", detail: expTable.table });
      continue;
    }
    const liveCols = new Set(liveTable.columns ?? []);
    for (const col of expTable.columns) {
      if (!liveCols.has(col)) {
        issues.push({ kind: "missing_column", detail: `${expTable.table}.${col}` });
      }
    }
  }

  for (const table of expected.rls_enabled) {
    if (!(live.rls_enabled ?? []).includes(table)) {
      issues.push({ kind: "rls_not_enabled", detail: table });
    }
  }

  for (const table of expected.realtime_tables) {
    if (!(live.realtime_tables ?? []).includes(table)) {
      issues.push({ kind: "missing_realtime", detail: table });
    }
  }

  for (const expIdx of expected.indexes) {
    const found = (live.indexes ?? []).some(
      (i) => i.table === expIdx.table && i.name === expIdx.name,
    );
    if (!found) issues.push({ kind: "missing_index", detail: `${expIdx.table}.${expIdx.name}` });
  }

  for (const expCon of expected.constraints) {
    const found = (live.constraints ?? []).some(
      (c) => c.table === expCon.table && c.name === expCon.name,
    );
    if (!found) {
      issues.push({ kind: "missing_constraint", detail: `${expCon.table}.${expCon.name}` });
    }
  }

  return issues;
}
