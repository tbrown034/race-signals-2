import { fecCandidateUrl } from "@/src/lib/sources/fec/client";
import type { Candidate } from "@/src/lib/types";

const FEC_BASE_URL = "https://api.open.fec.gov/v1";

type FecCandidateTotal = {
  candidate_id: string;
  cycle: number;
  receipts?: number | string | null;
  disbursements?: number | string | null;
  cash_on_hand_end_period?: number | string | null;
  coverage_end_date?: string | null;
  load_date?: string | null;
  individual_itemized_contributions?: number | string | null;
  other_political_committee_contributions?: number | string | null;
};

export async function fetchCandidateTotal(candidateId: string, cycle: number) {
  const key = process.env.FEC_API_KEY;
  if (!key) throw new Error("FEC_API_KEY is not configured.");
  const url = new URL(`${FEC_BASE_URL}/candidates/totals/`);
  url.searchParams.set("api_key", key);
  url.searchParams.set("candidate_id", candidateId);
  url.searchParams.set("cycle", String(cycle));

  const response = await fetch(url, { headers: { accept: "application/json" } });
  if (!response.ok) {
    throw new Error(`FEC totals request failed ${response.status}: ${candidateId}`);
  }

  const data = (await response.json()) as { results?: FecCandidateTotal[] };
  return data.results?.[0] ?? null;
}

export async function applyCandidateTotals(candidate: Candidate, cycle: number) {
  const total = await fetchCandidateTotal(candidate.fecCandidateId, cycle);
  if (!total) return candidate;

  const receipts = numberValue(total.receipts);
  const individual = numberValue(total.individual_itemized_contributions);
  const pac = numberValue(total.other_political_committee_contributions);

  return {
    ...candidate,
    totalReceiptsCycle: receipts,
    totalDisbursementsCycle: numberValue(total.disbursements),
    cashOnHandLatest: numberValue(total.cash_on_hand_end_period),
    cashOnHandAsOf: total.coverage_end_date ?? total.load_date?.slice(0, 10) ?? null,
    individualContributionPct: pct(individual, receipts),
    pacContributionPct: pct(pac, receipts),
    totalsUpdatedAt: total.load_date ?? new Date().toISOString(),
    sourceUrl: candidate.sourceUrl ?? fecCandidateUrl(candidate.fecCandidateId),
  };
}

function numberValue(value: number | string | null | undefined) {
  if (value === null || value === undefined) return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function pct(numerator: number | null, denominator: number | null) {
  if (!numerator || !denominator) return null;
  return Number(((numerator / denominator) * 100).toFixed(2));
}
