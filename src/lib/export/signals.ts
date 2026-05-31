import type { Signal } from "@/src/lib/types";

export const EXPORT_LIMIT = 10000;

export type SignalExportRow = {
  signal_date: string;
  signal_type: string;
  headline: string;
  why_it_matters: string;
  candidate_name: string | null;
  committee_name: string | null;
  race_name: string | null;
  state: string | null;
  office: string | null;
  amount: number | null;
  confidence: string;
  status: string;
  source_url: string | null;
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
    committee_name: signal.committeeName ?? null,
    race_name: signal.raceName ?? null,
    state: signal.state ?? stateFromRaceId(signal.raceId),
    office: signal.office ?? officeFromRaceId(signal.raceId),
    amount: signal.amount ?? null,
    confidence: signal.confidence,
    status: signal.status,
    source_url: signal.sourceUrl ?? null,
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
    "committee_name",
    "race_name",
    "state",
    "office",
    "amount",
    "confidence",
    "status",
    "source_url",
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
