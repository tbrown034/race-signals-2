import assert from "node:assert/strict";
import { raceBoardRowsToCsv, type RaceBoardExportRow } from "@/src/lib/export/race-board";
import { scheduleERowsToCsv, scheduleEToExportRow, type ScheduleEExportManifest, type ScheduleEExportRow } from "@/src/lib/export/schedule-e";
import { signalToExportRow, rowsToCsv, type ExportManifest } from "@/src/lib/export/signals";
import { spenderRowsToCsv, type SpenderExportRow } from "@/src/lib/export/spenders";
import type { Signal } from "@/src/lib/types";

const manifest: ExportManifest = {
  exportedAt: "2026-05-31T12:00:00.000Z",
  filters: { state: "IN" },
  latestRun: {
    id: "run-test",
    scope: "test",
    status: "success",
    finishedAt: "2026-05-31T12:00:00.000Z",
  },
};

const scheduleEManifest: ScheduleEExportManifest = {
  exportedAt: manifest.exportedAt,
  filters: { state: "IN" },
  baseUrl: "https://race-signals.test",
  latestRun: null,
};

const signal: Signal = {
  dedupeKey: "fec:activity_spike:filing-test",
  signalType: "committee_activity_spike",
  headline: "=Committee reported a filing-level receipts spike.",
  whyItMatters: "Compare source filings before publication.",
  candidateId: "cand-H6IN05000",
  candidateName: "TEST, CANDIDATE",
  candidateParty: "REP",
  candidateState: "IN",
  candidateDistrict: "05",
  candidateIncumbentChallengeStatus: "C",
  committeeId: "cmte-C00999999",
  committeeName: "TEST CANDIDATE FOR CONGRESS",
  raceId: "2026-IN-05-H",
  raceName: "Indiana 05 Congressional District",
  state: "IN",
  office: "H",
  amount: 61000,
  signalDate: "2026-04-15",
  sourceUrl: "https://www.fec.gov/data/filing/filing-test/",
  confidence: "medium",
  status: "new",
  dataFreshness: "2026-05-31T12:00:00.000Z",
  metadata: {
    sourceId: "filing-test",
    sourceKind: "filing",
    totalReceiptsBasis: "period",
    latestTotalReceipts: 61000,
    priorTotalReceipts: 20000,
    latestReportType: "Q1",
    priorReportType: "Q4",
    latestCoverageStartDate: "2026-01-01",
    latestCoverageEndDate: "2026-03-31",
    priorCoverageStartDate: "2025-10-01",
    priorCoverageEndDate: "2025-12-31",
    latestSourceId: "filing-test",
    latestSourceUrl: "https://www.fec.gov/data/filing/filing-test/",
    priorSourceId: "filing-prior",
    priorSourceUrl: "https://www.fec.gov/data/filing/filing-prior/",
    comparisonBasis: "Period receipts comparison; different report types Q1 vs Q4; different coverage lengths 90 vs 92 days.",
  },
};

const scheduleERow: ScheduleEExportRow = {
  expenditure_date: "2026-05-20",
  amount: 125000,
  support_oppose: "O",
  target_position_label: "FEC code: opposes target",
  spender_committee_name: "+OUTSIDE GROUP",
  spender_committee_id: "cmte-C00888888",
  fec_committee_id: "C00888888",
  candidate_name: "TEST, CANDIDATE",
  candidate_id: "cand-H6IN05000",
  fec_candidate_id: "H6IN05000",
  candidate_party: "REP",
  race_name: "Indiana 05 Congressional District",
  race_id: "2026-IN-05-H",
  purpose: "Digital ads",
  source_url: "https://www.fec.gov/data/independent-expenditures/?sub_id=123",
  source_id: "123",
  evidence_url: "https://race-signals.test/records/schedule-e?state=IN&sourceId=123#schedule-e-123",
  methodology_url: "https://race-signals.test/methodology#large_independent_expenditure",
  scope_note: "Stored source-linked rows.",
  exported_at: manifest.exportedAt,
  filters: JSON.stringify(manifest.filters),
  latest_run_id: "run-test",
  latest_run_scope: "test",
  latest_run_mode: null,
  latest_run_state: "IN",
  latest_run_status: "success",
  latest_run_finished_at: manifest.exportedAt,
};

const spenderRow: SpenderExportRow = {
  committee_id: "cmte-C00888888",
  fec_committee_id: "C00888888",
  committee_name: "-OUTSIDE GROUP",
  committee_type: "O",
  designation: "U",
  total_ie: 125000,
  support_ie: 0,
  oppose_ie: 125000,
  supports_targets_ie: 0,
  opposes_targets_ie: 125000,
  record_count: 1,
  race_count: 1,
  states: "IN",
  last_expenditure_date: "2026-05-20",
  latest_schedule_e_source_id: "123",
  latest_schedule_e_source_url: "https://www.fec.gov/data/independent-expenditures/?sub_id=123",
  records_table_url: "https://race-signals.test/records/schedule-e?committee=cmte-C00888888",
  spending_signals_url: "https://race-signals.test/spending?committee=cmte-C00888888&sort=date",
  committee_evidence_url: "https://race-signals.test/committees/cmte-C00888888#schedule-e-records",
  top_race_id: "2026-IN-05-H",
  top_race_name: "Indiana 05 Congressional District",
  top_race_url: "https://race-signals.test/races/2026-IN-05-H",
  top_race_amount: 125000,
  top_race_share: 1,
  oppose_share: 1,
  support_share: 0,
  committee_source_url: "https://www.fec.gov/data/committee/C00888888/",
  methodology_url: "https://race-signals.test/methodology#large_independent_expenditure",
  scope_note: "Ranked from stored rows.",
  exported_at: manifest.exportedAt,
  filters: JSON.stringify(manifest.filters),
  latest_run_id: "run-test",
  latest_run_scope: "test",
  latest_run_mode: null,
  latest_run_state: "IN",
  latest_run_status: "success",
  latest_run_finished_at: manifest.exportedAt,
};

const raceBoardRow: RaceBoardExportRow = {
  state: "IN",
  race_id: "2026-IN-05-H",
  race_name: "@Indiana 05 Congressional District",
  race_url: "https://race-signals.test/races/2026-IN-05-H",
  outside_spending_records_url: "https://race-signals.test/records/schedule-e?race=2026-IN-05-H",
  outside_spending_signals_url: "https://race-signals.test/spending?race=2026-IN-05-H",
  office: "H",
  district: "05",
  candidate_count: 2,
  incumbent_count: 1,
  candidate_receipts_total: 100000,
  candidate_fec_ids: "H6IN05000",
  candidate_source_urls: "https://www.fec.gov/data/candidate/H6IN05000/",
  candidate_evidence_url: "https://race-signals.test/races/2026-IN-05-H#candidate-cohort",
  methodology_url: "https://race-signals.test/methodology#scope",
  scope_note: "Race-board totals are a stored slice.",
  candidate_totals_fetched_at_latest: manifest.exportedAt,
  candidate_totals_fetched_at_oldest: manifest.exportedAt,
  signal_count: 1,
  latest_signal_date: "2026-04-15",
  latest_signal_headline: "A signal.",
  latest_signal_permalink: "https://race-signals.test/#signal-test",
  independent_expenditure_total: 125000,
  exported_at: manifest.exportedAt,
  filters: JSON.stringify(manifest.filters),
  latest_run_id: "run-test",
  latest_run_scope: "test",
  latest_run_mode: null,
  latest_run_state: "IN",
  latest_run_status: "success",
  latest_run_finished_at: manifest.exportedAt,
};

assertHeader(rowsToCsv([signalToExportRow(signal, "https://race-signals.test", manifest)]), [
  "source_url",
  "source_id",
  "source_kind",
  "signal_permalink",
  "methodology_url",
  "scope_note",
  "latest_receipts",
  "prior_receipts",
  "comparison_basis",
]);
assertFormulaNeutralized(rowsToCsv([signalToExportRow(signal, "https://race-signals.test", manifest)]), "'=Committee");

assertHeader(scheduleERowsToCsv([scheduleERow]), [
  "source_url",
  "source_id",
  "evidence_url",
  "methodology_url",
  "scope_note",
]);
assertFormulaNeutralized(scheduleERowsToCsv([scheduleERow]), "'+OUTSIDE");
assert.equal(
  scheduleEToExportRow({
    sourceId: "123",
    cycle: 2026,
    spenderCommitteeId: "cmte-C00888888",
    fecCommitteeId: "C00888888",
    candidateId: "cand-H6IN05000",
    fecCandidateId: "H6IN05000",
    raceId: "2026-IN-05-H",
    supportOpposeIndicator: "O",
    amount: -125000,
    expenditureDate: "2026-05-20",
    purpose: "+Digital ads",
    sourceUrl: "https://www.fec.gov/data/independent-expenditures/?sub_id=123",
    raw: {},
    candidateName: "TEST, CANDIDATE",
    candidateParty: "REP",
    committeeName: "+OUTSIDE GROUP",
    raceName: "Indiana 05 Congressional District",
  }, scheduleEManifest).evidence_url,
  "https://race-signals.test/records/schedule-e?state=IN&sourceId=123#schedule-e-123",
);
const negativeNumberCsv = scheduleERowsToCsv([{ ...scheduleERow, amount: -125000 }]);
assert.ok(negativeNumberCsv.includes("\n2026-05-20,-125000,"), "numeric negative amounts should stay numeric");

assertHeader(spenderRowsToCsv([spenderRow]), [
  "latest_schedule_e_source_url",
  "records_table_url",
  "committee_evidence_url",
  "methodology_url",
  "scope_note",
]);
assertFormulaNeutralized(spenderRowsToCsv([spenderRow]), "'-OUTSIDE");

assertHeader(raceBoardRowsToCsv([raceBoardRow]), [
  "race_url",
  "candidate_evidence_url",
  "methodology_url",
  "scope_note",
]);
assertFormulaNeutralized(raceBoardRowsToCsv([raceBoardRow]), "'@Indiana");

function assertHeader(csv: string, required: string[]) {
  const header = csv.split("\n")[0]?.split(",") ?? [];
  const duplicates = header.filter((column, index) => header.indexOf(column) !== index);
  assert.deepEqual(duplicates, [], `duplicate CSV columns: ${duplicates.join(", ")}`);
  for (const column of required) {
    assert.ok(header.includes(column), `missing CSV column: ${column}`);
  }
}

function assertFormulaNeutralized(csv: string, expected: string) {
  assert.ok(csv.includes(expected), `CSV did not neutralize spreadsheet formula prefix: ${expected}`);
}

console.log("Export contract tests passed.");
