import assert from "node:assert/strict";
import { generateSignals } from "@/src/lib/signals/generate";
import { signalFiltersFromSearchParams, signalFiltersFromUrl } from "@/src/lib/signals/filters";
import { contributionPct } from "@/src/lib/sources/fec/totals";
import type { Candidate, Committee, Filing, IndependentExpenditure, Race } from "@/src/lib/types";

const race: Race = {
  id: "2026-IN-05-H",
  cycle: 2026,
  state: "IN",
  district: "05",
  office: "H",
  name: "Indiana 05 Congressional District",
};

const candidate: Candidate = {
  id: "cand-H6IN05000",
  fecCandidateId: "H6IN05000",
  name: "TEST, CANDIDATE",
  party: "REP",
  office: "H",
  state: "IN",
  district: "05",
  electionYear: 2026,
  incumbentChallengeStatus: "C",
  raceId: race.id,
  sourceUrl: "https://www.fec.gov/data/candidate/H6IN05000/",
};

const committee: Committee = {
  id: "cmte-C00999999",
  fecCommitteeId: "C00999999",
  name: "TEST CANDIDATE FOR CONGRESS",
  designation: "P",
  committeeType: "H",
  candidateId: candidate.id,
  raceId: race.id,
  firstFileDate: "2025-02-01",
  sourceUrl: "https://www.fec.gov/data/committee/C00999999/",
};

const currentFiling: Filing = {
  sourceId: "filing-current",
  cycle: 2026,
  committeeId: committee.id,
  fecCommitteeId: committee.fecCommitteeId,
  reportType: "Q1",
  coverageStartDate: "2026-01-01",
  coverageEndDate: "2026-03-31",
  receiptDate: "2026-04-15",
  totalReceipts: 61000,
  totalReceiptsBasis: "period",
  cashOnHand: 25000,
  sourceUrl: "https://www.fec.gov/data/filing/filing-current/",
  raw: {},
};

const oldFiling: Filing = {
  ...currentFiling,
  sourceId: "filing-old",
  cycle: 2018,
  coverageStartDate: "2018-01-01",
  coverageEndDate: "2018-03-31",
  receiptDate: "2018-04-15",
  sourceUrl: "https://www.fec.gov/data/filing/filing-old/",
};

const currentIe: IndependentExpenditure = {
  sourceId: "ie-current",
  cycle: 2026,
  spenderCommitteeId: "cmte-C00888888",
  fecCommitteeId: "C00888888",
  candidateId: candidate.id,
  fecCandidateId: candidate.fecCandidateId,
  raceId: race.id,
  supportOpposeIndicator: "O",
  amount: 125000,
  expenditureDate: "2026-05-25",
  sourceUrl: "https://www.fec.gov/data/independent-expenditures/?candidate_id=H6IN05000",
  raw: {},
};

const oldIe: IndependentExpenditure = {
  ...currentIe,
  sourceId: "ie-old",
  cycle: 2022,
  amount: 250000,
  expenditureDate: "2022-10-01",
};

const signals = generateSignals({
  candidates: [candidate],
  committees: [committee],
  races: [race],
  filings: [currentFiling, oldFiling],
  independentExpenditures: [currentIe, oldIe],
  dataFreshness: "2026-05-31T12:00:00.000Z",
});

assert.equal(contributionPct(0, 100000), 0, "true zero funding mix should render as 0%, not missing data");
assert.equal(contributionPct(null, 100000), null, "missing funding numerator should stay unknown");
assert.equal(contributionPct(1000, 0), null, "zero receipts denominator cannot produce a funding percentage");

assert.equal(
  signals.some((signal) => signal.dedupeKey === "fec:new_filing:filing-old"),
  false,
  "old filings must not generate current-cycle signals",
);
assert.equal(
  signals.some((signal) => signal.dedupeKey === "fec:large_ie:ie-old"),
  false,
  "old independent expenditures must not generate current-cycle signals",
);

const currentIeSignal = signals.find((signal) => signal.dedupeKey === "fec:large_ie:ie-current");
assert.ok(currentIeSignal, "current-cycle large IE should generate a signal");
assert.equal(currentIeSignal.status, "review", "current-cycle IE over $100k should be marked review");
assert.match(
  currentIeSignal.headline,
  /Schedule E independent expenditure/,
  "IE headlines should stand alone as independent-expenditure records",
);
assert.match(
  currentIeSignal.headline,
  /Candidate Test/,
  "IE headlines should use reader-facing candidate names while raw FEC names remain on the entity record",
);

const oldButCurrentCycleIeSignals = generateSignals({
  candidates: [candidate],
  committees: [committee],
  races: [race],
  filings: [],
  independentExpenditures: [
    {
      ...currentIe,
      sourceId: "ie-current-cycle-old-event",
      expenditureDate: "2025-02-01",
    },
  ],
  dataFreshness: "2026-05-31T12:00:00.000Z",
});
assert.equal(
  oldButCurrentCycleIeSignals.find((signal) => signal.dedupeKey === "fec:large_ie:ie-current-cycle-old-event")?.status,
  "review",
  "current-cycle IE over $100k should stay reviewable even when older than the freshness window",
);

const filingSignal = signals.find((signal) => signal.dedupeKey === "fec:new_filing:filing-current");
assert.ok(filingSignal, "current-cycle filing should generate a signal");
assert.equal(filingSignal.metadata?.reportType, "Q1");
assert.equal(filingSignal.metadata?.totalReceipts, 61000);
assert.equal(filingSignal.metadata?.cashOnHand, 25000);
assert.equal(filingSignal.metadata?.filingVersionKind, "initial_or_single");

const terminationSignals = generateSignals({
  candidates: [candidate],
  committees: [committee],
  races: [race],
  filings: [
    {
      ...currentFiling,
      sourceId: "filing-termination",
      reportType: "TER",
      sourceUrl: "https://www.fec.gov/data/filing/filing-termination/",
    },
  ],
  independentExpenditures: [],
  dataFreshness: "2026-05-31T12:00:00.000Z",
});
const terminationSignal = terminationSignals.find((signal) => signal.dedupeKey === "fec:new_filing:filing-termination");
assert.ok(terminationSignal, "termination filing should generate a filing signal");
assert.match(
  terminationSignal.headline,
  /filed a termination report/,
  "termination report copy should explain the FEC TER code",
);
assert.match(
  terminationSignal.whyItMatters,
  /committee wind-down or administrative cleanup/,
  "termination report why-it-matters copy should not use generic fundraising-report framing",
);

const committeeSignal = signals.find((signal) => signal.dedupeKey === "fec:new_committee:C00999999");
assert.ok(committeeSignal, "current-cycle committee should generate a signal");
assert.equal(committeeSignal.metadata?.sourceId, "C00999999");
assert.equal(committeeSignal.metadata?.sourceKind, "committee");
assert.equal(committeeSignal.metadata?.committeeType, "H");
assert.equal(committeeSignal.metadata?.designation, "P");
assert.match(
  committeeSignal.headline,
  /FEC lists a principal campaign committee/,
  "new-committee copy should describe the FEC record, not imply ballot status",
);
assert.match(
  committeeSignal.headline,
  /Candidate Test/,
  "new-committee headlines should use reader-facing candidate names",
);
assert.doesNotMatch(
  committeeSignal.headline,
  /formed|launched|entered/i,
  "new-committee copy should avoid overstating what the FEC committee record proves",
);
assert.match(
  committeeSignal.whyItMatters,
  /verify candidacy and ballot status separately/,
  "challenger committee copy should remind reporters to verify ballot context",
);

const incumbentSignals = generateSignals({
  candidates: [{ ...candidate, incumbentChallengeStatus: "I", name: "TEST, INCUMBENT" }],
  committees: [{ ...committee, candidateId: candidate.id, fecCommitteeId: "C00777777", id: "cmte-C00777777" }],
  races: [race],
  filings: [],
  independentExpenditures: [],
  dataFreshness: "2026-05-31T12:00:00.000Z",
});
const incumbentCommitteeSignal = incumbentSignals.find((signal) => signal.signalType === "new_committee");
assert.ok(incumbentCommitteeSignal, "incumbent principal committee should still generate a source-linked signal");
assert.match(
  incumbentCommitteeSignal.whyItMatters,
  /not proof of a first-time launch/,
  "incumbent committee copy should not frame routine campaign infrastructure as a launch",
);

const openSeatSignals = generateSignals({
  candidates: [{ ...candidate, incumbentChallengeStatus: "O", name: "TEST, OPEN SEAT" }],
  committees: [{ ...committee, candidateId: candidate.id, fecCommitteeId: "C00666666", id: "cmte-C00666666" }],
  races: [race],
  filings: [],
  independentExpenditures: [],
  dataFreshness: "2026-05-31T12:00:00.000Z",
});
const openSeatCommitteeSignal = openSeatSignals.find((signal) => signal.signalType === "new_committee");
assert.ok(openSeatCommitteeSignal, "open-seat principal committee should generate a source-linked signal");
assert.match(
  openSeatCommitteeSignal.headline,
  /Open Seat Test/,
  "open-seat committee headlines should name the candidate because several candidates may be organizing",
);

const mixedBasisSignals = generateSignals({
  candidates: [candidate],
  committees: [committee],
  races: [race],
  filings: [
    currentFiling,
    {
      ...currentFiling,
      sourceId: "filing-prior-ytd",
      receiptDate: "2026-01-31",
      totalReceipts: 20000,
      totalReceiptsBasis: "ytd",
    },
  ],
  independentExpenditures: [],
  dataFreshness: "2026-05-31T12:00:00.000Z",
});
assert.equal(
  mixedBasisSignals.some((signal) => signal.signalType === "committee_activity_spike"),
  false,
  "activity spikes must not compare period receipts to YTD or total receipts",
);

const refileSignals = generateSignals({
  candidates: [candidate],
  committees: [committee],
  races: [race],
  filings: [
    currentFiling,
    {
      ...currentFiling,
      sourceId: "filing-current-amended",
      receiptDate: "2026-04-20",
      sourceUrl: "https://www.fec.gov/data/filing/filing-current-amended/",
    },
  ],
  independentExpenditures: [],
  dataFreshness: "2026-05-31T12:00:00.000Z",
});
const refileSignal = refileSignals.find((signal) => signal.dedupeKey === "fec:new_filing:filing-current-amended");
assert.ok(refileSignal, "likely refile should still generate a source-linked filing signal");
assert.equal(refileSignal.metadata?.filingVersionKind, "likely_refile");
assert.match(refileSignal.headline, /another version/, "likely refile headline should avoid fresh-activity framing");
assert.deepEqual(refileSignal.metadata?.relatedFilingVersions, [
  {
    receiptDate: currentFiling.receiptDate,
    sourceId: currentFiling.sourceId,
    sourceUrl: currentFiling.sourceUrl,
  },
]);

const spikeSignals = generateSignals({
  candidates: [candidate],
  committees: [committee],
  races: [race],
  filings: [
    currentFiling,
    {
      ...currentFiling,
      sourceId: "filing-prior-period",
      receiptDate: "2026-01-31",
      coverageStartDate: "2025-10-01",
      coverageEndDate: "2025-12-31",
      totalReceipts: 20000,
      totalReceiptsBasis: "period",
      sourceUrl: "https://www.fec.gov/data/filing/filing-prior-period/",
    },
  ],
  independentExpenditures: [],
  dataFreshness: "2026-05-31T12:00:00.000Z",
});
const spikeSignal = spikeSignals.find((signal) => signal.signalType === "committee_activity_spike");
assert.ok(spikeSignal, "comparable period filings should generate an activity-spike signal");
assert.equal(spikeSignal.metadata?.latestSourceUrl, currentFiling.sourceUrl);
assert.equal(spikeSignal.metadata?.priorSourceUrl, "https://www.fec.gov/data/filing/filing-prior-period/");
assert.equal(spikeSignal.metadata?.priorCoverageStartDate, "2025-10-01");

const zeroToMaterialSpikeSignals = generateSignals({
  candidates: [candidate],
  committees: [committee],
  races: [race],
  filings: [
    currentFiling,
    {
      ...currentFiling,
      sourceId: "filing-prior-zero-period",
      receiptDate: "2026-01-31",
      coverageStartDate: "2025-10-01",
      coverageEndDate: "2025-12-31",
      totalReceipts: 0,
      totalReceiptsBasis: "period",
      sourceUrl: "https://www.fec.gov/data/filing/filing-prior-zero-period/",
    },
  ],
  independentExpenditures: [],
  dataFreshness: "2026-05-31T12:00:00.000Z",
});
const zeroToMaterialSpikeSignal = zeroToMaterialSpikeSignals.find((signal) => signal.signalType === "committee_activity_spike");
assert.ok(zeroToMaterialSpikeSignal, "a zero-to-material period receipts jump should generate an activity-spike signal");
assert.equal(zeroToMaterialSpikeSignal.metadata?.priorTotalReceipts, 0);
assert.equal(zeroToMaterialSpikeSignal.metadata?.priorSourceUrl, "https://www.fec.gov/data/filing/filing-prior-zero-period/");

assert.equal(signalFiltersFromSearchParams({ state: "in" }).state, "IN");
assert.equal(signalFiltersFromUrl(new URL("https://example.test/?state=me")).state, "ME");

console.log("Signal logic tests passed.");
