import { SignalCard } from "@/src/components/signal-card";
import { formatDate, formatMoney } from "@/src/lib/format";
import Link from "next/link";
import type { ReactNode } from "react";
import type { CommitteeIndependentExpenditure, RaceRating, Signal } from "@/src/lib/types";

export function EntityPage({
  asideMedia,
  children,
  eyebrow,
  title,
  titleAccessory,
  meta,
  sourceUrl,
  ratings = [],
  independentExpenditures = [],
  signals,
  allSignalsHref,
}: {
  asideMedia?: ReactNode;
  children?: ReactNode;
  eyebrow: string;
  title: string;
  titleAccessory?: ReactNode;
  meta: Array<[string, ReactNode | null | undefined]>;
  sourceUrl?: string | null;
  ratings?: RaceRating[];
  independentExpenditures?: CommitteeIndependentExpenditure[];
  signals: Signal[];
  allSignalsHref?: string;
}) {
  const prioritySignals = [...signals].sort((a, b) => {
    if (a.status === "review" && b.status !== "review") return -1;
    if (b.status === "review" && a.status !== "review") return 1;
    return b.signalDate.localeCompare(a.signalDate);
  });
  const visibleSignals = prioritySignals.slice(0, 25);
  const hiddenSignals = Math.max(signals.length - visibleSignals.length, 0);

  return (
    <main className="mx-auto grid max-w-7xl gap-6 px-5 py-6 sm:px-8 lg:grid-cols-[320px_1fr]">
      <aside className="h-fit min-w-0 border border-neutral-300 bg-white p-5">
        {asideMedia ? <div className="mb-4">{asideMedia}</div> : null}
        <p className="font-mono text-xs uppercase tracking-[0.18em] text-neutral-500">
          {eyebrow}
        </p>
        <h1 className="mt-2 flex flex-wrap items-center gap-2 text-2xl font-semibold tracking-tight">
          <span>{title}</span>
          {titleAccessory}
        </h1>
        <dl className="mt-5 space-y-4 text-sm">
          {meta.map(([label, value]) => (
            <div key={label}>
              <dt className="font-mono text-xs uppercase tracking-[0.12em] text-neutral-500">
                {label}
              </dt>
              <dd className="mt-1">{value ?? "Not available"}</dd>
            </div>
          ))}
        </dl>
        {sourceUrl ? (
          <a
            className="mt-5 inline-block text-sm font-medium underline underline-offset-4"
            href={sourceUrl}
            rel="noreferrer"
            target="_blank"
          >
            FEC source
          </a>
        ) : null}
        {ratings.length ? (
          <div className="mt-6 border-t border-neutral-300 pt-5">
            <h2 className="font-mono text-xs uppercase tracking-[0.12em] text-neutral-500">
              Race ratings
            </h2>
            <div className="mt-3 space-y-3">
              {ratings.map((rating) => (
                <div className="text-sm" key={`${rating.raceId}-${rating.sourceName}`}>
                  <p className="font-semibold">{rating.rating}</p>
                  <p className="mt-1 text-neutral-700">{rating.rationale}</p>
                  {rating.sourceUrl ? (
                    <a
                      className="mt-2 inline-block text-xs font-medium underline underline-offset-4"
                      href={rating.sourceUrl}
                    >
                      {rating.sourceName}
                    </a>
                  ) : (
                    <p className="mt-2 text-xs text-neutral-600">{rating.sourceName}</p>
                  )}
                </div>
              ))}
            </div>
          </div>
        ) : null}
      </aside>
      <section className="min-w-0 border border-neutral-300 bg-white">
        {children}
        {independentExpenditures.length ? (
          <div className="border-b border-neutral-300">
            <div className="border-b border-neutral-300 px-5 py-4">
              <h2 className="text-sm font-semibold uppercase tracking-[0.14em] text-neutral-600">
                Recent independent expenditures
              </h2>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[760px] text-left text-sm">
                <thead className="bg-neutral-100 text-xs uppercase tracking-[0.12em] text-neutral-500">
                  <tr>
                    <th className="px-4 py-3 font-medium" scope="col">Date</th>
                    <th className="px-4 py-3 font-medium" scope="col">Target</th>
                    <th className="px-4 py-3 font-medium" scope="col">Position</th>
                    <th className="px-4 py-3 font-medium" scope="col">Race</th>
                    <th className="px-4 py-3 font-medium" scope="col">Purpose</th>
                    <th className="px-4 py-3 font-medium" scope="col">Source</th>
                    <th className="px-4 py-3 text-right font-medium" scope="col">Amount</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-200">
                  {independentExpenditures.map((expenditure) => (
                    <tr key={expenditure.sourceId}>
                      <td className="px-4 py-3">{formatDate(expenditure.expenditureDate)}</td>
                      <td className="px-4 py-3">
                        {expenditure.candidateId ? (
                          <Link
                            className="font-medium underline underline-offset-4"
                            href={`/candidates/${expenditure.candidateId}`}
                          >
                            {expenditure.candidateName ?? expenditure.fecCandidateId ?? "Candidate not resolved"}
                          </Link>
                        ) : (
                          expenditure.candidateName ?? expenditure.fecCandidateId ?? "Candidate not resolved"
                        )}
                      </td>
                      <td className="px-4 py-3">{supportLabel(expenditure.supportOpposeIndicator)}</td>
                      <td className="px-4 py-3">
                        {expenditure.raceId ? (
                          <Link
                            className="font-medium underline underline-offset-4"
                            href={`/races/${expenditure.raceId}`}
                          >
                            {expenditure.raceName ?? expenditure.raceId}
                          </Link>
                        ) : (
                          "Unmatched"
                        )}
                      </td>
                      <td className="px-4 py-3 text-neutral-700">{expenditure.purpose ?? "Not specified"}</td>
                      <td className="px-4 py-3">
                        <div className="flex flex-col gap-1">
                          {expenditure.sourceUrl ? (
                            <a
                              className="font-medium underline underline-offset-4"
                              href={expenditure.sourceUrl}
                              rel="noreferrer"
                              target="_blank"
                            >
                              FEC Schedule E
                            </a>
                          ) : (
                            <span className="text-neutral-600">Source not stored</span>
                          )}
                          <span className="font-mono text-[11px] uppercase tracking-[0.12em] text-neutral-500">
                            {expenditure.sourceId}
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-right font-mono">
                        {formatMoney(expenditure.amount)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ) : null}
        <div className="border-b border-neutral-300 px-5 py-4">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <h2 className="text-sm font-semibold uppercase tracking-[0.14em] text-neutral-600">
              Related signals
            </h2>
            {hiddenSignals && allSignalsHref ? (
              <Link className="text-sm font-medium underline underline-offset-4" href={allSignalsHref}>
                Open all {signals.length} in feed
              </Link>
            ) : null}
          </div>
        </div>
        {visibleSignals.length ? (
          <>
            {hiddenSignals ? (
              <p className="border-b border-neutral-300 px-5 py-3 text-sm text-neutral-600">
                Showing the latest and review-worthy {visibleSignals.length} of {signals.length} related signals.
              </p>
            ) : null}
            {visibleSignals.map((signal) => <SignalCard signal={signal} key={signal.dedupeKey} />)}
          </>
        ) : (
          <p className="p-5 text-sm text-neutral-600">No related signals in the current slice.</p>
        )}
      </section>
    </main>
  );
}

function supportLabel(value?: string | null) {
  if (value === "S") return "Support";
  if (value === "O") return "Oppose";
  return "Mention";
}
