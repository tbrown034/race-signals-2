import { csvCell } from "@/src/lib/export/csv";
import type { IngestionRun, TopFundraiser } from "@/src/lib/types";

export const FUNDRAISER_EXPORT_LIMIT = 10000;

export type FundraiserExportManifest = {
  exportedAt: string;
  filters: Record<string, string>;
  baseUrl?: string;
  latestRun?: IngestionRun | null;
};

export type FundraiserExportRow = {
  candidate_id: string;
  fec_candidate_id: string;
  candidate_name: string;
  party: string | null;
  office: string;
  state: string;
  district: string | null;
  incumbent_challenge_status: string | null;
  race_id: string | null;
  race_name: string | null;
  total_receipts_cycle: number | null;
  total_disbursements_cycle: number | null;
  cash_on_hand_latest: number | null;
  cash_on_hand_as_of: string | null;
  individual_contribution_pct: number | null;
  pac_contribution_pct: number | null;
  totals_updated_at: string | null;
  fec_source_url: string | null;
  candidate_page_url: string;
  race_page_url: string | null;
  methodology_url: string;
  scope_note: string;
  exported_at: string;
  filters: string;
  latest_run_id: string | null;
  latest_run_scope: string | null;
  latest_run_mode: string | null;
  latest_run_state: string | null;
  latest_run_status: string | null;
  latest_run_finished_at: string | null;
};

const SCOPE_NOTE =
  "Ranked from FEC candidate totals stored in the current Race Signals database slice; not a national completeness claim.";

export function fundraiserToExportRow(
  fundraiser: TopFundraiser,
  manifest: FundraiserExportManifest,
): FundraiserExportRow {
  const baseUrl = manifest.baseUrl ?? "";
  return {
    candidate_id: fundraiser.candidateId,
    fec_candidate_id: fundraiser.fecCandidateId,
    candidate_name: fundraiser.name,
    party: fundraiser.party,
    office: fundraiser.office,
    state: fundraiser.state,
    district: fundraiser.district,
    incumbent_challenge_status: fundraiser.incumbentChallengeStatus,
    race_id: fundraiser.raceId,
    race_name: fundraiser.raceName,
    total_receipts_cycle: fundraiser.totalReceiptsCycle,
    total_disbursements_cycle: fundraiser.totalDisbursementsCycle,
    cash_on_hand_latest: fundraiser.cashOnHandLatest,
    cash_on_hand_as_of: fundraiser.cashOnHandAsOf,
    individual_contribution_pct: fundraiser.individualContributionPct,
    pac_contribution_pct: fundraiser.pacContributionPct,
    totals_updated_at: fundraiser.totalsUpdatedAt,
    fec_source_url: fundraiser.sourceUrl,
    candidate_page_url: `${baseUrl}/candidates/${fundraiser.candidateId}`,
    race_page_url: fundraiser.raceId ? `${baseUrl}/races/${fundraiser.raceId}` : null,
    methodology_url: `${baseUrl}/methodology`,
    scope_note: SCOPE_NOTE,
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

const FUNDRAISER_COLUMNS: Array<keyof FundraiserExportRow> = [
  "candidate_id",
  "fec_candidate_id",
  "candidate_name",
  "party",
  "office",
  "state",
  "district",
  "incumbent_challenge_status",
  "race_id",
  "race_name",
  "total_receipts_cycle",
  "total_disbursements_cycle",
  "cash_on_hand_latest",
  "cash_on_hand_as_of",
  "individual_contribution_pct",
  "pac_contribution_pct",
  "totals_updated_at",
  "fec_source_url",
  "candidate_page_url",
  "race_page_url",
  "methodology_url",
  "scope_note",
  "exported_at",
  "filters",
  "latest_run_id",
  "latest_run_scope",
  "latest_run_mode",
  "latest_run_state",
  "latest_run_status",
  "latest_run_finished_at",
];

export function fundraiserRowsToCsv(rows: FundraiserExportRow[]) {
  const lines = [FUNDRAISER_COLUMNS.join(",")];
  for (const row of rows) {
    lines.push(
      FUNDRAISER_COLUMNS.map((col) => {
        const value = row[col];
        if (value === null || value === undefined) return "";
        if (typeof value === "number") return csvCell(value);
        return csvCell(String(value));
      }).join(","),
    );
  }
  return lines.join("\n");
}
