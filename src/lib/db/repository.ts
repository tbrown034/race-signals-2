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
import type {
  Candidate,
  CandidateFiling,
  CandidateSignalGap,
  Committee,
  CommitteeIndependentExpenditure,
  ElectionCoverage,
  Election,
  EndpointFreshness,
  IngestionRun,
  Race,
  RaceRating,
  RaceStats,
  RecentValidationIssue,
  Signal,
  SourceRecordArchiveSummary,
  StateRaceBoardRow,
  StateSignalFreshness,
  StorageUsage,
  TopSpender,
  Transaction,
  ValidationIssueRollup,
} from "@/src/lib/types";

type SignalRow = {
  id: string;
  dedupe_key: string;
  signal_type: string;
  headline: string;
  why_it_matters: string;
  candidate_id: string | null;
  candidate_name: string | null;
  candidate_party: string | null;
  candidate_state: string | null;
  candidate_district: string | null;
  candidate_incumbent_challenge_status: string | null;
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

type CandidateRow = {
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
  totals_fetched_at: string | Date | null;
  general_election_status: string | null;
  bioguide_id: string | null;
  wikidata_id: string | null;
  photo_url: string | null;
  wikipedia_url: string | null;
  elections_checked_at: string | Date | null;
  race_id: string | null;
  source_url: string | null;
  committee_count?: string | null;
  filing_count?: string | null;
  signal_count?: string | null;
};

const CURRENT_CYCLE = 2026;
const currentCycleSignalPredicate =
  "(r.cycle is null or (s.signal_date >= make_date(r.cycle - 1, 1, 1) and s.signal_date <= make_date(r.cycle, 12, 31)))";

function mapSignal(row: SignalRow): Signal {
  return {
    id: row.id,
    dedupeKey: row.dedupe_key,
    signalType: row.signal_type,
    headline: row.headline,
    whyItMatters: row.why_it_matters,
    candidateId: row.candidate_id,
    candidateName: row.candidate_name,
    candidateParty: row.candidate_party,
    candidateState: row.candidate_state,
    candidateDistrict: row.candidate_district,
    candidateIncumbentChallengeStatus: row.candidate_incumbent_challenge_status,
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

function mapCandidateRow(row: CandidateRow): Candidate {
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
    totalsFetchedAt: row.totals_fetched_at ? toIsoString(row.totals_fetched_at) : null,
    generalElectionStatus: row.general_election_status,
    bioguideId: row.bioguide_id,
    wikidataId: row.wikidata_id,
    photoUrl: row.photo_url,
    wikipediaUrl: row.wikipedia_url,
    electionsCheckedAt: row.elections_checked_at ? toIsoString(row.elections_checked_at) : null,
    raceId: row.race_id,
    sourceUrl: row.source_url,
    committeeCount: row.committee_count === undefined || row.committee_count === null ? undefined : Number(row.committee_count),
    filingCount: row.filing_count === undefined || row.filing_count === null ? undefined : Number(row.filing_count),
    signalCount: row.signal_count === undefined || row.signal_count === null ? undefined : Number(row.signal_count),
  };
}

export async function getCandidateElections(candidateId: string): Promise<Election[]> {
  if (!hasDatabase()) return [];
  const rows = await sql<{
    candidate_id: string;
    candidate_name: string | null;
    candidate_party: string | null;
    election_type: Election["electionType"];
    election_date: string | Date;
    status: Election["status"];
    vote_share: string | null;
    opponent_count: number | null;
    source: Election["source"];
    source_url: string;
    source_entity_id: string | null;
    fetched_at: string | Date;
  }>(
    `
      select
        e.candidate_id,
        c.name as candidate_name,
        c.party as candidate_party,
        e.election_type,
        e.election_date,
        e.status,
        e.vote_share,
        e.opponent_count,
        e.source,
        e.source_url,
        e.source_entity_id,
        e.fetched_at
      from elections e
      left join candidates c on c.id = e.candidate_id
      where e.candidate_id = $1
      order by e.election_date asc
    `,
    [candidateId],
  );
  return rows.map(mapElectionRow);
}

export async function getRaceElections(raceId: string): Promise<Election[]> {
  if (!hasDatabase()) return [];
  const rows = await sql<{
    candidate_id: string;
    candidate_name: string | null;
    candidate_party: string | null;
    election_type: Election["electionType"];
    election_date: string | Date;
    status: Election["status"];
    vote_share: string | null;
    opponent_count: number | null;
    source: Election["source"];
    source_url: string;
    source_entity_id: string | null;
    fetched_at: string | Date;
  }>(
    `
      select
        e.candidate_id,
        c.name as candidate_name,
        c.party as candidate_party,
        e.election_type,
        e.election_date,
        e.status,
        e.vote_share,
        e.opponent_count,
        e.source,
        e.source_url,
        e.source_entity_id,
        e.fetched_at
      from elections e
      join candidates c on c.id = e.candidate_id
      where c.race_id = $1
      order by e.election_date asc, c.name
    `,
    [raceId],
  );
  return rows.map(mapElectionRow);
}

function mapElectionRow(row: {
  candidate_id: string;
  candidate_name: string | null;
  candidate_party: string | null;
  election_type: Election["electionType"];
  election_date: string | Date;
  status: Election["status"];
  vote_share: string | null;
  opponent_count: number | null;
  source: Election["source"];
  source_url: string;
  source_entity_id: string | null;
  fetched_at: string | Date;
}): Election {
  return {
    candidateId: row.candidate_id,
    candidateName: row.candidate_name,
    candidateParty: row.candidate_party,
    electionType: row.election_type,
    electionDate: toDateString(row.election_date),
    status: row.status,
    voteShare: row.vote_share === null ? null : Number(row.vote_share),
    opponentCount: row.opponent_count,
    source: row.source,
    sourceUrl: row.source_url,
    sourceEntityId: row.source_entity_id,
    fetchedAt: toIsoString(row.fetched_at),
  };
}

export async function getCandidateFilings(candidateId: string): Promise<CandidateFiling[]> {
  if (!hasDatabase()) return [];
  const rows = await sql<{
    source_id: string;
    cycle: number | null;
    committee_id: string | null;
    fec_committee_id: string | null;
    committee_name: string | null;
    report_type: string | null;
    coverage_start_date: string | Date | null;
    coverage_end_date: string | Date | null;
    receipt_date: string | Date | null;
    total_receipts: string | null;
    total_disbursements: string | null;
    cash_on_hand: string | null;
    source_url: string | null;
    raw: unknown;
  }>(
    `
      select
        f.source_id,
        f.cycle,
        f.committee_id,
        f.fec_committee_id,
        c.name as committee_name,
        f.report_type,
        f.coverage_start_date,
        f.coverage_end_date,
        f.receipt_date,
        f.total_receipts,
        f.total_disbursements,
        f.cash_on_hand,
        f.source_url,
        f.raw
      from filings f
      join committees c on c.id = f.committee_id
      where c.candidate_id = $1
      order by f.receipt_date desc nulls last, f.source_id desc
    `,
    [candidateId],
  );
  return rows.map((row) => ({
    sourceId: row.source_id,
    cycle: row.cycle,
    committeeId: row.committee_id,
    fecCommitteeId: row.fec_committee_id,
    committeeName: row.committee_name,
    reportType: row.report_type,
    coverageStartDate: row.coverage_start_date ? toDateString(row.coverage_start_date) : null,
    coverageEndDate: row.coverage_end_date ? toDateString(row.coverage_end_date) : null,
    receiptDate: row.receipt_date ? toDateString(row.receipt_date) : null,
    totalReceipts: row.total_receipts === null ? null : Number(row.total_receipts),
    totalReceiptsBasis: receiptBasis(row.raw),
    totalDisbursements: row.total_disbursements === null ? null : Number(row.total_disbursements),
    cashOnHand: row.cash_on_hand === null ? null : Number(row.cash_on_hand),
    sourceUrl: row.source_url,
    raw: row.raw ?? {},
  }));
}

function toDateString(value: string | Date) {
  if (value instanceof Date) return value.toISOString().slice(0, 10);
  return String(value).slice(0, 10);
}

function toIsoString(value: string | Date) {
  if (value instanceof Date) return value.toISOString();
  return String(value);
}

function resolveSince(value: string) {
  const windows: Record<string, number> = {
    "24h": 24 * 60 * 60 * 1000,
    "7d": 7 * 24 * 60 * 60 * 1000,
    "30d": 30 * 24 * 60 * 60 * 1000,
  };
  const window = windows[value];
  if (window) return new Date(Date.now() - window).toISOString();
  return value;
}

function resolveMinAmount(value: string) {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 0;
}

function signalSearchClause(values: unknown[], query: string) {
  values.push(`%${query}%`);
  const param = values.length;
  return `(
    s.headline ilike $${param}
    or s.why_it_matters ilike $${param}
    or c.name ilike $${param}
    or c.fec_candidate_id ilike $${param}
    or cm.name ilike $${param}
    or cm.fec_committee_id ilike $${param}
    or r.name ilike $${param}
    or s.dedupe_key ilike $${param}
    or s.source_url ilike $${param}
    or s.metadata->>'sourceId' ilike $${param}
    or s.metadata->>'latestSourceId' ilike $${param}
    or s.metadata->>'priorSourceId' ilike $${param}
    or s.metadata->>'sourceKind' ilike $${param}
  )`;
}

function demoSignalSearchText(signal: Signal) {
  return [
    signal.headline,
    signal.whyItMatters,
    signal.candidateName ?? "",
    signal.committeeName ?? "",
    signal.raceName ?? "",
    signal.dedupeKey,
    signal.sourceUrl ?? "",
    JSON.stringify(signal.metadata ?? {}),
  ]
    .join(" ")
    .toLowerCase();
}

export async function getSignals(filters: SignalFilters = {}) {
  if (!hasDatabase()) {
    const q = filters.q?.toLowerCase();
    return demoSignals.filter((signal) => {
      if (filters.raceId && signal.raceId !== filters.raceId) return false;
      if (filters.committeeId && signal.committeeId !== filters.committeeId) return false;
      if (filters.state && !signal.raceId?.includes(`-${filters.state}-`)) return false;
      if (filters.office && !signal.raceId?.endsWith(`-${filters.office}`)) return false;
      if (filters.type && signal.signalType !== filters.type) return false;
      if (filters.status && signal.status !== filters.status) return false;
      if (filters.since && signal.signalDate <= resolveSince(filters.since)) return false;
      if (filters.ingestedSince && signal.dataFreshness <= resolveSince(filters.ingestedSince)) return false;
      if (filters.minAmount && (signal.amount ?? 0) < resolveMinAmount(filters.minAmount)) return false;
      if (filters.position && signal.metadata?.supportOpposeIndicator !== filters.position) return false;
      if (filters.targetParty && signal.candidateParty !== filters.targetParty) return false;
      if (filters.targetStatus && signal.candidateIncumbentChallengeStatus !== filters.targetStatus) return false;
      if (q && !demoSignalSearchText(signal).includes(q)) return false;
      return true;
    }).slice(0, filters.limit ?? 50);
  }

  const values: unknown[] = [];
  const where: string[] = [currentCycleSignalPredicate];
  if (filters.raceId) {
    values.push(filters.raceId);
    where.push(`s.race_id = $${values.length}`);
  }
  if (filters.committeeId) {
    values.push(filters.committeeId);
    where.push(`s.committee_id = $${values.length}`);
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
    values.push(resolveSince(filters.since));
    where.push(`s.signal_date > $${values.length}`);
  }
  if (filters.ingestedSince) {
    values.push(resolveSince(filters.ingestedSince));
    where.push(`s.data_freshness > $${values.length}`);
  }
  if (filters.minAmount) {
    values.push(resolveMinAmount(filters.minAmount));
    where.push(`s.amount >= $${values.length}`);
  }
  if (filters.position) {
    values.push(filters.position);
    where.push(`s.metadata->>'supportOpposeIndicator' = $${values.length}`);
  }
  if (filters.targetParty) {
    values.push(filters.targetParty);
    where.push(`c.party = $${values.length}`);
  }
  if (filters.targetStatus) {
    values.push(filters.targetStatus);
    where.push(`c.incumbent_challenge_status = $${values.length}`);
  }
  if (filters.q) {
    where.push(signalSearchClause(values, filters.q));
  }
  values.push(filters.limit ?? 50);

  const rows = await sql<SignalRow>(
    `
      select
        s.*,
        c.name as candidate_name,
        c.party as candidate_party,
        c.state as candidate_state,
        c.district as candidate_district,
        c.incumbent_challenge_status as candidate_incumbent_challenge_status,
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

export async function getSpendingSignals(
  filters: Omit<SignalFilters, "type"> = {},
  sort: "amount" | "date" = "amount",
) {
  const scopedFilters = { ...filters, type: "large_independent_expenditure", limit: filters.limit ?? 100 };
  if (!hasDatabase()) {
    const signals = await getSignals(scopedFilters);
    return [...signals].sort((a, b) =>
      sort === "date"
        ? b.signalDate.localeCompare(a.signalDate)
        : (b.amount ?? 0) - (a.amount ?? 0) || b.signalDate.localeCompare(a.signalDate),
    );
  }

  const values: unknown[] = [];
  const where: string[] = [
    "s.signal_type = 'large_independent_expenditure'",
    currentCycleSignalPredicate,
  ];
  if (scopedFilters.raceId) {
    values.push(scopedFilters.raceId);
    where.push(`s.race_id = $${values.length}`);
  }
  if (scopedFilters.committeeId) {
    values.push(scopedFilters.committeeId);
    where.push(`s.committee_id = $${values.length}`);
  }
  if (scopedFilters.state) {
    values.push(scopedFilters.state);
    where.push(`r.state = $${values.length}`);
  }
  if (scopedFilters.office) {
    values.push(scopedFilters.office);
    where.push(`r.office = $${values.length}`);
  }
  if (scopedFilters.status) {
    values.push(scopedFilters.status);
    where.push(`s.status = $${values.length}`);
  }
  if (scopedFilters.since) {
    values.push(resolveSince(scopedFilters.since));
    where.push(`s.signal_date > $${values.length}`);
  }
  if (scopedFilters.ingestedSince) {
    values.push(resolveSince(scopedFilters.ingestedSince));
    where.push(`s.data_freshness > $${values.length}`);
  }
  if (scopedFilters.minAmount) {
    values.push(resolveMinAmount(scopedFilters.minAmount));
    where.push(`s.amount >= $${values.length}`);
  }
  if (scopedFilters.position) {
    values.push(scopedFilters.position);
    where.push(`s.metadata->>'supportOpposeIndicator' = $${values.length}`);
  }
  if (scopedFilters.targetParty) {
    values.push(scopedFilters.targetParty);
    where.push(`c.party = $${values.length}`);
  }
  if (scopedFilters.targetStatus) {
    values.push(scopedFilters.targetStatus);
    where.push(`c.incumbent_challenge_status = $${values.length}`);
  }
  if (scopedFilters.q) {
    where.push(signalSearchClause(values, scopedFilters.q));
  }
  values.push(scopedFilters.limit);

  const rows = await sql<SignalRow>(
    `
      select
        s.*,
        c.name as candidate_name,
        c.party as candidate_party,
        c.state as candidate_state,
        c.district as candidate_district,
        c.incumbent_challenge_status as candidate_incumbent_challenge_status,
        cm.name as committee_name,
        r.name as race_name,
        r.state as race_state,
        r.office as race_office
      from signals s
      left join candidates c on c.id = s.candidate_id
      left join committees cm on cm.id = s.committee_id
      left join races r on r.id = s.race_id
      where ${where.join(" and ")}
      order by ${sort === "date" ? "s.signal_date desc, s.created_at desc" : "s.amount desc nulls last, s.signal_date desc"}
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

export async function getStateRaceBoard(state: string): Promise<StateRaceBoardRow[]> {
  const normalizedState = state.toUpperCase();
  if (!hasDatabase()) {
    return demoRaces
      .filter((race) => race.state === normalizedState && race.cycle === CURRENT_CYCLE)
      .map((race) => {
        const raceSignals = demoSignals.filter((signal) => signal.raceId === race.id);
        const latestRaceSignal = [...raceSignals].sort((a, b) => b.signalDate.localeCompare(a.signalDate))[0];
        const expenditures = demoIndependentExpenditures.filter((expenditure) => expenditure.raceId === race.id);
        return {
          raceId: race.id,
          raceName: race.name,
          office: race.office,
          district: race.district,
          candidateCount: demoCandidates.filter((candidate) => candidate.raceId === race.id).length,
          incumbentCount: demoCandidates.filter((candidate) => candidate.raceId === race.id && isIncumbent(candidate.incumbentChallengeStatus)).length,
          candidateReceiptsTotal: demoCandidates
            .filter((candidate) => candidate.raceId === race.id)
            .reduce((sum, candidate) => sum + (candidate.totalReceiptsCycle ?? 0), 0),
          candidateTotalsFetchedAtLatest: demoCandidates
            .filter((candidate) => candidate.raceId === race.id)
            .map((candidate) => candidate.totalsFetchedAt)
            .filter(Boolean)
            .sort()
            .at(-1) ?? null,
          candidateTotalsFetchedAtOldest: demoCandidates
            .filter((candidate) => candidate.raceId === race.id)
            .map((candidate) => candidate.totalsFetchedAt)
            .filter(Boolean)
            .sort()
            .at(0) ?? null,
          signalCount: raceSignals.length,
          latestSignalDate: latestRaceSignal?.signalDate ?? null,
          latestSignalDedupeKey: latestRaceSignal?.dedupeKey ?? null,
          latestSignalHeadline: latestRaceSignal?.headline ?? null,
          independentExpenditureTotal: expenditures.reduce((sum, expenditure) => sum + expenditure.amount, 0),
        };
      });
  }

  const rows = await sql<{
    race_id: string;
    race_name: string;
    office: string;
    district: string | null;
    candidate_count: string;
    incumbent_count: string;
    candidate_receipts_total: string;
    candidate_totals_fetched_at_latest: string | Date | null;
    candidate_totals_fetched_at_oldest: string | Date | null;
    signal_count: string;
    latest_signal_date: string | Date | null;
    latest_signal_dedupe_key: string | null;
    latest_signal_headline: string | null;
    independent_expenditure_total: string;
  }>(
    `
      select
        r.id as race_id,
        r.name as race_name,
        r.office,
        r.district,
        (
          select count(*)::text
          from candidates c
          where c.race_id = r.id
        ) as candidate_count,
        (
          select count(*)::text
          from candidates c
          where c.race_id = r.id
            and c.incumbent_challenge_status in ('I', 'Incumbent')
        ) as incumbent_count,
        (
          select coalesce(sum(c.total_receipts_cycle), 0)::text
          from candidates c
          where c.race_id = r.id
        ) as candidate_receipts_total,
        (
          select max(c.totals_fetched_at)
          from candidates c
          where c.race_id = r.id
        ) as candidate_totals_fetched_at_latest,
        (
          select min(c.totals_fetched_at)
          from candidates c
          where c.race_id = r.id
            and c.totals_fetched_at is not null
        ) as candidate_totals_fetched_at_oldest,
        (
          select count(*)::text
          from signals s
          where s.race_id = r.id
            and (r.cycle is null or (s.signal_date >= make_date(r.cycle - 1, 1, 1) and s.signal_date <= make_date(r.cycle, 12, 31)))
        ) as signal_count,
        (
          select max(s.signal_date)
          from signals s
          where s.race_id = r.id
            and (r.cycle is null or (s.signal_date >= make_date(r.cycle - 1, 1, 1) and s.signal_date <= make_date(r.cycle, 12, 31)))
        ) as latest_signal_date,
        (
          select s.dedupe_key
          from signals s
          where s.race_id = r.id
            and (r.cycle is null or (s.signal_date >= make_date(r.cycle - 1, 1, 1) and s.signal_date <= make_date(r.cycle, 12, 31)))
          order by s.signal_date desc, s.created_at desc
          limit 1
        ) as latest_signal_dedupe_key,
        (
          select s.headline
          from signals s
          where s.race_id = r.id
            and (r.cycle is null or (s.signal_date >= make_date(r.cycle - 1, 1, 1) and s.signal_date <= make_date(r.cycle, 12, 31)))
          order by s.signal_date desc, s.created_at desc
          limit 1
        ) as latest_signal_headline,
        (
          select coalesce(sum(ie.amount), 0)::text
          from independent_expenditures ie
          where ie.race_id = r.id
            and ie.expenditure_date >= make_date(r.cycle - 1, 1, 1)
            and ie.expenditure_date <= make_date(r.cycle, 12, 31)
        ) as independent_expenditure_total
      from races r
      where r.state = $1
        and r.cycle = $2
      order by r.office desc, r.district nulls first
    `,
    [normalizedState, CURRENT_CYCLE],
  );
  return rows.map((row) => ({
    raceId: row.race_id,
    raceName: row.race_name,
    office: row.office,
    district: row.district,
    candidateCount: Number(row.candidate_count),
    incumbentCount: Number(row.incumbent_count),
    candidateReceiptsTotal: Number(row.candidate_receipts_total),
    candidateTotalsFetchedAtLatest: row.candidate_totals_fetched_at_latest ? toIsoString(row.candidate_totals_fetched_at_latest) : null,
    candidateTotalsFetchedAtOldest: row.candidate_totals_fetched_at_oldest ? toIsoString(row.candidate_totals_fetched_at_oldest) : null,
    signalCount: Number(row.signal_count),
    latestSignalDate: row.latest_signal_date ? toDateString(row.latest_signal_date) : null,
    latestSignalDedupeKey: row.latest_signal_dedupe_key,
    latestSignalHeadline: row.latest_signal_headline,
    independentExpenditureTotal: Number(row.independent_expenditure_total),
  }));
}

export async function getSignalStateCounts(signalType?: string): Promise<Record<string, number>> {
  if (!hasDatabase()) {
    return demoSignals.reduce<Record<string, number>>((counts, signal) => {
      if (signalType && signal.signalType !== signalType) return counts;
      const state = signal.raceId?.split("-")[1] ?? signal.candidateState;
      if (state) counts[state] = (counts[state] ?? 0) + 1;
      return counts;
    }, {});
  }

  const values: unknown[] = [];
  const where = ["r.state is not null", currentCycleSignalPredicate];
  if (signalType) {
    values.push(signalType);
    where.push(`s.signal_type = $${values.length}`);
  }
  const rows = await sql<{ state: string; count: string }>(
    `
      select r.state, count(*)::text as count
      from signals s
      join races r on r.id = s.race_id
      where ${where.join(" and ")}
      group by r.state
      order by count(*) desc, r.state asc
    `,
    values,
  );
  return Object.fromEntries(rows.map((row) => [row.state, Number(row.count)]));
}

export async function getSignalStateFreshness(signalType?: string): Promise<Record<string, StateSignalFreshness>> {
  if (!hasDatabase()) {
    return demoSignals.reduce<Record<string, StateSignalFreshness>>((counts, signal) => {
      if (signalType && signal.signalType !== signalType) return counts;
      const state = signal.raceId?.split("-")[1] ?? signal.candidateState;
      if (!state) return counts;
      const current = counts[state] ?? { state, count: 0, latestDataFreshness: null };
      current.count += 1;
      if (!current.latestDataFreshness || signal.dataFreshness > current.latestDataFreshness) {
        current.latestDataFreshness = signal.dataFreshness;
      }
      counts[state] = current;
      return counts;
    }, {});
  }

  const values: unknown[] = [];
  const where = ["r.state is not null", currentCycleSignalPredicate];
  if (signalType) {
    values.push(signalType);
    where.push(`s.signal_type = $${values.length}`);
  }
  const rows = await sql<{ state: string; count: string; latest_data_freshness: string | Date | null }>(
    `
      select
        r.state,
        count(*)::text as count,
        max(s.data_freshness) as latest_data_freshness
      from signals s
      join races r on r.id = s.race_id
      where ${where.join(" and ")}
      group by r.state
      order by count(*) desc, r.state asc
    `,
    values,
  );
  return Object.fromEntries(rows.map((row) => [
    row.state,
    {
      state: row.state,
      count: Number(row.count),
      latestDataFreshness: row.latest_data_freshness ? toIsoString(row.latest_data_freshness) : null,
    },
  ]));
}

export async function getSitemapEntities() {
  if (!hasDatabase()) {
    return {
      races: [...new Set(demoSignals.map((signal) => signal.raceId).filter((id): id is string => Boolean(id)))],
      candidates: [
        ...new Set(demoSignals.map((signal) => signal.candidateId).filter((id): id is string => Boolean(id))),
      ],
      committees: [
        ...new Set(demoSignals.map((signal) => signal.committeeId).filter((id): id is string => Boolean(id))),
      ],
    };
  }
  const [races, candidates, committees] = await Promise.all([
    sql<{ id: string }>(`
      select distinct r.id
      from races r
      join signals s on s.race_id = r.id
      order by r.id
      limit 500
    `),
    sql<{ id: string }>(`
      select distinct c.id
      from candidates c
      join signals s on s.candidate_id = c.id
      order by c.id
      limit 500
    `),
    sql<{ id: string }>(`
      select distinct cm.id
      from committees cm
      join signals s on s.committee_id = cm.id
      order by cm.id
      limit 500
    `),
  ]);
  return {
    races: races.map((row) => row.id),
    candidates: candidates.map((row) => row.id),
    committees: committees.map((row) => row.id),
  };
}

export async function getCandidate(id: string): Promise<Candidate | null> {
  if (!hasDatabase()) return demoCandidates.find((candidate) => candidate.id === id) ?? null;
  const rows = await sql<CandidateRow>("select * from candidates where id = $1", [id]);
  const row = rows[0];
  if (!row) return null;
  return mapCandidateRow(row);
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
    first_file_date: string | Date | null;
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
    firstFileDate: row.first_file_date ? toDateString(row.first_file_date) : null,
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

export async function getCommitteeIndependentExpenditures(
  id: string,
  limit = 25,
): Promise<CommitteeIndependentExpenditure[]> {
  if (!hasDatabase()) {
    return demoIndependentExpenditures
      .filter((expenditure) => expenditure.spenderCommitteeId === id)
      .slice(0, limit)
      .map((expenditure) => ({
        ...expenditure,
        candidateName: demoCandidates.find((candidate) => candidate.id === expenditure.candidateId)?.name ?? null,
        candidateParty: demoCandidates.find((candidate) => candidate.id === expenditure.candidateId)?.party ?? null,
        committeeName: demoCommittees.find((committee) => committee.id === expenditure.spenderCommitteeId)?.name ?? null,
        raceName: demoRaces.find((race) => race.id === expenditure.raceId)?.name ?? null,
      }));
  }
  const rows = await sql<{
    source_id: string;
    cycle: number | null;
    spender_committee_id: string | null;
    fec_committee_id: string | null;
    candidate_id: string | null;
    fec_candidate_id: string | null;
    race_id: string | null;
    support_oppose_indicator: string | null;
    amount: string;
    expenditure_date: string | Date | null;
    purpose: string | null;
    source_url: string | null;
    raw: unknown;
    candidate_name: string | null;
    candidate_party: string | null;
    committee_name: string | null;
    race_name: string | null;
  }>(
    `
      select
        ie.*,
        c.name as candidate_name,
        c.party as candidate_party,
        cm.name as committee_name,
        r.name as race_name
      from independent_expenditures ie
      left join candidates c on c.id = ie.candidate_id
      left join committees cm on cm.id = ie.spender_committee_id
      left join races r on r.id = ie.race_id
      where ie.spender_committee_id = $1
        and (
          ie.expenditure_date >= make_date(coalesce(r.cycle, $3) - 1, 1, 1)
          and ie.expenditure_date <= make_date(coalesce(r.cycle, $3), 12, 31)
        )
      order by ie.expenditure_date desc nulls last, ie.amount desc
      limit $2
    `,
    [id, limit, CURRENT_CYCLE],
  );
  return rows.map((row) => ({
    sourceId: row.source_id,
    cycle: row.cycle,
    spenderCommitteeId: row.spender_committee_id,
    fecCommitteeId: row.fec_committee_id,
    candidateId: row.candidate_id,
    fecCandidateId: row.fec_candidate_id,
    raceId: row.race_id,
    supportOpposeIndicator: row.support_oppose_indicator,
    amount: Number(row.amount),
    expenditureDate: row.expenditure_date ? toDateString(row.expenditure_date) : null,
    purpose: row.purpose,
    sourceUrl: row.source_url,
    raw: row.raw,
    candidateName: row.candidate_name,
    candidateParty: row.candidate_party,
    committeeName: row.committee_name,
    raceName: row.race_name,
  }));
}

export async function getCandidateIndependentExpenditures(
  id: string,
  limit = 25,
): Promise<CommitteeIndependentExpenditure[]> {
  if (!hasDatabase()) {
    return demoIndependentExpenditures
      .filter((expenditure) => expenditure.candidateId === id)
      .slice(0, limit)
      .map((expenditure) => ({
        ...expenditure,
        candidateName: demoCandidates.find((candidate) => candidate.id === expenditure.candidateId)?.name ?? null,
        candidateParty: demoCandidates.find((candidate) => candidate.id === expenditure.candidateId)?.party ?? null,
        committeeName: demoCommittees.find((committee) => committee.id === expenditure.spenderCommitteeId)?.name ?? null,
        raceName: demoRaces.find((race) => race.id === expenditure.raceId)?.name ?? null,
      }));
  }
  const rows = await sql<{
    source_id: string;
    cycle: number | null;
    spender_committee_id: string | null;
    fec_committee_id: string | null;
    candidate_id: string | null;
    fec_candidate_id: string | null;
    race_id: string | null;
    support_oppose_indicator: string | null;
    amount: string;
    expenditure_date: string | Date | null;
    purpose: string | null;
    source_url: string | null;
    raw: unknown;
    candidate_name: string | null;
    candidate_party: string | null;
    committee_name: string | null;
    race_name: string | null;
  }>(
    `
      select
        ie.*,
        c.name as candidate_name,
        c.party as candidate_party,
        cm.name as committee_name,
        r.name as race_name
      from independent_expenditures ie
      left join candidates c on c.id = ie.candidate_id
      left join committees cm on cm.id = ie.spender_committee_id
      left join races r on r.id = ie.race_id
      where ie.candidate_id = $1
        and (
          ie.expenditure_date >= make_date(coalesce(r.cycle, $3) - 1, 1, 1)
          and ie.expenditure_date <= make_date(coalesce(r.cycle, $3), 12, 31)
        )
      order by ie.expenditure_date desc nulls last, ie.amount desc
      limit $2
    `,
    [id, limit, CURRENT_CYCLE],
  );
  return rows.map((row) => ({
    sourceId: row.source_id,
    cycle: row.cycle,
    spenderCommitteeId: row.spender_committee_id,
    fecCommitteeId: row.fec_committee_id,
    candidateId: row.candidate_id,
    fecCandidateId: row.fec_candidate_id,
    raceId: row.race_id,
    supportOpposeIndicator: row.support_oppose_indicator,
    amount: Number(row.amount),
    expenditureDate: row.expenditure_date ? toDateString(row.expenditure_date) : null,
    purpose: row.purpose,
    sourceUrl: row.source_url,
    raw: row.raw,
    candidateName: row.candidate_name,
    candidateParty: row.candidate_party,
    committeeName: row.committee_name,
    raceName: row.race_name,
  }));
}

export async function getScheduleERecords(
  filters: {
    candidateId?: string;
    committeeId?: string;
    raceId?: string;
    state?: string;
    limit?: number;
  } = {},
): Promise<CommitteeIndependentExpenditure[]> {
  const limit = filters.limit ?? 500;
  if (!hasDatabase()) {
    return demoIndependentExpenditures
      .filter((expenditure) => {
        if (filters.candidateId && expenditure.candidateId !== filters.candidateId) return false;
        if (filters.committeeId && expenditure.spenderCommitteeId !== filters.committeeId) return false;
        if (filters.raceId && expenditure.raceId !== filters.raceId) return false;
        if (filters.state && expenditure.raceId?.split("-")[1] !== filters.state) return false;
        return true;
      })
      .sort((a, b) => String(b.expenditureDate).localeCompare(String(a.expenditureDate)) || b.amount - a.amount)
      .slice(0, limit)
      .map((expenditure) => ({
        ...expenditure,
        candidateName: demoCandidates.find((candidate) => candidate.id === expenditure.candidateId)?.name ?? null,
        candidateParty: demoCandidates.find((candidate) => candidate.id === expenditure.candidateId)?.party ?? null,
        committeeName: demoCommittees.find((committee) => committee.id === expenditure.spenderCommitteeId)?.name ?? null,
        raceName: demoRaces.find((race) => race.id === expenditure.raceId)?.name ?? null,
      }));
  }

  const values: unknown[] = [CURRENT_CYCLE];
  const where = [
    `ie.expenditure_date >= make_date(coalesce(r.cycle, $1) - 1, 1, 1)`,
    `ie.expenditure_date <= make_date(coalesce(r.cycle, $1), 12, 31)`,
  ];
  if (filters.candidateId) {
    values.push(filters.candidateId);
    where.push(`ie.candidate_id = $${values.length}`);
  }
  if (filters.committeeId) {
    values.push(filters.committeeId);
    where.push(`ie.spender_committee_id = $${values.length}`);
  }
  if (filters.raceId) {
    values.push(filters.raceId);
    where.push(`ie.race_id = $${values.length}`);
  }
  if (filters.state) {
    values.push(filters.state);
    where.push(`r.state = $${values.length}`);
  }
  values.push(limit);

  const rows = await sql<{
    source_id: string;
    cycle: number | null;
    spender_committee_id: string | null;
    fec_committee_id: string | null;
    candidate_id: string | null;
    fec_candidate_id: string | null;
    race_id: string | null;
    support_oppose_indicator: string | null;
    amount: string;
    expenditure_date: string | Date | null;
    purpose: string | null;
    source_url: string | null;
    raw: unknown;
    candidate_name: string | null;
    candidate_party: string | null;
    committee_name: string | null;
    race_name: string | null;
  }>(
    `
      select
        ie.*,
        c.name as candidate_name,
        c.party as candidate_party,
        cm.name as committee_name,
        r.name as race_name
      from independent_expenditures ie
      left join candidates c on c.id = ie.candidate_id
      left join committees cm on cm.id = ie.spender_committee_id
      left join races r on r.id = ie.race_id
      where ${where.join(" and ")}
      order by ie.expenditure_date desc nulls last, ie.amount desc, ie.source_id
      limit $${values.length}
    `,
    values,
  );
  return rows.map((row) => ({
    sourceId: row.source_id,
    cycle: row.cycle,
    spenderCommitteeId: row.spender_committee_id,
    fecCommitteeId: row.fec_committee_id,
    candidateId: row.candidate_id,
    fecCandidateId: row.fec_candidate_id,
    raceId: row.race_id,
    supportOpposeIndicator: row.support_oppose_indicator,
    amount: Number(row.amount),
    expenditureDate: row.expenditure_date ? toDateString(row.expenditure_date) : null,
    purpose: row.purpose,
    sourceUrl: row.source_url,
    raw: row.raw,
    candidateName: row.candidate_name,
    candidateParty: row.candidate_party,
    committeeName: row.committee_name,
    raceName: row.race_name,
  }));
}

export async function getScheduleERecordSummary(
  filters: {
    candidateId?: string;
    committeeId?: string;
    raceId?: string;
    state?: string;
  } = {},
) {
  if (!hasDatabase()) {
    const records = demoIndependentExpenditures.filter((expenditure) => {
      if (filters.candidateId && expenditure.candidateId !== filters.candidateId) return false;
      if (filters.committeeId && expenditure.spenderCommitteeId !== filters.committeeId) return false;
      if (filters.raceId && expenditure.raceId !== filters.raceId) return false;
      if (filters.state && expenditure.raceId?.split("-")[1] !== filters.state) return false;
      return true;
    });
    return records.reduce(
      (summary, record) => {
        summary.recordCount += 1;
        summary.totalAmount += record.amount;
        if (record.supportOpposeIndicator === "S") summary.supportAmount += record.amount;
        else if (record.supportOpposeIndicator === "O") summary.opposeAmount += record.amount;
        else summary.uncodedAmount += record.amount;
        return summary;
      },
      { opposeAmount: 0, recordCount: 0, supportAmount: 0, totalAmount: 0, uncodedAmount: 0 },
    );
  }

  const values: unknown[] = [CURRENT_CYCLE];
  const where = [
    `ie.expenditure_date >= make_date(coalesce(r.cycle, $1) - 1, 1, 1)`,
    `ie.expenditure_date <= make_date(coalesce(r.cycle, $1), 12, 31)`,
  ];
  if (filters.candidateId) {
    values.push(filters.candidateId);
    where.push(`ie.candidate_id = $${values.length}`);
  }
  if (filters.committeeId) {
    values.push(filters.committeeId);
    where.push(`ie.spender_committee_id = $${values.length}`);
  }
  if (filters.raceId) {
    values.push(filters.raceId);
    where.push(`ie.race_id = $${values.length}`);
  }
  if (filters.state) {
    values.push(filters.state);
    where.push(`r.state = $${values.length}`);
  }

  const rows = await sql<{
    oppose_amount: string | null;
    record_count: string;
    support_amount: string | null;
    total_amount: string | null;
    uncoded_amount: string | null;
  }>(
    `
      select
        count(*)::text as record_count,
        coalesce(sum(ie.amount), 0)::text as total_amount,
        coalesce(sum(ie.amount) filter (where ie.support_oppose_indicator = 'S'), 0)::text as support_amount,
        coalesce(sum(ie.amount) filter (where ie.support_oppose_indicator = 'O'), 0)::text as oppose_amount,
        coalesce(sum(ie.amount) filter (
          where ie.support_oppose_indicator is null
             or ie.support_oppose_indicator not in ('S', 'O')
        ), 0)::text as uncoded_amount
      from independent_expenditures ie
      left join races r on r.id = ie.race_id
      where ${where.join(" and ")}
    `,
    values,
  );
  const row = rows[0];
  return {
    opposeAmount: Number(row?.oppose_amount ?? 0),
    recordCount: Number(row?.record_count ?? 0),
    supportAmount: Number(row?.support_amount ?? 0),
    totalAmount: Number(row?.total_amount ?? 0),
    uncodedAmount: Number(row?.uncoded_amount ?? 0),
  };
}

export async function getTopSpenders(limit = 100, state?: string | null): Promise<TopSpender[]> {
  if (!hasDatabase()) {
    return demoCommittees
      .map((committee) => {
        const records = demoIndependentExpenditures.filter((expenditure) => {
          if (expenditure.spenderCommitteeId !== committee.id) return false;
          if (!state) return true;
          return expenditure.raceId?.split("-")[1] === state;
        });
        return {
          committeeId: committee.id,
          fecCommitteeId: committee.fecCommitteeId,
          committeeName: committee.name,
          committeeType: committee.committeeType,
          designation: committee.designation,
          sourceUrl: committee.sourceUrl,
          totalAmount: records.reduce((sum, record) => sum + record.amount, 0),
          supportAmount: records
            .filter((record) => record.supportOpposeIndicator === "S")
            .reduce((sum, record) => sum + record.amount, 0),
          opposeAmount: records
            .filter((record) => record.supportOpposeIndicator === "O")
            .reduce((sum, record) => sum + record.amount, 0),
          recordCount: records.length,
          raceCount: new Set(records.map((record) => record.raceId).filter(Boolean)).size,
          states: [...new Set(records.map((record) => record.raceId?.split("-")[1]).filter(Boolean))] as string[],
          lastExpenditureDate: records
            .map((record) => record.expenditureDate)
            .filter(Boolean)
            .sort()
            .at(-1) ?? null,
          latestScheduleESourceId: records
            .filter((record) => record.expenditureDate)
            .sort((a, b) => String(b.expenditureDate).localeCompare(String(a.expenditureDate)))[0]?.sourceId ?? null,
          latestScheduleESourceUrl: records
            .filter((record) => record.expenditureDate)
            .sort((a, b) => String(b.expenditureDate).localeCompare(String(a.expenditureDate)))[0]?.sourceUrl ?? null,
          topRaceId: records[0]?.raceId ?? null,
          topRaceName: demoRaces.find((race) => race.id === records[0]?.raceId)?.name ?? null,
          topRaceAmount: records[0]?.amount ?? null,
        };
      })
      .filter((spender) => spender.recordCount > 0)
      .sort((a, b) => b.totalAmount - a.totalAmount)
      .slice(0, limit);
  }

  const rows = await sql<{
    committee_id: string | null;
    fec_committee_id: string | null;
    committee_name: string | null;
    committee_type: string | null;
    designation: string | null;
    source_url: string | null;
    total_amount: string;
    support_amount: string;
    oppose_amount: string;
    record_count: string;
    race_count: string;
    states: string[] | null;
    last_expenditure_date: string | Date | null;
    latest_schedule_e_source_id: string | null;
    latest_schedule_e_source_url: string | null;
    top_race_id: string | null;
    top_race_name: string | null;
    top_race_amount: string | null;
  }>(
    `
      with spending_by_committee as (
        select
          ie.spender_committee_id,
          coalesce(ie.fec_committee_id, ie.spender_committee_id) as spender_key,
          sum(ie.amount) as total_amount,
          coalesce(sum(ie.amount) filter (where ie.support_oppose_indicator = 'S'), 0) as support_amount,
          coalesce(sum(ie.amount) filter (where ie.support_oppose_indicator = 'O'), 0) as oppose_amount,
          count(*) as record_count,
          count(distinct ie.race_id) as race_count,
          max(ie.expenditure_date) as last_expenditure_date,
          array_remove(array_agg(distinct r.state), null) as states
        from independent_expenditures ie
        left join races r on r.id = ie.race_id
        where ie.expenditure_date >= make_date(coalesce(r.cycle, $2) - 1, 1, 1)
          and ie.expenditure_date <= make_date(coalesce(r.cycle, $2), 12, 31)
          and ($3::text is null or r.state = $3)
        group by ie.spender_committee_id, coalesce(ie.fec_committee_id, ie.spender_committee_id)
      ),
      spending_by_race as (
        select
          ie.spender_committee_id,
          coalesce(ie.fec_committee_id, ie.spender_committee_id) as spender_key,
          ie.race_id,
          r.name as race_name,
          sum(ie.amount) as race_amount,
          row_number() over (
            partition by coalesce(ie.fec_committee_id, ie.spender_committee_id)
            order by sum(ie.amount) desc nulls last
          ) as rank
        from independent_expenditures ie
        left join races r on r.id = ie.race_id
        where ie.expenditure_date >= make_date(coalesce(r.cycle, $2) - 1, 1, 1)
          and ie.expenditure_date <= make_date(coalesce(r.cycle, $2), 12, 31)
          and ($3::text is null or r.state = $3)
        group by ie.spender_committee_id, coalesce(ie.fec_committee_id, ie.spender_committee_id), ie.race_id, r.name
      ),
      top_race as (
        select spender_key, race_id, race_name, race_amount
        from spending_by_race
        where rank = 1
      ),
      latest_record as (
        select spender_key, source_id, source_url
        from (
          select
            ie.spender_committee_id,
            coalesce(ie.fec_committee_id, ie.spender_committee_id) as spender_key,
            ie.source_id,
            ie.source_url,
            row_number() over (
              partition by coalesce(ie.fec_committee_id, ie.spender_committee_id)
              order by ie.expenditure_date desc nulls last, ie.amount desc, ie.source_id
            ) as rank
          from independent_expenditures ie
          left join races r on r.id = ie.race_id
          where ie.expenditure_date >= make_date(coalesce(r.cycle, $2) - 1, 1, 1)
            and ie.expenditure_date <= make_date(coalesce(r.cycle, $2), 12, 31)
            and ($3::text is null or r.state = $3)
        ) ranked_records
        where rank = 1
      )
      select
        cm.id as committee_id,
        coalesce(cm.fec_committee_id, s.spender_key) as fec_committee_id,
        coalesce(cm.name, s.spender_key, 'Spender not resolved') as committee_name,
        cm.committee_type,
        cm.designation,
        cm.source_url,
        s.total_amount::text as total_amount,
        s.support_amount::text as support_amount,
        s.oppose_amount::text as oppose_amount,
        s.record_count::text as record_count,
        s.race_count::text as race_count,
        s.last_expenditure_date,
        latest_record.source_id as latest_schedule_e_source_id,
        latest_record.source_url as latest_schedule_e_source_url,
        s.states,
        top_race.race_id as top_race_id,
        top_race.race_name as top_race_name,
        top_race.race_amount::text as top_race_amount
      from spending_by_committee s
      left join committees cm on cm.id = s.spender_committee_id
      left join top_race on top_race.spender_key = s.spender_key
      left join latest_record on latest_record.spender_key = s.spender_key
      order by s.total_amount desc nulls last
      limit $1
    `,
    [limit, CURRENT_CYCLE, state ?? null],
  );

  return rows.map((row) => ({
    committeeId: row.committee_id,
    fecCommitteeId: row.fec_committee_id,
    committeeName: row.committee_name ?? "Spender not resolved",
    committeeType: row.committee_type,
    designation: row.designation,
    sourceUrl: row.source_url,
    totalAmount: Number(row.total_amount),
    supportAmount: Number(row.support_amount),
    opposeAmount: Number(row.oppose_amount),
    recordCount: Number(row.record_count),
    raceCount: Number(row.race_count),
    states: row.states ?? [],
    lastExpenditureDate: row.last_expenditure_date ? toDateString(row.last_expenditure_date) : null,
    latestScheduleESourceId: row.latest_schedule_e_source_id,
    latestScheduleESourceUrl: row.latest_schedule_e_source_url,
    topRaceId: row.top_race_id,
    topRaceName: row.top_race_name,
    topRaceAmount: row.top_race_amount === null ? null : Number(row.top_race_amount),
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
        and source_name <> 'Race Signals public-source watchlist'
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
        c.party as candidate_party,
        c.state as candidate_state,
        c.district as candidate_district,
        c.incumbent_challenge_status as candidate_incumbent_challenge_status,
        cm.name as committee_name,
        r.name as race_name,
        r.state as race_state,
        r.office as race_office
      from signals s
      left join candidates c on c.id = s.candidate_id
      left join committees cm on cm.id = s.committee_id
      left join races r on r.id = s.race_id
      where ${column} = $1
        and ${currentCycleSignalPredicate}
      order by s.signal_date desc, s.created_at desc
      limit 100
    `,
    [id],
  );
  return rows.map(mapSignal);
}

export async function getCandidatesForRace(id: string): Promise<Candidate[]> {
  if (!hasDatabase()) {
    return demoCandidates
      .filter((candidate) => candidate.raceId === id)
      .map((candidate) => ({
        ...candidate,
        committeeCount: demoCommittees.filter((committee) => committee.candidateId === candidate.id).length,
        filingCount: 0,
        signalCount: demoSignals.filter((signal) => signal.candidateId === candidate.id).length,
      }))
      .sort(compareCandidateStanding);
  }
  const rows = await sql<CandidateRow>(
    `
      select
        c.*,
        count(distinct cm.id)::text as committee_count,
        count(distinct f.source_id)::text as filing_count,
        count(distinct s.id)::text as signal_count
      from candidates c
      left join committees cm on cm.candidate_id = c.id
      left join filings f on f.committee_id = cm.id
      left join signals s on s.candidate_id = c.id
      where c.race_id = $1
      group by c.id
      order by
        case when c.incumbent_challenge_status in ('I', 'Incumbent') then 0 else 1 end,
        c.total_receipts_cycle desc nulls last,
        c.name
    `,
    [id],
  );
  return rows.map(mapCandidateRow);
}

export async function getRaceStats(id: string): Promise<RaceStats> {
  if (!hasDatabase()) {
    const candidates = demoCandidates.filter((candidate) => candidate.raceId === id);
    const expenditures = demoIndependentExpenditures.filter((expenditure) => expenditure.raceId === id);
    return {
      totalRaised: candidates.reduce((sum, candidate) => sum + (candidate.totalReceiptsCycle ?? 0), 0),
      totalIndependentExpenditures: expenditures.reduce((sum, expenditure) => sum + expenditure.amount, 0),
      supportIndependentExpenditures: expenditures
        .filter((expenditure) => expenditure.supportOpposeIndicator === "S")
        .reduce((sum, expenditure) => sum + expenditure.amount, 0),
      opposeIndependentExpenditures: expenditures
        .filter((expenditure) => expenditure.supportOpposeIndicator === "O")
        .reduce((sum, expenditure) => sum + expenditure.amount, 0),
      independentExpenditureRecordCount: expenditures.length,
      candidateCount: candidates.length,
      incumbentCount: candidates.filter((candidate) => isIncumbent(candidate.incumbentChallengeStatus)).length,
      latestIndependentExpenditureDate: expenditures.map((expenditure) => expenditure.expenditureDate).filter(Boolean).sort().at(-1) ?? null,
    };
  }

  const rows = await sql<{
    total_raised: string | null;
    total_independent_expenditures: string | null;
    support_independent_expenditures: string | null;
    oppose_independent_expenditures: string | null;
    independent_expenditure_record_count: string;
    latest_independent_expenditure_date: string | Date | null;
    candidate_count: string;
    incumbent_count: string;
  }>(
    `
      with candidate_stats as (
        select
          coalesce(sum(total_receipts_cycle), 0)::text as total_raised,
          count(*)::text as candidate_count,
          count(*) filter (where incumbent_challenge_status in ('I', 'Incumbent'))::text as incumbent_count
        from candidates
        where race_id = $1
      ),
      spending_stats as (
        select
          coalesce(sum(amount), 0)::text as total_independent_expenditures,
          coalesce(sum(amount) filter (where support_oppose_indicator = 'S'), 0)::text as support_independent_expenditures,
          coalesce(sum(amount) filter (where support_oppose_indicator = 'O'), 0)::text as oppose_independent_expenditures,
          count(*)::text as independent_expenditure_record_count,
          max(expenditure_date) as latest_independent_expenditure_date
        from independent_expenditures ie
        join races r on r.id = $1
        where ie.race_id = $1
          and ie.expenditure_date >= make_date(r.cycle - 1, 1, 1)
          and ie.expenditure_date <= make_date(r.cycle, 12, 31)
      )
      select
        candidate_stats.total_raised,
        spending_stats.total_independent_expenditures,
        spending_stats.support_independent_expenditures,
        spending_stats.oppose_independent_expenditures,
        spending_stats.independent_expenditure_record_count,
        spending_stats.latest_independent_expenditure_date,
        candidate_stats.candidate_count,
        candidate_stats.incumbent_count
      from candidate_stats, spending_stats
    `,
    [id],
  );

  const row = rows[0];
  return {
    totalRaised: Number(row?.total_raised ?? 0),
    totalIndependentExpenditures: Number(row?.total_independent_expenditures ?? 0),
    supportIndependentExpenditures: Number(row?.support_independent_expenditures ?? 0),
    opposeIndependentExpenditures: Number(row?.oppose_independent_expenditures ?? 0),
    independentExpenditureRecordCount: Number(row?.independent_expenditure_record_count ?? 0),
    candidateCount: Number(row?.candidate_count ?? 0),
    incumbentCount: Number(row?.incumbent_count ?? 0),
    latestIndependentExpenditureDate: row?.latest_independent_expenditure_date ? toDateString(row.latest_independent_expenditure_date) : null,
  };
}

function compareCandidateStanding(a: Candidate, b: Candidate) {
  if (isIncumbent(a.incumbentChallengeStatus) && !isIncumbent(b.incumbentChallengeStatus)) return -1;
  if (isIncumbent(b.incumbentChallengeStatus) && !isIncumbent(a.incumbentChallengeStatus)) return 1;
  return (b.totalReceiptsCycle ?? 0) - (a.totalReceiptsCycle ?? 0) || a.name.localeCompare(b.name);
}

function isIncumbent(status?: string | null) {
  return status === "I" || status === "Incumbent";
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
      validationIssues: [],
      recentValidationIssues: [],
      candidateSignalGaps: [],
      electionCoverage: {
        candidates: demoCandidates.length,
        withIdentifiers: demoCandidates.filter((candidate) => candidate.wikidataId || candidate.wikipediaUrl).length,
        checked: demoCandidates.filter((candidate) => candidate.electionsCheckedAt).length,
        withRows: 0,
        electionRows: 0,
      },
      storageUsage: {
        databaseSizeBytes: null,
        guardBytes: 400 * 1024 * 1024,
        transactionsRowCount: 0,
        largestTables: [],
      },
      sourceRecordArchive: {
        count: 0,
        latestFetchedAt: null,
        tables: [],
      },
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
  let validationIssues: Array<{
    rule: string;
    severity: string;
    count: string;
    latest_at: string | Date;
  }> = [];
  let recentValidationIssues: Array<{
    entity_type: string;
    source_id: string | null;
    severity: string;
    rule: string;
    message: string;
    source_url: string | null;
    created_at: string | Date;
  }> = [];
  let candidateSignalGaps: Array<{
    id: string;
    name: string;
    fec_candidate_id: string;
    race_id: string | null;
    race_name: string | null;
    total_receipts_cycle: string | null;
    committee_count: string;
    filing_count: string;
    independent_expenditure_count: string;
    totals_updated_at: string | Date | null;
    totals_fetched_at: string | Date | null;
    source_url: string | null;
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
  const electionCoverageRows = await sql<{
    candidates: string;
    with_identifiers: string;
    checked: string;
    with_rows: string;
    election_rows: string;
  }>(`
    select
      count(distinct c.id)::text as candidates,
      count(distinct c.id) filter (where c.wikidata_id is not null or c.wikipedia_url is not null)::text as with_identifiers,
      count(distinct c.id) filter (where c.elections_checked_at is not null)::text as checked,
      count(distinct e.candidate_id)::text as with_rows,
      count(e.*)::text as election_rows
    from candidates c
    left join elections e on e.candidate_id = c.id
  `);
  const electionCoverageRow = electionCoverageRows[0];
  const storageRows = await sql<{
    table_name: string;
    total_bytes: string;
  }>(`
    select
      relname as table_name,
      pg_total_relation_size(c.oid)::text as total_bytes
    from pg_class c
    join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public'
      and c.relkind = 'r'
    order by pg_total_relation_size(c.oid) desc
    limit 8
  `);
  const storageCounts = await getTableCounts([...new Set([...storageRows.map((row) => row.table_name), "transactions"])]);
  const databaseSizeRows = await sql<{ size: string }>("select pg_database_size(current_database())::text as size");
  const sourceRecordArchiveRows = await sql<{
    count: string;
    latest_fetched_at: string | Date | null;
  }>(`
    select count(*)::text as count, max(fetched_at) as latest_fetched_at
    from source_records
  `);
  const sourceRecordArchiveRow = sourceRecordArchiveRows[0];
  const sourceRecordArchiveTableRows = await sql<{
    source: string;
    source_table: string;
    count: string;
    distinct_source_ids: string;
    latest_fetched_at: string | Date | null;
  }>(`
    select
      source,
      source_table,
      count(*)::text as count,
      count(distinct source_id)::text as distinct_source_ids,
      max(fetched_at) as latest_fetched_at
    from source_records
    group by source, source_table
    order by max(fetched_at) desc, count(*) desc, source_table
  `);
  try {
    validationIssues = await sql<{
      rule: string;
      severity: string;
      count: string;
      latest_at: string | Date;
    }>(`
      select rule, severity, count(*)::text as count, max(created_at) as latest_at
      from validation_issues
      group by rule, severity
      order by max(created_at) desc, count(*) desc
      limit 12
    `);
    recentValidationIssues = await sql<{
      entity_type: string;
      source_id: string | null;
      severity: string;
      rule: string;
      message: string;
      source_url: string | null;
      created_at: string | Date;
    }>(`
      select entity_type, source_id, severity, rule, message, source_url, created_at
      from (
        select distinct on (vi.rule, coalesce(vi.source_id, ''), vi.message)
          vi.entity_type,
          vi.source_id,
          vi.severity,
          vi.rule,
          vi.message,
          coalesce(ie.source_url, vi.source_url) as source_url,
          vi.created_at
        from validation_issues vi
        left join independent_expenditures ie
          on vi.entity_type = 'independent_expenditure'
          and ie.source_id = vi.source_id
        order by vi.rule, coalesce(vi.source_id, ''), vi.message, vi.created_at desc
      ) latest_examples
      order by created_at desc
      limit 8
    `);
  } catch (error) {
    if (!(error instanceof Error) || !error.message.includes("validation_issues")) {
      throw error;
    }
  }
  candidateSignalGaps = await sql<{
    id: string;
    name: string;
    fec_candidate_id: string;
    race_id: string | null;
    race_name: string | null;
    total_receipts_cycle: string | null;
    committee_count: string;
    filing_count: string;
    independent_expenditure_count: string;
    totals_updated_at: string | Date | null;
    totals_fetched_at: string | Date | null;
    source_url: string | null;
  }>(`
    select
      c.id,
      c.name,
      c.fec_candidate_id,
      c.race_id,
      r.name as race_name,
      c.total_receipts_cycle::text as total_receipts_cycle,
      count(distinct cm.id)::text as committee_count,
      count(distinct f.source_id)::text as filing_count,
      count(distinct ie.source_id)::text as independent_expenditure_count,
      c.totals_updated_at,
      c.totals_fetched_at,
      c.source_url
    from candidates c
    left join races r on r.id = c.race_id
    left join committees cm on cm.candidate_id = c.id
    left join filings f on f.committee_id = cm.id
    left join independent_expenditures ie on ie.candidate_id = c.id
    left join signals s on s.candidate_id = c.id
    group by c.id, r.name
    having count(s.id) = 0
    order by c.total_receipts_cycle desc nulls last, c.name
    limit 10
  `);

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
      startedAt: toIsoString(run.started_at),
      finishedAt: run.finished_at ? toIsoString(run.finished_at) : null,
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
    validationIssues: validationIssues.map<ValidationIssueRollup>((issue) => ({
      rule: issue.rule,
      severity: issue.severity,
      count: Number(issue.count),
      latestAt: toIsoString(issue.latest_at),
    })),
    recentValidationIssues: recentValidationIssues.map<RecentValidationIssue>((issue) => ({
      entityType: issue.entity_type,
      sourceId: issue.source_id,
      severity: issue.severity,
      rule: issue.rule,
      message: issue.message,
      sourceUrl: issue.source_url,
      createdAt: toIsoString(issue.created_at),
    })),
    candidateSignalGaps: candidateSignalGaps.map<CandidateSignalGap>((candidate) => ({
      id: candidate.id,
      name: candidate.name,
      fecCandidateId: candidate.fec_candidate_id,
      raceId: candidate.race_id,
      raceName: candidate.race_name,
      totalReceiptsCycle: candidate.total_receipts_cycle === null ? null : Number(candidate.total_receipts_cycle),
      committeeCount: Number(candidate.committee_count),
      filingCount: Number(candidate.filing_count),
      independentExpenditureCount: Number(candidate.independent_expenditure_count),
      totalsUpdatedAt: candidate.totals_updated_at ? toIsoString(candidate.totals_updated_at) : null,
      totalsFetchedAt: candidate.totals_fetched_at ? toIsoString(candidate.totals_fetched_at) : null,
      sourceUrl: candidate.source_url,
    })),
    electionCoverage: {
      candidates: Number(electionCoverageRow?.candidates ?? 0),
      withIdentifiers: Number(electionCoverageRow?.with_identifiers ?? 0),
      checked: Number(electionCoverageRow?.checked ?? 0),
      withRows: Number(electionCoverageRow?.with_rows ?? 0),
      electionRows: Number(electionCoverageRow?.election_rows ?? 0),
    } satisfies ElectionCoverage,
    storageUsage: {
      databaseSizeBytes: Number(databaseSizeRows[0]?.size ?? 0),
      guardBytes: Number(process.env.COST_AUDIT_MAX_DB_MB ?? "400") * 1024 * 1024,
      transactionsRowCount: storageCounts.get("transactions") ?? null,
      largestTables: storageRows.map((row) => ({
        tableName: row.table_name,
        totalBytes: Number(row.total_bytes),
        rowCount: storageCounts.get(row.table_name) ?? null,
      })),
    } satisfies StorageUsage,
    sourceRecordArchive: {
      count: Number(sourceRecordArchiveRow?.count ?? 0),
      latestFetchedAt: sourceRecordArchiveRow?.latest_fetched_at ? toIsoString(sourceRecordArchiveRow.latest_fetched_at) : null,
      tables: sourceRecordArchiveTableRows.map((row) => ({
        source: row.source,
        sourceTable: row.source_table,
        count: Number(row.count),
        distinctSourceIds: Number(row.distinct_source_ids),
        latestFetchedAt: row.latest_fetched_at ? toIsoString(row.latest_fetched_at) : null,
      })),
    } satisfies SourceRecordArchiveSummary,
    mode: "database",
  };
}

export async function getCoverageSummary() {
  if (!hasDatabase()) {
    return {
      runs: demoIngestionRuns.slice(0, 1),
      counts: {
        races: demoRaces.length,
        candidates: demoCandidates.length,
        committees: demoCommittees.length,
        independentExpenditures: demoIndependentExpenditures.length,
        signals: demoSignals.length,
      },
      endpoints: [] as EndpointFreshness[],
      mode: "demo",
    };
  }

  const [runs, counts, endpoints] = await Promise.all([
    sql<IngestionRunRow>("select * from ingestion_runs order by started_at desc limit 1"),
    sql<{ name: string; count: string }>(`
      select 'races' as name, count(*)::text from races
      union all select 'candidates', count(*)::text from candidates
      union all select 'committees', count(*)::text from committees
      union all select 'independentExpenditures', count(*)::text from independent_expenditures
      union all select 'signals', count(*)::text from signals
    `),
    sql<{
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
    `).catch((error) => {
      if (error instanceof Error && error.message.includes("ingestion_endpoint_runs")) return [];
      throw error;
    }),
  ]);

  return {
    runs: runs.map(mapIngestionRun),
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

type IngestionRunRow = {
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
};

function mapIngestionRun(run: IngestionRunRow): IngestionRun {
  return {
    id: run.id,
    source: run.source,
    scope: run.scope,
    mode: run.mode,
    status: run.status,
    windowStart: run.window_start,
    windowEnd: run.window_end,
    state: run.state,
    startedAt: toIsoString(run.started_at),
    finishedAt: run.finished_at ? toIsoString(run.finished_at) : null,
    recordsSeen: run.records_seen,
    recordsInserted: run.records_inserted,
    recordsUpdated: run.records_updated,
    errors: run.errors,
    metadata: run.metadata,
  };
}

function receiptBasis(raw: unknown): CandidateFiling["totalReceiptsBasis"] {
  if (!raw || typeof raw !== "object") return null;
  const record = raw as Record<string, unknown>;
  if (record.total_receipts_period !== null && record.total_receipts_period !== undefined) return "period";
  if (record.total_receipts !== null && record.total_receipts !== undefined) return "total";
  if (record.total_receipts_ytd !== null && record.total_receipts_ytd !== undefined) return "ytd";
  return null;
}

async function getTableCounts(tableNames: string[]) {
  const counts = new Map<string, number>();

  for (const tableName of tableNames) {
    const rows = await sql<{ count: string }>(
      `select count(*)::text as count from ${quoteIdentifier(tableName)}`,
    );
    counts.set(tableName, Number(rows[0]?.count ?? 0));
  }

  return counts;
}

function quoteIdentifier(identifier: string) {
  return `"${identifier.replaceAll('"', '""')}"`;
}
