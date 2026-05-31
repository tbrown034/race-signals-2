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
const HISTORICAL_WINDOW_DAYS = 14;

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
    if (committee.designation !== "P" || !committee.sourceUrl) continue;
    const race = committee.raceId ? races.get(committee.raceId) : undefined;
    const candidate = committee.candidateId ? candidates.get(committee.candidateId) : undefined;
    const signalDate = committee.firstFileDate ?? input.dataFreshness.slice(0, 10);
    if (!isCurrentCycleRecord(signalDate, race)) continue;
    const committeeCopy = newCommitteeCopy(candidate, race);
    signals.push({
      dedupeKey: `fec:new_committee:${committee.fecCommitteeId}`,
      signalType: "new_committee",
      headline: committeeCopy.headline,
      whyItMatters: committeeCopy.whyItMatters,
      candidateId: candidate?.id ?? null,
      candidateName: candidate?.name ?? null,
      committeeId: committee.id,
      committeeName: committee.name,
      raceId: race?.id ?? null,
      raceName: race?.name ?? null,
      signalDate,
      sourceUrl: committee.sourceUrl,
      confidence: "high",
      status: eventStatus(status, signalDate, input.dataFreshness),
      dataFreshness: input.dataFreshness,
      metadata: {
        sourceId: committee.fecCommitteeId,
        sourceKind: "committee",
      },
    });
  }

  for (const filing of input.filings) {
    if (!filing.receiptDate || !filing.sourceUrl) continue;
    const committee = filing.committeeId ? committees.get(filing.committeeId) : undefined;
    const race = committee?.raceId ? races.get(committee.raceId) : undefined;
    if (!isCurrentCycleRecord(filing.receiptDate, race, filing.cycle)) continue;
    const candidate = committee?.candidateId ? candidates.get(committee.candidateId) : undefined;
    signals.push({
      dedupeKey: `fec:new_filing:${filing.sourceId}`,
      signalType: "new_filing",
      headline: `${committee?.name ?? "A committee"} filed ${reportLabel(filing.reportType)}.`,
      whyItMatters:
        "New reports can reveal changed cash positions, spending pace and committee activity before those shifts are visible in public campaigning.",
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
      status: eventStatus(status, filing.receiptDate, input.dataFreshness),
      dataFreshness: input.dataFreshness,
      metadata: {
        reportType: filing.reportType,
        coverageStartDate: filing.coverageStartDate,
        coverageEndDate: filing.coverageEndDate,
        totalReceipts: filing.totalReceipts,
        cashOnHand: filing.cashOnHand,
        sourceId: filing.sourceId,
        sourceKind: "filing",
      },
    });
  }

  for (const expenditure of input.independentExpenditures) {
    if (!expenditure.expenditureDate || !expenditure.sourceUrl || expenditure.amount < LARGE_IE_THRESHOLD) continue;
    const committee = expenditure.spenderCommitteeId
      ? committees.get(expenditure.spenderCommitteeId)
      : undefined;
    const race = expenditure.raceId ? races.get(expenditure.raceId) : undefined;
    if (!isCurrentCycleRecord(expenditure.expenditureDate, race, expenditure.cycle)) continue;
    const candidate = expenditure.candidateId ? candidates.get(expenditure.candidateId) : undefined;
    const computedStatus = eventStatus(status, expenditure.expenditureDate, input.dataFreshness);
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
      status: expenditure.amount >= 100000 && computedStatus !== "historical" ? "review" : computedStatus,
      dataFreshness: input.dataFreshness,
      metadata: {
        supportOpposeIndicator: expenditure.supportOpposeIndicator,
        purpose: expenditure.purpose,
        sourceId: expenditure.sourceId,
        sourceKind: "schedule_e",
      },
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
    const committee = committees.get(committeeId);
    const race = committee?.raceId ? races.get(committee.raceId) : undefined;
    if (
      !latest?.totalReceipts ||
      !latest.receiptDate ||
      !prior?.totalReceipts ||
      !isCurrentCycleRecord(latest.receiptDate, race, latest.cycle) ||
      latest.totalReceipts < ACTIVITY_SPIKE_THRESHOLD ||
      latest.totalReceipts < prior.totalReceipts * 2
    ) {
      continue;
    }
    const candidate = committee?.candidateId ? candidates.get(committee.candidateId) : undefined;
    signals.push({
      dedupeKey: `fec:activity_spike:${latest.sourceId}`,
      signalType: "committee_activity_spike",
      headline: `${committee?.name ?? "A committee"} reported a filing-level receipts spike in ${displayRace(race)}.`,
      whyItMatters:
      "A sharp increase compared with the prior stored filing can signal fundraising momentum worth source-level review.",
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
      status: eventStatus(status, latest.receiptDate, input.dataFreshness),
      dataFreshness: input.dataFreshness,
      metadata: {
        latestTotalReceipts: latest.totalReceipts,
        priorTotalReceipts: prior.totalReceipts,
        reportType: latest.reportType,
        coverageStartDate: latest.coverageStartDate,
        coverageEndDate: latest.coverageEndDate,
        latestSourceId: latest.sourceId,
        priorSourceId: prior.sourceId,
        sourceId: latest.sourceId,
        sourceKind: "filing",
      },
    });
  }

  return signals.sort((a, b) => b.signalDate.localeCompare(a.signalDate));
}

function reportLabel(reportType?: string | null) {
  const labels: Record<string, string> = {
    Q1: "an April quarterly report",
    Q1S: "an April quarterly report",
    Q2: "a July quarterly report",
    Q2S: "a July quarterly report",
    Q3: "an October quarterly report",
    Q3S: "an October quarterly report",
    YE: "a year-end report",
    YES: "a year-end report",
    "12P": "a pre-primary report",
    "12G": "a pre-general report",
    "30G": "a post-general report",
  };
  if (!reportType) return "a new report";
  return labels[reportType] ?? `${reportType} report`;
}

function newCommitteeCopy(candidate?: Candidate, race?: Race) {
  const raceLabel = displayRace(race);
  const candidateName = candidate?.name ?? "A candidate";
  if (isIncumbent(candidate?.incumbentChallengeStatus)) {
    return {
      headline: `${candidateName} has a principal campaign committee on file in ${raceLabel}.`,
      whyItMatters:
        "For an incumbent, committee activity is usually campaign infrastructure or cycle paperwork, not proof of a first-time launch.",
    };
  }
  if (isOpenSeat(candidate?.incumbentChallengeStatus)) {
    return {
      headline: `Principal campaign committee filed in open-seat ${raceLabel}.`,
      whyItMatters:
        "In an open-seat race, a principal committee can be an early sign of candidate organization, but it still needs source review.",
    };
  }
  return {
    headline: `${candidateName} filed a principal campaign committee in ${raceLabel}.`,
    whyItMatters:
      "For a challenger or non-incumbent, a principal committee is often an early paperwork signal that a campaign is organizing.",
  };
}

function eventStatus(baseStatus: string, signalDate: string, dataFreshness: string) {
  if (baseStatus !== "new") return baseStatus;
  const eventTime = Date.parse(signalDate);
  const freshnessTime = Date.parse(dataFreshness);
  if (!Number.isFinite(eventTime) || !Number.isFinite(freshnessTime)) return baseStatus;
  const ageDays = (freshnessTime - eventTime) / (24 * 60 * 60 * 1000);
  return ageDays > HISTORICAL_WINDOW_DAYS ? "historical" : baseStatus;
}

function isIncumbent(status?: string | null) {
  return status === "I" || status === "Incumbent";
}

function isOpenSeat(status?: string | null) {
  return status === "O" || status === "Open seat";
}

function isCurrentCycleRecord(date: string, race?: Race, cycle?: number | null) {
  const expectedCycle = race?.cycle ?? cycle;
  if (!expectedCycle) return true;
  return date >= `${expectedCycle - 1}-01-01` && date <= `${expectedCycle}-12-31`;
}
