import assert from "node:assert/strict";
import { generateSignals } from "@/src/lib/signals/generate";
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

const filingSignal = signals.find((signal) => signal.dedupeKey === "fec:new_filing:filing-current");
assert.ok(filingSignal, "current-cycle filing should generate a signal");
assert.equal(filingSignal.metadata?.reportType, "Q1");
assert.equal(filingSignal.metadata?.totalReceipts, 61000);
assert.equal(filingSignal.metadata?.cashOnHand, 25000);

const committeeSignal = signals.find((signal) => signal.dedupeKey === "fec:new_committee:C00999999");
assert.ok(committeeSignal, "current-cycle committee should generate a signal");
assert.equal(committeeSignal.metadata?.sourceId, "C00999999");
assert.equal(committeeSignal.metadata?.sourceKind, "committee");
assert.equal(committeeSignal.metadata?.committeeType, "H");
assert.equal(committeeSignal.metadata?.designation, "P");

console.log("Signal logic tests passed.");
