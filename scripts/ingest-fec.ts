import { loadEnvConfig } from "@next/env";
import { migrate } from "@/src/lib/db/schema";
import {
  createIngestionRun,
  finishIngestionRun,
  insertValidationIssues,
  upsertCandidates,
  upsertCommittees,
  upsertFilings,
  upsertIndependentExpenditures,
  upsertRaces,
  upsertSignals,
  upsertTransactions,
} from "@/src/lib/db/write";
import {
  normalizeCandidate,
  normalizeCommittee,
  normalizeFiling,
  normalizeIndependentExpenditure,
  normalizeTransaction,
} from "@/src/lib/normalization/fec";
import { generateSignals } from "@/src/lib/signals/generate";
import {
  fetchCommitteesForCandidate,
  fetchHouseCandidates,
  fetchIndependentExpendituresForCandidate,
  fetchReceiptsForCommittee,
  fetchReportsForCommittee,
  type DateWindow,
} from "@/src/lib/sources/fec/client";
import { DEFAULT_CYCLE, TARGET_RACES } from "@/src/lib/scope";
import {
  validateCandidate,
  validateCommittee,
  validateFiling,
  validateIndependentExpenditure,
  validateTransaction,
} from "@/src/lib/validation/rules";
import type {
  Candidate,
  Committee,
  Filing,
  IndependentExpenditure,
  Transaction,
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

  const runScope = `${cycle} ${state ? `${state} ` : "national "}House ${mode}`;
  const runId = await createIngestionRun({
    scope: runScope,
    mode,
    windowStart: dateWindow.startDate,
    windowEnd: dateWindow.endDate,
    state,
    metadata: {
      maxCandidatePages,
      maxCandidates,
      requestDelayMs: process.env.FEC_REQUEST_DELAY_MS,
    },
  });
  const errors: unknown[] = [];

  try {
    const candidates: Candidate[] = [];
    const committees: Committee[] = [];
    const filings: Filing[] = [];
    const transactions: Transaction[] = [];
    const independentExpenditures: IndependentExpenditure[] = [];
    const issues: ValidationIssue[] = [];

    const raceScope = TARGET_RACES.filter(
      (race) => race.cycle === cycle && (!state || race.state === state),
    );
    const raceIds = new Set(raceScope.map((race) => race.id));
    const fecCandidates = await fetchHouseCandidates(cycle, maxCandidatePages, state);
    const normalizedCandidates = fecCandidates
      .map((record) => normalizeCandidate(record, cycle))
      .filter((candidate) => candidate.raceId && raceIds.has(candidate.raceId))
      .slice(0, maxCandidates);

    candidates.push(...normalizedCandidates);
    normalizedCandidates.forEach((candidate) => issues.push(...validateCandidate(candidate)));

    for (const candidate of normalizedCandidates) {
      try {
        const fecCommittees = await fetchCommitteesForCandidate(candidate.fecCandidateId);
        const normalizedCommittees = fecCommittees.map((record) =>
          normalizeCommittee(record, candidate),
        );
        committees.push(...normalizedCommittees);
        normalizedCommittees.forEach((committee) => issues.push(...validateCommittee(committee)));

        const fecIes = await fetchIndependentExpendituresForCandidate(
          candidate.fecCandidateId,
          cycle,
          dateWindow,
        );
        const normalizedIes = fecIes.map((record) =>
          normalizeIndependentExpenditure(record, candidate.raceId),
        );
        independentExpenditures.push(...normalizedIes);
        normalizedIes.forEach((ie) => issues.push(...validateIndependentExpenditure(ie)));

        for (const committee of normalizedCommittees) {
          const fecReports = await fetchReportsForCommittee(
            committee.fecCommitteeId,
            cycle,
            dateWindow,
          );
          const fecReceipts = await fetchReceiptsForCommittee(
            committee.fecCommitteeId,
            cycle,
            dateWindow,
          );
          const normalizedFilings = fecReports.map(normalizeFiling);
          const normalizedTransactions = fecReceipts.map(normalizeTransaction);
          filings.push(...normalizedFilings);
          transactions.push(...normalizedTransactions);
          normalizedFilings.forEach((filing) => issues.push(...validateFiling(filing)));
          normalizedTransactions.forEach((transaction) =>
            issues.push(...validateTransaction(transaction)),
          );
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
      transactions,
      independentExpenditures,
      dataFreshness,
      status: mode === "backfill" ? "historical" : "new",
    });

    await upsertRaces(raceScope);
    await upsertCandidates(candidates);
    await upsertCommittees(committees);
    await upsertFilings(filings);
    await upsertTransactions(transactions);
    await upsertIndependentExpenditures(independentExpenditures);
    await upsertSignals(signals);
    await insertValidationIssues(issues);

    const recordsSeen =
      candidates.length +
      committees.length +
      filings.length +
      transactions.length +
      independentExpenditures.length +
      signals.length;
    await finishIngestionRun(runId, errors.length ? "partial" : "success", recordsSeen, errors);

    console.log(
      `Ingested ${recordsSeen} records/signals from ${candidates.length} House candidates with ${issues.length} validation issues.`,
    );
  } catch (error) {
    errors.push(error instanceof Error ? error.message : error);
    await finishIngestionRun(runId, "failed", 0, errors);
    throw error;
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
