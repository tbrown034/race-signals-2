import { getPool } from "@/src/lib/db/client";
import type {
  Candidate,
  Committee,
  Filing,
  IndependentExpenditure,
  Race,
  Signal,
  Transaction,
  ValidationIssue,
} from "@/src/lib/types";

export async function upsertRaces(races: Race[]) {
  const pool = getPool();
  for (const race of races) {
    await pool.query(
      `
        insert into races (id, cycle, state, district, office, name, competitiveness)
        values ($1, $2, $3, $4, $5, $6, $7)
        on conflict (id) do update set
          cycle = excluded.cycle,
          state = excluded.state,
          district = excluded.district,
          office = excluded.office,
          name = excluded.name,
          competitiveness = excluded.competitiveness,
          updated_at = now()
      `,
      [race.id, race.cycle, race.state, race.district, race.office, race.name, race.competitiveness],
    );
  }
}

export async function upsertCandidates(candidates: Candidate[]) {
  const pool = getPool();
  for (const candidate of candidates) {
    await pool.query(
      `
        insert into candidates (
          id, fec_candidate_id, name, party, office, state, district, election_year,
          incumbent_challenge_status, race_id, source_url
        )
        values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)
        on conflict (fec_candidate_id) do update set
          name = excluded.name,
          party = excluded.party,
          office = excluded.office,
          state = excluded.state,
          district = excluded.district,
          election_year = excluded.election_year,
          incumbent_challenge_status = excluded.incumbent_challenge_status,
          race_id = excluded.race_id,
          source_url = excluded.source_url,
          updated_at = now()
      `,
      [
        candidate.id,
        candidate.fecCandidateId,
        candidate.name,
        candidate.party,
        candidate.office,
        candidate.state,
        candidate.district,
        candidate.electionYear,
        candidate.incumbentChallengeStatus,
        candidate.raceId,
        candidate.sourceUrl,
      ],
    );
  }
}

export async function upsertCommittees(committees: Committee[]) {
  const pool = getPool();
  for (const committee of committees) {
    await pool.query(
      `
        insert into committees (
          id, fec_committee_id, name, committee_type, designation, party,
          treasurer_name, candidate_id, race_id, source_url
        )
        values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
        on conflict (fec_committee_id) do update set
          name = excluded.name,
          committee_type = excluded.committee_type,
          designation = excluded.designation,
          party = excluded.party,
          treasurer_name = excluded.treasurer_name,
          candidate_id = excluded.candidate_id,
          race_id = excluded.race_id,
          source_url = excluded.source_url,
          updated_at = now()
      `,
      [
        committee.id,
        committee.fecCommitteeId,
        committee.name,
        committee.committeeType,
        committee.designation,
        committee.party,
        committee.treasurerName,
        committee.candidateId,
        committee.raceId,
        committee.sourceUrl,
      ],
    );
  }
}

export async function upsertFilings(filings: Filing[]) {
  const pool = getPool();
  for (const filing of filings.filter((item) => item.sourceId)) {
    await pool.query(
      `
        insert into filings (
          source_id, committee_id, fec_committee_id, report_type, coverage_start_date,
          coverage_end_date, receipt_date, total_receipts, total_disbursements,
          cash_on_hand, source_url, raw
        )
        values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)
        on conflict (source, source_id) do update set
          committee_id = excluded.committee_id,
          report_type = excluded.report_type,
          receipt_date = excluded.receipt_date,
          total_receipts = excluded.total_receipts,
          total_disbursements = excluded.total_disbursements,
          cash_on_hand = excluded.cash_on_hand,
          source_url = excluded.source_url,
          raw = excluded.raw,
          updated_at = now()
      `,
      [
        filing.sourceId,
        filing.committeeId,
        filing.fecCommitteeId,
        filing.reportType,
        filing.coverageStartDate,
        filing.coverageEndDate,
        filing.receiptDate,
        filing.totalReceipts,
        filing.totalDisbursements,
        filing.cashOnHand,
        filing.sourceUrl,
        JSON.stringify(filing.raw),
      ],
    );
  }
}

export async function upsertTransactions(transactions: Transaction[]) {
  const pool = getPool();
  for (const transaction of transactions.filter((item) => item.sourceId)) {
    await pool.query(
      `
        insert into transactions (
          source_id, committee_id, fec_committee_id, contributor_name,
          contributor_employer, contributor_occupation, amount, transaction_date,
          transaction_type, memo_text, source_url, raw
        )
        values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)
        on conflict (source, source_id) do update set
          committee_id = excluded.committee_id,
          contributor_name = excluded.contributor_name,
          amount = excluded.amount,
          transaction_date = excluded.transaction_date,
          transaction_type = excluded.transaction_type,
          memo_text = excluded.memo_text,
          source_url = excluded.source_url,
          raw = excluded.raw
      `,
      [
        transaction.sourceId,
        transaction.committeeId,
        transaction.fecCommitteeId,
        transaction.contributorName,
        transaction.contributorEmployer,
        transaction.contributorOccupation,
        transaction.amount,
        transaction.transactionDate,
        transaction.transactionType,
        transaction.memoText,
        transaction.sourceUrl,
        JSON.stringify(transaction.raw),
      ],
    );
  }
}

export async function upsertIndependentExpenditures(expenditures: IndependentExpenditure[]) {
  const pool = getPool();
  for (const expenditure of expenditures.filter((item) => item.sourceId)) {
    await pool.query(
      `
        insert into independent_expenditures (
          source_id, spender_committee_id, fec_committee_id, candidate_id,
          fec_candidate_id, race_id, support_oppose_indicator, amount,
          expenditure_date, purpose, source_url, raw
        )
        values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)
        on conflict (source, source_id) do update set
          spender_committee_id = excluded.spender_committee_id,
          candidate_id = excluded.candidate_id,
          race_id = excluded.race_id,
          support_oppose_indicator = excluded.support_oppose_indicator,
          amount = excluded.amount,
          expenditure_date = excluded.expenditure_date,
          purpose = excluded.purpose,
          source_url = excluded.source_url,
          raw = excluded.raw
      `,
      [
        expenditure.sourceId,
        expenditure.spenderCommitteeId,
        expenditure.fecCommitteeId,
        expenditure.candidateId,
        expenditure.fecCandidateId,
        expenditure.raceId,
        expenditure.supportOpposeIndicator,
        expenditure.amount,
        expenditure.expenditureDate,
        expenditure.purpose,
        expenditure.sourceUrl,
        JSON.stringify(expenditure.raw),
      ],
    );
  }
}

export async function upsertSignals(signals: Signal[]) {
  const pool = getPool();
  for (const signal of signals) {
    await pool.query(
      `
        insert into signals (
          dedupe_key, signal_type, headline, why_it_matters, candidate_id,
          committee_id, race_id, amount, signal_date, source_url, confidence,
          status, data_freshness, metadata
        )
        values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14)
        on conflict (dedupe_key) do update set
          headline = excluded.headline,
          why_it_matters = excluded.why_it_matters,
          amount = excluded.amount,
          source_url = excluded.source_url,
          confidence = excluded.confidence,
          status = excluded.status,
          data_freshness = excluded.data_freshness,
          metadata = excluded.metadata,
          updated_at = now()
      `,
      [
        signal.dedupeKey,
        signal.signalType,
        signal.headline,
        signal.whyItMatters,
        signal.candidateId,
        signal.committeeId,
        signal.raceId,
        signal.amount,
        signal.signalDate,
        signal.sourceUrl,
        signal.confidence,
        signal.status,
        signal.dataFreshness,
        JSON.stringify(signal.metadata ?? {}),
      ],
    );
  }
}

export async function insertValidationIssues(issues: ValidationIssue[]) {
  const pool = getPool();
  for (const issue of issues) {
    await pool.query(
      `
        insert into validation_issues (
          source, entity_type, source_id, severity, rule, message, source_url, raw
        )
        values ('fec', $1, $2, $3, $4, $5, $6, $7)
      `,
      [
        issue.entityType,
        issue.sourceId,
        issue.severity,
        issue.rule,
        issue.message,
        issue.sourceUrl,
        JSON.stringify(issue.raw ?? {}),
      ],
    );
  }
}

export async function createIngestionRun(scope: string) {
  const rows = await getPool().query<{ id: string }>(
    "insert into ingestion_runs (source, scope, status) values ('fec', $1, 'running') returning id",
    [scope],
  );
  return rows.rows[0].id;
}

export async function finishIngestionRun(
  id: string,
  status: "success" | "failed",
  recordsSeen: number,
  errors: unknown[] = [],
) {
  await getPool().query(
    `
      update ingestion_runs
      set status = $2,
          finished_at = now(),
          records_seen = $3,
          records_inserted = $3,
          errors = $4
      where id = $1
    `,
    [id, status, recordsSeen, JSON.stringify(errors)],
  );
}
