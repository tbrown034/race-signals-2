import type {
  Candidate,
  Committee,
  Filing,
  IndependentExpenditure,
  ValidationIssue,
} from "@/src/lib/types";

const LARGE_AMOUNT_REVIEW_THRESHOLD = 100000;

function sourceUrlIssue(entityType: string, sourceId?: string | null, sourceUrl?: string | null) {
  if (usableFecSourceUrl(entityType, sourceId, sourceUrl)) return [];
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

function usableFecSourceUrl(entityType: string, sourceId?: string | null, sourceUrl?: string | null) {
  if (!sourceUrl) return false;
  let url: URL;
  try {
    url = new URL(sourceUrl);
  } catch {
    return false;
  }
  if (url.origin !== "https://www.fec.gov") return false;
  if (entityType === "candidate") return /^\/data\/candidate\/[^/]+\/?$/.test(url.pathname);
  if (entityType === "committee") return /^\/data\/committee\/[^/]+\/?$/.test(url.pathname);
  if (entityType === "filing") {
    return /^\/data\/filing\/[^/]+\/?$/.test(url.pathname) && Boolean(sourceId);
  }
  if (entityType === "independent_expenditure") {
    return url.pathname === "/data/independent-expenditures/" && Boolean(sourceId) && url.searchParams.has("sub_id");
  }
  if (entityType === "transaction") return url.pathname.startsWith("/data/receipts/");
  return url.pathname.startsWith("/data/");
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
  if (committee.designation === "P" && !committee.firstFileDate) {
    issues.push({
      entityType: "committee",
      sourceId: committee.fecCommitteeId,
      severity: "warning",
      rule: "missing_committee_formation_date",
      message: "Principal campaign committee has no FEC first-file date, so Race Signals cannot date a committee-formation signal.",
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
  if (!filing.committeeId && !filing.fecCommitteeId) {
    issues.push({
      entityType: "filing",
      sourceId: filing.sourceId,
      severity: "warning",
      rule: "missing_committee_id",
      message: "Filing is missing a committee ID, so it cannot be matched to a committee or race.",
      sourceUrl: filing.sourceUrl,
    });
  }
  return issues.concat(sourceUrlIssue("filing", filing.sourceId, filing.sourceUrl));
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
  if (expenditure.amount >= LARGE_AMOUNT_REVIEW_THRESHOLD) {
    issues.push({
      entityType: "independent_expenditure",
      sourceId: expenditure.sourceId,
      severity: "warning",
      rule: "large_amount_review",
      message: "Independent expenditure amount meets the flat manual review threshold.",
      sourceUrl: expenditure.sourceUrl,
      raw: expenditure.raw,
    });
  }
  return issues.concat(
    sourceUrlIssue("independent_expenditure", expenditure.sourceId, expenditure.sourceUrl),
  );
}
