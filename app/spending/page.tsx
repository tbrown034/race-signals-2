import Link from "next/link";
import { FeedFilters } from "@/src/components/feed-filters";
import { PageShell } from "@/src/components/page-shell";
import { SignalCard } from "@/src/components/signal-card";
import { getRaces, getSpendingSignals } from "@/src/lib/db/repository";
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
  const [signals, races] = await Promise.all([
    getSpendingSignals(signalFiltersFromSearchParams(params, 101), sort),
    getRaces(),
  ]);
  const visibleSignals = signals.slice(0, 100);
  const hasMoreSignals = signals.length > visibleSignals.length;
  const amountHref = spendingSortHref(params, "amount");
  const dateHref = spendingSortHref(params, "date");

  return (
    <PageShell>
      <main className="mx-auto max-w-7xl px-5 py-6 sm:px-8">
        <section className="border border-neutral-300 bg-white">
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
            status={statusFilter}
            type="large_independent_expenditure"
          />
          <div className="border-b border-neutral-300 px-5 py-3 font-mono text-[11px] uppercase tracking-[0.12em] text-neutral-500">
            Showing {visibleSignals.length}{hasMoreSignals ? "+" : ""} outside-spending signals
          </div>
          {visibleSignals.length ? (
            visibleSignals.map((signal) => <SignalCard signal={signal} key={signal.dedupeKey} />)
          ) : (
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
          )}
        </section>
      </main>
    </PageShell>
  );
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
