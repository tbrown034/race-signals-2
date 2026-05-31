import type { IngestionRun, TopSpender } from "@/src/lib/types";

export const SPENDER_EXPORT_LIMIT = 10000;

export type SpenderExportManifest = {
  exportedAt: string;
  filters: Record<string, string>;
  latestRun?: IngestionRun | null;
};

export type SpenderExportRow = {
  committee_id: string | null;
  fec_committee_id: string | null;
  committee_name: string;
  committee_type: string | null;
  designation: string | null;
  total_ie: number;
  support_ie: number;
  oppose_ie: number;
  record_count: number;
  race_count: number;
  states: string;
  last_expenditure_date: string | null;
  latest_schedule_e_source_id: string | null;
  latest_schedule_e_source_url: string | null;
  top_race_id: string | null;
  top_race_name: string | null;
  top_race_amount: number | null;
  committee_source_url: string | null;
  exported_at: string;
  filters: string;
  latest_run_id: string | null;
  latest_run_scope: string | null;
  latest_run_mode: string | null;
  latest_run_state: string | null;
  latest_run_status: string | null;
  latest_run_finished_at: string | null;
};

export function spenderToExportRow(
  spender: TopSpender,
  manifest: SpenderExportManifest,
): SpenderExportRow {
  return {
    committee_id: spender.committeeId,
    fec_committee_id: spender.fecCommitteeId,
    committee_name: spender.committeeName,
    committee_type: spender.committeeType ?? null,
    designation: spender.designation ?? null,
    total_ie: spender.totalAmount,
    support_ie: spender.supportAmount,
    oppose_ie: spender.opposeAmount,
    record_count: spender.recordCount,
    race_count: spender.raceCount,
    states: spender.states.join("|"),
    last_expenditure_date: spender.lastExpenditureDate ?? null,
    latest_schedule_e_source_id: spender.latestScheduleESourceId ?? null,
    latest_schedule_e_source_url: spender.latestScheduleESourceUrl ?? null,
    top_race_id: spender.topRaceId ?? null,
    top_race_name: spender.topRaceName ?? null,
    top_race_amount: spender.topRaceAmount ?? null,
    committee_source_url: spender.sourceUrl ?? null,
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

export function spenderRowsToCsv(rows: SpenderExportRow[]) {
  const columns: Array<keyof SpenderExportRow> = [
    "committee_id",
    "fec_committee_id",
    "committee_name",
    "committee_type",
    "designation",
    "total_ie",
    "support_ie",
    "oppose_ie",
    "record_count",
    "race_count",
    "states",
    "last_expenditure_date",
    "latest_schedule_e_source_id",
    "latest_schedule_e_source_url",
    "top_race_id",
    "top_race_name",
    "top_race_amount",
    "committee_source_url",
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

function csvCell(value: string | number | null) {
  if (value === null) return "";
  const text = String(value);
  if (!/[",\n\r]/.test(text)) return text;
  return `"${text.replaceAll('"', '""')}"`;
}
