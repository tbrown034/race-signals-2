import type {
  Candidate,
  Committee,
  IndependentExpenditure,
  IngestionRun,
  Race,
  Signal,
  Transaction,
} from "@/src/lib/types";
import { TARGET_RACES } from "@/src/lib/scope";

const freshness = new Date("2026-05-30T12:00:00.000Z").toISOString();

export const demoRaces: Race[] = TARGET_RACES;

export const demoCandidates: Candidate[] = [
  {
    id: "cand-H6IN05101",
    fecCandidateId: "H6IN05101",
    name: "Mara Ellison",
    party: "DEM",
    office: "H",
    state: "IN",
    district: "05",
    electionYear: 2026,
    incumbentChallengeStatus: "C",
    raceId: "2026-IN-05-H",
    sourceUrl: "https://www.fec.gov/data/candidate/H6IN05101/",
  },
  {
    id: "cand-H6IN05202",
    fecCandidateId: "H6IN05202",
    name: "Daniel Kline",
    party: "REP",
    office: "H",
    state: "IN",
    district: "05",
    electionYear: 2026,
    incumbentChallengeStatus: "O",
    raceId: "2026-IN-05-H",
    sourceUrl: "https://www.fec.gov/data/candidate/H6IN05202/",
  },
  {
    id: "cand-H6IN09109",
    fecCandidateId: "H6IN09109",
    name: "Priya Natarajan",
    party: "DEM",
    office: "H",
    state: "IN",
    district: "09",
    electionYear: 2026,
    incumbentChallengeStatus: "C",
    raceId: "2026-IN-09-H",
    sourceUrl: "https://www.fec.gov/data/candidate/H6IN09109/",
  },
];

export const demoCommittees: Committee[] = [
  {
    id: "cmte-C00890501",
    fecCommitteeId: "C00890501",
    name: "Ellison for Indiana",
    committeeType: "H",
    designation: "P",
    party: "DEM",
    candidateId: "cand-H6IN05101",
    raceId: "2026-IN-05-H",
    sourceUrl: "https://www.fec.gov/data/committee/C00890501/",
  },
  {
    id: "cmte-C00890544",
    fecCommitteeId: "C00890544",
    name: "Kline for Congress",
    committeeType: "H",
    designation: "P",
    party: "REP",
    candidateId: "cand-H6IN05202",
    raceId: "2026-IN-05-H",
    sourceUrl: "https://www.fec.gov/data/committee/C00890544/",
  },
  {
    id: "cmte-C00900118",
    fecCommitteeId: "C00900118",
    name: "Hoosier Future Action",
    committeeType: "O",
    designation: "U",
    sourceUrl: "https://www.fec.gov/data/committee/C00900118/",
  },
];

export const demoTransactions: Transaction[] = [
  {
    sourceId: "demo-tx-001",
    committeeId: "cmte-C00890501",
    fecCommitteeId: "C00890501",
    contributorName: "Midwest Civic Fund",
    amount: 25000,
    transactionDate: "2026-05-24",
    transactionType: "15",
    sourceUrl:
      "https://www.fec.gov/data/receipts/individual-contributions/?committee_id=C00890501",
    raw: {},
  },
  {
    sourceId: "demo-tx-002",
    committeeId: "cmte-C00890544",
    fecCommitteeId: "C00890544",
    contributorName: "Northside Builders PAC",
    amount: 12000,
    transactionDate: "2026-05-22",
    transactionType: "15",
    sourceUrl:
      "https://www.fec.gov/data/receipts/individual-contributions/?committee_id=C00890544",
    raw: {},
  },
];

export const demoIndependentExpenditures: IndependentExpenditure[] = [
  {
    sourceId: "demo-ie-001",
    spenderCommitteeId: "cmte-C00900118",
    fecCommitteeId: "C00900118",
    candidateId: "cand-H6IN05202",
    fecCandidateId: "H6IN05202",
    raceId: "2026-IN-05-H",
    supportOpposeIndicator: "O",
    amount: 85000,
    expenditureDate: "2026-05-27",
    purpose: "Digital media",
    sourceUrl:
      "https://www.fec.gov/data/independent-expenditures/?candidate_id=H6IN05202",
    raw: {},
  },
];

export const demoSignals: Signal[] = [
  {
    id: "demo-signal-001",
    dedupeKey: "demo:committee:C00890501",
    signalType: "new_committee",
    headline: "New candidate committee formed in IN-05.",
    whyItMatters:
      "A new principal campaign committee is often the first durable paperwork signal that a candidate is moving from exploration to execution.",
    candidateId: "cand-H6IN05101",
    candidateName: "Mara Ellison",
    committeeId: "cmte-C00890501",
    committeeName: "Ellison for Indiana",
    raceId: "2026-IN-05-H",
    raceName: "Indiana 5th Congressional District",
    signalDate: "2026-05-28",
    sourceUrl: "https://www.fec.gov/data/committee/C00890501/",
    confidence: "high",
    status: "demo",
    dataFreshness: freshness,
  },
  {
    id: "demo-signal-002",
    dedupeKey: "demo:ie:demo-ie-001",
    signalType: "large_independent_expenditure",
    headline: "Outside group reported $85,000 opposing Daniel Kline in IN-05.",
    whyItMatters:
      "Independent expenditures can show where outside groups believe a race is worth influencing before that attention is visible in polling or public messaging.",
    candidateId: "cand-H6IN05202",
    candidateName: "Daniel Kline",
    committeeId: "cmte-C00900118",
    committeeName: "Hoosier Future Action",
    raceId: "2026-IN-05-H",
    raceName: "Indiana 5th Congressional District",
    amount: 85000,
    signalDate: "2026-05-27",
    sourceUrl:
      "https://www.fec.gov/data/independent-expenditures/?candidate_id=H6IN05202",
    confidence: "high",
    status: "demo",
    dataFreshness: freshness,
  },
  {
    id: "demo-signal-003",
    dedupeKey: "demo:tx:demo-tx-001",
    signalType: "large_contribution",
    headline: "Ellison for Indiana received a $25,000 contribution.",
    whyItMatters:
      "Large receipts can reveal which campaigns are attracting early institutional support and deserve a closer look at donor networks.",
    candidateId: "cand-H6IN05101",
    candidateName: "Mara Ellison",
    committeeId: "cmte-C00890501",
    committeeName: "Ellison for Indiana",
    raceId: "2026-IN-05-H",
    raceName: "Indiana 5th Congressional District",
    amount: 25000,
    signalDate: "2026-05-24",
    sourceUrl:
      "https://www.fec.gov/data/receipts/individual-contributions/?committee_id=C00890501",
    confidence: "medium",
    status: "demo",
    dataFreshness: freshness,
  },
];

export const demoIngestionRuns: IngestionRun[] = [
  {
    id: "demo-run",
    source: "fec",
    scope: "2026 U.S. congressional demo",
    status: "demo",
    startedAt: freshness,
    finishedAt: freshness,
    recordsSeen: 9,
    recordsInserted: 9,
    recordsUpdated: 0,
    errors: [],
    metadata: { mode: "demo" },
  },
];
