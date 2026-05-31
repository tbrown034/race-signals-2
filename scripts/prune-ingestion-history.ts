import { loadEnvConfig } from "@next/env";
import { getPool } from "@/src/lib/db/client";

loadEnvConfig(process.cwd());

const retentionDays = readPositiveInteger("INGESTION_HISTORY_RETENTION_DAYS", 90);
const keepRuns = readPositiveInteger("INGESTION_HISTORY_KEEP_RUNS", 30);
const dryRun = process.env.DRY_RUN === "1";

async function main() {
  if (!process.env.DATABASE_URL) {
    console.log("No DATABASE_URL configured; ingestion history prune skipped.");
    return;
  }

  const pool = getPool();
  try {
    const cutoffResult = await pool.query<{ cutoff: Date }>(
      "select now() - ($1::int * interval '1 day') as cutoff",
      [retentionDays],
    );
    const cutoff = cutoffResult.rows[0].cutoff;
    const counts = await countPrunableRows(cutoff);

    if (dryRun) {
      console.log(
        `Dry run: would prune ${counts.validationIssues} validation issues, ${counts.endpointRuns} endpoint runs and ${counts.ingestionRuns} ingestion runs older than ${retentionDays} days, preserving the latest endpoint row per endpoint and latest ${keepRuns} ingestion runs.`,
      );
      return;
    }

    const validationIssues = await pool.query<{ count: string }>(
      "delete from validation_issues where created_at < $1 returning 1",
      [cutoff],
    );

    const endpointRuns = await pool.query<{ count: string }>(
      `
        with latest_per_endpoint as (
          select distinct on (endpoint) id
          from ingestion_endpoint_runs
          order by endpoint, completed_at desc
        )
        delete from ingestion_endpoint_runs
        where completed_at < $1
          and id not in (select id from latest_per_endpoint)
        returning 1
      `,
      [cutoff],
    );

    const ingestionRuns = await pool.query<{ count: string }>(
      `
        with protected_runs as (
          select id
          from ingestion_runs
          order by started_at desc
          limit $2
        )
        delete from ingestion_runs
        where started_at < $1
          and id not in (select id from protected_runs)
          and id not in (
            select ingestion_run_id
            from ingestion_endpoint_runs
            where ingestion_run_id is not null
          )
        returning 1
      `,
      [cutoff, keepRuns],
    );

    console.log(
      `Pruned ${validationIssues.rowCount ?? 0} validation issues, ${endpointRuns.rowCount ?? 0} endpoint runs and ${ingestionRuns.rowCount ?? 0} ingestion runs older than ${retentionDays} days.`,
    );
  } finally {
    await pool.end();
  }
}

async function countPrunableRows(cutoff: Date) {
  const pool = getPool();
  const [validationIssues, endpointRuns, ingestionRuns] = await Promise.all([
    pool.query<{ count: string }>(
      "select count(*)::text as count from validation_issues where created_at < $1",
      [cutoff],
    ),
    pool.query<{ count: string }>(
      `
        with latest_per_endpoint as (
          select distinct on (endpoint) id
          from ingestion_endpoint_runs
          order by endpoint, completed_at desc
        )
        select count(*)::text as count
        from ingestion_endpoint_runs
        where completed_at < $1
          and id not in (select id from latest_per_endpoint)
      `,
      [cutoff],
    ),
    pool.query<{ count: string }>(
      `
        with protected_runs as (
          select id
          from ingestion_runs
          order by started_at desc
          limit $2
        )
        select count(*)::text as count
        from ingestion_runs
        where started_at < $1
          and id not in (select id from protected_runs)
          and id not in (
            select ingestion_run_id
            from ingestion_endpoint_runs
            where ingestion_run_id is not null
          )
      `,
      [cutoff, keepRuns],
    ),
  ]);

  return {
    validationIssues: Number(validationIssues.rows[0]?.count ?? 0),
    endpointRuns: Number(endpointRuns.rows[0]?.count ?? 0),
    ingestionRuns: Number(ingestionRuns.rows[0]?.count ?? 0),
  };
}

function readPositiveInteger(name: string, fallback: number) {
  const value = Number(process.env[name] ?? fallback);
  if (!Number.isFinite(value) || value < 1) return fallback;
  return Math.floor(value);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
