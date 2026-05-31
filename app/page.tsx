import { FeedFilters } from "@/src/components/feed-filters";
import { PageShell } from "@/src/components/page-shell";
import { SignalCard } from "@/src/components/signal-card";
import { getRaces, getSignals, getStatus } from "@/src/lib/db/repository";
import { signalFiltersFromSearchParams } from "@/src/lib/signals/filters";
import Link from "next/link";

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
  const exportQuery = new URLSearchParams();
  for (const key of ["q", "state", "office", "race", "type", "status"]) {
    const value = params[key];
    if (typeof value === "string" && value) exportQuery.set(key, value);
  }
  const [signals, races, status] = await Promise.all([
    getSignals(signalFiltersFromSearchParams(params, 50)),
    getRaces(),
    getStatus(),
  ]);

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
                  {signals.length} visible signals. Source-linked FEC records for House and Senate coverage.
                </p>
              </div>
              <div className="flex flex-wrap gap-2 text-sm">
              <a
                className="border border-neutral-400 px-3 py-2 font-medium hover:border-neutral-900"
                href={`/api/signals/export.csv?${exportQuery.toString()}`}
              >
                Export CSV
              </a>
              <a
                className="border border-neutral-400 px-3 py-2 font-medium hover:border-neutral-900"
                href={`/api/signals/export.json?${exportQuery.toString()}`}
              >
                Export JSON
              </a>
              </div>
            </div>
          </div>
          <FeedFilters
            races={races}
            q={q}
            state={state}
            office={office}
            raceId={raceId}
            type={type}
            status={statusFilter}
          />
          {signals.length ? (
            signals.map((signal) => <SignalCard signal={signal} key={signal.dedupeKey} />)
          ) : (
            <div className="p-5 text-sm text-neutral-700">
              <p className="font-semibold text-neutral-950">No signals match this view.</p>
              <p className="mt-1">
                The filters may be too narrow, or the current database slice may not include recent FEC activity for this race.
              </p>
              <div className="mt-3 flex gap-3">
                <Link className="font-medium underline underline-offset-4" href="/">
                  Reset filters
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
            FEC-only MVP coverage. Demo mode appears automatically when no database
            is configured; real ingestion uses `FEC_API_KEY` and Postgres.
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
              <dd className="mt-1">{races.length} configured House and Senate races</dd>
            </div>
          </dl>

          <form className="mt-6 border-t border-neutral-300 pt-5" action="/api/saved-filters" method="post">
            <h2 className="text-sm font-semibold uppercase tracking-[0.14em] text-neutral-600">
              Save this view
            </h2>
            {["q", "state", "office", "race", "type", "status"].map((key) => {
              const value = params[key];
              return typeof value === "string" && value ? (
                <input name={key} type="hidden" value={value} key={key} />
              ) : null;
            })}
            <label className="mt-3 block text-xs font-medium uppercase tracking-[0.12em] text-neutral-500">
              Name
              <input
                className="mt-1 block h-9 w-full border border-neutral-300 px-3 text-sm normal-case tracking-normal text-neutral-950"
                name="name"
                defaultValue="Race Signals feed"
              />
            </label>
            <label className="mt-3 block text-xs font-medium uppercase tracking-[0.12em] text-neutral-500">
              Email
              <input
                className="mt-1 block h-9 w-full border border-neutral-300 px-3 text-sm normal-case tracking-normal text-neutral-950"
                name="owner_email"
                placeholder="reporter@example.com"
                type="email"
              />
            </label>
            <label className="mt-3 block text-xs font-medium uppercase tracking-[0.12em] text-neutral-500">
              Cadence
              <select
                className="mt-1 block h-9 w-full border border-neutral-300 px-3 text-sm normal-case tracking-normal text-neutral-950"
                name="cadence"
                defaultValue="off"
              >
                <option value="off">RSS only</option>
                <option value="daily">Daily webhook digest</option>
                <option value="hourly">Hourly webhook digest</option>
              </select>
            </label>
            <button className="mt-3 w-full border border-neutral-900 bg-neutral-950 px-4 py-2 text-sm font-medium text-white">
              Save view
            </button>
          </form>
        </aside>
      </main>
    </PageShell>
  );
}
