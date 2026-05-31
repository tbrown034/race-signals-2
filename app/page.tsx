import Link from "next/link";
import { CoverageStrip } from "@/src/components/coverage-strip";
import { FeedFilters } from "@/src/components/feed-filters";
import { PageShell } from "@/src/components/page-shell";
import { SignalCard } from "@/src/components/signal-card";
import { getRaces, getSignals, getStatus } from "@/src/lib/db/repository";
import { signalFiltersFromSearchParams, sinceLabel } from "@/src/lib/signals/filters";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Federal campaign-finance alerts",
  description: "A chronological feed of source-linked FEC campaign-finance signals.",
};

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
  const type = typeof params.type === "string" ? params.type : undefined;
  const statusFilter = typeof params.status === "string" ? params.status : undefined;
  const since = typeof params.since === "string" ? params.since : undefined;
  const exportQuery = new URLSearchParams();
  for (const key of ["q", "state", "office", "race", "type", "status", "since"]) {
    const value = params[key];
    if (typeof value === "string" && value) exportQuery.set(key, value);
  }
  const exportSuffix = exportQuery.toString();
  const [signals, races, status] = await Promise.all([
    getSignals(signalFiltersFromSearchParams(params, 51)),
    getRaces(),
    getStatus(),
  ]);
  const visibleSignals = signals.slice(0, 50);
  const hasMoreSignals = signals.length > visibleSignals.length;
  const selectedRace = raceId ? races.find((race) => race.id === raceId) : null;
  const activeFilters = [
    q ? `search "${q}"` : null,
    state ? `state ${state}` : null,
    office ? (office === "S" ? "Senate" : office === "H" ? "House" : `office ${office}`) : null,
    selectedRace ? selectedRace.name : raceId,
    type ? type.replaceAll("_", " ") : null,
    statusFilter ? `status ${statusFilter}` : null,
    since ? sinceLabel(since) : null,
  ].filter(Boolean);

  return (
    <PageShell>
      <main className="mx-auto grid max-w-7xl gap-6 px-5 py-6 sm:px-8 lg:grid-cols-[1fr_320px]">
        <section className="border border-neutral-300 bg-white">
          <div className="border-b border-neutral-300 px-5 py-5">
            <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
              <div>
                <p className="font-mono text-xs uppercase tracking-[0.18em] text-neutral-500">
                  Signal feed
                </p>
                <h1 className="mt-1 text-xl font-semibold tracking-tight">
                  Federal campaign-finance alerts
                </h1>
                <p className="mt-2 text-sm leading-5 text-neutral-700">
                  Showing {visibleSignals.length}{hasMoreSignals ? "+" : ""} signals. Source-linked FEC records for House and Senate coverage.
                </p>
                {activeFilters.length ? (
                  <p className="mt-1 font-mono text-[11px] uppercase tracking-[0.12em] text-neutral-500">
                    Filtered by {activeFilters.join(" / ")}
                  </p>
                ) : null}
              </div>
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
            </div>
          </div>
          <CoverageStrip counts={status.counts} latestRun={status.runs[0]} mode={status.mode} />
          <FeedFilters
            key={[q, state, office, raceId, type, statusFilter, since].join("|")}
            races={races}
            q={q}
            state={state}
            office={office}
            raceId={raceId}
            type={type}
            status={statusFilter}
            since={since}
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

        <aside className="h-fit border border-neutral-300 bg-white p-5">
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
