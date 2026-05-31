import { loadEnvConfig } from "@next/env";
import { getPool } from "@/src/lib/db/client";

loadEnvConfig(process.cwd());

type Check = {
  name: string;
  severity: "info" | "warn" | "fail";
  count: number;
  sample?: Record<string, unknown>[];
};

async function main() {
  if (!process.env.DATABASE_URL) {
    console.log("No DATABASE_URL configured; signal audit skipped.");
    return;
  }

  const pool = getPool();
  try {
    const checks: Check[] = [];

    checks.push(await countCheck(pool, "Missing source URL", "fail", `
      select dedupe_key, signal_type, headline
      from signals
      where source_url is null or source_url = ''
      limit 10
    `));

    checks.push(await countCheck(pool, "Missing signal source ID", "fail", `
      select dedupe_key, signal_type, headline
      from signals
      where metadata->>'sourceId' is null or metadata->>'sourceId' = ''
      limit 10
    `));

    checks.push(await countCheck(pool, "Missing signal source kind", "fail", `
      select dedupe_key, signal_type, headline
      from signals
      where metadata->>'sourceKind' is null or metadata->>'sourceKind' = ''
      limit 10
    `));

    checks.push(await countCheck(pool, "Non-FEC signal source URL", "fail", `
      select dedupe_key, signal_type, source_url, metadata->>'sourceKind' as source_kind
      from signals
      where source_url is not null
        and source_url <> ''
        and source_url not like 'https://www.fec.gov/data/%'
      limit 10
    `));

    checks.push(await countCheck(pool, "Committee signal source URL mismatch", "fail", `
      select dedupe_key, signal_type, source_url, metadata->>'sourceId' as source_id
      from signals
      where metadata->>'sourceKind' = 'committee'
        and source_url not like 'https://www.fec.gov/data/committee/%'
      limit 10
    `));

    checks.push(await countCheck(pool, "Filing signal source URL mismatch", "fail", `
      select dedupe_key, signal_type, source_url, metadata->>'sourceId' as source_id
      from signals
      where metadata->>'sourceKind' = 'filing'
        and source_url not like 'https://www.fec.gov/data/filing/%'
      limit 10
    `));

    checks.push(await countCheck(pool, "Schedule E signal source URL mismatch", "fail", `
      select dedupe_key, signal_type, source_url, metadata->>'sourceId' as source_id
      from signals
      where metadata->>'sourceKind' = 'schedule_e'
        and (
          source_url not like 'https://www.fec.gov/data/independent-expenditures/%'
          or position(('sub_id=' || (metadata->>'sourceId')) in source_url) = 0
        )
      limit 10
    `));

    checks.push(await countCheck(pool, "Duplicate signal keys", "fail", `
      select dedupe_key, count(*)::int as count
      from signals
      group by dedupe_key
      having count(*) > 1
      limit 10
    `));

    checks.push(await countCheck(pool, "Future-dated signals", "fail", `
      select dedupe_key, signal_type, signal_date, data_freshness
      from signals
      where signal_date::date > (data_freshness::date + interval '1 day')
      limit 10
    `));

    checks.push(await countCheck(pool, "Old events still marked new", "warn", `
      select dedupe_key, signal_type, headline, signal_date, data_freshness
      from signals
      where status = 'new'
        and signal_date::date < (data_freshness::date - interval '14 days')
      order by signal_date desc
      limit 10
    `));

    checks.push(await countCheck(pool, "Signals outside race cycle window", "fail", `
      select s.dedupe_key, s.signal_type, s.signal_date, r.id as race_id, r.cycle
      from signals s
      join races r on r.id = s.race_id
      where s.signal_date < make_date(r.cycle - 1, 1, 1)
         or s.signal_date > make_date(r.cycle, 12, 31)
      order by s.signal_date asc
      limit 10
    `));

    checks.push(await countCheck(pool, "Schedule E outside race cycle window", "fail", `
      select ie.source_id, ie.expenditure_date, ie.race_id, r.cycle, ie.amount
      from independent_expenditures ie
      join races r on r.id = ie.race_id
      where ie.expenditure_date < make_date(r.cycle - 1, 1, 1)
         or ie.expenditure_date > make_date(r.cycle, 12, 31)
      order by ie.expenditure_date asc
      limit 10
    `));

    checks.push(await countCheck(pool, "Possible duplicate Schedule E records", "warn", `
      select
        spender_committee_id,
        candidate_id,
        expenditure_date,
        amount,
        support_oppose_indicator,
        count(*)::int as count,
        array_agg(source_id order by source_id) as source_ids
      from independent_expenditures
      group by spender_committee_id, candidate_id, expenditure_date, amount, support_oppose_indicator
      having count(*) > 1
      limit 10
    `));

    checks.push(await countCheck(pool, "Schedule E signals missing stance", "fail", `
      select dedupe_key, signal_type, headline, metadata->>'sourceId' as source_id
      from signals
      where signal_type = 'large_independent_expenditure'
        and (metadata->>'supportOpposeIndicator' is null or metadata->>'supportOpposeIndicator' = '')
      limit 10
    `));

    checks.push(await countCheck(pool, "Filings outside race cycle window", "fail", `
      select f.source_id, f.receipt_date, cm.race_id, r.cycle
      from filings f
      join committees cm on cm.id = f.committee_id
      join races r on r.id = cm.race_id
      where f.receipt_date < make_date(r.cycle - 1, 1, 1)
         or f.receipt_date > make_date(r.cycle, 12, 31)
      order by f.receipt_date asc
      limit 10
    `));

    checks.push(await countCheck(pool, "Incumbent committee copy needs review", "warn", `
      select s.dedupe_key, s.headline, c.name, c.incumbent_challenge_status
      from signals s
      join candidates c on c.id = s.candidate_id
      where s.signal_type = 'new_committee'
        and c.incumbent_challenge_status in ('I', 'Incumbent')
        and (
          s.why_it_matters not ilike '%not proof%'
          or s.why_it_matters ilike '%first%launch%'
          or s.why_it_matters ilike '%early paperwork signal%'
        )
      limit 10
    `));

    checks.push(await countCheck(pool, "Unknown-status committee copy framed as challenger", "warn", `
      select s.dedupe_key, s.headline, s.why_it_matters, c.name, c.incumbent_challenge_status
      from signals s
      left join candidates c on c.id = s.candidate_id
      where s.signal_type = 'new_committee'
        and (c.incumbent_challenge_status is null or c.incumbent_challenge_status not in ('I', 'Incumbent', 'C', 'Challenger', 'O', 'Open seat'))
        and (
          s.why_it_matters ilike '%challenger%'
          or s.why_it_matters ilike '%non-incumbent%'
        )
      limit 10
    `));

    checks.push(await countCheck(pool, "Schedule E headline lacks independent-expenditure context", "fail", `
      select dedupe_key, headline, metadata->>'sourceId' as source_id
      from signals
      where signal_type = 'large_independent_expenditure'
        and headline not ilike '%independent expenditure%'
        and headline not ilike '%schedule e%'
      limit 10
    `));

    checks.push(await countCheck(pool, "Refiles use generic new-report copy", "warn", `
      select dedupe_key, headline, why_it_matters, metadata->>'sourceId' as source_id
      from signals
      where signal_type = 'new_filing'
        and metadata->>'filingVersionKind' = 'likely_refile'
        and why_it_matters ilike '%New reports can reveal%'
      limit 10
    `));

    checks.push(await countCheck(pool, "Historical filings use fresh-report copy", "warn", `
      select dedupe_key, headline, why_it_matters, metadata->>'sourceId' as source_id
      from signals
      where signal_type = 'new_filing'
        and status = 'historical'
        and why_it_matters ilike '%New reports can reveal%'
      limit 10
    `));

    checks.push(await countCheck(pool, "Activity spikes missing comparison evidence", "fail", `
      select dedupe_key, headline, metadata
      from signals
      where signal_type = 'committee_activity_spike'
        and (
          metadata->>'latestSourceUrl' is null
          or metadata->>'priorSourceUrl' is null
          or metadata->>'latestCoverageStartDate' is null
          or metadata->>'latestCoverageEndDate' is null
          or metadata->>'priorCoverageStartDate' is null
          or metadata->>'priorCoverageEndDate' is null
        )
      limit 10
    `));

    checks.push(await countCheck(pool, "Signals without matched race", "fail", `
      select dedupe_key, signal_type, headline, metadata->>'sourceId' as source_id
      from signals
      where race_id is null or race_id = ''
      limit 10
    `));

    checks.push(await countCheck(pool, "Candidate signal coverage gaps", "info", `
      select c.id, c.name, c.fec_candidate_id, c.total_receipts_cycle
      from candidates c
      left join signals s on s.candidate_id = c.id
      group by c.id
      having count(s.id) = 0
      order by c.total_receipts_cycle desc nulls last
      limit 10
    `));

    for (const check of checks) {
      const label = `${check.severity.toUpperCase()} ${check.name}: ${check.count}`;
      console.log(label);
      if (check.sample?.length) console.table(check.sample);
    }

    const strict = process.env.SIGNAL_AUDIT_STRICT === "1";
    const failures = checks.filter((check) => check.severity === "fail" && check.count > 0);
    if (strict && failures.length) process.exitCode = 1;
  } finally {
    await pool.end();
  }
}

async function countCheck(
  pool: ReturnType<typeof getPool>,
  name: string,
  severity: Check["severity"],
  query: string,
): Promise<Check> {
  const sample = await pool.query(query);
  let count = sample.rowCount ?? 0;
  if (count === 10) {
    const countResult = await pool.query<{ count: string }>(`select count(*)::text from (${query.replace(/limit 10\s*$/i, "")}) q`);
    count = Number(countResult.rows[0]?.count ?? count);
  }
  return { name, severity, count, sample: sample.rows };
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
