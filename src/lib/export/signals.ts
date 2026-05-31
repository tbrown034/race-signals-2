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
  signal_permalink: string;
  data_freshness: string;
  dedupe_key: string;
  metadata: Record<string, unknown>;
};

export function signalToExportRow(signal: Signal): SignalExportRow {
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
    signal_permalink: `/#${signalAnchorId(signal.dedupeKey)}`,
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
