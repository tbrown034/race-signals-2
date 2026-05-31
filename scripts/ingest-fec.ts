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
  const runScope = `${cycle} national House candidate scope`;
  const runId = await createIngestionRun(runScope);
  const errors: unknown[] = [];

  try {
    const candidates: Candidate[] = [];
    const committees: Committee[] = [];
    const filings: Filing[] = [];
    const transactions: Transaction[] = [];
    const independentExpenditures: IndependentExpenditure[] = [];
    const issues: ValidationIssue[] = [];

    const raceScope = TARGET_RACES.filter((race) => race.cycle === cycle);
    const raceIds = new Set(raceScope.map((race) => race.id));
    const fecCandidates = await fetchHouseCandidates(cycle, maxCandidatePages);
    const normalizedCandidates = fecCandidates
      .map((record) => normalizeCandidate(record, cycle))
      .filter((candidate) => candidate.raceId && raceIds.has(candidate.raceId))
      .slice(0, maxCandidates);

    candidates.push(...normalizedCandidates);
    normalizedCandidates.forEach((candidate) => issues.push(...validateCandidate(candidate)));

    for (const candidate of normalizedCandidates) {
      const fecCommittees = await fetchCommitteesForCandidate(candidate.fecCandidateId);
      const normalizedCommittees = fecCommittees.map((record) =>
        normalizeCommittee(record, candidate),
      );
      committees.push(...normalizedCommittees);
      normalizedCommittees.forEach((committee) => issues.push(...validateCommittee(committee)));

      const fecIes = await fetchIndependentExpendituresForCandidate(candidate.fecCandidateId, cycle);
      const normalizedIes = fecIes.map((record) =>
        normalizeIndependentExpenditure(record, candidate.raceId),
      );
      independentExpenditures.push(...normalizedIes);
      normalizedIes.forEach((ie) => issues.push(...validateIndependentExpenditure(ie)));

      for (const committee of normalizedCommittees) {
        const [fecReports, fecReceipts] = await Promise.all([
          fetchReportsForCommittee(committee.fecCommitteeId, cycle),
          fetchReceiptsForCommittee(committee.fecCommitteeId, cycle),
        ]);
        const normalizedFilings = fecReports.map(normalizeFiling);
        const normalizedTransactions = fecReceipts.map(normalizeTransaction);
        filings.push(...normalizedFilings);
        transactions.push(...normalizedTransactions);
        normalizedFilings.forEach((filing) => issues.push(...validateFiling(filing)));
        normalizedTransactions.forEach((transaction) =>
          issues.push(...validateTransaction(transaction)),
        );
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
    await finishIngestionRun(runId, "success", recordsSeen);

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
