import {
  demoCandidates,
  demoCommittees,
  demoIndependentExpenditures,
  demoIngestionRuns,
  demoRaces,
  demoSignals,
} from "@/src/lib/demo/data";
import { hasDatabase, sql } from "@/src/lib/db/client";
import type { SignalFilters } from "@/src/lib/signals/filters";
import type { Candidate, Committee, EndpointFreshness, IngestionRun, Race, RaceRating, Signal, Transaction } from "@/src/lib/types";

type SignalRow = {
  id: string;
  dedupe_key: string;
  signal_type: string;
  headline: string;
  why_it_matters: string;
  candidate_id: string | null;
  candidate_name: string | null;
  committee_id: string | null;
  committee_name: string | null;
  race_id: string | null;
  race_name: string | null;
  race_state: string | null;
  race_office: string | null;
  amount: string | null;
  signal_date: string | Date;
  source_url: string | null;
  confidence: "high" | "medium" | "low";
  status: string;
  data_freshness: string | Date;
  metadata: Record<string, unknown>;
};

function mapSignal(row: SignalRow): Signal {
  return {
    id: row.id,
    dedupeKey: row.dedupe_key,
    signalType: row.signal_type,
    headline: row.headline,
    whyItMatters: row.why_it_matters,
    candidateId: row.candidate_id,
    candidateName: row.candidate_name,
    committeeId: row.committee_id,
    committeeName: row.committee_name,
    raceId: row.race_id,
    raceName: row.race_name,
    state: row.race_state,
    office: row.race_office,
    amount: row.amount === null ? null : Number(row.amount),
    signalDate: toDateString(row.signal_date),
    sourceUrl: row.source_url,
    confidence: row.confidence,
    status: row.status,
    dataFreshness: toIsoString(row.data_freshness),
    metadata: row.metadata,
  };
}

function toDateString(value: string | Date) {
  if (value instanceof Date) return value.toISOString().slice(0, 10);
  return String(value).slice(0, 10);
}

function toIsoString(value: string | Date) {
  if (value instanceof Date) return value.toISOString();
  return String(value);
}

export async function getSignals(filters: SignalFilters = {}) {
  if (!hasDatabase()) {
    const q = filters.q?.toLowerCase();
    return demoSignals.filter((signal) => {
      if (filters.raceId && signal.raceId !== filters.raceId) return false;
      if (filters.state && !signal.raceId?.includes(`-${filters.state}-`)) return false;
      if (filters.office && !signal.raceId?.endsWith(`-${filters.office}`)) return false;
      if (filters.type && signal.signalType !== filters.type) return false;
      if (filters.status && signal.status !== filters.status) return false;
      if (q && !`${signal.headline} ${signal.whyItMatters}`.toLowerCase().includes(q)) {
        return false;
      }
      return true;
    }).slice(0, filters.limit ?? 50);
  }

  const values: unknown[] = [];
  const where: string[] = [];
  if (filters.raceId) {
    values.push(filters.raceId);
    where.push(`s.race_id = $${values.length}`);
  }
  if (filters.state) {
    values.push(filters.state);
    where.push(`r.state = $${values.length}`);
  }
  if (filters.office) {
    values.push(filters.office);
    where.push(`r.office = $${values.length}`);
  }
  if (filters.type) {
    values.push(filters.type);
    where.push(`s.signal_type = $${values.length}`);
  }
  if (filters.status) {
    values.push(filters.status);
    where.push(`s.status = $${values.length}`);
  }
  if (filters.since) {
    values.push(filters.since);
    where.push(`s.created_at > $${values.length}`);
  }
  if (filters.q) {
    values.push(`%${filters.q}%`);
    where.push(`(s.headline ilike $${values.length} or s.why_it_matters ilike $${values.length})`);
  }
  values.push(filters.limit ?? 50);

  const rows = await sql<SignalRow>(
    `
      select
        s.*,
        c.name as candidate_name,
        cm.name as committee_name,
        r.name as race_name,
        r.state as race_state,
        r.office as race_office
      from signals s
      left join candidates c on c.id = s.candidate_id
      left join committees cm on cm.id = s.committee_id
      left join races r on r.id = s.race_id
      ${where.length ? `where ${where.join(" and ")}` : ""}
      order by s.signal_date desc, s.created_at desc
      limit $${values.length}
    `,
    values,
  );
  return rows.map(mapSignal);
}

export async function getRaces(): Promise<Race[]> {
  if (!hasDatabase()) return demoRaces;
  return sql<Race>(
    "select id, cycle, state, district, office, name, competitiveness from races order by state, district",
  );
}

export async function getCandidate(id: string): Promise<Candidate | null> {
  if (!hasDatabase()) return demoCandidates.find((candidate) => candidate.id === id) ?? null;
  const rows = await sql<{
    id: string;
    fec_candidate_id: string;
    name: string;
    party: string | null;
    office: string;
    state: string;
    district: string | null;
    election_year: number | null;
    incumbent_challenge_status: string | null;
    total_receipts_cycle: string | null;
    total_disbursements_cycle: string | null;
    cash_on_hand_latest: string | null;
    cash_on_hand_as_of: string | Date | null;
    individual_contribution_pct: string | null;
    pac_contribution_pct: string | null;
    totals_updated_at: string | Date | null;
    general_election_status: string | null;
    race_id: string | null;
    source_url: string | null;
  }>("select * from candidates where id = $1", [id]);
  const row = rows[0];
  if (!row) return null;
  return {
    id: row.id,
    fecCandidateId: row.fec_candidate_id,
    name: row.name,
    party: row.party,
    office: row.office,
    state: row.state,
    district: row.district,
    electionYear: row.election_year,
    incumbentChallengeStatus: row.incumbent_challenge_status,
    totalReceiptsCycle: row.total_receipts_cycle === null ? null : Number(row.total_receipts_cycle),
    totalDisbursementsCycle:
      row.total_disbursements_cycle === null ? null : Number(row.total_disbursements_cycle),
    cashOnHandLatest: row.cash_on_hand_latest === null ? null : Number(row.cash_on_hand_latest),
    cashOnHandAsOf: row.cash_on_hand_as_of ? toDateString(row.cash_on_hand_as_of) : null,
    individualContributionPct:
      row.individual_contribution_pct === null ? null : Number(row.individual_contribution_pct),
    pacContributionPct: row.pac_contribution_pct === null ? null : Number(row.pac_contribution_pct),
    totalsUpdatedAt: row.totals_updated_at ? toIsoString(row.totals_updated_at) : null,
    generalElectionStatus: row.general_election_status,
    raceId: row.race_id,
    sourceUrl: row.source_url,
  };
}

export async function getCommittee(id: string): Promise<Committee | null> {
  if (!hasDatabase()) return demoCommittees.find((committee) => committee.id === id) ?? null;
  const rows = await sql<{
    id: string;
    fec_committee_id: string;
    name: string;
    committee_type: string | null;
    designation: string | null;
    party: string | null;
    treasurer_name: string | null;
    candidate_id: string | null;
    race_id: string | null;
    discovered_via: string | null;
    source_url: string | null;
  }>("select * from committees where id = $1", [id]);
  const row = rows[0];
  if (!row) return null;
  return {
    id: row.id,
    fecCommitteeId: row.fec_committee_id,
    name: row.name,
    committeeType: row.committee_type,
    designation: row.designation,
    party: row.party,
    treasurerName: row.treasurer_name,
    candidateId: row.candidate_id,
    raceId: row.race_id,
    discoveredVia: row.discovered_via,
    sourceUrl: row.source_url,
  };
}

export async function getCommitteeTransactions(id: string, limit = 10): Promise<Transaction[]> {
  if (!hasDatabase()) return [];
  const rows = await sql<{
    source_id: string;
    committee_id: string | null;
    fec_committee_id: string | null;
    contributor_name: string | null;
    contributor_name_normalized: string | null;
    contributor_employer: string | null;
    contributor_employer_normalized: string | null;
    contributor_occupation: string | null;
    amount: string;
    transaction_date: string | Date | null;
    transaction_type: string | null;
    memo_text: string | null;
    source_url: string | null;
    raw: unknown;
  }>(
    `
      select *
      from transactions
      where committee_id = $1
      order by transaction_date desc nulls last, amount desc
      limit $2
    `,
    [id, limit],
  );
  return rows.map((row) => ({
    sourceId: row.source_id,
    committeeId: row.committee_id,
    fecCommitteeId: row.fec_committee_id,
    contributorName: row.contributor_name,
    contributorNameNormalized: row.contributor_name_normalized,
    contributorEmployer: row.contributor_employer,
    contributorEmployerNormalized: row.contributor_employer_normalized,
    contributorOccupation: row.contributor_occupation,
    amount: Number(row.amount),
    transactionDate: row.transaction_date ? toDateString(row.transaction_date) : null,
    transactionType: row.transaction_type,
    memoText: row.memo_text,
    sourceUrl: row.source_url,
    raw: row.raw,
  }));
}

export async function getRace(id: string): Promise<Race | null> {
  if (!hasDatabase()) return demoRaces.find((race) => race.id === id) ?? null;
  const rows = await sql<Race>(
    "select id, cycle, state, district, office, name, competitiveness from races where id = $1",
    [id],
  );
  return rows[0] ?? null;
}

export async function getRaceRatings(id: string): Promise<RaceRating[]> {
  if (!hasDatabase()) return [];
  const rows = await sql<{
    race_id: string;
    source_name: string;
    source_url: string | null;
    rating: string;
    rating_date: string | null;
    rationale: string | null;
  }>(
    `
      select race_id, source_name, source_url, rating, rating_date, rationale
      from race_ratings
      where race_id = $1
      order by rating_date desc nulls last, source_name
    `,
    [id],
  );
  return rows.map((row) => ({
    raceId: row.race_id,
    sourceName: row.source_name,
    sourceUrl: row.source_url,
    rating: row.rating,
    ratingDate: row.rating_date,
    rationale: row.rationale,
  }));
}

export async function getSignalsForEntity(entity: "candidate" | "committee" | "race", id: string) {
  if (entity === "race") return getSignals({ raceId: id, limit: 30 });
  if (!hasDatabase()) {
    return demoSignals.filter((signal) =>
      entity === "candidate" ? signal.candidateId === id : signal.committeeId === id,
    );
  }

  const column = entity === "candidate" ? "s.candidate_id" : "s.committee_id";
  const rows = await sql<SignalRow>(
    `
      select
        s.*,
        c.name as candidate_name,
        cm.name as committee_name,
        r.name as race_name,
        r.state as race_state,
        r.office as race_office
      from signals s
      left join candidates c on c.id = s.candidate_id
      left join committees cm on cm.id = s.committee_id
      left join races r on r.id = s.race_id
      where ${column} = $1
      order by s.signal_date desc, s.created_at desc
      limit 100
    `,
    [id],
  );
  return rows.map(mapSignal);
}

export async function getStatus() {
  if (!hasDatabase()) {
    return {
      runs: demoIngestionRuns,
      counts: {
        races: demoRaces.length,
        candidates: demoCandidates.length,
        committees: demoCommittees.length,
        independentExpenditures: demoIndependentExpenditures.length,
        signals: demoSignals.length,
      },
      endpoints: [],
      mode: "demo",
    };
  }

  const runs = await sql<{
    id: string;
    source: string;
    scope: string;
    status: string;
    mode: string;
    window_start: string | null;
    window_end: string | null;
    state: string | null;
    started_at: string;
    finished_at: string | null;
    records_seen: number;
    records_inserted: number;
    records_updated: number;
    errors: unknown[];
    metadata: Record<string, unknown>;
  }>("select * from ingestion_runs order by started_at desc limit 10");

  const counts = await sql<{ name: string; count: string }>(`
    select 'races' as name, count(*)::text from races
    union all select 'candidates', count(*)::text from candidates
    union all select 'committees', count(*)::text from committees
    union all select 'independentExpenditures', count(*)::text from independent_expenditures
    union all select 'signals', count(*)::text from signals
  `);

  let endpoints: Array<{
    endpoint: string;
    status: string;
    records_fetched: number;
    validation_issues_count: number;
    completed_at: string | Date;
  }> = [];
  try {
    endpoints = await sql<{
      endpoint: string;
      status: string;
      records_fetched: number;
      validation_issues_count: number;
      completed_at: string | Date;
    }>(`
      select distinct on (endpoint)
        endpoint, status, records_fetched, validation_issues_count, completed_at
      from ingestion_endpoint_runs
      order by endpoint, completed_at desc
    `);
  } catch (error) {
    if (!(error instanceof Error) || !error.message.includes("ingestion_endpoint_runs")) {
      throw error;
    }
  }

  return {
    runs: runs.map<IngestionRun>((run) => ({
      id: run.id,
      source: run.source,
      scope: run.scope,
      mode: run.mode,
      status: run.status,
      windowStart: run.window_start,
      windowEnd: run.window_end,
      state: run.state,
      startedAt: run.started_at,
      finishedAt: run.finished_at,
      recordsSeen: run.records_seen,
      recordsInserted: run.records_inserted,
      recordsUpdated: run.records_updated,
      errors: run.errors,
      metadata: run.metadata,
    })),
    counts: Object.fromEntries(counts.map((row) => [row.name, Number(row.count)])),
    endpoints: endpoints.map<EndpointFreshness>((endpoint) => ({
      endpoint: endpoint.endpoint,
      status: endpoint.status,
      recordsFetched: endpoint.records_fetched,
      validationIssuesCount: endpoint.validation_issues_count,
      completedAt: toIsoString(endpoint.completed_at),
    })),
    mode: "database",
  };
}
