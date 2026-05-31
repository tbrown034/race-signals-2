import type { IngestionRun, StateRaceBoardRow } from "@/src/lib/types";

export type RaceBoardExportManifest = {
  exportedAt: string;
  filters: Record<string, string>;
  latestRun?: IngestionRun | null;
};

export type RaceBoardExportRow = {
  state: string;
  race_id: string;
  race_name: string;
  office: string;
  district: string | null;
  candidate_count: number;
  incumbent_count: number;
  candidate_receipts_total: number;
  signal_count: number;
  latest_signal_date: string | null;
  independent_expenditure_total: number;
  exported_at: string;
  filters: string;
  latest_run_id: string | null;
  latest_run_scope: string | null;
  latest_run_mode: string | null;
  latest_run_state: string | null;
  latest_run_status: string | null;
  latest_run_finished_at: string | null;
};

export function raceBoardToExportRow(
  row: StateRaceBoardRow,
  state: string,
  manifest: RaceBoardExportManifest,
): RaceBoardExportRow {
  return {
    state,
    race_id: row.raceId,
    race_name: row.raceName,
    office: row.office,
    district: row.district ?? null,
    candidate_count: row.candidateCount,
    incumbent_count: row.incumbentCount,
    candidate_receipts_total: row.candidateReceiptsTotal,
    signal_count: row.signalCount,
    latest_signal_date: row.latestSignalDate ?? null,
    independent_expenditure_total: row.independentExpenditureTotal,
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

export function raceBoardRowsToCsv(rows: RaceBoardExportRow[]) {
  const columns: Array<keyof RaceBoardExportRow> = [
    "state",
    "race_id",
    "race_name",
    "office",
    "district",
    "candidate_count",
    "incumbent_count",
    "candidate_receipts_total",
    "signal_count",
    "latest_signal_date",
    "independent_expenditure_total",
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
