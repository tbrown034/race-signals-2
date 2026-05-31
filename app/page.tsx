import { FeedFilters } from "@/src/components/feed-filters";
import { PageShell } from "@/src/components/page-shell";
import { SignalCard } from "@/src/components/signal-card";
import { getRaces, getSignals, getStatus } from "@/src/lib/db/repository";

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
  const [signals, races, status] = await Promise.all([
    getSignals({ q, state, office, raceId, type, status: statusFilter, limit: 50 }),
    getRaces(),
    getStatus(),
  ]);

  return (
    <PageShell>
      <main className="mx-auto grid max-w-7xl gap-6 px-5 py-6 sm:px-8 lg:grid-cols-[1fr_320px]">
        <section className="border border-neutral-300 bg-white">
          <div className="border-b border-neutral-300 px-5 py-5">
            <p className="font-mono text-xs uppercase tracking-[0.18em] text-neutral-500">
              Chronological signal feed
            </p>
            <h1 className="mt-2 text-3xl font-semibold tracking-tight">
              What changed in the money trail?
            </h1>
            <p className="mt-3 max-w-3xl text-sm leading-6 text-neutral-700">
              A national FEC-first feed for 2026 U.S. House and Senate races. Each alert links
              back to source records so a reporter can verify, contextualize and
              decide whether to follow up.
            </p>
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
            <p className="p-5 text-sm text-neutral-600">
              No signals match the current filters.
            </p>
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
        </aside>
      </main>
    </PageShell>
  );
}
