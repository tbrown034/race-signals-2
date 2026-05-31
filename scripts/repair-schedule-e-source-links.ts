import { loadEnvConfig } from "@next/env";
import { getPool } from "@/src/lib/db/client";
import { fecIndependentExpendituresUrl } from "@/src/lib/sources/fec/client";

loadEnvConfig(process.cwd());

async function main() {
  if (!process.env.DATABASE_URL) {
    console.log("No DATABASE_URL configured; Schedule E source-link repair skipped.");
    return;
  }

  const pool = getPool();
  try {
    const rows = await pool.query<{
      source_id: string;
      fec_candidate_id: string | null;
      fec_committee_id: string | null;
      amount: string;
      expenditure_date: string | Date | null;
    }>(`
      select source_id, fec_candidate_id, fec_committee_id, amount::text as amount, expenditure_date
      from independent_expenditures
      where source = 'fec'
        and source_id is not null
        and fec_candidate_id is not null
    `);

    let updated = 0;
    for (const row of rows.rows) {
      const sourceUrl = fecIndependentExpendituresUrl({
        candidate_id: row.fec_candidate_id,
        committee_id: row.fec_committee_id,
        expenditure_amount: Number(row.amount),
        expenditure_date: dateText(row.expenditure_date),
        sub_id: row.source_id,
      });

      await pool.query(
        `
          update independent_expenditures
          set source_url = $2
          where source = 'fec' and source_id = $1
        `,
        [row.source_id, sourceUrl],
      );
      await pool.query(
        `
          update signals
          set source_url = $2
          where dedupe_key = $1
            and signal_type = 'large_independent_expenditure'
        `,
        [`fec:large_ie:${row.source_id}`, sourceUrl],
      );
      await pool.query(
        `
          update validation_issues
          set source_url = $2
          where entity_type = 'independent_expenditure'
            and source_id = $1
        `,
        [row.source_id, sourceUrl],
      );
      updated += 1;
    }

    console.log(`Repaired ${updated} Schedule E source links.`);
  } finally {
    await pool.end();
  }
}

function dateText(value: string | Date | null) {
  if (!value) return null;
  if (value instanceof Date) return value.toISOString().slice(0, 10);
  return String(value).slice(0, 10);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
