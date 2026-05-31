import { loadEnvConfig } from "@next/env";
import { migrate } from "@/src/lib/db/schema";
import { getPool } from "@/src/lib/db/client";

loadEnvConfig(process.cwd());

async function main() {
  if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL is required to prune cross-cycle records.");
  }
  await migrate();
  const pool = getPool();
  try {
    const oldIes = await pool.query(`
      delete from independent_expenditures ie
      using races r
      where ie.race_id = r.id
        and (
          ie.expenditure_date < make_date(r.cycle - 1, 1, 1)
          or ie.expenditure_date > make_date(r.cycle, 12, 31)
        )
    `);
    const oldFilings = await pool.query(`
      delete from filings f
      using committees cm, races r
      where f.committee_id = cm.id
        and cm.race_id = r.id
        and (
          f.receipt_date < make_date(r.cycle - 1, 1, 1)
          or f.receipt_date > make_date(r.cycle, 12, 31)
        )
    `);
    const oldSignals = await pool.query(`
      delete from signals s
      using races r
      where s.race_id = r.id
        and (
          s.signal_date < make_date(r.cycle - 1, 1, 1)
          or s.signal_date > make_date(r.cycle, 12, 31)
        )
    `);
    console.log(
      `Pruned ${oldIes.rowCount ?? 0} Schedule E records, ${oldFilings.rowCount ?? 0} filings, ${oldSignals.rowCount ?? 0} signals outside race cycle windows.`,
    );
  } finally {
    await pool.end();
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
