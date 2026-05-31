import { loadEnvConfig } from "@next/env";
import { getPool } from "@/src/lib/db/client";

loadEnvConfig(process.cwd());

async function main() {
  if (!process.env.DATABASE_URL) {
    console.log("No DATABASE_URL configured; donor transaction repair skipped.");
    return;
  }

  const pool = getPool();
  try {
    const result = await pool.query("delete from transactions");
    console.log(`Removed ${result.rowCount ?? 0} legacy donor transaction rows.`);
  } finally {
    await pool.end();
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
