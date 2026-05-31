import Link from "next/link";
import { FreshMark } from "@/src/components/fresh-mark";
import { IncumbentBadge } from "@/src/components/incumbent-badge";
import { PartySquare } from "@/src/components/party-square";
import { SignalCopyLink } from "@/src/components/signal-copy-link";
import { committeeDesignationLabel, committeeTypeLabel } from "@/src/lib/fec-codes";
import { reportTypeDisplay } from "@/src/lib/fec-report-types";
import { formatDate, formatDateTime, formatMoney } from "@/src/lib/format";
import { displayCandidateName } from "@/src/lib/names";
import { signalRuleLabel } from "@/src/lib/signals/rules";
import type { Signal } from "@/src/lib/types";

const typeLabels: Record<string, string> = {
  new_committee: "Committee record",
  new_filing: "Filing record",
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
  const amount = signalAmountLabel(signal);
  const contributorName = textMetadata(signal.metadata?.contributorName);
  const contributorNameNormalized = textMetadata(signal.metadata?.contributorNameNormalized);
  const contributorEmployerNormalized = textMetadata(signal.metadata?.contributorEmployerNormalized);
  const isIncumbent = isIncumbentStatus(signal.candidateIncumbentChallengeStatus);
  const candidateLabel = candidateDisplay(signal);
  const anchorId = signalAnchorId(signal);
  const evidence = signalEvidence(signal);
  const evidenceItems = evidence ? evidence.split(" | ") : [];
  const comparisonSources = filingComparisonSources(signal);
  const relatedFilingSources = filingVersionSources(signal);
  const verifyLine = verificationLine(signal.signalType);
  const nextChecks = signalNextChecks(signal);

  return (
    <article
      className={`grid max-w-full gap-3 overflow-hidden border-b border-l-[3px] border-b-neutral-300 bg-white px-4 py-4 outline-none focus-visible:ring-2 focus-visible:ring-neutral-900 focus-visible:ring-offset-[-2px] md:grid-cols-[112px_1fr_190px] ${typeStripes[signal.signalType] ?? "border-l-neutral-400"}`}
      data-signal-card="true"
      data-source-url={signal.sourceUrl ?? undefined}
      id={anchorId}
      tabIndex={-1}
    >
      <div className="min-w-0 max-w-full font-mono text-xs text-neutral-600">
        <p className="flex items-center gap-1.5 text-neutral-950">
          <FreshMark signalDate={signal.signalDate} status={signal.status} />
          {signalDateLabel(signal)} {formatDate(signal.signalDate)}
        </p>
        <Link
          className="mt-1 block uppercase tracking-[0.12em] underline-offset-4 hover:underline"
          href={`/methodology#${signal.signalType}`}
        >
          {typeLabels[signal.signalType] ?? signal.signalType}
        </Link>
      </div>

      <div className="min-w-0 max-w-full overflow-hidden">
        <div className="flex max-w-full flex-wrap items-center gap-2 overflow-hidden">
          <h2 className="min-w-0 max-w-full break-words text-base font-semibold leading-snug tracking-tight [overflow-wrap:anywhere]">
            {displaySignalHeadline(signal.headline, signal.candidateName)}
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
        <p className="mt-1 max-w-full break-words text-sm leading-5 text-neutral-700 [overflow-wrap:anywhere] sm:max-w-3xl">
          {signal.whyItMatters}
        </p>
        <p className="mt-1 max-w-full break-words text-xs leading-5 text-neutral-600 [overflow-wrap:anywhere]">
          <span className="font-mono uppercase tracking-[0.12em] text-neutral-500">Rule:</span>{" "}
          {signalRuleLabel(signal).replace(/^Rule: /, "")}
        </p>
        <div className="mt-2 flex flex-wrap items-center gap-1.5 md:hidden">
          <span className="font-mono text-sm font-semibold text-neutral-950">{amount}</span>
          {evidenceItems.slice(0, 3).map((item) => (
            <span
              className="border border-neutral-300 px-1.5 py-0.5 text-xs leading-5 text-neutral-700"
              key={`mobile-open-${item}`}
            >
              {item}
            </span>
          ))}
        </div>
        <details className="mt-2 border border-neutral-300 px-2 py-1.5 text-xs text-neutral-700 md:hidden">
          <summary className="cursor-pointer font-mono uppercase tracking-[0.12em] text-neutral-600">
            Full record details
          </summary>
          {evidenceItems.length > 3 ? (
            <div className="mt-2 flex flex-wrap gap-1.5">
              {evidenceItems.slice(3).map((item) => (
                <span
                  className="border border-neutral-300 px-1.5 py-0.5 leading-5"
                  key={`mobile-${item}`}
                >
                  {item}
                </span>
              ))}
            </div>
          ) : null}
          <p className="mt-2 leading-5">
            <span className="font-mono uppercase tracking-[0.12em] text-neutral-500">Verify:</span>{" "}
            {verifyLine}
          </p>
          {comparisonSources.length || relatedFilingSources.length ? (
            <div className="mt-2 flex flex-wrap gap-2">
              {[...comparisonSources, ...relatedFilingSources].map((source) => (
                <a
                  className="font-medium underline underline-offset-4"
                  href={source.href}
                  key={`mobile-${source.label}-${source.href}`}
                  rel="noreferrer"
                  target="_blank"
                >
                  {source.label}
                </a>
              ))}
            </div>
          ) : null}
        </details>
        {evidenceItems.length ? (
          <div className="mt-2 hidden flex-wrap gap-1.5 md:flex">
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
        <p className="mt-1 hidden text-xs leading-5 text-neutral-600 md:block">
          <span className="font-mono uppercase tracking-[0.12em] text-neutral-500">Verify:</span>{" "}
          {verifyLine}{" "}
          {signal.sourceUrl ? (
            <a
              className="font-medium underline underline-offset-4"
              href={signal.sourceUrl}
              rel="noreferrer"
              target="_blank"
            >
              {fecSourceLabel(signal)}
            </a>
          ) : null}
        </p>
        {nextChecks.length ? (
          <div className="mt-2 flex flex-wrap items-center gap-2 text-xs">
            <span className="font-mono uppercase tracking-[0.12em] text-neutral-500">Next check</span>
            {nextChecks.map((check) => (
              <Link
                className="border border-neutral-300 px-2 py-1 font-medium underline-offset-4 hover:underline"
                href={check.href}
                key={`${check.label}-${check.href}`}
              >
                {check.label}
              </Link>
            ))}
          </div>
        ) : null}
        {comparisonSources.length ? (
          <div className="mt-1 hidden flex-wrap gap-2 text-xs md:flex">
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
        {relatedFilingSources.length ? (
          <div className="mt-1 hidden flex-wrap gap-2 text-xs md:flex">
            {relatedFilingSources.map((source) => (
              <a
                className="font-medium underline underline-offset-4"
                href={source.href}
                key={`${source.label}-${source.href}`}
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
            <span className="inline-flex min-w-0 flex-wrap items-center gap-1.5">
              <PartySquare party={signal.candidateParty} />
              <Link className="min-w-0 break-words font-medium underline underline-offset-4" href={`/candidates/${signal.candidateId}`}>
                {candidateLabel}
              </Link>
              {isIncumbent ? <IncumbentBadge /> : null}
            </span>
          ) : null}
          {signal.committeeId ? (
            <Link className="min-w-0 max-w-full break-words underline underline-offset-4 [overflow-wrap:anywhere]" href={`/committees/${signal.committeeId}`}>
              {signal.committeeName ?? signal.committeeId}
            </Link>
          ) : null}
          {signal.raceId ? (
            <Link className="min-w-0 max-w-full break-words underline underline-offset-4 [overflow-wrap:anywhere]" href={`/races/${signal.raceId}`}>
              {signal.raceName ?? signal.raceId}
            </Link>
          ) : (
            <span>Unmatched race</span>
          )}
        </div>
      </div>

      <div className="flex min-w-0 max-w-full flex-wrap items-start gap-2 text-xs md:flex-col md:items-end">
        <span className="hidden font-mono text-sm font-semibold text-neutral-950 md:inline">
          {amount}
        </span>
        <Link
          className="font-mono text-[11px] uppercase tracking-[0.12em] text-neutral-500 underline-offset-4 hover:underline"
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
        <span className="text-neutral-500">Ingested by Race Signals {formatDateTime(signal.dataFreshness)}</span>
      </div>
    </article>
  );
}

function textMetadata(value: unknown) {
  return typeof value === "string" && value ? value : null;
}

function candidateDisplay(signal: Signal) {
  const name = displayCandidateName(signal.candidateName) ?? signal.candidateId ?? "Candidate not resolved";
  const context = [
    signal.candidateParty,
    [signal.candidateState, signal.candidateDistrict].filter(Boolean).join("-"),
    isIncumbentStatus(signal.candidateIncumbentChallengeStatus) ? "incumbent" : null,
  ].filter(Boolean);
  return context.length ? `${name} (${context.join(", ")})` : name;
}

function displaySignalHeadline(headline: string, candidateName?: string | null) {
  const displayName = displayCandidateName(candidateName);
  if (!candidateName || !displayName) return headline;
  return headline.replaceAll(candidateName, displayName);
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
  if (signal.amount && signal.amount >= 100000) return "$100k+ source record";
  return "needs human check";
}

function signalDateLabel(signal: Signal) {
  if (signal.signalType === "large_independent_expenditure") return "Spent";
  if (signal.signalType === "new_filing" || signal.signalType === "committee_activity_spike") return "Filed";
  if (signal.signalType === "new_committee") return "Committee record";
  return "Event";
}

function signalEvidence(signal: Signal) {
  if (signal.signalType === "large_independent_expenditure") {
    const support = textMetadata(signal.metadata?.supportOpposeIndicator);
    const purpose = textMetadata(signal.metadata?.purpose);
    const sourceId = textMetadata(signal.metadata?.sourceId);
    return [
      support ? `target position ${supportOpposeLabel(support)}` : null,
      signal.amount !== null && signal.amount !== undefined ? `amount ${formatMoney(signal.amount)}` : null,
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
    const receiptsBasis = textMetadata(signal.metadata?.totalReceiptsBasis);
    const versionKind = textMetadata(signal.metadata?.filingVersionKind);
    const sourceId = textMetadata(signal.metadata?.sourceId);
    const coverage = [
      textMetadata(signal.metadata?.coverageStartDate),
      textMetadata(signal.metadata?.coverageEndDate),
    ].filter(Boolean);
    return [
      reportType ? `report ${reportTypeDisplay(reportType)}` : null,
      versionKind === "likely_refile" ? "likely amendment/refile" : null,
      receipts !== null ? `${receiptBasisLabel(receiptsBasis)} ${formatMoney(receipts)}` : null,
      cash !== null ? `cash ${formatMoney(cash)}` : null,
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
    const comparisonBasis = textMetadata(signal.metadata?.comparisonBasis) ?? filingComparisonBasis(signal.metadata);
    return [
      latestReportType ? `latest report ${reportTypeDisplay(latestReportType)}` : null,
      latest !== null ? `latest ${formatMoney(latest)}` : null,
      latestCoverage.length === 2 ? `latest period ${latestCoverage.join(" to ")}` : null,
      priorReportType ? `prior report ${reportTypeDisplay(priorReportType)}` : null,
      prior !== null ? `prior ${formatMoney(prior)}` : null,
      priorCoverage.length === 2 ? `prior period ${priorCoverage.join(" to ")}` : null,
      comparisonBasis ? `basis ${comparisonBasis}` : null,
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
      committeeType ? committeeTypeLabel(committeeType) : null,
      designation ? committeeDesignationLabel(designation) : null,
    ]
      .filter(Boolean)
      .join(" | ");
  }

  return null;
}

function receiptBasisLabel(value?: string | null) {
  if (value === "period") return "period receipts";
  if (value === "ytd") return "YTD receipts";
  if (value === "total") return "total receipts";
  return "receipts";
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

function filingVersionSources(signal: Signal) {
  if (signal.signalType !== "new_filing") return [];
  const relatedVersions = Array.isArray(signal.metadata?.relatedFilingVersions)
    ? signal.metadata.relatedFilingVersions
    : [];
  return relatedVersions
    .map((version) => {
      if (!version || typeof version !== "object") return null;
      const record = version as Record<string, unknown>;
      const href = textMetadata(record.sourceUrl);
      const sourceId = textMetadata(record.sourceId);
      if (!href) return null;
      return {
        href,
        label: sourceId ? `Related filing ${sourceId}` : "Related filing source",
      };
    })
    .filter((source): source is { label: string; href: string } => Boolean(source));
}

function numberMetadata(value: unknown) {
  if (typeof value === "number") return value;
  if (typeof value === "string") {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

function filingComparisonBasis(metadata?: Record<string, unknown> | null) {
  if (!metadata) return null;
  const latestReportType = textMetadata(metadata.latestReportType);
  const priorReportType = textMetadata(metadata.priorReportType);
  const reportTypePart = latestReportType && priorReportType
    ? latestReportType === priorReportType
      ? `same report type ${latestReportType}`
      : `different report types ${latestReportType} vs ${priorReportType}`
    : null;
  const latestDays = coverageDays(
    textMetadata(metadata.latestCoverageStartDate) ?? textMetadata(metadata.coverageStartDate),
    textMetadata(metadata.latestCoverageEndDate) ?? textMetadata(metadata.coverageEndDate),
  );
  const priorDays = coverageDays(
    textMetadata(metadata.priorCoverageStartDate),
    textMetadata(metadata.priorCoverageEndDate),
  );
  const coveragePart = latestDays !== null && priorDays !== null
    ? latestDays === priorDays
      ? `same ${latestDays}-day coverage length`
      : `different coverage lengths ${latestDays} vs ${priorDays} days`
    : null;
  if (!reportTypePart && !coveragePart) return null;
  return `Period receipts comparison; ${[reportTypePart, coveragePart].filter(Boolean).join("; ")}.`;
}

function coverageDays(start?: string | null, end?: string | null) {
  if (!start || !end) return null;
  const startTime = Date.parse(`${start}T00:00:00Z`);
  const endTime = Date.parse(`${end}T00:00:00Z`);
  if (!Number.isFinite(startTime) || !Number.isFinite(endTime) || endTime < startTime) return null;
  return Math.round((endTime - startTime) / 86_400_000) + 1;
}

function signalAmountLabel(signal: Signal) {
  if (signal.signalType === "new_filing" || signal.signalType === "committee_activity_spike") {
    const amount = formatMoney(signal.amount);
    if (amount) return `${receiptBasisLabel(textMetadata(signal.metadata?.totalReceiptsBasis))} ${amount}`;
    return "Receipts not reported";
  }
  const amount = formatMoney(signal.amount);
  if (amount) return amount;
  if (signal.signalType === "new_committee") return "Non-monetary";
  return "Amount not stored";
}

function supportOpposeLabel(value: string) {
  if (value === "S") return "FEC code: supports target";
  if (value === "O") return "FEC code: opposes target";
  return value;
}

function verificationLine(signalType: string) {
  if (signalType === "large_independent_expenditure") {
    return "Open the FEC Schedule E source, confirm spender, target, target-position code and race context.";
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

function signalNextChecks(signal: Signal) {
  const checks: Array<{ label: string; href: string }> = [];
  if (signal.signalType === "large_independent_expenditure") {
    checks.push({ label: "Open Schedule E evidence", href: scheduleEHref(signal) });
    if (signal.raceId) checks.push({ label: "Open race context", href: `/races/${signal.raceId}` });
    return checks;
  }
  if (signal.signalType === "new_filing" || signal.signalType === "committee_activity_spike") {
    if (signal.committeeId) checks.push({ label: "Open committee page", href: `/committees/${signal.committeeId}` });
    if (signal.candidateId) checks.push({ label: "Open candidate page", href: `/candidates/${signal.candidateId}` });
    return checks;
  }
  if (signal.signalType === "new_committee") {
    if (signal.candidateId) checks.push({ label: "Open candidate page", href: `/candidates/${signal.candidateId}` });
    if (signal.raceId) checks.push({ label: "Open race context", href: `/races/${signal.raceId}` });
    return checks;
  }
  if (signal.candidateId) checks.push({ label: "Open candidate page", href: `/candidates/${signal.candidateId}` });
  if (signal.committeeId) checks.push({ label: "Open committee page", href: `/committees/${signal.committeeId}` });
  return checks.slice(0, 2);
}

function scheduleEHref(signal: Signal) {
  const params = new URLSearchParams();
  const sourceId = textMetadata(signal.metadata?.sourceId);
  if (signal.raceId) params.set("race", signal.raceId);
  if (signal.committeeId) params.set("committee", signal.committeeId);
  if (signal.candidateId) params.set("candidate", signal.candidateId);
  if (sourceId) params.set("sourceId", sourceId);
  const query = params.toString();
  const hash = sourceId ? `#${scheduleEAnchorId(sourceId)}` : "";
  return `${query ? `/records/schedule-e?${query}` : "/records/schedule-e"}${hash}`;
}

function scheduleEAnchorId(sourceId: string) {
  return `schedule-e-${sourceId.replace(/[^a-zA-Z0-9_-]/g, "-")}`;
}
