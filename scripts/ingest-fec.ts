import { loadEnvConfig } from "@next/env";
import { migrate } from "@/src/lib/db/schema";
import {
  createIngestionRun,
  finishIngestionRun,
  insertEndpointRuns,
  insertValidationIssues,
  upsertCandidates,
  upsertCommittees,
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
  ValidationIssue,
} from "@/src/lib/types";

loadEnvConfig(process.cwd());

function numberFromEnv(name: string) {
  const value = process.env[name];
  if (!value) return undefined;
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : undefined;
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
    for (const candidate of candidatesWithLegislatorIds) {
      normalizedCandidates.push(await applyCandidateTotals(candidate, cycle));
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
        const normalizedIes = fecIes.map((record) =>
          normalizeIndependentExpenditure(record, candidate.raceId),
        );
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

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
