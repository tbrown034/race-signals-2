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

function csvCell(value: string | number | null) {
  if (value === null) return "";
  const text = String(value);
  if (!/[",\n\r]/.test(text)) return text;
  return `"${text.replaceAll('"', '""')}"`;
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
