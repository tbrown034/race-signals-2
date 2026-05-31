import Link from "next/link";
import { FreshMark } from "@/src/components/fresh-mark";
import { IncumbentBadge } from "@/src/components/incumbent-badge";
import { PartySquare } from "@/src/components/party-square";
import { SignalCopyLink } from "@/src/components/signal-copy-link";
import { formatDate, formatDateTime, formatMoney } from "@/src/lib/format";
import type { Signal } from "@/src/lib/types";

const typeLabels: Record<string, string> = {
  new_committee: "New committee",
  new_filing: "New filing",
  large_contribution: "Large receipt",
  large_independent_expenditure: "Independent expenditure",
  outside_spending_increase: "Outside spending",
  committee_activity_spike: "Activity spike",
};

const typeStripes: Record<string, string> = {
  new_committee: "border-l-neutral-700",
  new_filing: "border-l-neutral-500",
  large_contribution: "border-l-blue-700",
  large_independent_expenditure: "border-l-red-700",
  outside_spending_increase: "border-l-red-700",
  committee_activity_spike: "border-l-amber-700",
};

export function SignalCard({ signal }: { signal: Signal }) {
  const amount = formatMoney(signal.amount);
  const contributorName = textMetadata(signal.metadata?.contributorName);
  const contributorNameNormalized = textMetadata(signal.metadata?.contributorNameNormalized);
  const contributorEmployerNormalized = textMetadata(signal.metadata?.contributorEmployerNormalized);
  const isIncumbent = isIncumbentStatus(signal.candidateIncumbentChallengeStatus);
  const candidateLabel = candidateDisplay(signal);
  const anchorId = signalAnchorId(signal);
  const evidence = signalEvidence(signal);
  const evidenceItems = evidence ? evidence.split(" | ") : [];
  const comparisonSources = filingComparisonSources(signal);
  const verifyLine = verificationLine(signal.signalType);

  return (
    <article
      className={`grid gap-3 border-b border-l-[3px] border-b-neutral-300 bg-white px-4 py-4 md:grid-cols-[112px_1fr_190px] ${typeStripes[signal.signalType] ?? "border-l-neutral-400"}`}
      id={anchorId}
    >
      <div className="font-mono text-xs text-neutral-600">
        <p className="flex items-center gap-1.5 text-neutral-950">
          <FreshMark signalDate={signal.signalDate} status={signal.status} />
          Event {formatDate(signal.signalDate)}
        </p>
        <Link
          className="mt-1 block uppercase tracking-[0.12em] underline-offset-4 hover:underline"
          href={`/methodology#${signal.signalType}`}
        >
          {typeLabels[signal.signalType] ?? signal.signalType}
        </Link>
      </div>

      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <h2 className="text-base font-semibold leading-snug tracking-tight">
            {signal.headline}
          </h2>
          {signal.status === "review" ? (
            <span
              className="border border-red-700 px-1.5 py-0.5 font-mono text-[10px] uppercase tracking-[0.12em] text-red-700"
              title={reviewReason(signal)}
            >
              Review: {reviewReason(signal)}
            </span>
          ) : null}
        </div>
        <p className="mt-1 max-w-3xl text-sm leading-5 text-neutral-700">
          {signal.whyItMatters}
        </p>
        {evidenceItems.length ? (
          <div className="mt-2 flex flex-wrap gap-1.5">
            <span className="font-mono text-[11px] uppercase tracking-[0.12em] text-neutral-500">
              Record
            </span>
            {evidenceItems.map((item) => (
              <span
                className="border border-neutral-300 px-1.5 py-0.5 text-xs leading-5 text-neutral-700"
                key={item}
              >
                {item}
              </span>
            ))}
          </div>
        ) : null}
        <p className="mt-1 text-xs leading-5 text-neutral-600">
          <span className="font-mono uppercase tracking-[0.12em] text-neutral-500">Verify:</span>{" "}
          {verifyLine}
        </p>
        {comparisonSources.length ? (
          <div className="mt-1 flex flex-wrap gap-2 text-xs">
            {comparisonSources.map((source) => (
              <a
                className="font-medium underline underline-offset-4"
                href={source.href}
                key={source.label}
                rel="noreferrer"
                target="_blank"
              >
                {source.label}
              </a>
            ))}
          </div>
        ) : null}
        <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-xs text-neutral-600">
          {signal.status !== "new" && signal.status !== "review" ? (
            <span className="font-mono uppercase tracking-[0.12em] text-neutral-500">
              Status: {signal.status}
            </span>
          ) : null}
          {contributorNameNormalized ? (
            <span title={contributorName ?? contributorNameNormalized}>
              Donor: {contributorNameNormalized}
            </span>
          ) : null}
          {contributorEmployerNormalized ? (
            <span>Employer: {contributorEmployerNormalized}</span>
          ) : null}
          {signal.candidateId ? (
            <span className="inline-flex flex-wrap items-center gap-1.5">
              <PartySquare party={signal.candidateParty} />
              <Link className="font-medium underline underline-offset-4" href={`/candidates/${signal.candidateId}`}>
                {candidateLabel}
              </Link>
              {isIncumbent ? <IncumbentBadge /> : null}
            </span>
          ) : null}
          {signal.committeeId ? (
            <Link className="underline underline-offset-4" href={`/committees/${signal.committeeId}`}>
              {signal.committeeName ?? signal.committeeId}
            </Link>
          ) : null}
          {signal.raceId ? (
            <Link className="underline underline-offset-4" href={`/races/${signal.raceId}`}>
              {signal.raceName ?? signal.raceId}
            </Link>
          ) : (
            <span>Unmatched race</span>
          )}
        </div>
      </div>

      <div className="flex flex-wrap items-start gap-2 text-xs md:flex-col md:items-end">
        <span className="font-mono text-sm font-semibold text-neutral-950">
          {amount ?? "Non-monetary"}
        </span>
        <Link
          className="border border-neutral-400 px-2 py-1 font-mono uppercase tracking-[0.12em] text-neutral-600 underline-offset-4 hover:underline"
          href="/methodology#confidence"
          title="How Race Signals assigns confidence labels"
        >
          Confidence: {signal.confidence}
        </Link>
        {signal.sourceUrl ? (
          <a
            className="font-medium underline underline-offset-4"
            href={signal.sourceUrl}
            rel="noreferrer"
            target="_blank"
          >
            {fecSourceLabel(signal)}
          </a>
        ) : (
          <span>Source not publishable</span>
        )}
        <SignalCopyLink anchorId={anchorId} />
        <span className="text-neutral-500">Ingested {formatDateTime(signal.dataFreshness)}</span>
      </div>
    </article>
  );
}

function textMetadata(value: unknown) {
  return typeof value === "string" && value ? value : null;
}

function candidateDisplay(signal: Signal) {
  const name = signal.candidateName ?? signal.candidateId ?? "Candidate not resolved";
  const context = [
    signal.candidateParty,
    [signal.candidateState, signal.candidateDistrict].filter(Boolean).join("-"),
    isIncumbentStatus(signal.candidateIncumbentChallengeStatus) ? "incumbent" : null,
  ].filter(Boolean);
  return context.length ? `${name} (${context.join(", ")})` : name;
}

function isIncumbentStatus(status?: string | null) {
  return status === "I" || status === "Incumbent";
}

function signalAnchorId(signal: Signal) {
  return `signal-${signal.dedupeKey.replace(/[^a-zA-Z0-9_-]/g, "-")}`;
}

function fecSourceLabel(signal: Signal) {
  const sourceKind = textMetadata(signal.metadata?.sourceKind);
  if (sourceKind === "committee") return "FEC committee";
  if (sourceKind === "filing") return "FEC filing";
  if (sourceKind === "schedule_e") return "FEC Schedule E";
  if (signal.signalType === "new_committee") return "FEC committee";
  if (signal.signalType === "new_filing" || signal.signalType === "committee_activity_spike") return "FEC filing";
  if (signal.signalType === "large_independent_expenditure") return "FEC Schedule E";
  return "FEC source";
}

function reviewReason(signal: Signal) {
  if (signal.amount && signal.amount >= 100000) return "large amount";
  return "needs human check";
}

function signalEvidence(signal: Signal) {
  if (signal.signalType === "large_independent_expenditure") {
    const support = textMetadata(signal.metadata?.supportOpposeIndicator);
    const purpose = textMetadata(signal.metadata?.purpose);
    const sourceId = textMetadata(signal.metadata?.sourceId);
    return [
      support ? `stance ${supportOpposeLabel(support)}` : null,
      signal.amount ? `amount ${formatMoney(signal.amount)}` : null,
      signal.committeeName ? `spender ${signal.committeeName}` : null,
      purpose ? `purpose ${purpose}` : null,
      sourceId ? `Schedule E sub_id ${sourceId}` : null,
    ]
      .filter(Boolean)
      .join(" | ");
  }

  if (signal.signalType === "new_filing") {
    const receipts = numberMetadata(signal.metadata?.totalReceipts);
    const cash = numberMetadata(signal.metadata?.cashOnHand);
    const reportType = textMetadata(signal.metadata?.reportType);
    const versionKind = textMetadata(signal.metadata?.filingVersionKind);
    const sourceId = textMetadata(signal.metadata?.sourceId);
    const coverage = [
      textMetadata(signal.metadata?.coverageStartDate),
      textMetadata(signal.metadata?.coverageEndDate),
    ].filter(Boolean);
    return [
      reportType ? `report ${reportType}` : null,
      versionKind === "likely_refile" ? "likely amendment/refile" : null,
      receipts ? `receipts ${formatMoney(receipts)}` : null,
      cash ? `cash ${formatMoney(cash)}` : null,
      coverage.length === 2 ? `period ${coverage.join(" to ")}` : null,
      sourceId ? `filing ${sourceId}` : null,
    ]
      .filter(Boolean)
      .join(" | ");
  }

  if (signal.signalType === "committee_activity_spike") {
    const latest = numberMetadata(signal.metadata?.latestTotalReceipts);
    const prior = numberMetadata(signal.metadata?.priorTotalReceipts);
    const latestReportType = textMetadata(signal.metadata?.latestReportType) ?? textMetadata(signal.metadata?.reportType);
    const priorReportType = textMetadata(signal.metadata?.priorReportType);
    const latestCoverage = [
      textMetadata(signal.metadata?.latestCoverageStartDate) ?? textMetadata(signal.metadata?.coverageStartDate),
      textMetadata(signal.metadata?.latestCoverageEndDate) ?? textMetadata(signal.metadata?.coverageEndDate),
    ].filter(Boolean);
    const priorCoverage = [
      textMetadata(signal.metadata?.priorCoverageStartDate),
      textMetadata(signal.metadata?.priorCoverageEndDate),
    ].filter(Boolean);
    return [
      latestReportType ? `latest report ${latestReportType}` : null,
      latest ? `latest ${formatMoney(latest)}` : null,
      latestCoverage.length === 2 ? `latest period ${latestCoverage.join(" to ")}` : null,
      priorReportType ? `prior report ${priorReportType}` : null,
      prior ? `prior ${formatMoney(prior)}` : null,
      priorCoverage.length === 2 ? `prior period ${priorCoverage.join(" to ")}` : null,
      textMetadata(signal.metadata?.latestSourceId) ? `latest ${textMetadata(signal.metadata?.latestSourceId)}` : null,
      textMetadata(signal.metadata?.priorSourceId) ? `prior ${textMetadata(signal.metadata?.priorSourceId)}` : null,
    ]
      .filter(Boolean)
      .join(" | ");
  }

  if (signal.signalType === "new_committee") {
    const sourceId = textMetadata(signal.metadata?.sourceId);
    const committeeType = textMetadata(signal.metadata?.committeeType);
    const designation = textMetadata(signal.metadata?.designation);
    return [
      sourceId ? `committee ${sourceId}` : null,
      committeeType ? `type ${committeeType}` : null,
      designation ? `designation ${designation}` : null,
    ]
      .filter(Boolean)
      .join(" | ");
  }

  return null;
}

function filingComparisonSources(signal: Signal) {
  if (signal.signalType !== "committee_activity_spike") return [];
  const latestSourceUrl = textMetadata(signal.metadata?.latestSourceUrl);
  const priorSourceUrl = textMetadata(signal.metadata?.priorSourceUrl);
  return [
    latestSourceUrl ? { label: "Latest filing source", href: latestSourceUrl } : null,
    priorSourceUrl ? { label: "Prior filing source", href: priorSourceUrl } : null,
  ].filter((source): source is { label: string; href: string } => Boolean(source));
}

function numberMetadata(value: unknown) {
  if (typeof value === "number") return value;
  if (typeof value === "string") {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

function supportOpposeLabel(value: string) {
  if (value === "S") return "supporting";
  if (value === "O") return "opposing";
  return value;
}

function verificationLine(signalType: string) {
  if (signalType === "large_independent_expenditure") {
    return "Open the FEC Schedule E source, confirm spender, target, support/oppose marker and race context.";
  }
  if (signalType === "new_filing") {
    return "Open the FEC filing source, check report type, coverage period, totals and amendments.";
  }
  if (signalType === "new_committee") {
    return "Open the FEC committee source, confirm candidate linkage and verify ballot status separately.";
  }
  if (signalType === "committee_activity_spike") {
    return "Open the latest and prior filings, compare report periods and confirm totals before publication.";
  }
  return "Open the source record and confirm the linked candidate, committee, race and date.";
}
