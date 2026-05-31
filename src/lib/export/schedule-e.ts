import { csvCell } from "@/src/lib/export/csv";
import type { CommitteeIndependentExpenditure, IngestionRun } from "@/src/lib/types";

export const SCHEDULE_E_EXPORT_LIMIT = 10000;

export type ScheduleEExportManifest = {
  exportedAt: string;
  filters: Record<string, string>;
  baseUrl?: string;
  latestRun?: IngestionRun | null;
};

export type ScheduleEExportRow = {
  expenditure_date: string | null;
  amount: number;
  dissemination_date: string | null;
  support_oppose: string | null;
  target_position_label: string;
  spender_committee_name: string | null;
  spender_committee_id: string | null;
  fec_committee_id: string | null;
  payee_name: string | null;
  category_code_full: string | null;
  filing_form: string | null;
  file_number: string | null;
  pdf_url: string | null;
  candidate_name: string | null;
  candidate_id: string | null;
  fec_candidate_id: string | null;
  candidate_party: string | null;
  race_name: string | null;
  race_id: string | null;
  purpose: string | null;
  source_url: string | null;
  source_id: string;
  evidence_url: string | null;
  methodology_url: string;
  scope_note: string;
  exported_at: string;
  filters: string;
  latest_run_id: string | null;
  latest_run_scope: string | null;
  latest_run_mode: string | null;
  latest_run_state: string | null;
  latest_run_status: string | null;
  latest_run_finished_at: string | null;
};

export function scheduleEToExportRow(
  record: CommitteeIndependentExpenditure,
  manifest: ScheduleEExportManifest,
): ScheduleEExportRow {
  return {
    expenditure_date: record.expenditureDate ?? null,
    amount: record.amount,
    dissemination_date: record.disseminationDate ?? null,
    support_oppose: record.supportOpposeIndicator ?? null,
    target_position_label: targetPositionLabel(record.supportOpposeIndicator),
    spender_committee_name: record.committeeName ?? null,
    spender_committee_id: record.spenderCommitteeId ?? null,
    fec_committee_id: record.fecCommitteeId ?? null,
    payee_name: record.payeeName ?? null,
    category_code_full: record.categoryCodeFull ?? null,
    filing_form: record.filingForm ?? null,
    file_number: record.fileNumber ?? null,
    pdf_url: record.pdfUrl ?? null,
    candidate_name: record.candidateName ?? null,
    candidate_id: record.candidateId ?? null,
    fec_candidate_id: record.fecCandidateId ?? null,
    candidate_party: record.candidateParty ?? null,
    race_name: record.raceName ?? null,
    race_id: record.raceId ?? null,
    purpose: record.purpose ?? null,
    source_url: record.sourceUrl ?? null,
    source_id: record.sourceId,
    evidence_url: manifest.baseUrl ? `${manifest.baseUrl}/records/schedule-e${evidenceQuery(manifest.filters, record.sourceId)}#${scheduleEAnchorId(record.sourceId)}` : null,
    methodology_url: manifest.baseUrl
      ? `${manifest.baseUrl}/methodology#large_independent_expenditure`
      : "/methodology#large_independent_expenditure",
    scope_note: "Stored, source-linked Schedule E rows in the current Race Signals database slice; not a completeness claim.",
    exported_at: manifest.exportedAt,
    filters: JSON.stringify(manifest.filters),
    latest_run_id: manifest.latestRun?.id ?? null,
    latest_run_scope: manifest.latestRun?.scope ?? null,
    latest_run_mode: manifest.latestRun?.mode ?? null,
    latest_run_state: manifest.latestRun?.state ?? null,
    latest_run_status: manifest.latestRun?.status ?? null,
    latest_run_finished_at: manifest.latestRun?.finishedAt ?? null,
  };
}

export function scheduleERowsToCsv(rows: ScheduleEExportRow[]) {
  const columns: Array<keyof ScheduleEExportRow> = [
    "expenditure_date",
    "amount",
    "dissemination_date",
    "support_oppose",
    "target_position_label",
    "spender_committee_name",
    "spender_committee_id",
    "fec_committee_id",
    "payee_name",
    "category_code_full",
    "filing_form",
    "file_number",
    "pdf_url",
    "candidate_name",
    "candidate_id",
    "fec_candidate_id",
    "candidate_party",
    "race_name",
    "race_id",
    "purpose",
    "source_url",
    "source_id",
    "evidence_url",
    "methodology_url",
    "scope_note",
    "exported_at",
    "filters",
    "latest_run_id",
    "latest_run_scope",
    "latest_run_mode",
    "latest_run_state",
    "latest_run_status",
    "latest_run_finished_at",
  ];

  return [
    columns.join(","),
    ...rows.map((row) => columns.map((column) => csvCell(row[column])).join(",")),
  ].join("\n");
}

function targetPositionLabel(value?: string | null) {
  if (value === "S") return "FEC code: supports target";
  if (value === "O") return "FEC code: opposes target";
  return "Not classified by FEC";
}

function scheduleEAnchorId(sourceId: string) {
  return `schedule-e-${sourceId.replace(/[^a-zA-Z0-9_-]/g, "-")}`;
}

function evidenceQuery(filters: Record<string, string>, sourceId: string) {
  const params = new URLSearchParams();
  for (const key of ["state", "race", "committee", "fecCommittee", "candidate", "position", "minAmount", "targetParty", "targetStatus"]) {
    const value = filters[key];
    if (value) params.set(key, value);
  }
  params.set("sourceId", sourceId);
  const query = params.toString();
  return query ? `?${query}` : "";
}
