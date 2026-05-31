import Link from "next/link";
import { PageShell } from "@/src/components/page-shell";
import { getTopSpenders } from "@/src/lib/db/repository";
import { committeeDesignationLabel, committeeTypeLabel } from "@/src/lib/fec-codes";
import { formatDate, formatMoney } from "@/src/lib/format";
import type { Metadata } from "next";

export const revalidate = 21600;
export const metadata: Metadata = {
  title: "Top outside spenders",
  description: "Committees ranked by independent expenditure totals in the Race Signals FEC slice.",
};

export default async function SpendersPage() {
  const spenders = await getTopSpenders(100);

  return (
    <PageShell>
      <main className="mx-auto max-w-7xl px-5 py-6 sm:px-8">
        <section className="border border-neutral-300 bg-white">
          <div className="border-b border-neutral-300 px-5 py-5">
            <p className="font-mono text-xs uppercase tracking-[0.18em] text-neutral-500">
              Schedule E ranking
            </p>
            <h1 className="mt-1 text-xl font-semibold tracking-tight">
              Top outside spenders
            </h1>
            <p className="mt-2 max-w-3xl text-sm leading-5 text-neutral-700">
              Committees ranked by all stored current-cycle independent expenditure
              totals in the current database slice, including records below the
              $25,000 alert threshold. Amounts are sourced from FEC Schedule E
              records and should be checked against the linked records view before
              publication.
            </p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-0 text-left text-sm md:min-w-[1040px]">
              <thead className="bg-neutral-100 font-mono text-xs uppercase tracking-[0.12em] text-neutral-500">
                <tr>
                  <th className="px-4 py-3 font-medium" scope="col">Committee</th>
                  <th className="hidden px-4 py-3 font-medium md:table-cell" scope="col">Type</th>
                  <th className="hidden px-4 py-3 font-medium md:table-cell" scope="col">Where</th>
                  <th className="hidden px-4 py-3 font-medium md:table-cell" scope="col">Last IE</th>
                  <th className="hidden px-4 py-3 font-medium md:table-cell" scope="col">Position split</th>
                  <th className="hidden px-4 py-3 text-right font-medium md:table-cell" scope="col">Total IE</th>
                  <th className="hidden px-4 py-3 text-right font-medium md:table-cell" scope="col">Records</th>
                  <th className="hidden px-4 py-3 font-medium md:table-cell" scope="col">Source</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-200">
                {spenders.length ? (
                  spenders.map((spender) => (
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
                        <dl className="mt-2 space-y-1 text-xs leading-5 text-neutral-600 md:hidden">
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
                            <dt className="inline font-mono uppercase tracking-[0.12em] text-neutral-500">Split </dt>
                            <dd className="inline">Support {formatMoney(spender.supportAmount) ?? "$0"} / Oppose {formatMoney(spender.opposeAmount) ?? "$0"}</dd>
                          </div>
                          <div>
                            <dt className="inline font-mono uppercase tracking-[0.12em] text-neutral-500">Total IE </dt>
                            <dd className="inline font-mono font-semibold text-neutral-950">{formatMoney(spender.totalAmount)}</dd>
                          </div>
                          <div>
                            <dt className="inline font-mono uppercase tracking-[0.12em] text-neutral-500">Records </dt>
                            <dd className="inline">
                              <Link className="font-medium underline underline-offset-4" href={spenderRecordsHref(spender.committeeId, spender.latestScheduleESourceUrl)}>
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
                            </dd>
                          </div>
                          <div>
                            <dt className="inline font-mono uppercase tracking-[0.12em] text-neutral-500">Source </dt>
                            <dd className="inline">
                              <Link className="font-medium underline underline-offset-4" href={spenderRecordsHref(spender.committeeId, spender.latestScheduleESourceUrl)}>
                                Open contributing records
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
                      </td>
                      <td className="hidden px-4 py-3 font-mono md:table-cell">
                        {formatDate(spender.lastExpenditureDate)}
                      </td>
                      <td className="hidden px-4 py-3 text-xs leading-5 text-neutral-700 md:table-cell">
                        <span className="block">Support {formatMoney(spender.supportAmount) ?? "$0"}</span>
                        <span className="block">Oppose {formatMoney(spender.opposeAmount) ?? "$0"}</span>
                      </td>
                      <td className="hidden px-4 py-3 text-right font-mono font-semibold md:table-cell">
                        {formatMoney(spender.totalAmount)}
                      </td>
                      <td className="hidden px-4 py-3 text-right font-mono md:table-cell">
                        <Link className="font-medium underline underline-offset-4" href={spenderRecordsHref(spender.committeeId, spender.latestScheduleESourceUrl)}>
                          {spender.recordCount}
                        </Link>
                      </td>
                      <td className="hidden px-4 py-3 md:table-cell">
                        <div className="flex flex-col gap-1">
                          <Link className="font-medium underline underline-offset-4" href={spenderRecordsHref(spender.committeeId, spender.latestScheduleESourceUrl)}>
                            Open contributing records
                          </Link>
                          {spender.latestScheduleESourceUrl ? (
                            <a
                              className="text-xs underline underline-offset-4"
                              href={spender.latestScheduleESourceUrl}
                              rel="noreferrer"
                              target="_blank"
                            >
                              Latest FEC source only
                            </a>
                          ) : (
                            <span className="text-neutral-600">Schedule E source not stored</span>
                          )}
                          <span className="font-mono text-[11px] uppercase tracking-[0.12em] text-neutral-500">
                            {spender.latestScheduleESourceId ?? "No Schedule E ID"}
                          </span>
                          {spender.sourceUrl ? (
                            <a
                              className="text-xs underline underline-offset-4"
                              href={spender.sourceUrl}
                              rel="noreferrer"
                              target="_blank"
                            >
                              Committee profile
                            </a>
                          ) : null}
                        </div>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td className="px-4 py-4 text-neutral-600" colSpan={8}>
                      No Schedule E spender records are available in the current database slice.
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

function spenderRecordsHref(committeeId?: string | null, latestSourceUrl?: string | null) {
  if (committeeId) return `/committees/${committeeId}#schedule-e-records`;
  return latestSourceUrl ?? "/spending?type=large_independent_expenditure";
}
