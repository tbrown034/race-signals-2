import type {
  Candidate,
  Committee,
  Filing,
  IndependentExpenditure,
  Transaction,
  ValidationIssue,
} from "@/src/lib/types";

const SUSPICIOUS_AMOUNT = 100000;

function sourceUrlIssue(entityType: string, sourceId?: string | null, sourceUrl?: string | null) {
  if (sourceUrl?.startsWith("https://www.fec.gov/")) return [];
  return [
    {
      entityType,
      sourceId,
      severity: "warning" as const,
      rule: "broken_or_missing_source_url",
      message: "Record is missing a usable FEC source URL.",
      sourceUrl,
    },
  ];
}

export function validateCandidate(candidate: Candidate): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  if (!candidate.name) {
    issues.push({
      entityType: "candidate",
      sourceId: candidate.fecCandidateId,
      severity: "error",
      rule: "missing_candidate_name",
      message: "Candidate record has no candidate name.",
      sourceUrl: candidate.sourceUrl,
    });
  }
  if (!candidate.raceId) {
    issues.push({
      entityType: "candidate",
      sourceId: candidate.fecCandidateId,
      severity: "warning",
      rule: "unmatched_race",
      message: "Candidate could not be matched to the configured race scope.",
      sourceUrl: candidate.sourceUrl,
    });
  }
  return issues.concat(sourceUrlIssue("candidate", candidate.fecCandidateId, candidate.sourceUrl));
}

export function validateCommittee(committee: Committee): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  if (!committee.fecCommitteeId) {
    issues.push({
      entityType: "committee",
      sourceId: null,
      severity: "error",
      rule: "missing_committee_id",
      message: "Committee record has no FEC committee ID.",
      sourceUrl: committee.sourceUrl,
    });
  }
  if (!committee.raceId && committee.designation === "P") {
    issues.push({
      entityType: "committee",
      sourceId: committee.fecCommitteeId,
      severity: "warning",
      rule: "unmatched_race",
      message: "Principal campaign committee could not be matched to a configured race.",
      sourceUrl: committee.sourceUrl,
    });
  }
  return issues.concat(sourceUrlIssue("committee", committee.fecCommitteeId, committee.sourceUrl));
}

export function validateFiling(filing: Filing): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  if (!filing.sourceId) {
    issues.push({
      entityType: "filing",
      sourceId: null,
      severity: "error",
      rule: "missing_source_id",
      message: "Filing has no stable source ID for deduping.",
      sourceUrl: filing.sourceUrl,
    });
  }
  if (!filing.receiptDate) {
    issues.push({
      entityType: "filing",
      sourceId: filing.sourceId,
      severity: "warning",
      rule: "missing_date",
      message: "Filing is missing a receipt date.",
      sourceUrl: filing.sourceUrl,
    });
  }
  return issues.concat(sourceUrlIssue("filing", filing.sourceId, filing.sourceUrl));
}

export function validateTransaction(transaction: Transaction): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  if (!transaction.committeeId) {
    issues.push({
      entityType: "transaction",
      sourceId: transaction.sourceId,
      severity: "error",
      rule: "missing_committee_id",
      message: "Transaction cannot be matched to a committee.",
      sourceUrl: transaction.sourceUrl,
    });
  }
  if (!transaction.transactionDate) {
    issues.push({
      entityType: "transaction",
      sourceId: transaction.sourceId,
      severity: "warning",
      rule: "missing_date",
      message: "Transaction is missing a transaction date.",
      sourceUrl: transaction.sourceUrl,
    });
  }
  if (transaction.amount >= SUSPICIOUS_AMOUNT) {
    issues.push({
      entityType: "transaction",
      sourceId: transaction.sourceId,
      severity: "warning",
      rule: "suspiciously_large_amount",
      message: "Transaction amount is large enough to require manual review.",
      sourceUrl: transaction.sourceUrl,
      raw: transaction.raw,
    });
  }
  return issues.concat(sourceUrlIssue("transaction", transaction.sourceId, transaction.sourceUrl));
}

export function validateIndependentExpenditure(
  expenditure: IndependentExpenditure,
): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  if (!expenditure.fecCommitteeId) {
    issues.push({
      entityType: "independent_expenditure",
      sourceId: expenditure.sourceId,
      severity: "error",
      rule: "missing_committee_id",
      message: "Independent expenditure has no spending committee ID.",
      sourceUrl: expenditure.sourceUrl,
    });
  }
  if (!expenditure.expenditureDate) {
    issues.push({
      entityType: "independent_expenditure",
      sourceId: expenditure.sourceId,
      severity: "warning",
      rule: "missing_date",
      message: "Independent expenditure is missing an expenditure date.",
      sourceUrl: expenditure.sourceUrl,
    });
  }
  if (!expenditure.raceId) {
    issues.push({
      entityType: "independent_expenditure",
      sourceId: expenditure.sourceId,
      severity: "warning",
      rule: "unmatched_race",
      message: "Independent expenditure could not be matched to a configured race.",
      sourceUrl: expenditure.sourceUrl,
    });
  }
  if (expenditure.amount >= SUSPICIOUS_AMOUNT) {
    issues.push({
      entityType: "independent_expenditure",
      sourceId: expenditure.sourceId,
      severity: "warning",
      rule: "suspiciously_large_amount",
      message: "Independent expenditure amount is large enough to require manual review.",
      sourceUrl: expenditure.sourceUrl,
      raw: expenditure.raw,
    });
  }
  return issues.concat(
    sourceUrlIssue("independent_expenditure", expenditure.sourceId, expenditure.sourceUrl),
  );
}
