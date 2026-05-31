import Link from "next/link";
import { PageShell } from "@/src/components/page-shell";
import { getTopSpenders } from "@/src/lib/db/repository";
import { committeeDesignationLabel, committeeTypeLabel } from "@/src/lib/fec-codes";
import { formatDate, formatMoney } from "@/src/lib/format";
import type { Metadata } from "next";

export const revalidate = 21600;
export const metadata: Metadata = {
  title: "Top stored outside spenders",
  description: "Committees ranked by independent expenditure totals in the Race Signals FEC slice.",
};

export default async function SpendersPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const params = await searchParams;
  const selectedState = typeof params.state === "string" ? params.state.toUpperCase() : undefined;
  const [spenders, stateOptionSpenders] = await Promise.all([
    getTopSpenders(100, selectedState),
    getTopSpenders(100),
  ]);
  const stateOptions = [...new Set(stateOptionSpenders.flatMap((spender) => spender.states))].sort();
  const stateCounts = stateSpenderCounts(stateOptionSpenders);
  const visibleSpenders = spenders;
  const exportSuffix = selectedState ? `?state=${selectedState}` : "";

  return (
    <PageShell>
      <main className="mx-auto max-w-7xl px-5 py-6 sm:px-8">
        <section className="min-w-0 overflow-hidden border border-neutral-300 bg-white">
          <div className="border-b border-neutral-300 px-5 py-5">
            <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
              <div className="min-w-0">
                <p className="font-mono text-xs uppercase tracking-[0.18em] text-neutral-500">
                  Schedule E ranking
                </p>
                <h1 className="mt-1 text-xl font-semibold tracking-tight">
                  Top stored outside spenders
                </h1>
                <p className="mt-2 max-w-[min(280px,100%)] break-words text-sm leading-5 text-neutral-700 [overflow-wrap:anywhere] sm:max-w-3xl">
                  Ranked by stored Schedule E rows in the current Race Signals database slice; not a complete national outside-spending total.
                </p>
              </div>
              <div className="flex flex-col gap-1 md:items-end">
                <div className="flex flex-wrap gap-2 text-sm">
                  <a
                    className="border border-neutral-400 px-3 py-2 font-medium hover:border-neutral-900"
                    href={`/api/spenders/export.csv${exportSuffix}`}
                  >
                    Export CSV
                  </a>
                  <a
                    className="border border-neutral-400 px-3 py-2 font-medium hover:border-neutral-900"
                    href={`/api/spenders/export.json${exportSuffix}`}
                  >
                    Export JSON
                  </a>
                </div>
                <p className="max-w-full break-words text-xs text-neutral-600 [overflow-wrap:anywhere]">
                  Exports include matching rows, capped at 10,000.
                </p>
              </div>
            </div>
          </div>
          {stateOptions.length ? (
            <nav
              aria-label="Filter spenders by state"
              className="overflow-x-auto border-b border-neutral-300 px-5 py-3 font-mono text-[11px] uppercase tracking-[0.12em] text-neutral-600"
            >
              <div className="flex min-w-max flex-nowrap gap-x-4 whitespace-nowrap">
                <Link
                  className={stateLinkClass(!selectedState)}
                  href="/spenders"
                >
                  All states <span className="text-neutral-500">{stateOptionSpenders.length}</span>
                </Link>
                {stateOptions.map((state) => (
                  <Link
                    className={stateLinkClass(selectedState === state)}
                    href={`/spenders?state=${state}`}
                    key={state}
                  >
                    {state} <span className="text-neutral-500">{stateCounts.get(state) ?? 0}</span>
                  </Link>
                ))}
              </div>
            </nav>
          ) : null}
          <div className="overflow-x-auto">
            <table className="w-full min-w-0 text-left text-sm md:min-w-[1040px]">
              <thead className="bg-neutral-100 font-mono text-xs uppercase tracking-[0.12em] text-neutral-500">
                <tr>
                  <th className="px-4 py-3 font-medium" scope="col">Committee</th>
                  <th className="hidden px-4 py-3 font-medium md:table-cell" scope="col">Type</th>
                  <th className="hidden px-4 py-3 font-medium md:table-cell" scope="col">Where</th>
                  <th className="hidden px-4 py-3 font-medium md:table-cell" scope="col">Last IE</th>
                  <th className="hidden px-4 py-3 font-medium md:table-cell" scope="col">Position split</th>
                  <th className="hidden px-4 py-3 text-right font-medium md:table-cell" scope="col">Stored slice IE total</th>
                  <th className="hidden px-4 py-3 text-right font-medium md:table-cell" scope="col">Records</th>
                  <th className="hidden px-4 py-3 font-medium md:table-cell" scope="col">Source</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-200">
                {visibleSpenders.length ? (
                  visibleSpenders.map((spender) => {
                    const topRaceShare = share(spender.topRaceAmount ?? null, spender.totalAmount);
                    const supportShare = share(spender.supportAmount, spender.totalAmount);
                    const opposeShare = share(spender.opposeAmount, spender.totalAmount);
                    const positionNote = positionConcentrationNote(supportShare, opposeShare);
                    const raceNote = topRaceShare >= 0.75 ? `Top-race share ${formatPercent(topRaceShare)}` : null;

                    return (
                    <tr key={spender.committeeId ?? spender.fecCommitteeId ?? spender.committeeName}>
                      <td className="px-4 py-3">
                        {spender.committeeId ? (
                          <Link
                            className="font-medium underline underline-offset-4"
                            href={`/committees/${spender.committeeId}`}
                          >
                            {spender.committeeName}
                          </Link>
                        ) : (
                          <span className="font-medium">{spender.committeeName ?? spender.fecCommitteeId ?? "Spender not resolved"}</span>
                        )}
                        <p className="mt-1 font-mono text-[11px] uppercase tracking-[0.12em] text-neutral-500">
                          {spender.fecCommitteeId ?? "No FEC committee ID"}
                        </p>
                        <p className="mt-1 font-mono text-sm font-semibold text-neutral-950 md:hidden">
                          {formatMoney(spender.totalAmount)} stored slice IE
                        </p>
                        <dl className="mt-2 max-w-full space-y-1 text-xs leading-5 text-neutral-600 [overflow-wrap:anywhere] md:hidden">
                          <div>
                            <dt className="inline font-mono uppercase tracking-[0.12em] text-neutral-500">Stored slice IE </dt>
                            <dd className="inline font-mono font-semibold text-neutral-950">{formatMoney(spender.totalAmount)}</dd>
                          </div>
                          <div>
                            <dt className="inline font-mono uppercase tracking-[0.12em] text-neutral-500">Type </dt>
                            <dd className="inline">
                              {committeeTypeLabel(spender.committeeType)}
                              {spender.designation ? ` / ${committeeDesignationLabel(spender.designation)}` : ""}
                            </dd>
                          </div>
                          <div>
                            <dt className="inline font-mono uppercase tracking-[0.12em] text-neutral-500">Last IE </dt>
                            <dd className="inline font-mono text-neutral-950">{formatDate(spender.lastExpenditureDate)}</dd>
                          </div>
                          <div>
                            <dt className="inline font-mono uppercase tracking-[0.12em] text-neutral-500">FEC code supports </dt>
                            <dd className="inline font-mono text-neutral-950">{formatMoney(spender.supportAmount) ?? "$0"}</dd>
                          </div>
                          <div>
                            <dt className="inline font-mono uppercase tracking-[0.12em] text-neutral-500">FEC code opposes </dt>
                            <dd className="inline font-mono text-neutral-950">{formatMoney(spender.opposeAmount) ?? "$0"}</dd>
                          </div>
                          {positionNote ? (
                            <div>
                              <dt className="inline font-mono uppercase tracking-[0.12em] text-neutral-500">Split </dt>
                              <dd className="inline">{positionNote}</dd>
                            </div>
                          ) : null}
                          <div>
                            <dt className="inline font-mono uppercase tracking-[0.12em] text-neutral-500">Records </dt>
                            <dd className="inline">
                              <Link className="font-medium underline underline-offset-4" href={spenderEvidenceHref(spender.committeeId, spender.latestScheduleESourceUrl)}>
                                {spender.recordCount} Schedule E record{spender.recordCount === 1 ? "" : "s"}
                              </Link>
                            </dd>
                          </div>
                          <div>
                            <dt className="inline font-mono uppercase tracking-[0.12em] text-neutral-500">Top race </dt>
                            <dd className="inline">
                              {spender.topRaceId ? (
                                <Link className="font-medium underline underline-offset-4" href={`/races/${spender.topRaceId}`}>
                                  {spender.topRaceName ?? spender.topRaceId}
                                </Link>
                              ) : (
                                "Unmatched race"
                              )}
                              {raceNote ? (
                                <span className="mt-1 block font-mono text-[11px] uppercase tracking-[0.12em] text-neutral-700">
                                  {raceNote}
                                </span>
                              ) : null}
                            </dd>
                          </div>
                          <div>
                            <dt className="inline font-mono uppercase tracking-[0.12em] text-neutral-500">Source </dt>
                            <dd className="inline">
                              <Link className="font-medium underline underline-offset-4" href={spenderEvidenceHref(spender.committeeId, spender.latestScheduleESourceUrl)}>
                                Open evidence records
                              </Link>
                            </dd>
                          </div>
                        </dl>
                      </td>
                      <td className="hidden px-4 py-3 text-neutral-700 md:table-cell">
                        <span>{committeeTypeLabel(spender.committeeType)}</span>
                        <span className="block text-xs text-neutral-500">
                          {committeeDesignationLabel(spender.designation)}
                        </span>
                      </td>
                      <td className="hidden px-4 py-3 text-neutral-700 md:table-cell">
                        {spender.topRaceId ? (
                          <Link className="font-medium underline underline-offset-4" href={`/races/${spender.topRaceId}`}>
                            {spender.topRaceName ?? spender.topRaceId}
                          </Link>
                        ) : (
                          "Unmatched race"
                        )}
                        <p className="mt-1 text-xs text-neutral-500">
                          {spender.states.length ? spender.states.join(", ") : "State unknown"}
                          {spender.raceCount > 1 ? ` / ${spender.raceCount} races` : ""}
                          {spender.topRaceAmount ? ` / top race ${formatMoney(spender.topRaceAmount)}` : ""}
                        </p>
                        {raceNote ? (
                          <p className="mt-1 font-mono text-[11px] uppercase tracking-[0.12em] text-neutral-700">
                            {raceNote}
                          </p>
                        ) : null}
                      </td>
                      <td className="hidden px-4 py-3 font-mono md:table-cell">
                        {formatDate(spender.lastExpenditureDate)}
                      </td>
                      <td className="hidden px-4 py-3 text-xs leading-5 text-neutral-700 md:table-cell">
                        <span className="block">FEC code supports {formatMoney(spender.supportAmount) ?? "$0"}</span>
                        <span className="block">FEC code opposes {formatMoney(spender.opposeAmount) ?? "$0"}</span>
                        {positionNote ? (
                          <span className="mt-1 block font-mono text-[11px] uppercase tracking-[0.12em] text-neutral-700">
                            {positionNote}
                          </span>
                        ) : null}
                      </td>
                      <td className="hidden px-4 py-3 text-right font-mono font-semibold md:table-cell">
                        {formatMoney(spender.totalAmount)}
                      </td>
                      <td className="hidden px-4 py-3 text-right font-mono md:table-cell">
                        <Link className="font-medium underline underline-offset-4" href={spenderEvidenceHref(spender.committeeId, spender.latestScheduleESourceUrl)}>
                          {spender.recordCount}
                        </Link>
                      </td>
                      <td className="hidden px-4 py-3 md:table-cell">
                        <div className="flex flex-col gap-1">
                          <Link className="font-medium underline underline-offset-4" href={spenderEvidenceHref(spender.committeeId, spender.latestScheduleESourceUrl)}>
                            Open evidence records
                          </Link>
                          <span className="font-mono text-[11px] uppercase tracking-[0.12em] text-neutral-500">
                            {spender.latestScheduleESourceId ?? "No Schedule E ID"}
                          </span>
                          <details className="text-xs text-neutral-600">
                            <summary className="cursor-pointer underline underline-offset-4">
                              More source links
                            </summary>
                            <div className="mt-1 flex flex-col gap-1">
                              {spender.committeeId ? (
                                <Link className="underline underline-offset-4" href={`/committees/${spender.committeeId}#schedule-e-records`}>
                                  Committee evidence page
                                </Link>
                              ) : null}
                              <a
                                className="underline underline-offset-4"
                                href={spender.committeeId ? `/api/schedule-e/export.csv?committee=${spender.committeeId}` : "/api/schedule-e/export.csv"}
                              >
                                Export this spender
                              </a>
                              {spender.latestScheduleESourceUrl ? (
                                <a
                                  className="underline underline-offset-4"
                                  href={spender.latestScheduleESourceUrl}
                                  rel="noreferrer"
                                  target="_blank"
                                >
                                  Latest FEC source only
                                </a>
                              ) : (
                                <span>Schedule E source not stored</span>
                              )}
                              {spender.sourceUrl ? (
                                <a
                                  className="underline underline-offset-4"
                                  href={spender.sourceUrl}
                                  rel="noreferrer"
                                  target="_blank"
                                >
                                  Committee profile
                                </a>
                              ) : null}
                            </div>
                          </details>
                        </div>
                      </td>
                    </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td className="px-4 py-4 text-neutral-600" colSpan={8}>
                      {selectedState
                        ? `No Schedule E spender records are available for ${selectedState} in the current database slice.`
                        : "No Schedule E spender records are available in the current database slice."}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>
      </main>
    </PageShell>
  );
}

function share(numerator: number | null, denominator: number) {
  if (numerator === null || denominator <= 0) return 0;
  return numerator / denominator;
}

function formatPercent(value: number) {
  return `${Math.round(value * 100)}%`;
}

function positionConcentrationNote(supportShare: number, opposeShare: number) {
  if (opposeShare >= 0.75) return `Mostly opposes targets (${formatPercent(opposeShare)})`;
  if (supportShare >= 0.75) return `Mostly supports targets (${formatPercent(supportShare)})`;
  return null;
}

function spenderEvidenceHref(committeeId?: string | null, latestSourceUrl?: string | null) {
  if (committeeId) return `/records/schedule-e?committee=${committeeId}`;
  return latestSourceUrl ?? "/spending?type=large_independent_expenditure";
}

function stateSpenderCounts(spenders: Awaited<ReturnType<typeof getTopSpenders>>) {
  const counts = new Map<string, number>();
  for (const spender of spenders) {
    for (const state of spender.states) {
      counts.set(state, (counts.get(state) ?? 0) + 1);
    }
  }
  return counts;
}

function stateLinkClass(active: boolean) {
  return active
    ? "font-semibold text-neutral-950 underline underline-offset-4"
    : "underline-offset-4 hover:underline";
}
