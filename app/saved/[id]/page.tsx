import { notFound } from "next/navigation";
import { FeedFilters } from "@/src/components/feed-filters";
import { PageShell } from "@/src/components/page-shell";
import { SignalCard } from "@/src/components/signal-card";
import { getSavedFilter } from "@/src/lib/db/saved-filters";
import { getRaces, getSignals } from "@/src/lib/db/repository";
import { signalFiltersFromSearchParams } from "@/src/lib/signals/filters";

export default async function SavedFilterPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const saved = await getSavedFilter(id);
  if (!saved) notFound();

  const [signals, races] = await Promise.all([
    getSignals(signalFiltersFromSearchParams(saved.filterJson, 100)),
    getRaces(),
  ]);

  return (
    <PageShell>
      <main className="mx-auto max-w-7xl px-5 py-6 sm:px-8">
        <section className="border border-neutral-300 bg-white">
          <div className="border-b border-neutral-300 px-5 py-5">
            <p className="font-mono text-xs uppercase tracking-[0.18em] text-neutral-500">
              Saved view
            </p>
            <h1 className="mt-1 text-xl font-semibold tracking-tight">{saved.name}</h1>
            <p className="mt-2 text-sm text-neutral-700">
              Owner: {saved.ownerEmail}. Cadence: {saved.cadence}. RSS:{" "}
              <a className="underline underline-offset-4" href={`/saved/${saved.id}/feed.xml`}>
                feed.xml
              </a>
            </p>
          </div>
          <FeedFilters
            races={races}
            q={saved.filterJson.q}
            state={saved.filterJson.state}
            office={saved.filterJson.office}
            raceId={saved.filterJson.race}
            type={saved.filterJson.type}
            status={saved.filterJson.status}
          />
          {signals.length ? (
            signals.map((signal) => <SignalCard signal={signal} key={signal.dedupeKey} />)
          ) : (
            <p className="p-5 text-sm text-neutral-700">No signals match this saved view.</p>
          )}
        </section>
      </main>
    </PageShell>
  );
}
