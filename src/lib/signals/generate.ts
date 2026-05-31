import type {
  Candidate,
  Committee,
  Filing,
  IndependentExpenditure,
  Race,
  Signal,
} from "@/src/lib/types";
import { reportTypePhrase } from "@/src/lib/fec-report-types";
import { displayCandidateName } from "@/src/lib/names";

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

type FilingVersionInfo = {
  relatedVersions: Array<{
    receiptDate?: string | null;
    sourceId: string;
    sourceUrl?: string | null;
  }>;
  versionKind: string;
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

function candidateHeadlineName(candidate?: Candidate) {
  if (!candidate?.name) return "a candidate";
  return displayCandidateName(candidate.name) ?? candidate.name;
}

export function generateSignals(input: SignalInput): Signal[] {
  const candidates = candidateById(input.candidates);
  const committees = committeeById(input.committees);
  const races = raceById(input.races);
  const signals: Signal[] = [];
  const status = input.status ?? "new";

  for (const committee of input.committees) {
    if (committee.designation !== "P" || !committee.sourceUrl || !committee.firstFileDate) continue;
    const race = committee.raceId ? races.get(committee.raceId) : undefined;
    const candidate = committee.candidateId ? candidates.get(committee.candidateId) : undefined;
    if (!candidate || !race) continue;
    const signalDate = committee.firstFileDate;
    if (!isCurrentCycleRecord(signalDate, race)) continue;
    const committeeCopy = newCommitteeCopy(committee, candidate, race);
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
        committeeType: committee.committeeType,
        designation: committee.designation,
      },
    });
  }

  const filingVersionInfo = classifyFilingVersions(input.filings);
  for (const filing of input.filings) {
    if (!filing.sourceId || !filing.receiptDate || !filing.sourceUrl) continue;
    const committee = filing.committeeId ? committees.get(filing.committeeId) : undefined;
    const race = committee?.raceId ? races.get(committee.raceId) : undefined;
    if (!committee || !race) continue;
    if (!isCurrentCycleRecord(filing.receiptDate, race, filing.cycle)) continue;
    const candidate = committee?.candidateId ? candidates.get(committee.candidateId) : undefined;
    const versionInfo = filingVersionInfo.get(filing.sourceId) ?? { versionKind: "initial_or_single", relatedVersions: [] };
    const filingCopy = newFilingCopy(filing, committee, versionInfo.versionKind);
    signals.push({
      dedupeKey: `fec:new_filing:${filing.sourceId}`,
      signalType: "new_filing",
      headline: filingCopy.headline,
      whyItMatters: filingCopy.whyItMatters,
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
        totalReceiptsBasis: filing.totalReceiptsBasis,
        cashOnHand: filing.cashOnHand,
        filingVersionKind: filingCopy.versionKind,
        relatedFilingVersions: versionInfo.relatedVersions,
        sourceId: filing.sourceId,
        sourceKind: "filing",
      },
    });
  }

  for (const expenditure of input.independentExpenditures) {
    if (!expenditure.expenditureDate || !expenditure.sourceUrl || expenditure.amount < LARGE_IE_THRESHOLD) continue;
    if (expenditure.supportOpposeIndicator !== "S" && expenditure.supportOpposeIndicator !== "O") continue;
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
      headline: `${committee?.name ?? "An outside spender"} reported a $${Math.round(
        expenditure.amount,
      ).toLocaleString()} Schedule E independent expenditure ${supportVerb(expenditure.supportOpposeIndicator)} ${
        candidateHeadlineName(candidate)
      } in ${displayRace(race)}.`,
      whyItMatters:
        "Schedule E records show outside spending that is supposed to be independent of a campaign; verify the support/oppose code, purpose, amount and race before citing.",
      candidateId: candidate?.id ?? expenditure.candidateId ?? null,
      candidateName: candidate?.name ?? null,
      committeeId: committee?.id ?? expenditure.spenderCommitteeId ?? null,
      committeeName: committee?.name ?? null,
      raceId: race?.id ?? expenditure.raceId ?? null,
      raceName: race?.name ?? null,
      amount: expenditure.amount,
      signalDate: expenditure.expenditureDate,
      sourceUrl: expenditure.sourceUrl,
      confidence: "high",
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
    const latestVersionInfo = latest ? filingVersionInfo.get(latest.sourceId) : undefined;
    const priorVersionInfo = prior ? filingVersionInfo.get(prior.sourceId) : undefined;
    const committee = committees.get(committeeId);
    const race = committee?.raceId ? races.get(committee.raceId) : undefined;
    if (
      !latest?.totalReceipts ||
      !latest.receiptDate ||
      !latest.sourceUrl ||
      !prior?.totalReceipts ||
      !prior.sourceUrl ||
      sameReportPeriod(latest, prior) ||
      latestVersionInfo?.versionKind === "likely_refile" ||
      priorVersionInfo?.versionKind === "likely_refile" ||
      latest.totalReceiptsBasis !== "period" ||
      prior.totalReceiptsBasis !== "period" ||
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
        "A sharp period-receipts increase versus the prior stored filing can signal fundraising movement worth source-level review; compare coverage periods before drawing conclusions.",
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
        totalReceiptsBasis: latest.totalReceiptsBasis,
        reportType: latest.reportType,
        coverageStartDate: latest.coverageStartDate,
        coverageEndDate: latest.coverageEndDate,
        latestReportType: latest.reportType,
        latestCoverageStartDate: latest.coverageStartDate,
        latestCoverageEndDate: latest.coverageEndDate,
        priorReportType: prior.reportType,
        priorCoverageStartDate: prior.coverageStartDate,
        priorCoverageEndDate: prior.coverageEndDate,
        latestSourceId: latest.sourceId,
        latestSourceUrl: latest.sourceUrl,
        priorSourceId: prior.sourceId,
        priorSourceUrl: prior.sourceUrl,
        sourceId: latest.sourceId,
        sourceKind: "filing",
      },
    });
  }

  return signals.sort((a, b) => b.signalDate.localeCompare(a.signalDate));
}

function newFilingCopy(filing: Filing, committee?: Committee, versionKind = "initial_or_single") {
  const label = reportTypePhrase(filing.reportType);
  const committeeName = committee?.name ?? "A committee";
  const isTermination = filing.reportType === "TER";
  if (versionKind === "likely_refile") {
    return {
      headline: `${committeeName} filed another version of ${label}.`,
      whyItMatters:
        "Multiple versions of the same report can reflect amendments or refiles; compare the linked FEC filings before treating totals as new activity.",
      versionKind: "likely_refile",
    };
  }
  if (isTermination) {
    return {
      headline: `${committeeName} filed ${label}.`,
      whyItMatters:
        "A termination report can signal committee wind-down or administrative cleanup; verify debts, cash and candidate status before treating the campaign as inactive.",
      versionKind: "initial_or_single",
    };
  }
  return {
    headline: `${committeeName} filed ${label}.`,
    whyItMatters:
      "New reports can reveal changed cash positions, spending pace and committee activity before those shifts are visible in public campaigning.",
    versionKind: "initial_or_single",
  };
}

function newCommitteeCopy(committee: Committee, candidate?: Candidate, race?: Race) {
  const raceLabel = displayRace(race);
  const candidateName = candidateHeadlineName(candidate);
  const fileDate = committee.firstFileDate ? ` with first-file date ${committee.firstFileDate}` : "";
  if (isIncumbent(candidate?.incumbentChallengeStatus)) {
    return {
      headline: `FEC lists a principal campaign committee for ${candidateName} in ${raceLabel}.`,
      whyItMatters:
        "For an incumbent, committee activity is usually campaign infrastructure or cycle paperwork, not proof of a first-time launch.",
    };
  }
  if (isOpenSeat(candidate?.incumbentChallengeStatus)) {
    return {
      headline: `FEC lists a principal campaign committee${fileDate} in open-seat ${raceLabel}.`,
      whyItMatters:
        "In an open-seat race, a principal committee is a paperwork signal of campaign organization; verify candidacy and ballot status separately.",
      };
  }
  if (isChallenger(candidate?.incumbentChallengeStatus)) {
    return {
      headline: `FEC lists a principal campaign committee for ${candidateName} in ${raceLabel}.`,
      whyItMatters:
        "For a challenger, a principal committee is a paperwork signal that campaign infrastructure exists; verify candidacy and ballot status separately.",
    };
  }
  return {
    headline: `FEC lists a principal campaign committee for ${candidateName} in ${raceLabel}.`,
    whyItMatters:
      "This source-linked committee record shows campaign infrastructure, but candidate status and ballot context still need verification.",
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

function isChallenger(status?: string | null) {
  return status === "C" || status === "Challenger";
}

function classifyFilingVersions(filings: Filing[]) {
  const byVersionKey = new Map<string, Filing[]>();
  for (const filing of filings) {
    const key = filingVersionKey(filing);
    const group = byVersionKey.get(key) ?? [];
    group.push(filing);
    byVersionKey.set(key, group);
  }
  const classifications = new Map<string, FilingVersionInfo>();
  for (const group of byVersionKey.values()) {
    if (group.length === 1) {
      classifications.set(group[0].sourceId, { relatedVersions: [], versionKind: "initial_or_single" });
      continue;
    }
    const sorted = group.sort((a, b) => {
      const dateCompare = String(a.receiptDate ?? "").localeCompare(String(b.receiptDate ?? ""));
      return dateCompare || a.sourceId.localeCompare(b.sourceId);
    });
    sorted.forEach((filing, index) => {
      classifications.set(filing.sourceId, {
        relatedVersions: sorted
          .filter((other) => other.sourceId !== filing.sourceId)
          .map((other) => ({
            receiptDate: other.receiptDate,
            sourceId: other.sourceId,
            sourceUrl: other.sourceUrl,
          })),
        versionKind: index === 0 ? "initial_version" : "likely_refile",
      });
    });
  }
  return classifications;
}

function filingVersionKey(filing: Filing) {
  return [
    filing.committeeId ?? filing.fecCommitteeId ?? "",
    filing.reportType ?? "",
    filing.coverageStartDate ?? "",
    filing.coverageEndDate ?? "",
  ].join("|");
}

function sameReportPeriod(a: Filing, b: Filing) {
  return (
    (a.reportType ?? "") === (b.reportType ?? "") &&
    (a.coverageStartDate ?? "") === (b.coverageStartDate ?? "") &&
    (a.coverageEndDate ?? "") === (b.coverageEndDate ?? "")
  );
}

function isCurrentCycleRecord(date: string, race?: Race, cycle?: number | null) {
  const expectedCycle = race?.cycle ?? cycle;
  if (!expectedCycle) return true;
  return date >= `${expectedCycle - 1}-01-01` && date <= `${expectedCycle}-12-31`;
}
