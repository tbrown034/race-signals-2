import { raceIdFor } from "@/src/lib/scope";
import {
  fecCandidateUrl,
  fecCommitteeUrl,
  fecFilingUrl,
  fecIndependentExpendituresUrl,
  type FecCandidate,
  type FecCommittee,
  type FecReport,
  type FecScheduleE,
} from "@/src/lib/sources/fec/client";
import type {
  Candidate,
  Committee,
  Filing,
  IndependentExpenditure,
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
    incumbentChallengeStatus: normalizeIncumbentChallengeStatus(
      record.incumbent_challenge ?? record.incumbent_challenge_full,
    ),
    raceId: raceIdFor(record.state, district, cycle, record.office),
    sourceUrl: fecCandidateUrl(record.candidate_id),
  };
}

function normalizeIncumbentChallengeStatus(value?: string | null) {
  if (!value) return null;
  const normalized = value.trim().toUpperCase();
  if (normalized === "I" || normalized === "INCUMBENT") return "I";
  if (normalized === "C" || normalized === "CHALLENGER") return "C";
  if (normalized === "O" || normalized === "OPEN SEAT") return "O";
  return value;
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
    firstFileDate: record.first_f1_date ?? record.first_file_date ?? null,
    sourceUrl: fecCommitteeUrl(record.committee_id),
  };
}

export function normalizeFiling(record: FecReport): Filing {
  const sourceId = String(record.beginning_image_number ?? record.file_number ?? "");
  const receipts = receiptValue(record);
  return {
    sourceId,
    cycle: record.report_year ?? null,
    committeeId: record.committee_id ? `cmte-${record.committee_id}` : null,
    fecCommitteeId: record.committee_id ?? null,
    reportType: record.report_type ?? null,
    coverageStartDate: record.coverage_start_date ?? null,
    coverageEndDate: record.coverage_end_date ?? null,
    receiptDate: record.receipt_date ?? null,
    totalReceipts: receipts.value,
    totalReceiptsBasis: receipts.basis,
    totalDisbursements: numberValue(
      record.total_disbursements_period ?? record.total_disbursements ?? record.total_disbursements_ytd,
    ),
    cashOnHand: record.cash_on_hand_end_period ?? null,
    sourceUrl: fecFilingUrl(record.beginning_image_number ?? record.file_number),
    raw: record,
  };
}

function receiptValue(record: FecReport): {
  value: number | null;
  basis: Filing["totalReceiptsBasis"];
} {
  if (record.total_receipts_period !== null && record.total_receipts_period !== undefined) {
    return { value: numberValue(record.total_receipts_period), basis: "period" };
  }
  if (record.total_receipts !== null && record.total_receipts !== undefined) {
    return { value: numberValue(record.total_receipts), basis: "total" };
  }
  if (record.total_receipts_ytd !== null && record.total_receipts_ytd !== undefined) {
    return { value: numberValue(record.total_receipts_ytd), basis: "ytd" };
  }
  return { value: null, basis: null };
}

function numberValue(value: number | string | null | undefined) {
  if (value === null || value === undefined) return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

export function normalizeIndependentExpenditure(
  record: FecScheduleE,
  raceId?: string | null,
  cycle?: number | null,
): IndependentExpenditure {
  return {
    sourceId: String(record.sub_id ?? ""),
    cycle: cycle ?? null,
    spenderCommitteeId: record.committee_id ? `cmte-${record.committee_id}` : null,
    fecCommitteeId: record.committee_id ?? null,
    candidateId: record.candidate_id ? `cand-${record.candidate_id}` : null,
    fecCandidateId: record.candidate_id ?? null,
    raceId: raceId ?? null,
    supportOpposeIndicator: record.support_oppose_indicator ?? null,
    amount: record.expenditure_amount ?? 0,
    expenditureDate: record.expenditure_date ?? null,
    purpose: record.expenditure_description ?? null,
    sourceUrl: record.candidate_id ? fecIndependentExpendituresUrl(record) : null,
    raw: record,
  };
}
