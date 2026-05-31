import type { CommitteeIndependentExpenditure } from "@/src/lib/types";

export const SCHEDULE_E_EXPORT_LIMIT = 10000;

export type ScheduleEExportManifest = {
  exportedAt: string;
  filters: Record<string, string>;
};

export type ScheduleEExportRow = {
  expenditure_date: string | null;
  amount: number;
  support_oppose: string | null;
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
};

export function scheduleEToExportRow(
  record: CommitteeIndependentExpenditure,
  manifest: ScheduleEExportManifest,
): ScheduleEExportRow {
  return {
    expenditure_date: record.expenditureDate ?? null,
    amount: record.amount,
    support_oppose: record.supportOpposeIndicator ?? null,
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
  };
}

export function scheduleERowsToCsv(rows: ScheduleEExportRow[]) {
  const columns: Array<keyof ScheduleEExportRow> = [
    "expenditure_date",
    "amount",
    "support_oppose",
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
