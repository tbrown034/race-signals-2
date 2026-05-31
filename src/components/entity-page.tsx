import { SignalCard } from "@/src/components/signal-card";
import { formatCount, formatDate, formatMoney } from "@/src/lib/format";
import Link from "next/link";
import type { ReactNode } from "react";
import type { CommitteeIndependentExpenditure, RaceRating, Signal } from "@/src/lib/types";

export function EntityPage({
  asideMedia,
  children,
  eyebrow,
  title,
  titleAccessory,
  mobileLead,
  meta,
  sourceUrl,
  ratings = [],
  independentExpenditures = [],
  signals,
  allSignalsHref,
  primaryMetaCount = 8,
}: {
  asideMedia?: ReactNode;
  children?: ReactNode;
  eyebrow: string;
  title: string;
  titleAccessory?: ReactNode;
  mobileLead?: ReactNode;
  meta: Array<[string, ReactNode | null | undefined]>;
  sourceUrl?: string | null;
  ratings?: RaceRating[];
  independentExpenditures?: CommitteeIndependentExpenditure[];
  signals: Signal[];
  allSignalsHref?: string;
  primaryMetaCount?: number;
}) {
  const prioritySignals = [...signals].sort((a, b) => {
    if (a.status === "review" && b.status !== "review") return -1;
    if (b.status === "review" && a.status !== "review") return 1;
    return b.signalDate.localeCompare(a.signalDate);
  });
  const visibleSignals = prioritySignals.slice(0, 25);
  const hiddenSignals = Math.max(signals.length - visibleSignals.length, 0);
  const mobileVisibleSignals = 10;
  const mobileHiddenSignals = Math.max(signals.length - mobileVisibleSignals, 0);
  const primaryMeta = meta.slice(0, primaryMetaCount);
  const secondaryMeta = meta.slice(primaryMetaCount);

  return (
    <main className="mx-auto grid w-full max-w-full grid-cols-1 gap-6 overflow-hidden px-5 py-6 sm:px-8 lg:max-w-7xl lg:grid-cols-[320px_1fr]">
      <aside className="h-fit w-full min-w-0 max-w-[calc(100vw-2.5rem)] border border-neutral-300 bg-white p-5 sm:max-w-full">
        {asideMedia ? <div className="mb-4">{asideMedia}</div> : null}
        <p className="font-mono text-xs uppercase tracking-[0.18em] text-neutral-500">
          {eyebrow}
        </p>
        <h1 className="mt-2 flex min-w-0 flex-wrap items-center gap-2 text-2xl font-semibold tracking-tight">
          <span className="min-w-0 max-w-full flex-1 basis-full whitespace-normal break-words [overflow-wrap:anywhere] sm:basis-auto">
            {title}
          </span>
          {titleAccessory}
        </h1>
        {mobileLead ? <div className="mt-4 md:hidden">{mobileLead}</div> : null}
        <dl className="mt-5 space-y-4 text-sm">
          <MetaRows rows={primaryMeta} />
        </dl>
        {secondaryMeta.length ? (
          <>
            <details className="mt-4 border-t border-neutral-300 pt-4 text-sm md:hidden">
              <summary className="cursor-pointer font-mono text-xs uppercase tracking-[0.12em] text-neutral-600">
                Source details
              </summary>
              <dl className="mt-4 space-y-4">
                <MetaRows rows={secondaryMeta} />
              </dl>
            </details>
            <dl className="mt-4 hidden space-y-4 text-sm md:block">
              <MetaRows rows={secondaryMeta} />
            </dl>
          </>
        ) : null}
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
      <section className="w-full min-w-0 max-w-[calc(100vw-2.5rem)] border border-neutral-300 bg-white sm:max-w-full">
        {children}
        {independentExpenditures.length ? (
          <div className="border-b border-neutral-300" id="schedule-e-records">
            <div className="border-b border-neutral-300 px-5 py-4">
              <h2 className="text-sm font-semibold uppercase tracking-[0.14em] text-neutral-600">
                Recent independent expenditures
              </h2>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full min-w-0 text-left text-sm md:min-w-[760px]">
                <thead className="bg-neutral-100 text-xs uppercase tracking-[0.12em] text-neutral-500">
                  <tr>
                    <th className="hidden px-4 py-3 font-medium md:table-cell" scope="col">Date</th>
                    <th className="px-4 py-3 font-medium" scope="col">Target</th>
                    <th className="hidden px-4 py-3 font-medium md:table-cell" scope="col">Position</th>
                    <th className="hidden px-4 py-3 font-medium md:table-cell" scope="col">Race</th>
                    <th className="hidden px-4 py-3 font-medium md:table-cell" scope="col">Purpose</th>
                    <th className="hidden px-4 py-3 font-medium md:table-cell" scope="col">Source</th>
                    <th className="hidden px-4 py-3 text-right font-medium md:table-cell" scope="col">Amount</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-200">
                  {independentExpenditures.map((expenditure) => (
                    <tr key={expenditure.sourceId}>
                      <td className="hidden px-4 py-3 md:table-cell">{formatDate(expenditure.expenditureDate)}</td>
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
                        <dl className="mt-2 space-y-1 text-xs leading-5 text-neutral-600 md:hidden">
                          <div>
                            <dt className="inline font-mono uppercase tracking-[0.12em] text-neutral-500">Date </dt>
                            <dd className="inline font-mono text-neutral-950">{formatDate(expenditure.expenditureDate)}</dd>
                          </div>
                          <div>
                            <dt className="inline font-mono uppercase tracking-[0.12em] text-neutral-500">Amount </dt>
                            <dd className="inline font-mono font-semibold text-neutral-950">{formatMoney(expenditure.amount)}</dd>
                          </div>
                          <div>
                            <dt className="inline font-mono uppercase tracking-[0.12em] text-neutral-500">Position </dt>
                            <dd className="inline">{supportLabel(expenditure.supportOpposeIndicator)}</dd>
                          </div>
                          <div>
                            <dt className="inline font-mono uppercase tracking-[0.12em] text-neutral-500">Race </dt>
                            <dd className="inline">
                              {expenditure.raceId ? (
                                <Link className="font-medium underline underline-offset-4" href={`/races/${expenditure.raceId}`}>
                                  {expenditure.raceName ?? expenditure.raceId}
                                </Link>
                              ) : (
                                "Unmatched"
                              )}
                            </dd>
                          </div>
                          <div>
                            <dt className="inline font-mono uppercase tracking-[0.12em] text-neutral-500">Purpose </dt>
                            <dd className="inline">{expenditure.purpose ?? "Not specified"}</dd>
                          </div>
                          <div>
                            <dt className="inline font-mono uppercase tracking-[0.12em] text-neutral-500">Source </dt>
                            <dd className="inline">
                              {expenditure.sourceUrl ? (
                                <a className="font-medium underline underline-offset-4" href={expenditure.sourceUrl} rel="noreferrer" target="_blank">
                                  FEC Schedule E
                                </a>
                              ) : (
                                "Source not stored"
                              )}
                            </dd>
                          </div>
                        </dl>
                      </td>
                      <td className="hidden px-4 py-3 md:table-cell">{supportLabel(expenditure.supportOpposeIndicator)}</td>
                      <td className="hidden px-4 py-3 md:table-cell">
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
                      <td className="hidden px-4 py-3 text-neutral-700 md:table-cell">{expenditure.purpose ?? "Not specified"}</td>
                      <td className="hidden px-4 py-3 md:table-cell">
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
                      <td className="hidden px-4 py-3 text-right font-mono md:table-cell">
                        {formatMoney(expenditure.amount)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ) : null}
        <div className="border-b border-neutral-300 px-5 py-4" id="related-signals">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <h2 className="text-sm font-semibold uppercase tracking-[0.14em] text-neutral-600">
              Related signals
            </h2>
            {allSignalsHref ? (
              <Link className="text-sm font-medium underline underline-offset-4" href={allSignalsHref}>
                Open matching feed
              </Link>
            ) : null}
          </div>
        </div>
        {visibleSignals.length ? (
          <>
            {hiddenSignals ? (
              <p className="border-b border-neutral-300 px-5 py-3 text-sm text-neutral-600">
                Showing the latest and review-worthy {visibleSignals.length} from{" "}
                {formatCount(signals.length, "loaded related signal")}. Open the feed view for broader filtering.
              </p>
            ) : null}
            {mobileHiddenSignals && allSignalsHref ? (
              <p className="border-b border-neutral-300 px-5 py-3 text-sm text-neutral-600 md:hidden">
                Showing 10 related signals on mobile.{" "}
                <Link className="font-medium underline underline-offset-4" href={allSignalsHref}>
                  Open matching feed
                </Link>{" "}
                for the full set.
              </p>
            ) : null}
            {visibleSignals.map((signal, index) => (
              <div className={index >= mobileVisibleSignals ? "hidden md:block" : undefined} key={signal.dedupeKey}>
                <SignalCard signal={signal} />
              </div>
            ))}
          </>
        ) : (
          <p className="p-5 text-sm text-neutral-600">No related signals in the current slice.</p>
        )}
      </section>
    </main>
  );
}

function MetaRows({ rows }: { rows: Array<[string, ReactNode | null | undefined]> }) {
  return rows.map(([label, value]) => (
    <div className="min-w-0 max-w-full" key={label}>
      <dt className="font-mono text-xs uppercase tracking-[0.12em] text-neutral-500">
        {label}
      </dt>
      <dd className="mt-1 min-w-0 max-w-full break-words [overflow-wrap:anywhere]">{value ?? "Not available"}</dd>
    </div>
  ));
}

function supportLabel(value?: string | null) {
  if (value === "S") return "Supports target";
  if (value === "O") return "Opposes target";
  return "Not classified by FEC";
}
