import { csvCell } from "@/src/lib/export/csv";
import type { Signal } from "@/src/lib/types";

export const EXPORT_LIMIT = 10000;

export type SignalExportRow = {
  exported_at: string;
  filters: string;
  latest_run_id: string | null;
  latest_run_scope: string | null;
  latest_run_mode: string | null;
  latest_run_state: string | null;
  latest_run_status: string | null;
  latest_run_finished_at: string | null;
  signal_date: string;
  signal_type: string;
  headline: string;
  why_it_matters: string;
  candidate_name: string | null;
  candidate_id: string | null;
  candidate_party: string | null;
  candidate_state: string | null;
  candidate_district: string | null;
  candidate_incumbent_challenge_status: string | null;
  committee_name: string | null;
  committee_id: string | null;
  race_name: string | null;
  race_id: string | null;
  state: string | null;
  office: string | null;
  amount: number | null;
  confidence: string;
  status: string;
  source_url: string | null;
  source_id: string | null;
  source_kind: string | null;
  total_receipts_basis: string | null;
  latest_receipts: number | null;
  prior_receipts: number | null;
  receipts_ratio: number | null;
  latest_report_type: string | null;
  prior_report_type: string | null;
  latest_coverage_start_date: string | null;
  latest_coverage_end_date: string | null;
  prior_coverage_start_date: string | null;
  prior_coverage_end_date: string | null;
  latest_source_id: string | null;
  latest_source_url: string | null;
  prior_source_id: string | null;
  prior_source_url: string | null;
  comparison_basis: string | null;
  signal_permalink: string;
  methodology_url: string;
  scope_note: string;
  data_freshness: string;
  dedupe_key: string;
  metadata_json: string;
  metadata: Record<string, unknown>;
};

export type ExportManifest = {
  exportedAt: string;
  filters: Record<string, string>;
  latestRun?: {
    id: string;
    scope: string;
    mode?: string | null;
    state?: string | null;
    status: string;
    finishedAt?: string | null;
  } | null;
};

export function signalToExportRow(
  signal: Signal,
  baseUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://race-signals.vercel.app",
  manifest: ExportManifest = { exportedAt: new Date().toISOString(), filters: {}, latestRun: null },
): SignalExportRow {
  const stableSourceId = sourceId(signal);
  const latestReceipts = numberMetadata(signal.metadata?.latestTotalReceipts);
  const priorReceipts = numberMetadata(signal.metadata?.priorTotalReceipts);
  return {
    exported_at: manifest.exportedAt,
    filters: JSON.stringify(manifest.filters),
    latest_run_id: manifest.latestRun?.id ?? null,
    latest_run_scope: manifest.latestRun?.scope ?? null,
    latest_run_mode: manifest.latestRun?.mode ?? null,
    latest_run_state: manifest.latestRun?.state ?? null,
    latest_run_status: manifest.latestRun?.status ?? null,
    latest_run_finished_at: manifest.latestRun?.finishedAt ?? null,
    signal_date: signal.signalDate,
    signal_type: signal.signalType,
    headline: signal.headline,
    why_it_matters: signal.whyItMatters,
    candidate_name: signal.candidateName ?? null,
    candidate_id: signal.candidateId ?? null,
    candidate_party: signal.candidateParty ?? null,
    candidate_state: signal.candidateState ?? null,
    candidate_district: signal.candidateDistrict ?? null,
    candidate_incumbent_challenge_status: signal.candidateIncumbentChallengeStatus ?? null,
    committee_name: signal.committeeName ?? null,
    committee_id: signal.committeeId ?? null,
    race_name: signal.raceName ?? null,
    race_id: signal.raceId ?? null,
    state: signal.state ?? stateFromRaceId(signal.raceId),
    office: signal.office ?? officeFromRaceId(signal.raceId),
    amount: signal.amount ?? null,
    confidence: signal.confidence,
    status: signal.status,
    source_url: signal.sourceUrl ?? null,
    source_id: stableSourceId,
    source_kind: sourceKind(signal),
    total_receipts_basis: textMetadata(signal.metadata?.totalReceiptsBasis),
    latest_receipts: latestReceipts,
    prior_receipts: priorReceipts,
    receipts_ratio: latestReceipts !== null && priorReceipts !== null && priorReceipts > 0
      ? Number((latestReceipts / priorReceipts).toFixed(2))
      : null,
    latest_report_type: textMetadata(signal.metadata?.latestReportType),
    prior_report_type: textMetadata(signal.metadata?.priorReportType),
    latest_coverage_start_date: textMetadata(signal.metadata?.latestCoverageStartDate),
    latest_coverage_end_date: textMetadata(signal.metadata?.latestCoverageEndDate),
    prior_coverage_start_date: textMetadata(signal.metadata?.priorCoverageStartDate),
    prior_coverage_end_date: textMetadata(signal.metadata?.priorCoverageEndDate),
    latest_source_id: textMetadata(signal.metadata?.latestSourceId),
    latest_source_url: textMetadata(signal.metadata?.latestSourceUrl),
    prior_source_id: textMetadata(signal.metadata?.priorSourceId),
    prior_source_url: textMetadata(signal.metadata?.priorSourceUrl),
    comparison_basis: textMetadata(signal.metadata?.comparisonBasis) ?? filingComparisonBasis(signal.metadata),
    signal_permalink: `${baseUrl}/?q=${encodeURIComponent(stableSourceId ?? signal.dedupeKey)}#${signalAnchorId(signal.dedupeKey)}`,
    methodology_url: `${baseUrl}/methodology#${signal.signalType}`,
    scope_note: "Source-linked Race Signals alert generated from stored FEC records in the current database slice; not a completeness claim.",
    data_freshness: signal.dataFreshness,
    dedupe_key: signal.dedupeKey,
    metadata_json: JSON.stringify(signal.metadata ?? {}),
    metadata: signal.metadata ?? {},
  };
}

export function rowsToCsv(rows: SignalExportRow[]) {
  const columns: Array<keyof Omit<SignalExportRow, "metadata">> = [
    "signal_date",
    "signal_type",
    "headline",
    "why_it_matters",
    "candidate_name",
    "candidate_id",
    "candidate_party",
    "candidate_state",
    "candidate_district",
    "candidate_incumbent_challenge_status",
    "committee_name",
    "committee_id",
    "race_name",
    "race_id",
    "state",
    "office",
    "amount",
    "confidence",
    "status",
    "source_url",
    "source_id",
    "source_kind",
    "total_receipts_basis",
    "latest_receipts",
    "prior_receipts",
    "receipts_ratio",
    "latest_report_type",
    "prior_report_type",
    "latest_coverage_start_date",
    "latest_coverage_end_date",
    "prior_coverage_start_date",
    "prior_coverage_end_date",
    "latest_source_id",
    "latest_source_url",
    "prior_source_id",
    "prior_source_url",
    "comparison_basis",
    "signal_permalink",
    "methodology_url",
    "scope_note",
    "data_freshness",
    "dedupe_key",
    "metadata_json",
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

function stateFromRaceId(raceId?: string | null) {
  return raceId?.split("-")[1] ?? null;
}

function officeFromRaceId(raceId?: string | null) {
  if (!raceId) return null;
  return raceId.includes("-S") ? "S" : "H";
}

function signalAnchorId(dedupeKey: string) {
  return `signal-${dedupeKey.replace(/[^a-zA-Z0-9_-]/g, "-")}`;
}

function sourceId(signal: Signal) {
  const value = signal.metadata?.sourceId;
  if (typeof value === "string" && value) return value;
  const parts = signal.dedupeKey.split(":");
  return parts.length >= 3 ? parts.slice(2).join(":") : signal.dedupeKey;
}

function sourceKind(signal: Signal) {
  const value = signal.metadata?.sourceKind;
  if (typeof value === "string" && value) return value;
  if (signal.signalType === "large_independent_expenditure") return "schedule_e";
  if (signal.signalType === "new_filing" || signal.signalType === "committee_activity_spike") return "filing";
  if (signal.signalType === "new_committee") return "committee";
  return null;
}

function textMetadata(value: unknown) {
  return typeof value === "string" && value ? value : null;
}

function numberMetadata(value: unknown) {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value !== "string" || !value) return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function filingComparisonBasis(metadata?: Record<string, unknown> | null) {
  if (!metadata) return null;
  const latestReportType = textMetadata(metadata.latestReportType);
  const priorReportType = textMetadata(metadata.priorReportType);
  const reportTypePart = latestReportType && priorReportType
    ? latestReportType === priorReportType
      ? `same report type ${latestReportType}`
      : `different report types ${latestReportType} vs ${priorReportType}`
    : null;
  const latestDays = coverageDays(
    textMetadata(metadata.latestCoverageStartDate) ?? textMetadata(metadata.coverageStartDate),
    textMetadata(metadata.latestCoverageEndDate) ?? textMetadata(metadata.coverageEndDate),
  );
  const priorDays = coverageDays(
    textMetadata(metadata.priorCoverageStartDate),
    textMetadata(metadata.priorCoverageEndDate),
  );
  const coveragePart = latestDays !== null && priorDays !== null
    ? latestDays === priorDays
      ? `same ${latestDays}-day coverage length`
      : `different coverage lengths ${latestDays} vs ${priorDays} days`
    : null;
  if (!reportTypePart && !coveragePart) return null;
  return `Period receipts comparison; ${[reportTypePart, coveragePart].filter(Boolean).join("; ")}.`;
}

function coverageDays(start?: string | null, end?: string | null) {
  if (!start || !end) return null;
  const startTime = Date.parse(`${start}T00:00:00Z`);
  const endTime = Date.parse(`${end}T00:00:00Z`);
  if (!Number.isFinite(startTime) || !Number.isFinite(endTime) || endTime < startTime) return null;
  return Math.round((endTime - startTime) / 86_400_000) + 1;
}
