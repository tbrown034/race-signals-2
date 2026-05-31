import { loadEnvConfig } from "@next/env";
import { getPool } from "@/src/lib/db/client";

loadEnvConfig(process.cwd());

async function main() {
  if (!process.env.DATABASE_URL) {
    console.log("No DATABASE_URL configured; cost audit skipped.");
    return;
  }

  const pool = getPool();
  try {
    const databaseSize = await pool.query<{ size: string }>(
      "select pg_database_size(current_database())::text as size",
    );
    const tables = await pool.query<{
      table_name: string;
      total_bytes: string;
      row_estimate: string;
    }>(`
      select
        relname as table_name,
        pg_total_relation_size(c.oid)::text as total_bytes,
        reltuples::bigint::text as row_estimate
      from pg_class c
      join pg_namespace n on n.oid = c.relnamespace
      where n.nspname = 'public'
        and c.relkind = 'r'
      order by pg_total_relation_size(c.oid) desc
      limit 12
    `);
    const exactCounts = await getExactCounts(
      pool,
      tables.rows.map((row) => row.table_name),
    );

    console.log(`Database size: ${formatBytes(Number(databaseSize.rows[0]?.size ?? 0))}`);
    console.table(
      tables.rows.map((row) => ({
        table: row.table_name,
        size: formatBytes(Number(row.total_bytes)),
        rows: exactCounts.get(row.table_name) ?? Number(row.row_estimate),
      })),
    );
  } finally {
    await pool.end();
  }
}

async function getExactCounts(pool: ReturnType<typeof getPool>, tableNames: string[]) {
  const counts = new Map<string, number>();
  const budgetSensitiveTables = tableNames.filter((name) =>
    [
      "candidates",
      "committees",
      "filings",
      "independent_expenditures",
      "signals",
      "source_records",
      "transactions",
      "validation_issues",
    ].includes(name),
  );

  for (const tableName of budgetSensitiveTables) {
    const result = await pool.query<{ count: string }>(
      `select count(*)::text as count from ${quoteIdentifier(tableName)}`,
    );
    counts.set(tableName, Number(result.rows[0]?.count ?? 0));
  }

  return counts;
}

function quoteIdentifier(identifier: string) {
  return `"${identifier.replaceAll('"', '""')}"`;
}

function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  const units = ["KB", "MB", "GB"];
  let value = bytes / 1024;
  let unit = units[0];
  for (let index = 1; index < units.length && value >= 1024; index += 1) {
    value /= 1024;
    unit = units[index];
  }
  return `${value.toFixed(value >= 10 ? 1 : 2)} ${unit}`;
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
