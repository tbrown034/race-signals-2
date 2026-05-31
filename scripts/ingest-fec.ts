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
  fetchCandidatesForRace,
  fetchCommitteesForCandidate,
  fetchIndependentExpendituresForCandidate,
  fetchReceiptsForCommittee,
  fetchReportsForCommittee,
} from "@/src/lib/sources/fec/client";
import { TARGET_RACES } from "@/src/lib/scope";
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

async function main() {
  if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL is required to ingest FEC data.");
  }
  if (!process.env.FEC_API_KEY) {
    throw new Error("FEC_API_KEY is required to ingest FEC data.");
  }

  await migrate();
  const runId = await createIngestionRun("2026 Indiana House watchlist");
  const errors: unknown[] = [];

  try {
    const candidates: Candidate[] = [];
    const committees: Committee[] = [];
    const filings: Filing[] = [];
    const transactions: Transaction[] = [];
    const independentExpenditures: IndependentExpenditure[] = [];
    const issues: ValidationIssue[] = [];

    for (const race of TARGET_RACES) {
      const fecCandidates = await fetchCandidatesForRace(race.state, race.district, race.cycle);
      const normalizedCandidates = fecCandidates.map((record) =>
        normalizeCandidate(record, race.cycle),
      );
      candidates.push(...normalizedCandidates);
      normalizedCandidates.forEach((candidate) => issues.push(...validateCandidate(candidate)));

      for (const candidate of normalizedCandidates) {
        const fecCommittees = await fetchCommitteesForCandidate(candidate.fecCandidateId);
        const normalizedCommittees = fecCommittees.map((record) =>
          normalizeCommittee(record, candidate),
        );
        committees.push(...normalizedCommittees);
        normalizedCommittees.forEach((committee) => issues.push(...validateCommittee(committee)));

        const fecIes = await fetchIndependentExpendituresForCandidate(
          candidate.fecCandidateId,
          race.cycle,
        );
        const normalizedIes = fecIes.map((record) =>
          normalizeIndependentExpenditure(record, candidate.raceId),
        );
        independentExpenditures.push(...normalizedIes);
        normalizedIes.forEach((ie) => issues.push(...validateIndependentExpenditure(ie)));

        for (const committee of normalizedCommittees) {
          const [fecReports, fecReceipts] = await Promise.all([
            fetchReportsForCommittee(committee.fecCommitteeId, race.cycle),
            fetchReceiptsForCommittee(committee.fecCommitteeId, race.cycle),
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
    }

    const dataFreshness = new Date().toISOString();
    const signals = generateSignals({
      candidates,
      committees,
      races: TARGET_RACES,
      filings,
      transactions,
      independentExpenditures,
      dataFreshness,
    });

    await upsertRaces(TARGET_RACES);
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
      `Ingested ${recordsSeen} records/signals with ${issues.length} validation issues.`,
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
