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

  return (
    <article className="border-b border-neutral-300 bg-white px-5 py-5">
      <div className="flex flex-wrap items-center gap-2 text-xs">
        <span className="border border-neutral-400 px-2 py-1 font-mono uppercase tracking-[0.12em] text-neutral-700">
          {typeLabels[signal.signalType] ?? signal.signalType}
        </span>
        <span
          className={`border px-2 py-1 font-mono uppercase tracking-[0.12em] ${confidenceStyles[signal.confidence]}`}
        >
          {signal.confidence}
        </span>
        {signal.status !== "new" ? (
          <span className="border border-neutral-400 px-2 py-1 font-mono uppercase tracking-[0.12em] text-neutral-700">
            {signal.status}
          </span>
        ) : null}
      </div>

      <h2 className="mt-3 text-xl font-semibold leading-snug tracking-tight">
        {signal.headline}
      </h2>
      <p className="mt-2 max-w-3xl text-sm leading-6 text-neutral-700">
        {signal.whyItMatters}
      </p>

      <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-2 lg:grid-cols-4">
        <div>
          <dt className="font-mono text-xs uppercase tracking-[0.12em] text-neutral-500">
            Date
          </dt>
          <dd className="mt-1">{formatDate(signal.signalDate)}</dd>
        </div>
        <div>
          <dt className="font-mono text-xs uppercase tracking-[0.12em] text-neutral-500">
            Race
          </dt>
          <dd className="mt-1">
            {signal.raceId ? (
              <Link className="underline underline-offset-4" href={`/races/${signal.raceId}`}>
                {signal.raceName ?? signal.raceId}
              </Link>
            ) : (
              "Unmatched"
            )}
          </dd>
        </div>
        <div>
          <dt className="font-mono text-xs uppercase tracking-[0.12em] text-neutral-500">
            Subject
          </dt>
          <dd className="mt-1">
            {signal.candidateId ? (
              <Link
                className="underline underline-offset-4"
                href={`/candidates/${signal.candidateId}`}
              >
                {signal.candidateName ?? signal.candidateId}
              </Link>
            ) : signal.committeeId ? (
              <Link
                className="underline underline-offset-4"
                href={`/committees/${signal.committeeId}`}
              >
                {signal.committeeName ?? signal.committeeId}
              </Link>
            ) : (
              "Not specified"
            )}
          </dd>
        </div>
        <div>
          <dt className="font-mono text-xs uppercase tracking-[0.12em] text-neutral-500">
            Amount
          </dt>
          <dd className="mt-1">{amount ?? "Not monetary"}</dd>
        </div>
      </dl>

      <div className="mt-4 flex flex-wrap gap-x-4 gap-y-2 text-xs text-neutral-600">
        {signal.sourceUrl ? (
          <a className="font-medium underline underline-offset-4" href={signal.sourceUrl}>
            FEC source
          </a>
        ) : (
          <span>Source URL missing</span>
        )}
        <span>Freshness: {formatDateTime(signal.dataFreshness)}</span>
        {signal.committeeId ? (
          <Link className="underline underline-offset-4" href={`/committees/${signal.committeeId}`}>
            Committee record
          </Link>
        ) : null}
      </div>
    </article>
  );
}
