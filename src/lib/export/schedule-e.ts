import type { CommitteeIndependentExpenditure, IngestionRun } from "@/src/lib/types";

export const SCHEDULE_E_EXPORT_LIMIT = 10000;

export type ScheduleEExportManifest = {
  exportedAt: string;
  filters: Record<string, string>;
  latestRun?: IngestionRun | null;
};

export type ScheduleEExportRow = {
  expenditure_date: string | null;
  amount: number;
  support_oppose: string | null;
  target_position_label: string;
  spender_committee_name: string | null;
  spender_committee_id: string | null;
  fec_committee_id: string | null;
  candidate_name: string | null;
  candidate_id: string | null;
  fec_candidate_id: string | null;
  candidate_party: string | null;
  race_name: string | null;
  race_id: string | null;
  purpose: string | null;
  source_url: string | null;
  source_id: string;
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
    support_oppose: record.supportOpposeIndicator ?? null,
    target_position_label: targetPositionLabel(record.supportOpposeIndicator),
    spender_committee_name: record.committeeName ?? null,
    spender_committee_id: record.spenderCommitteeId ?? null,
    fec_committee_id: record.fecCommitteeId ?? null,
    candidate_name: record.candidateName ?? null,
    candidate_id: record.candidateId ?? null,
    fec_candidate_id: record.fecCandidateId ?? null,
    candidate_party: record.candidateParty ?? null,
    race_name: record.raceName ?? null,
    race_id: record.raceId ?? null,
    purpose: record.purpose ?? null,
    source_url: record.sourceUrl ?? null,
    source_id: record.sourceId,
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
    "support_oppose",
    "target_position_label",
    "spender_committee_name",
    "spender_committee_id",
    "fec_committee_id",
    "candidate_name",
    "candidate_id",
    "fec_candidate_id",
    "candidate_party",
    "race_name",
    "race_id",
    "purpose",
    "source_url",
    "source_id",
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
  if (value === "S") return "Supports target";
  if (value === "O") return "Opposes target";
  return "Not classified by FEC";
}

function csvCell(value: string | number | null) {
  if (value === null) return "";
  const text = String(value);
  if (!/[",\n\r]/.test(text)) return text;
  return `"${text.replaceAll('"', '""')}"`;
}
