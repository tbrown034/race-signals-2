import type { Signal } from "@/src/lib/types";

export const EXPORT_LIMIT = 10000;

export type SignalExportRow = {
  signal_date: string;
  signal_type: string;
  headline: string;
  why_it_matters: string;
  candidate_name: string | null;
  candidate_id: string | null;
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
  signal_permalink: string;
  data_freshness: string;
  dedupe_key: string;
  metadata: Record<string, unknown>;
};

export function signalToExportRow(signal: Signal, baseUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://race-signals.vercel.app"): SignalExportRow {
  return {
    signal_date: signal.signalDate,
    signal_type: signal.signalType,
    headline: signal.headline,
    why_it_matters: signal.whyItMatters,
    candidate_name: signal.candidateName ?? null,
    candidate_id: signal.candidateId ?? null,
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
    source_id: sourceId(signal),
    source_kind: sourceKind(signal),
    signal_permalink: `${baseUrl}/#${signalAnchorId(signal.dedupeKey)}`,
    data_freshness: signal.dataFreshness,
    dedupe_key: signal.dedupeKey,
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
    "signal_permalink",
    "data_freshness",
    "dedupe_key",
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
