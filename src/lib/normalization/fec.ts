import { raceIdFor } from "@/src/lib/scope";
import {
  fecCandidateUrl,
  fecCommitteeUrl,
  fecFilingUrl,
  fecIndependentExpendituresUrl,
  fecReceiptsUrl,
  type FecCandidate,
  type FecCommittee,
  type FecReport,
  type FecScheduleA,
  type FecScheduleE,
} from "@/src/lib/sources/fec/client";
import type {
  Candidate,
  Committee,
  Filing,
  IndependentExpenditure,
  Transaction,
} from "@/src/lib/types";

export function normalizeCandidate(record: FecCandidate, cycle: number): Candidate {
  const district = record.district?.padStart(2, "0") ?? null;
  return {
    id: `cand-${record.candidate_id}`,
    fecCandidateId: record.candidate_id,
    name: record.name,
    party: record.party ?? null,
    office: record.office,
    state: record.state,
    district: record.office === "S" ? "00" : district,
    electionYear: cycle,
    incumbentChallengeStatus: record.incumbent_challenge_full ?? null,
    raceId: raceIdFor(record.state, district, cycle, record.office),
    sourceUrl: fecCandidateUrl(record.candidate_id),
  };
}

export function normalizeCommittee(
  record: FecCommittee,
  candidate?: Candidate,
): Committee {
  return {
    id: `cmte-${record.committee_id}`,
    fecCommitteeId: record.committee_id,
    name: record.name,
    committeeType: record.committee_type ?? null,
    designation: record.designation ?? null,
    party: record.party ?? null,
    treasurerName: record.treasurer_name ?? null,
    candidateId: candidate?.id ?? null,
    raceId: candidate?.raceId ?? null,
    discoveredVia: candidate ? "candidate_committee" : "schedule_e",
    sourceUrl: fecCommitteeUrl(record.committee_id),
  };
}

export function normalizeFiling(record: FecReport): Filing {
  const sourceId = String(record.beginning_image_number ?? record.file_number ?? "");
  return {
    sourceId,
    committeeId: record.committee_id ? `cmte-${record.committee_id}` : null,
    fecCommitteeId: record.committee_id ?? null,
    reportType: record.report_type ?? null,
    coverageStartDate: record.coverage_start_date ?? null,
    coverageEndDate: record.coverage_end_date ?? null,
    receiptDate: record.receipt_date ?? null,
    totalReceipts: record.total_receipts ?? null,
    totalDisbursements: record.total_disbursements ?? null,
    cashOnHand: record.cash_on_hand_end_period ?? null,
    sourceUrl: fecFilingUrl(record.beginning_image_number ?? record.file_number),
    raw: record,
  };
}

export function normalizeTransaction(record: FecScheduleA): Transaction {
  return {
    sourceId: String(record.sub_id ?? ""),
    committeeId: record.committee_id ? `cmte-${record.committee_id}` : null,
    fecCommitteeId: record.committee_id ?? null,
    contributorName: record.contributor_name ?? null,
    contributorEmployer: record.contributor_employer ?? null,
    contributorOccupation: record.contributor_occupation ?? null,
    amount: record.contribution_receipt_amount ?? 0,
    transactionDate: record.contribution_receipt_date ?? null,
    transactionType: record.receipt_type ?? null,
    memoText: record.memo_text ?? null,
    sourceUrl: record.committee_id ? fecReceiptsUrl(record.committee_id) : null,
    raw: record,
  };
}

export function normalizeIndependentExpenditure(
  record: FecScheduleE,
  raceId?: string | null,
): IndependentExpenditure {
  return {
    sourceId: String(record.sub_id ?? ""),
    spenderCommitteeId: record.committee_id ? `cmte-${record.committee_id}` : null,
    fecCommitteeId: record.committee_id ?? null,
    candidateId: record.candidate_id ? `cand-${record.candidate_id}` : null,
    fecCandidateId: record.candidate_id ?? null,
    raceId: raceId ?? null,
    supportOpposeIndicator: record.support_oppose_indicator ?? null,
    amount: record.expenditure_amount ?? 0,
    expenditureDate: record.expenditure_date ?? null,
    purpose: record.expenditure_description ?? null,
    sourceUrl: record.candidate_id ? fecIndependentExpendituresUrl(record.candidate_id) : null,
    raw: record,
  };
}
