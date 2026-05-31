import Link from "next/link";
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

const confidenceStyles: Record<string, string> = {
  high: "border-emerald-700 text-emerald-800",
  medium: "border-amber-700 text-amber-800",
  low: "border-red-700 text-red-800",
};

export function SignalCard({ signal }: { signal: Signal }) {
  const amount = formatMoney(signal.amount);
  const contributorName = textMetadata(signal.metadata?.contributorName);
  const contributorNameNormalized = textMetadata(signal.metadata?.contributorNameNormalized);
  const contributorEmployerNormalized = textMetadata(signal.metadata?.contributorEmployerNormalized);

  return (
    <article className="grid gap-3 border-b border-neutral-300 bg-white px-4 py-4 md:grid-cols-[112px_1fr_190px]">
      <div className="font-mono text-xs text-neutral-600">
        <p className="text-neutral-950">{formatDate(signal.signalDate)}</p>
        <p className="mt-1 uppercase tracking-[0.12em]">
          {typeLabels[signal.signalType] ?? signal.signalType}
        </p>
      </div>

      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <h2 className="text-base font-semibold leading-snug tracking-tight">
            {signal.headline}
          </h2>
          {signal.status !== "new" ? (
            <span className="border border-neutral-400 px-1.5 py-0.5 font-mono text-[10px] uppercase tracking-[0.12em] text-neutral-700">
              {signal.status}
            </span>
          ) : null}
        </div>
        <p className="mt-1 max-w-3xl text-sm leading-5 text-neutral-700">
          {signal.whyItMatters}
        </p>
        <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-xs text-neutral-600">
          {contributorNameNormalized ? (
            <span title={contributorName ?? contributorNameNormalized}>
              Donor: {contributorNameNormalized}
            </span>
          ) : null}
          {contributorEmployerNormalized ? (
            <span>Employer: {contributorEmployerNormalized}</span>
          ) : null}
          {signal.candidateId ? (
            <Link className="font-medium underline underline-offset-4" href={`/candidates/${signal.candidateId}`}>
              {signal.candidateName ?? signal.candidateId}
            </Link>
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
        <span
          className={`border px-2 py-1 font-mono uppercase tracking-[0.12em] ${confidenceStyles[signal.confidence]}`}
        >
          {signal.confidence}
        </span>
        {signal.sourceUrl ? (
          <a className="font-medium underline underline-offset-4" href={signal.sourceUrl}>
            FEC source
          </a>
        ) : (
          <span>Source URL missing</span>
        )}
        <span className="text-neutral-500">Fresh {formatDateTime(signal.dataFreshness)}</span>
      </div>
    </article>
  );
}

function textMetadata(value: unknown) {
  return typeof value === "string" && value ? value : null;
}
