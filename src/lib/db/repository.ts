import "server-only";

import {
  demoCandidates,
  demoCommittees,
  demoIndependentExpenditures,
  demoIngestionRuns,
  demoRaces,
  demoSignals,
} from "@/src/lib/demo/data";
import { hasDatabase, sql } from "@/src/lib/db/client";
import type { Candidate, Committee, IngestionRun, Race, Signal } from "@/src/lib/types";

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
  amount: string | null;
  signal_date: string;
  source_url: string | null;
  confidence: "high" | "medium" | "low";
  status: string;
  data_freshness: string;
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
    amount: row.amount === null ? null : Number(row.amount),
    signalDate: row.signal_date,
    sourceUrl: row.source_url,
    confidence: row.confidence,
    status: row.status,
    dataFreshness: row.data_freshness,
    metadata: row.metadata,
  };
}

export async function getSignals(filters: {
  q?: string;
  raceId?: string;
  state?: string;
  type?: string;
  limit?: number;
} = {}) {
  if (!hasDatabase()) {
    const q = filters.q?.toLowerCase();
    return demoSignals.filter((signal) => {
      if (filters.raceId && signal.raceId !== filters.raceId) return false;
      if (filters.state && !signal.raceId?.includes(`-${filters.state}-`)) return false;
      if (filters.type && signal.signalType !== filters.type) return false;
      if (q && !`${signal.headline} ${signal.whyItMatters}`.toLowerCase().includes(q)) {
        return false;
      }
      return true;
    });
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
  if (filters.type) {
    values.push(filters.type);
    where.push(`s.signal_type = $${values.length}`);
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
        r.name as race_name
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
    sourceUrl: row.source_url,
  };
}

export async function getRace(id: string): Promise<Race | null> {
  if (!hasDatabase()) return demoRaces.find((race) => race.id === id) ?? null;
  const rows = await sql<Race>(
    "select id, cycle, state, district, office, name, competitiveness from races where id = $1",
    [id],
  );
  return rows[0] ?? null;
}

export async function getSignalsForEntity(entity: "candidate" | "committee" | "race", id: string) {
  if (entity === "race") return getSignals({ raceId: id, limit: 30 });
  const signals = hasDatabase()
    ? await getSignals({ limit: 100 })
    : demoSignals;
  return signals.filter((signal) =>
    entity === "candidate" ? signal.candidateId === id : signal.committeeId === id,
  );
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
      mode: "demo",
    };
  }

  const runs = await sql<{
    id: string;
    source: string;
    scope: string;
    status: string;
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

  return {
    runs: runs.map<IngestionRun>((run) => ({
      id: run.id,
      source: run.source,
      scope: run.scope,
      status: run.status,
      startedAt: run.started_at,
      finishedAt: run.finished_at,
      recordsSeen: run.records_seen,
      recordsInserted: run.records_inserted,
      recordsUpdated: run.records_updated,
      errors: run.errors,
      metadata: run.metadata,
    })),
    counts: Object.fromEntries(counts.map((row) => [row.name, Number(row.count)])),
    mode: "database",
  };
}
