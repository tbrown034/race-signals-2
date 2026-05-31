import { loadEnvConfig } from "@next/env";
import { getPool } from "@/src/lib/db/client";
import { markElectionLookupChecked, upsertElections } from "@/src/lib/db/write";
import { fetchCandidateElections } from "@/src/lib/sources/wikidata/elections";
import type { Candidate, ValidationIssue } from "@/src/lib/types";

loadEnvConfig(process.cwd());

const limit = readPositiveInteger("ELECTIONS_REPAIR_LIMIT", 25);

async function main() {
  if (!process.env.DATABASE_URL) {
    console.log("No DATABASE_URL configured; election repair skipped.");
    return;
  }

  const pool = getPool();
  try {
    const rows = await pool.query<CandidateRow>(
      `
        select *
        from candidates
        where wikidata_id is not null or wikipedia_url is not null
        order by elections_checked_at nulls first, name
        limit $1
      `,
      [limit],
    );

    const issues: ValidationIssue[] = [];
    let electionCount = 0;
    for (const row of rows.rows) {
      const candidate = mapCandidate(row);
      const result = await fetchCandidateElections(candidate);
      if (result.elections.length) {
        await upsertElections(result.elections);
        electionCount += result.elections.length;
      }
      issues.push(...result.issues);
      await markElectionLookupChecked([candidate.id]);
    }

    console.log(
      `Checked ${rows.rowCount ?? 0} candidates and upserted ${electionCount} election rows with ${issues.length} lookup issues.`,
    );
  } finally {
    await pool.end();
  }
}

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
  bioguide_id: string | null;
  wikidata_id: string | null;
  photo_url: string | null;
  wikipedia_url: string | null;
  race_id: string | null;
  source_url: string | null;
};

function mapCandidate(row: CandidateRow): Candidate {
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
    bioguideId: row.bioguide_id,
    wikidataId: row.wikidata_id,
    photoUrl: row.photo_url,
    wikipediaUrl: row.wikipedia_url,
    raceId: row.race_id,
    sourceUrl: row.source_url,
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
