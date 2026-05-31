import Link from "next/link";
import { CoverageStrip } from "@/src/components/coverage-strip";
import { FeedFilters } from "@/src/components/feed-filters";
import { PageShell } from "@/src/components/page-shell";
import { SignalCard } from "@/src/components/signal-card";
import { getCoverageSummary, getRaces, getSignals, getSignalStateCounts, getSignalStateFreshness, getStateRaceBoard } from "@/src/lib/db/repository";
import { formatDate, formatMoney, formatRelativeTime } from "@/src/lib/format";
import { signalFiltersFromSearchParams, sinceLabel } from "@/src/lib/signals/filters";
import type { StateRaceBoardRow } from "@/src/lib/types";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Federal campaign-finance alerts",
  description: "A chronological feed of source-linked FEC campaign-finance signals.",
};
export const revalidate = 300;

const quickViews = [
  {
    href: "/?state=IN",
    label: "Indiana local desk",
    body: "State-level congressional slice for a local politics reporter.",
  },
  {
    href: "/?office=S",
    label: "Senate filter",
    body: "Shows Senate records present in the current stored slice.",
  },
  {
    href: "/?type=large_independent_expenditure",
    label: "Outside spending",
    body: "Independent expenditures, the highest-leverage early alerts.",
  },
  {
    href: "/?status=review",
    label: "Needs review",
    body: "Signals flagged for human attention before publication use.",
  },
];

export default async function Home({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const params = await searchParams;
  const q = typeof params.q === "string" ? params.q : undefined;
  const state = typeof params.state === "string" ? params.state : undefined;
  const office = typeof params.office === "string" ? params.office : undefined;
  const raceId = typeof params.race === "string" ? params.race : undefined;
  const committeeId = typeof params.committee === "string" ? params.committee : undefined;
  const type = typeof params.type === "string" ? params.type : undefined;
  const statusFilter = typeof params.status === "string" ? params.status : undefined;
  const since = typeof params.since === "string" ? params.since : undefined;
  const ingestedSince = typeof params.ingestedSince === "string" ? params.ingestedSince : undefined;
  const exportQuery = new URLSearchParams();
  for (const key of ["q", "state", "office", "race", "committee", "type", "status", "since", "ingestedSince", "minAmount", "position"]) {
    const value = params[key];
    if (typeof value === "string" && value) exportQuery.set(key, value);
  }
  const exportSuffix = exportQuery.toString();
  const [signals, races, status, stateSignalCounts, stateSignalFreshness, stateRaceBoard] = await Promise.all([
    getSignals(signalFiltersFromSearchParams(params, 51)),
    getRaces(),
    getCoverageSummary(),
    getSignalStateCounts(),
    getSignalStateFreshness(),
    state ? getStateRaceBoard(state) : Promise.resolve([]),
  ]);
  const visibleSignals = signals.slice(0, 50);
  const hasMoreSignals = signals.length > visibleSignals.length;
  const selectedRace = raceId ? races.find((race) => race.id === raceId) : null;
  const activeFilters = [
    q ? `search "${q}"` : null,
    state ? `state ${state}` : null,
    office ? (office === "S" ? "Senate" : office === "H" ? "House" : `office ${office}`) : null,
    selectedRace ? selectedRace.name : raceId,
    committeeId ? `committee ${committeeId}` : null,
    type ? type.replaceAll("_", " ") : null,
    statusFilter ? `status ${statusFilter}` : null,
    since ? `event ${sinceLabel(since)}` : null,
    ingestedSince ? `ingested ${sinceLabel(ingestedSince)}` : null,
    typeof params.minAmount === "string" ? `$${Number(params.minAmount).toLocaleString("en-US")}+` : null,
    params.position === "S" ? "support spending" : params.position === "O" ? "opposition spending" : null,
  ].filter(Boolean);

  return (
    <PageShell>
      <main className="mx-auto grid max-w-7xl grid-cols-1 gap-6 px-5 py-6 sm:px-8 lg:grid-cols-[1fr_320px]">
        <section className="w-full max-w-[calc(100vw-2.5rem)] min-w-0 border border-neutral-300 bg-white sm:max-w-none">
          <div className="border-b border-neutral-300 px-5 py-5">
            <div className="flex min-w-0 flex-col gap-3 md:flex-row md:items-end md:justify-between">
              <div className="min-w-0 max-w-full">
                <p className="font-mono text-xs uppercase tracking-[0.18em] text-neutral-500">
                  Signal feed
                </p>
                <h1 className="mt-1 max-w-full break-words text-xl font-semibold tracking-tight">
                  Federal campaign-finance alerts
                </h1>
                <p className="mt-2 max-w-full break-words text-sm leading-5 whitespace-normal text-neutral-700 sm:hidden">
                  {visibleSignals.length}{hasMoreSignals ? "+" : ""} stored signals. FEC links preserved.
                </p>
                <p className="mt-2 hidden max-w-full break-words text-sm leading-5 whitespace-normal text-neutral-700 sm:block">
                  Showing {visibleSignals.length}{hasMoreSignals ? "+" : ""} stored signals from the current capped ingest slice. Source-linked FEC records for House and Senate coverage.
                </p>
                {activeFilters.length ? (
                  <p className="mt-1 font-mono text-[11px] uppercase tracking-[0.12em] text-neutral-500">
                    Filtered by {activeFilters.join(" / ")}
                  </p>
                ) : null}
              </div>
              <div className="flex flex-col gap-1 md:items-end">
                <div className="flex flex-wrap gap-2 text-sm">
                  <a
                    className="border border-neutral-400 px-3 py-2 font-medium hover:border-neutral-900"
                    href={`/api/signals/export.csv${exportSuffix ? `?${exportSuffix}` : ""}`}
                  >
                    Export CSV
                  </a>
                  <a
                    className="border border-neutral-400 px-3 py-2 font-medium hover:border-neutral-900"
                    href={`/api/signals/export.json${exportSuffix ? `?${exportSuffix}` : ""}`}
                  >
                    Export JSON
                  </a>
                </div>
                <p className="text-xs text-neutral-600">
                  Exports preserve filters and include FEC source IDs.
                </p>
              </div>
            </div>
          </div>
          <CoverageStrip counts={status.counts} latestRun={status.runs[0]} mode={status.mode} />
          {state ? <StateRaceBoard state={state} rows={stateRaceBoard} /> : null}
          <StartPointStrip />
          <FeedFilters
            key={[q, state, office, raceId, committeeId, type, statusFilter, since, ingestedSince].join("|")}
            races={races}
            q={q}
            state={state}
            stateSignalCounts={stateSignalCounts}
            stateSignalFreshness={stateSignalFreshness}
            office={office}
            raceId={raceId}
            committeeId={committeeId}
            type={type}
            status={statusFilter}
            since={since}
            ingestedSince={ingestedSince}
          />
          {visibleSignals.length ? (
            visibleSignals.map((signal) => <SignalCard signal={signal} key={signal.dedupeKey} />)
          ) : (
            <div className="p-5 text-sm text-neutral-700">
              <p className="font-semibold text-neutral-950">No signals match this view.</p>
              <p className="mt-1">
                The filters may be too narrow, or the current database slice may not include recent FEC activity for this race.
              </p>
              <div className="mt-3 flex gap-3">
                {state ? (
                  <Link className="font-medium underline underline-offset-4" href={`/?state=${state}`}>
                    Show all {state} signals
                  </Link>
                ) : null}
                <Link className="font-medium underline underline-offset-4" href="/">
                  Show all signals
                </Link>
                <Link className="font-medium underline underline-offset-4" href="/status">
                  Check ingestion status
                </Link>
              </div>
            </div>
          )}
        </section>

        <aside className="h-fit min-w-0 border border-neutral-300 bg-white p-5">
          <p className="font-mono text-xs uppercase tracking-[0.18em] text-neutral-500">
            Scope
          </p>
          <h2 className="mt-2 text-lg font-semibold">2026 U.S. congressional scope</h2>
          <p className="mt-2 text-sm leading-6 text-neutral-700">
            FEC-only MVP coverage. The database can represent every 2026 House and Senate
            race, but the scheduled low-cost ingest is intentionally capped to a small daily
            slice. Demo mode appears automatically when no database is configured.
          </p>
          <dl className="mt-5 space-y-3 text-sm">
            <div>
              <dt className="font-mono text-xs uppercase tracking-[0.12em] text-neutral-500">
                Mode
              </dt>
              <dd className="mt-1">{status.mode}</dd>
            </div>
            <div>
              <dt className="font-mono text-xs uppercase tracking-[0.12em] text-neutral-500">
                Signals
              </dt>
              <dd className="mt-1">{status.counts.signals}</dd>
            </div>
            <div>
              <dt className="font-mono text-xs uppercase tracking-[0.12em] text-neutral-500">
                Races
              </dt>
              <dd className="mt-1">{races.length} race shells available for filtering</dd>
            </div>
            <div>
              <dt className="font-mono text-xs uppercase tracking-[0.12em] text-neutral-500">
                Cost guard
              </dt>
              <dd className="mt-1">Daily ingest is capped; broader national runs are manual.</dd>
            </div>
          </dl>
          <div className="mt-6 border-t border-neutral-300 pt-5">
            <p className="font-mono text-xs uppercase tracking-[0.12em] text-neutral-500">
              Start points
            </p>
            <div className="mt-3 space-y-3">
              {quickViews.map((view) => (
                <Link
                  className="block border border-neutral-300 p-3 hover:border-neutral-900"
                  href={view.href}
                  key={view.href}
                >
                  <span className="block text-sm font-semibold">{view.label}</span>
                  <span className="mt-1 block text-xs leading-5 text-neutral-600">{view.body}</span>
                </Link>
              ))}
            </div>
          </div>
        </aside>
      </main>
    </PageShell>
  );
}

function StartPointStrip() {
  return (
    <section className="border-b border-neutral-300 px-5 py-3" aria-label="Start points">
      <div className="flex flex-col gap-2 xl:flex-row xl:items-center">
        <p className="shrink-0 font-mono text-[11px] uppercase tracking-[0.12em] text-neutral-500">
          Start points
        </p>
        <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1 xl:flex-wrap xl:overflow-visible xl:pb-0">
          {quickViews.map((view) => (
            <Link
              className="shrink-0 border border-neutral-300 px-3 py-2 text-sm hover:border-neutral-900"
              href={view.href}
              key={`main-${view.href}`}
              title={view.body}
            >
              {view.label}
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}

function StateRaceBoard({ rows, state }: { rows: StateRaceBoardRow[]; state: string }) {
  return (
    <section className="border-b border-neutral-300" id="state-race-board">
      <div className="border-b border-neutral-300 px-5 py-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h2 className="text-sm font-semibold uppercase tracking-[0.14em] text-neutral-600">
              {state} race board
            </h2>
            <p className="mt-1 text-sm text-neutral-600">
              Every 2026 House and Senate race shell for this state, including quiet races with no stored signals.
            </p>
          </div>
          <div className="flex flex-wrap gap-2 text-sm">
            <a
              className="border border-neutral-400 px-3 py-2 font-medium hover:border-neutral-900"
              href={`/api/races/export.csv?state=${state}`}
            >
              Export CSV
            </a>
            <a
              className="border border-neutral-400 px-3 py-2 font-medium hover:border-neutral-900"
              href={`/api/races/export.json?state=${state}`}
            >
              Export JSON
            </a>
          </div>
        </div>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-0 text-left text-sm md:min-w-[860px]">
          <thead className="bg-neutral-100 font-mono text-xs uppercase tracking-[0.12em] text-neutral-500">
            <tr>
              <th className="px-4 py-3 font-medium" scope="col">Race</th>
              <th className="hidden px-4 py-3 text-right font-medium md:table-cell" scope="col">Candidates</th>
              <th className="hidden px-4 py-3 text-right font-medium md:table-cell" scope="col">Inc.</th>
              <th className="hidden px-4 py-3 text-right font-medium md:table-cell" scope="col">Raised</th>
              <th className="hidden px-4 py-3 text-right font-medium md:table-cell" scope="col">Signals</th>
              <th className="hidden px-4 py-3 text-right font-medium md:table-cell" scope="col">IE total</th>
              <th className="hidden px-4 py-3 font-medium md:table-cell" scope="col">Totals fetched</th>
              <th className="hidden px-4 py-3 font-medium md:table-cell" scope="col">Latest signal</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-neutral-200">
            {rows.length ? (
              rows.map((race) => (
                <tr key={race.raceId}>
                  <td className="px-4 py-3">
                    <Link className="font-medium underline underline-offset-4" href={`/races/${race.raceId}`}>
                      {race.raceName}
                    </Link>
                    <dl className="mt-2 space-y-1 text-xs leading-5 text-neutral-600 md:hidden">
                      <div>
                        <dt className="inline font-mono uppercase tracking-[0.12em] text-neutral-500">Candidates </dt>
                        <dd className="inline">{race.candidateCount}</dd>
                      </div>
                      <div>
                        <dt className="inline font-mono uppercase tracking-[0.12em] text-neutral-500">Incumbents </dt>
                        <dd className="inline">{race.incumbentCount}</dd>
                      </div>
                      <div>
                        <dt className="inline font-mono uppercase tracking-[0.12em] text-neutral-500">Raised </dt>
                        <dd className="inline font-mono text-neutral-950">{formatMoney(race.candidateReceiptsTotal) ?? "$0"}</dd>
                      </div>
                      <div>
                        <dt className="inline font-mono uppercase tracking-[0.12em] text-neutral-500">Signals </dt>
                        <dd className="inline">{race.signalCount}</dd>
                      </div>
                      <div>
                        <dt className="inline font-mono uppercase tracking-[0.12em] text-neutral-500">IE total </dt>
                        <dd className="inline font-mono text-neutral-950">
                          {race.independentExpenditureTotal > 0 ? (
                            <Link className="underline underline-offset-4" href={`/spending?race=${race.raceId}`}>
                              {formatMoney(race.independentExpenditureTotal) ?? "$0"}
                            </Link>
                          ) : (
                            "$0"
                          )}
                        </dd>
                      </div>
                      <div>
                        <dt className="inline font-mono uppercase tracking-[0.12em] text-neutral-500">Totals fetched </dt>
                        <dd className="inline">{raceTotalsFreshness(race)}</dd>
                      </div>
                      <div>
                        <dt className="inline font-mono uppercase tracking-[0.12em] text-neutral-500">Latest </dt>
                        <dd className="inline">
                          {race.latestSignalDate && race.latestSignalDedupeKey ? (
                            <Link className="underline underline-offset-4" href={`/?race=${race.raceId}#${race.latestSignalDedupeKey}`}>
                              {formatDate(race.latestSignalDate)}
                            </Link>
                          ) : (
                            "No stored signal"
                          )}
                        </dd>
                      </div>
                    </dl>
                  </td>
                  <td className="hidden px-4 py-3 text-right font-mono md:table-cell">{race.candidateCount}</td>
                  <td className="hidden px-4 py-3 text-right font-mono md:table-cell">{race.incumbentCount}</td>
                  <td className="hidden px-4 py-3 text-right font-mono md:table-cell">{formatMoney(race.candidateReceiptsTotal) ?? "$0"}</td>
                  <td className="hidden px-4 py-3 text-right font-mono md:table-cell">{race.signalCount}</td>
                  <td className="hidden px-4 py-3 text-right font-mono md:table-cell">
                    {race.independentExpenditureTotal > 0 ? (
                      <Link className="underline underline-offset-4" href={`/spending?race=${race.raceId}`}>
                        {formatMoney(race.independentExpenditureTotal) ?? "$0"}
                      </Link>
                    ) : (
                      "$0"
                    )}
                  </td>
                  <td className="hidden px-4 py-3 text-xs text-neutral-600 md:table-cell">{raceTotalsFreshness(race)}</td>
                  <td className="hidden px-4 py-3 md:table-cell">
                    {race.latestSignalDate && race.latestSignalDedupeKey ? (
                      <Link
                        className="block max-w-[240px] underline underline-offset-4"
                        href={`/?race=${race.raceId}#${race.latestSignalDedupeKey}`}
                        title={race.latestSignalHeadline ?? undefined}
                      >
                        <span className="block">{formatDate(race.latestSignalDate)}</span>
                        {race.latestSignalHeadline ? (
                          <span className="mt-1 block truncate text-xs text-neutral-600">
                            {race.latestSignalHeadline}
                          </span>
                        ) : null}
                      </Link>
                    ) : (
                      "No stored signal"
                    )}
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td className="px-4 py-3 text-neutral-600" colSpan={8}>
                  No configured race shells are available for {state}.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function raceTotalsFreshness(race: StateRaceBoardRow) {
  if (!race.candidateTotalsFetchedAtLatest) return "Totals not loaded";
  const latest = formatRelativeTime(race.candidateTotalsFetchedAtLatest);
  if (
    race.candidateTotalsFetchedAtOldest &&
    race.candidateTotalsFetchedAtOldest !== race.candidateTotalsFetchedAtLatest
  ) {
    return `${latest}; oldest ${formatRelativeTime(race.candidateTotalsFetchedAtOldest)}`;
  }
  return latest;
}
