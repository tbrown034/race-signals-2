import Link from "next/link";
import { CoverageStrip } from "@/src/components/coverage-strip";
import { FeedFilters } from "@/src/components/feed-filters";
import { PageShell } from "@/src/components/page-shell";
import { getRaces, getSignalStateCounts, getSpendingSignals, getStatus } from "@/src/lib/db/repository";
import { formatDate, formatMoney } from "@/src/lib/format";
import { signalFiltersFromSearchParams } from "@/src/lib/signals/filters";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Outside spending watch",
  description: "Independent expenditure alerts from FEC Schedule E records.",
};

export default async function SpendingPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const params = await searchParams;
  const sort = params.sort === "date" ? "date" : "amount";
  const q = typeof params.q === "string" ? params.q : undefined;
  const state = typeof params.state === "string" ? params.state : undefined;
  const office = typeof params.office === "string" ? params.office : undefined;
  const raceId = typeof params.race === "string" ? params.race : undefined;
  const statusFilter = typeof params.status === "string" ? params.status : undefined;
  const since = typeof params.since === "string" ? params.since : undefined;
  const [signals, races, status, stateSignalCounts] = await Promise.all([
    getSpendingSignals(signalFiltersFromSearchParams(params, 101), sort),
    getRaces(),
    getStatus(),
    getSignalStateCounts("large_independent_expenditure"),
  ]);
  const visibleSignals = signals.slice(0, 100);
  const hasMoreSignals = signals.length > visibleSignals.length;
  const amountHref = spendingSortHref(params, "amount");
  const dateHref = spendingSortHref(params, "date");

  return (
    <PageShell>
      <main className="mx-auto max-w-7xl px-5 py-6 sm:px-8">
        <section className="min-w-0 border border-neutral-300 bg-white">
          <div className="border-b border-neutral-300 px-5 py-5">
            <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
              <div>
                <p className="font-mono text-xs uppercase tracking-[0.18em] text-neutral-500">
                  Schedule E watch
                </p>
                <h1 className="mt-1 text-xl font-semibold tracking-tight">
                  Outside spending watch
                </h1>
                <p className="mt-2 max-w-3xl text-sm leading-5 text-neutral-700">
                  Independent expenditure signals from FEC Schedule E. Default sort
                  is largest amount first so a reporter can spot the biggest outside
                  moves before scanning the chronology.
                </p>
              </div>
              <div className="flex flex-wrap gap-2 text-sm">
                <Link
                  className={`border px-3 py-2 font-medium ${sort === "amount" ? "border-neutral-950 bg-neutral-950 text-white" : "border-neutral-400 hover:border-neutral-900"}`}
                  href={amountHref}
                >
                  Sort by amount
                </Link>
                <Link
                  className={`border px-3 py-2 font-medium ${sort === "date" ? "border-neutral-950 bg-neutral-950 text-white" : "border-neutral-400 hover:border-neutral-900"}`}
                  href={dateHref}
                >
                  Sort by date
                </Link>
              </div>
            </div>
          </div>
          <CoverageStrip counts={status.counts} latestRun={status.runs[0]} mode={status.mode} />
          <FeedFilters
            clearHref="/spending"
            key={[q, state, office, raceId, statusFilter, since].join("|")}
            lockedType
            office={office}
            q={q}
            raceId={raceId}
            races={races}
            since={since}
            state={state}
            stateSignalCounts={stateSignalCounts}
            status={statusFilter}
            type="large_independent_expenditure"
          />
          <div className="border-b border-neutral-300 px-5 py-3 font-mono text-[11px] uppercase tracking-[0.12em] text-neutral-500">
            Showing {visibleSignals.length}{hasMoreSignals ? "+" : ""} outside-spending signals
          </div>
          {visibleSignals.length ? (
            <div className="border-b border-neutral-300">
              <div className="overflow-x-auto">
                <table className="w-full min-w-[1220px] text-left text-sm">
                  <thead className="bg-neutral-100 font-mono text-xs uppercase tracking-[0.12em] text-neutral-500">
                    <tr>
                      <th className="px-4 py-3 font-medium" scope="col">Date</th>
                      <th className="px-4 py-3 font-medium" scope="col">Alert</th>
                      <th className="px-4 py-3 font-medium" scope="col">Spender</th>
                      <th className="px-4 py-3 font-medium" scope="col">Target</th>
                      <th className="px-4 py-3 font-medium" scope="col">Position</th>
                      <th className="px-4 py-3 font-medium" scope="col">Purpose</th>
                      <th className="px-4 py-3 font-medium" scope="col">Race</th>
                      <th className="px-4 py-3 text-right font-medium" scope="col">Amount</th>
                      <th className="px-4 py-3 font-medium" scope="col">Source</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-neutral-200">
                    {visibleSignals.map((signal) => (
                      <tr key={`row-${signal.dedupeKey}`}>
                        <td className="px-4 py-3 font-mono">{formatDate(signal.signalDate)}</td>
                        <td className="max-w-[320px] px-4 py-3">
                          <Link className="font-medium underline underline-offset-4" href={`/#${signalAnchorId(signal.dedupeKey)}`}>
                            {signal.headline}
                          </Link>
                        </td>
                        <td className="px-4 py-3">
                          <EntityLink
                            fallback="Spender not resolved"
                            hrefBase="/committees"
                            id={signal.committeeId}
                            label={signal.committeeName}
                          />
                        </td>
                        <td className="px-4 py-3">
                          <EntityLink
                            fallback="Candidate not resolved"
                            hrefBase="/candidates"
                            id={signal.candidateId}
                            label={signal.candidateName}
                          />
                        </td>
                        <td className="px-4 py-3">{supportOpposeLabel(signal.metadata?.supportOpposeIndicator)}</td>
                        <td className="px-4 py-3 text-neutral-700">{sourcePurpose(signal.metadata?.purpose)}</td>
                        <td className="px-4 py-3">
                          {signal.raceId ? (
                            <Link className="font-medium underline underline-offset-4" href={`/races/${signal.raceId}`}>
                              {signal.raceName ?? signal.raceId}
                            </Link>
                          ) : (
                            "Unmatched"
                          )}
                        </td>
                        <td className="px-4 py-3 text-right font-mono font-semibold">
                          {formatMoney(signal.amount)}
                        </td>
                        <td className="px-4 py-3">
                          {signal.sourceUrl ? (
                            <span className="inline-flex flex-col gap-1">
                              <a
                                className="font-medium underline underline-offset-4"
                                href={signal.sourceUrl}
                                rel="noreferrer"
                                target="_blank"
                              >
                                FEC Schedule E
                              </a>
                              <span className="font-mono text-[11px] uppercase tracking-[0.12em] text-neutral-500">
                                {sourceRecordLabel(signal.metadata?.sourceId)}
                              </span>
                            </span>
                          ) : (
                            <span className="text-neutral-600">Source not stored</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ) : null}
          {!visibleSignals.length ? (
            <div className="p-5 text-sm text-neutral-700">
              <p className="font-semibold text-neutral-950">No outside-spending signals match this view.</p>
              <p className="mt-1">
                Narrow filters can hide Schedule E activity. Broaden to a state, or check status to confirm the latest ingest window.
              </p>
              <div className="mt-3 flex flex-wrap gap-3">
                {state ? (
                  <Link className="font-medium underline underline-offset-4" href={`/spending?state=${state}`}>
                    Show all {state} outside spending
                  </Link>
                ) : null}
                <Link className="font-medium underline underline-offset-4" href="/spending">
                  Show all outside spending
                </Link>
                <Link className="font-medium underline underline-offset-4" href="/status">
                  Check ingestion status
                </Link>
              </div>
            </div>
          ) : null}
        </section>
      </main>
    </PageShell>
  );
}

function supportOpposeLabel(value: unknown) {
  if (value === "S") return "Support";
  if (value === "O") return "Oppose";
  return "Not coded by FEC";
}

function EntityLink({
  fallback,
  hrefBase,
  id,
  label,
}: {
  fallback: string;
  hrefBase: "/candidates" | "/committees";
  id?: string | null;
  label?: string | null;
}) {
  if (!id) return label ?? fallback;
  return (
    <Link className="font-medium underline underline-offset-4" href={`${hrefBase}/${id}`}>
      {label ?? id}
    </Link>
  );
}

function sourceRecordLabel(value: unknown) {
  if (typeof value === "string" && value) return `Record ${value}`;
  return "Record not stored";
}

function sourcePurpose(value: unknown) {
  if (typeof value === "string" && value) return value;
  return "Not specified";
}

function signalAnchorId(dedupeKey: string) {
  return `signal-${dedupeKey.replace(/[^a-zA-Z0-9_-]/g, "-")}`;
}

function spendingSortHref(
  params: { [key: string]: string | string[] | undefined },
  sort: "amount" | "date",
) {
  const next = new URLSearchParams();
  for (const key of ["q", "state", "office", "race", "status", "since"]) {
    const value = params[key];
    if (typeof value === "string" && value) next.set(key, value);
  }
  if (sort !== "amount") next.set("sort", sort);
  const query = next.toString();
  return query ? `/spending?${query}` : "/spending";
}
