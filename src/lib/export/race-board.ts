import type { IngestionRun, StateRaceBoardRow } from "@/src/lib/types";

export type RaceBoardExportManifest = {
  exportedAt: string;
  filters: Record<string, string>;
  baseUrl?: string;
  latestRun?: IngestionRun | null;
};

export type RaceBoardExportRow = {
  state: string;
  race_id: string;
  race_name: string;
  race_url: string | null;
  outside_spending_records_url: string | null;
  outside_spending_signals_url: string | null;
  office: string;
  district: string | null;
  candidate_count: number;
  incumbent_count: number;
  candidate_receipts_total: number;
  candidate_fec_ids: string;
  candidate_source_urls: string;
  candidate_evidence_url: string | null;
  candidate_totals_fetched_at_latest: string | null;
  candidate_totals_fetched_at_oldest: string | null;
  signal_count: number;
  latest_signal_date: string | null;
  latest_signal_headline: string | null;
  latest_signal_permalink: string | null;
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
    race_url: manifest.baseUrl ? `${manifest.baseUrl}/races/${row.raceId}` : null,
    outside_spending_records_url: manifest.baseUrl ? `${manifest.baseUrl}/records/schedule-e?race=${row.raceId}` : null,
    outside_spending_signals_url: manifest.baseUrl ? `${manifest.baseUrl}/spending?race=${row.raceId}` : null,
    office: row.office,
    district: row.district ?? null,
    candidate_count: row.candidateCount,
    incumbent_count: row.incumbentCount,
    candidate_receipts_total: row.candidateReceiptsTotal,
    candidate_fec_ids: row.candidateFecIds.join("|"),
    candidate_source_urls: row.candidateSourceUrls.join("|"),
    candidate_evidence_url: manifest.baseUrl ? `${manifest.baseUrl}/races/${row.raceId}#candidate-cohort` : null,
    candidate_totals_fetched_at_latest: row.candidateTotalsFetchedAtLatest ?? null,
    candidate_totals_fetched_at_oldest: row.candidateTotalsFetchedAtOldest ?? null,
    signal_count: row.signalCount,
    latest_signal_date: row.latestSignalDate ?? null,
    latest_signal_headline: row.latestSignalHeadline ?? null,
    latest_signal_permalink: manifest.baseUrl && row.latestSignalDedupeKey
      ? `${manifest.baseUrl}/?race=${row.raceId}#${signalAnchorId(row.latestSignalDedupeKey)}`
      : null,
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
    "race_url",
    "outside_spending_records_url",
    "outside_spending_signals_url",
    "office",
    "district",
    "candidate_count",
    "incumbent_count",
    "candidate_receipts_total",
    "candidate_fec_ids",
    "candidate_source_urls",
    "candidate_evidence_url",
    "candidate_totals_fetched_at_latest",
    "candidate_totals_fetched_at_oldest",
    "signal_count",
    "latest_signal_date",
    "latest_signal_headline",
    "latest_signal_permalink",
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

function signalAnchorId(dedupeKey: string) {
  return `signal-${dedupeKey.replace(/[^a-zA-Z0-9_-]/g, "-")}`;
}
