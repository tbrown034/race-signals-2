import type {
  Candidate,
  Committee,
  Filing,
  IndependentExpenditure,
  Race,
  Signal,
} from "@/src/lib/types";

const LARGE_IE_THRESHOLD = 25000;
const ACTIVITY_SPIKE_THRESHOLD = 50000;

type SignalInput = {
  candidates: Candidate[];
  committees: Committee[];
  races: Race[];
  filings: Filing[];
  independentExpenditures: IndependentExpenditure[];
  dataFreshness: string;
  status?: string;
};

function candidateById(candidates: Candidate[]) {
  return new Map(candidates.map((candidate) => [candidate.id, candidate]));
}

function committeeById(committees: Committee[]) {
  return new Map(committees.map((committee) => [committee.id, committee]));
}

function raceById(races: Race[]) {
  return new Map(races.map((race) => [race.id, race]));
}

function displayRace(race?: Race) {
  if (!race) return "the race";
  if (race.office === "S") return `${race.state} Senate`;
  return `${race.state}-${race.district}`;
}

function supportVerb(value?: string | null) {
  if (value === "S") return "supporting";
  if (value === "O") return "opposing";
  return "mentioning";
}

export function generateSignals(input: SignalInput): Signal[] {
  const candidates = candidateById(input.candidates);
  const committees = committeeById(input.committees);
  const races = raceById(input.races);
  const signals: Signal[] = [];
  const status = input.status ?? "new";

  for (const committee of input.committees) {
    if (committee.designation !== "P") continue;
    const race = committee.raceId ? races.get(committee.raceId) : undefined;
    const candidate = committee.candidateId ? candidates.get(committee.candidateId) : undefined;
    signals.push({
      dedupeKey: `fec:new_committee:${committee.fecCommitteeId}`,
      signalType: "new_committee",
      headline: `New candidate committee formed in ${displayRace(race)}.`,
      whyItMatters:
        "A new principal campaign committee is often the first durable paperwork signal that a candidate is moving from exploration to execution.",
      candidateId: candidate?.id ?? null,
      candidateName: candidate?.name ?? null,
      committeeId: committee.id,
      committeeName: committee.name,
      raceId: race?.id ?? null,
      raceName: race?.name ?? null,
      signalDate: input.dataFreshness.slice(0, 10),
      sourceUrl: committee.sourceUrl,
      confidence: "high",
      status,
      dataFreshness: input.dataFreshness,
    });
  }

  for (const filing of input.filings) {
    if (!filing.receiptDate) continue;
    const committee = filing.committeeId ? committees.get(filing.committeeId) : undefined;
    const race = committee?.raceId ? races.get(committee.raceId) : undefined;
    const candidate = committee?.candidateId ? candidates.get(committee.candidateId) : undefined;
    signals.push({
      dedupeKey: `fec:new_filing:${filing.sourceId}`,
      signalType: "new_filing",
      headline: `${committee?.name ?? "A committee"} filed ${filing.reportType ?? "a new report"}.`,
      whyItMatters:
        "New reports can reveal changed cash positions, spending pace and donor patterns before those shifts are visible in public campaigning.",
      candidateId: candidate?.id ?? null,
      candidateName: candidate?.name ?? null,
      committeeId: committee?.id ?? filing.committeeId ?? null,
      committeeName: committee?.name ?? null,
      raceId: race?.id ?? null,
      raceName: race?.name ?? null,
      amount: filing.totalReceipts ?? null,
      signalDate: filing.receiptDate,
      sourceUrl: filing.sourceUrl,
      confidence: "high",
      status,
      dataFreshness: input.dataFreshness,
    });
  }

  for (const expenditure of input.independentExpenditures) {
    if (!expenditure.expenditureDate || expenditure.amount < LARGE_IE_THRESHOLD) continue;
    const committee = expenditure.spenderCommitteeId
      ? committees.get(expenditure.spenderCommitteeId)
      : undefined;
    const race = expenditure.raceId ? races.get(expenditure.raceId) : undefined;
    const candidate = expenditure.candidateId ? candidates.get(expenditure.candidateId) : undefined;
    signals.push({
      dedupeKey: `fec:large_ie:${expenditure.sourceId}`,
      signalType: "large_independent_expenditure",
      headline: `${committee?.name ?? "An outside spender"} reported $${Math.round(
        expenditure.amount,
      ).toLocaleString()} ${supportVerb(expenditure.supportOpposeIndicator)} ${
        candidate?.name ?? "a candidate"
      } in ${displayRace(race)}.`,
      whyItMatters:
        "Independent expenditures can show where outside groups believe a race is worth influencing before that attention is visible in polling or public messaging.",
      candidateId: candidate?.id ?? expenditure.candidateId ?? null,
      candidateName: candidate?.name ?? null,
      committeeId: committee?.id ?? expenditure.spenderCommitteeId ?? null,
      committeeName: committee?.name ?? null,
      raceId: race?.id ?? expenditure.raceId ?? null,
      raceName: race?.name ?? null,
      amount: expenditure.amount,
      signalDate: expenditure.expenditureDate,
      sourceUrl: expenditure.sourceUrl,
      confidence: expenditure.amount >= 100000 ? "medium" : "high",
      status: expenditure.amount >= 100000 ? "review" : status,
      dataFreshness: input.dataFreshness,
      metadata: { supportOpposeIndicator: expenditure.supportOpposeIndicator },
    });
  }

  const filingsByCommittee = new Map<string, Filing[]>();
  for (const filing of input.filings) {
    if (!filing.committeeId || !filing.receiptDate) continue;
    const committeeFilings = filingsByCommittee.get(filing.committeeId) ?? [];
    committeeFilings.push(filing);
    filingsByCommittee.set(filing.committeeId, committeeFilings);
  }

  for (const [committeeId, committeeFilings] of filingsByCommittee) {
    const sorted = committeeFilings.sort((a, b) =>
      String(b.receiptDate).localeCompare(String(a.receiptDate)),
    );
    const latest = sorted[0];
    const prior = sorted[1];
    if (
      !latest?.totalReceipts ||
      !latest.receiptDate ||
      !prior?.totalReceipts ||
      latest.totalReceipts < ACTIVITY_SPIKE_THRESHOLD ||
      latest.totalReceipts < prior.totalReceipts * 2
    ) {
      continue;
    }
    const committee = committees.get(committeeId);
    const race = committee?.raceId ? races.get(committee.raceId) : undefined;
    const candidate = committee?.candidateId ? candidates.get(committee.candidateId) : undefined;
    signals.push({
      dedupeKey: `fec:activity_spike:${latest.sourceId}`,
      signalType: "committee_activity_spike",
      headline: `${committee?.name ?? "A committee"} reported a filing-level receipts spike in ${displayRace(race)}.`,
      whyItMatters:
        "A sharp increase in report-level receipts can signal fundraising momentum worth source-level review.",
      candidateId: candidate?.id ?? null,
      candidateName: candidate?.name ?? null,
      committeeId,
      committeeName: committee?.name ?? null,
      raceId: race?.id ?? null,
      raceName: race?.name ?? null,
      amount: latest.totalReceipts,
      signalDate: latest.receiptDate,
      sourceUrl: latest.sourceUrl,
      confidence: "medium",
      status,
      dataFreshness: input.dataFreshness,
      metadata: {
        latestTotalReceipts: latest.totalReceipts,
        priorTotalReceipts: prior.totalReceipts,
        reportType: latest.reportType,
        coverageStartDate: latest.coverageStartDate,
        coverageEndDate: latest.coverageEndDate,
      },
    });
  }

  return signals.sort((a, b) => b.signalDate.localeCompare(a.signalDate));
}
