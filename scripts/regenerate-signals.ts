import { loadEnvConfig } from "@next/env";
import { getPool } from "@/src/lib/db/client";
import { upsertSignals } from "@/src/lib/db/write";
import { generateSignals } from "@/src/lib/signals/generate";
import type { Candidate, Committee, Filing, IndependentExpenditure, Race } from "@/src/lib/types";

loadEnvConfig(process.cwd());

async function main() {
  if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL is required to regenerate signals.");
  }

  const pool = getPool();
  try {
    const [candidateRows, committeeRows, raceRows, filingRows, ieRows] = await Promise.all([
      pool.query("select * from candidates"),
      pool.query("select * from committees"),
      pool.query("select * from races"),
      pool.query("select * from filings"),
      pool.query("select * from independent_expenditures"),
    ]);
    const freshness = new Date().toISOString();
    const signals = generateSignals({
      candidates: candidateRows.rows.map(mapCandidate),
      committees: committeeRows.rows.map(mapCommittee),
      races: raceRows.rows.map(mapRace),
      filings: filingRows.rows.map(mapFiling),
      independentExpenditures: ieRows.rows.map(mapIndependentExpenditure),
      dataFreshness: freshness,
    });
    await pruneFecSignals(pool, signals.map((signal) => signal.dedupeKey));
    await upsertSignals(signals);
    console.log(`Regenerated ${signals.length} signals from existing normalized records.`);
  } finally {
    await pool.end();
  }
}

async function pruneFecSignals(pool: ReturnType<typeof getPool>, dedupeKeys: string[]) {
  if (!dedupeKeys.length) {
    await pool.query("delete from signals where dedupe_key like 'fec:%'");
    return;
  }
  await pool.query("delete from signals where dedupe_key like 'fec:%' and not (dedupe_key = any($1::text[]))", [
    dedupeKeys,
  ]);
}

function mapCandidate(row: Record<string, unknown>): Candidate {
  return {
    id: String(row.id),
    fecCandidateId: String(row.fec_candidate_id),
    name: String(row.name),
    party: text(row.party),
    office: String(row.office),
    state: String(row.state),
    district: text(row.district),
    electionYear: numberOrNull(row.election_year),
    incumbentChallengeStatus: text(row.incumbent_challenge_status),
    totalReceiptsCycle: numberOrNull(row.total_receipts_cycle),
    totalDisbursementsCycle: numberOrNull(row.total_disbursements_cycle),
    cashOnHandLatest: numberOrNull(row.cash_on_hand_latest),
    cashOnHandAsOf: dateText(row.cash_on_hand_as_of),
    individualContributionPct: numberOrNull(row.individual_contribution_pct),
    pacContributionPct: numberOrNull(row.pac_contribution_pct),
    totalsUpdatedAt: isoText(row.totals_updated_at),
    generalElectionStatus: text(row.general_election_status),
    bioguideId: text(row.bioguide_id),
    wikidataId: text(row.wikidata_id),
    photoUrl: text(row.photo_url),
    wikipediaUrl: text(row.wikipedia_url),
    electionsCheckedAt: isoText(row.elections_checked_at),
    raceId: text(row.race_id),
    sourceUrl: text(row.source_url),
  };
}

function mapCommittee(row: Record<string, unknown>): Committee {
  return {
    id: String(row.id),
    fecCommitteeId: String(row.fec_committee_id),
    name: String(row.name),
    committeeType: text(row.committee_type),
    designation: text(row.designation),
    party: text(row.party),
    treasurerName: text(row.treasurer_name),
    candidateId: text(row.candidate_id),
    raceId: text(row.race_id),
    discoveredVia: text(row.discovered_via),
    firstFileDate: dateText(row.first_file_date),
    sourceUrl: text(row.source_url),
  };
}

function mapRace(row: Record<string, unknown>): Race {
  return {
    id: String(row.id),
    cycle: Number(row.cycle),
    state: String(row.state),
    district: String(row.district),
    office: String(row.office),
    name: String(row.name),
    competitiveness: text(row.competitiveness),
  };
}

function mapFiling(row: Record<string, unknown>): Filing {
  return {
    sourceId: String(row.source_id),
    cycle: numberOrNull(row.cycle),
    committeeId: text(row.committee_id),
    fecCommitteeId: text(row.fec_committee_id),
    reportType: text(row.report_type),
    coverageStartDate: dateText(row.coverage_start_date),
    coverageEndDate: dateText(row.coverage_end_date),
    receiptDate: dateText(row.receipt_date),
    totalReceipts: numberOrNull(row.total_receipts),
    totalDisbursements: numberOrNull(row.total_disbursements),
    cashOnHand: numberOrNull(row.cash_on_hand),
    sourceUrl: text(row.source_url),
    raw: row.raw ?? {},
  };
}

function mapIndependentExpenditure(row: Record<string, unknown>): IndependentExpenditure {
  return {
    sourceId: String(row.source_id),
    cycle: numberOrNull(row.cycle),
    spenderCommitteeId: text(row.spender_committee_id),
    fecCommitteeId: text(row.fec_committee_id),
    candidateId: text(row.candidate_id),
    fecCandidateId: text(row.fec_candidate_id),
    raceId: text(row.race_id),
    supportOpposeIndicator: text(row.support_oppose_indicator),
    amount: Number(row.amount),
    expenditureDate: dateText(row.expenditure_date),
    purpose: text(row.purpose),
    sourceUrl: text(row.source_url),
    raw: row.raw ?? {},
  };
}

function text(value: unknown) {
  return value === null || value === undefined ? null : String(value);
}

function numberOrNull(value: unknown) {
  if (value === null || value === undefined) return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function dateText(value: unknown) {
  if (value instanceof Date) return value.toISOString().slice(0, 10);
  return text(value)?.slice(0, 10) ?? null;
}

function isoText(value: unknown) {
  if (value instanceof Date) return value.toISOString();
  return text(value);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
