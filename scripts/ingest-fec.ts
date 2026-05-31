import { loadEnvConfig } from "@next/env";
import { migrate } from "@/src/lib/db/schema";
import { getPool } from "@/src/lib/db/client";
import {
  createIngestionRun,
  finishIngestionRun,
  insertEndpointRuns,
  insertValidationIssues,
  markElectionLookupChecked,
  upsertCandidates,
  upsertCommittees,
  upsertElections,
  upsertFilings,
  upsertIndependentExpenditures,
  upsertRaceRatings,
  upsertRaces,
  upsertSignals,
} from "@/src/lib/db/write";
import {
  normalizeCandidate,
  normalizeCommittee,
  normalizeFiling,
  normalizeIndependentExpenditure,
} from "@/src/lib/normalization/fec";
import { generateSignals } from "@/src/lib/signals/generate";
import {
  fetchCommitteesForCandidate,
  fetchCandidatesForOffice,
  fetchCommittee,
  fetchIndependentExpendituresForCandidate,
  fetchReportsForCommittee,
  type DateWindow,
} from "@/src/lib/sources/fec/client";
import { DEFAULT_CYCLE, TARGET_RACES } from "@/src/lib/scope";
import { getPublicWatchlistRatings } from "@/src/lib/ratings/public-watchlist";
import { applyCongressLegislatorIds } from "@/src/lib/sources/congress-legislators/sync";
import { applyCandidateTotals } from "@/src/lib/sources/fec/totals";
import { fetchCandidateElections } from "@/src/lib/sources/wikidata/elections";
import {
  validateCandidate,
  validateCommittee,
  validateFiling,
  validateIndependentExpenditure,
} from "@/src/lib/validation/rules";
import type {
  Candidate,
  Committee,
  Filing,
  IndependentExpenditure,
  Election,
  ValidationIssue,
} from "@/src/lib/types";

loadEnvConfig(process.cwd());

function numberFromEnv(name: string) {
  const value = process.env[name];
  if (!value) return undefined;
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    throw new Error(`${name} must be a positive number when set.`);
  }
  return parsed;
}

function envValue(name: string) {
  const value = process.env[name];
  return value && value.trim() ? value.trim() : undefined;
}

function dateFromEnv(name: string) {
  const value = envValue(name);
  if (!value) return undefined;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    throw new Error(`${name} must use YYYY-MM-DD format.`);
  }
  return value;
}

function ingestionMode() {
  const mode = envValue("INGESTION_MODE") ?? "watch";
  if (!["watch", "backfill", "repair"].includes(mode)) {
    throw new Error("INGESTION_MODE must be watch, backfill, or repair.");
  }
  return mode as "watch" | "backfill" | "repair";
}

function officesFromEnv() {
  const value = envValue("RACE_SIGNALS_OFFICES") ?? "H,S";
  const offices = value.split(",").map((office) => office.trim().toUpperCase());
  if (offices.some((office) => office !== "H" && office !== "S")) {
    throw new Error("RACE_SIGNALS_OFFICES must contain H, S, or H,S.");
  }
  return offices as Array<"H" | "S">;
}

function enforceScheduledCostGuard({
  maxCandidates,
  maxCandidatePages,
  state,
}: {
  maxCandidates?: number;
  maxCandidatePages?: number;
  state?: string;
}) {
  if (process.env.GITHUB_ACTIONS !== "true") {
    return;
  }
  if (process.env.GITHUB_EVENT_NAME === "workflow_dispatch" && process.env.ALLOW_UNBOUNDED_INGEST === "1") {
    return;
  }
  if (process.env.GITHUB_EVENT_NAME === "schedule" && !state) {
    throw new Error(
      "Scheduled GitHub Actions ingest must set RACE_SIGNALS_STATE. Use workflow_dispatch for broader capped runs.",
    );
  }
  if (!maxCandidates || !maxCandidatePages) {
    throw new Error(
      "GitHub Actions ingest must set FEC_MAX_CANDIDATES and FEC_MAX_CANDIDATE_PAGES. Set ALLOW_UNBOUNDED_INGEST=1 only for an intentional manual uncapped run.",
    );
  }
}

async function main() {
  if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL is required to ingest FEC data.");
  }
  if (!process.env.FEC_API_KEY) {
    throw new Error("FEC_API_KEY is required to ingest FEC data.");
  }

  await migrate();
  const cycle = numberFromEnv("RACE_SIGNALS_CYCLE") ?? DEFAULT_CYCLE;
  const maxCandidatePages = numberFromEnv("FEC_MAX_CANDIDATE_PAGES");
  const maxCandidates = numberFromEnv("FEC_MAX_CANDIDATES");
  const mode = ingestionMode();
  const offices = officesFromEnv();
  const state = envValue("RACE_SIGNALS_STATE")?.toUpperCase();
  enforceScheduledCostGuard({ maxCandidates, maxCandidatePages, state });
  const dateWindow: DateWindow = {
    startDate: dateFromEnv("BACKFILL_START_DATE"),
    endDate: dateFromEnv("BACKFILL_END_DATE"),
  };
  if (mode === "backfill" && (!dateWindow.startDate || !dateWindow.endDate)) {
    throw new Error("Backfill mode requires BACKFILL_START_DATE and BACKFILL_END_DATE.");
  }
  if (
    dateWindow.startDate &&
    dateWindow.endDate &&
    dateWindow.startDate > dateWindow.endDate
  ) {
    throw new Error("BACKFILL_START_DATE must be before or equal to BACKFILL_END_DATE.");
  }

  const officeLabel = offices.length === 2 ? "House/Senate" : offices[0] === "S" ? "Senate" : "House";
  const runScope = `${cycle} ${state ? `${state} ` : "national "}${officeLabel} ${mode}`;
  const runId = await createIngestionRun({
    scope: runScope,
    mode,
    windowStart: dateWindow.startDate,
    windowEnd: dateWindow.endDate,
    state,
    metadata: {
      maxCandidatePages,
      maxCandidates,
      offices,
      requestDelayMs: process.env.FEC_REQUEST_DELAY_MS,
    },
  });
  const errors: unknown[] = [];
  const endpointCounts = {
    candidates: 0,
    committees: 0,
    reports: 0,
    schedule_e: 0,
    totals: 0,
    congress_legislators: 0,
    elections: 0,
  };

  try {
    const candidates: Candidate[] = [];
    const committees: Committee[] = [];
    const filings: Filing[] = [];
    const independentExpenditures: IndependentExpenditure[] = [];
    const issues: ValidationIssue[] = [];

    const raceScope = TARGET_RACES.filter(
      (race) =>
        race.cycle === cycle && offices.includes(race.office as "H" | "S") && (!state || race.state === state),
    );
    const raceIds = new Set(raceScope.map((race) => race.id));
    const fecCandidates = (
      await Promise.all(
        offices.map((office) => fetchCandidatesForOffice(office, cycle, maxCandidatePages, state)),
      )
    ).flat();
    endpointCounts.candidates += fecCandidates.length;
    const normalizedCandidatesBase = fecCandidates
      .map((record) => normalizeCandidate(record, cycle))
      .filter((candidate) => candidate.raceId && raceIds.has(candidate.raceId))
      .slice(0, maxCandidates);
    let candidatesWithLegislatorIds = normalizedCandidatesBase;
    try {
      const sync = await applyCongressLegislatorIds(normalizedCandidatesBase);
      candidatesWithLegislatorIds = sync.candidates;
      endpointCounts.congress_legislators = sync.matchedCount;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      errors.push({ endpoint: "congress_legislators", message });
    }

    const normalizedCandidates: Candidate[] = [];
    const elections: Election[] = [];
    const electionCheckedCandidateIds: string[] = [];
    const checkedAtByCandidateId = await getElectionCheckedAt(candidatesWithLegislatorIds.map((candidate) => candidate.id));
    for (const candidate of candidatesWithLegislatorIds) {
      const candidateWithLookupState = {
        ...candidate,
        electionsCheckedAt: checkedAtByCandidateId.get(candidate.id) ?? candidate.electionsCheckedAt,
      };
      if (shouldRefreshElections(candidateWithLookupState)) {
        try {
          const result = await fetchCandidateElections(candidateWithLookupState);
          elections.push(...result.elections);
          issues.push(...result.issues);
          endpointCounts.elections += result.elections.length;
          electionCheckedCandidateIds.push(candidate.id);
        } catch (error) {
          issues.push({
            entityType: "candidate",
            sourceId: candidateWithLookupState.fecCandidateId,
            severity: "warning",
            rule: "elections_lookup",
            message: error instanceof Error ? error.message : String(error),
            sourceUrl: candidateWithLookupState.sourceUrl,
          });
          electionCheckedCandidateIds.push(candidateWithLookupState.id);
        }
      }
      normalizedCandidates.push(await applyCandidateTotals(candidateWithLookupState, cycle));
      endpointCounts.totals += 1;
    }

    candidates.push(...normalizedCandidates);
    normalizedCandidates.forEach((candidate) => issues.push(...validateCandidate(candidate)));
    const knownCommitteeIds = new Set<string>();

    for (const candidate of normalizedCandidates) {
      try {
        const fecCommittees = await fetchCommitteesForCandidate(candidate.fecCandidateId);
        endpointCounts.committees += fecCommittees.length;
        const normalizedCommittees = fecCommittees.map((record) =>
          normalizeCommittee(record, candidate),
        );
        committees.push(...normalizedCommittees);
        normalizedCommittees.forEach((committee) => knownCommitteeIds.add(committee.fecCommitteeId));
        normalizedCommittees.forEach((committee) => issues.push(...validateCommittee(committee)));

        const fecIes = await fetchIndependentExpendituresForCandidate(
          candidate.fecCandidateId,
          cycle,
          dateWindow,
        );
        endpointCounts.schedule_e += fecIes.length;
        const normalizedIes = fecIes
          .filter((record) => isCurrentCycleExpenditure(record.expenditure_date, cycle))
          .map((record) => normalizeIndependentExpenditure(record, candidate.raceId, cycle));
        independentExpenditures.push(...normalizedIes);
        normalizedIes.forEach((ie) => issues.push(...validateIndependentExpenditure(ie)));

        const orphanSpenderIds = [
          ...new Set(
            normalizedIes
              .map((ie) => ie.fecCommitteeId)
              .filter((committeeId): committeeId is string => Boolean(committeeId)),
          ),
        ].filter((committeeId) => !knownCommitteeIds.has(committeeId));

        for (const committeeId of orphanSpenderIds) {
          const spender = await fetchCommittee(committeeId);
          if (!spender) continue;
          endpointCounts.committees += 1;
          const normalizedSpender = normalizeCommittee(spender);
          committees.push(normalizedSpender);
          knownCommitteeIds.add(normalizedSpender.fecCommitteeId);
          issues.push(...validateCommittee(normalizedSpender));
        }

        for (const committee of normalizedCommittees) {
          const fecReports = await fetchReportsForCommittee(
            committee.fecCommitteeId,
            cycle,
            dateWindow,
          );
          endpointCounts.reports += fecReports.length;
          const normalizedFilings = fecReports.map(normalizeFiling);
          filings.push(...normalizedFilings);
          normalizedFilings.forEach((filing) => issues.push(...validateFiling(filing)));
        }
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        errors.push({ candidateId: candidate.fecCandidateId, message });
        issues.push({
          entityType: "candidate",
          sourceId: candidate.fecCandidateId,
          severity: "warning",
          rule: "partial_ingestion_error",
          message,
          sourceUrl: candidate.sourceUrl,
        });
      }
    }

    const dataFreshness = new Date().toISOString();
    const signals = generateSignals({
      candidates,
      committees,
      races: raceScope,
      filings,
      independentExpenditures,
      dataFreshness,
      status: mode === "backfill" ? "historical" : "new",
    });

    await upsertRaces(raceScope);
    await upsertRaceRatings(getPublicWatchlistRatings(raceScope, cycle));
    await upsertCandidates(candidates);
    await upsertElections(elections);
    await markElectionLookupChecked(electionCheckedCandidateIds);
    await upsertCommittees(committees);
    await upsertFilings(filings);
    await upsertIndependentExpenditures(independentExpenditures);
    await upsertSignals(signals);
    await insertValidationIssues(issues);
    await insertEndpointRuns(
      runId,
      Object.entries(endpointCounts).map(([endpoint, recordsFetched]) => ({
        endpoint,
        status: errors.length ? "partial" : "success",
        recordsFetched,
        validationIssuesCount: issues.filter((issue) => endpointForIssue(issue.entityType) === endpoint)
          .length,
      })),
    );

    const recordsSeen =
      candidates.length +
      committees.length +
      filings.length +
      independentExpenditures.length +
      elections.length +
      signals.length;
    await finishIngestionRun(runId, errors.length ? "partial" : "success", recordsSeen, errors);

    console.log(
      `Ingested ${recordsSeen} records/signals from ${candidates.length} ${officeLabel} candidates with ${issues.length} validation issues.`,
    );
  } catch (error) {
    errors.push(error instanceof Error ? error.message : error);
    await finishIngestionRun(runId, "failed", 0, errors);
    throw error;
  }
}

function endpointForIssue(entityType: string) {
  if (entityType === "candidate") return "candidates";
  if (entityType === "committee") return "committees";
  if (entityType === "filing") return "reports";
  if (entityType === "independent_expenditure") return "schedule_e";
  if (entityType === "congress_legislators") return "congress_legislators";
  return "unknown";
}

function isCurrentCycleExpenditure(date: string | undefined, cycle: number) {
  if (!date) return false;
  return date >= `${cycle - 1}-01-01` && date <= `${cycle}-12-31`;
}

function shouldRefreshElections(candidate: Candidate) {
  const refreshHours = numberFromEnv("ELECTIONS_REFRESH_HOURS") ?? 24;
  if (!candidate.wikidataId && !candidate.wikipediaUrl) return false;
  if (!candidate.electionsCheckedAt) return true;
  const checkedAt = Date.parse(candidate.electionsCheckedAt);
  if (Number.isNaN(checkedAt)) return true;
  return Date.now() - checkedAt >= refreshHours * 60 * 60 * 1000;
}

async function getElectionCheckedAt(candidateIds: string[]) {
  if (!candidateIds.length) return new Map<string, string>();
  const result = await getPool().query<{ id: string; elections_checked_at: Date | null }>(
    `
      select id, elections_checked_at
      from candidates
      where id = any($1::text[])
    `,
    [candidateIds],
  );
  return new Map(
    result.rows
      .filter((row) => row.elections_checked_at)
      .map((row) => [row.id, row.elections_checked_at!.toISOString()]),
  );
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
