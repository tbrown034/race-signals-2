import { SignalCard } from "@/src/components/signal-card";
import type { Signal } from "@/src/lib/types";

export function EntityPage({
  eyebrow,
  title,
  meta,
  sourceUrl,
  signals,
}: {
  eyebrow: string;
  title: string;
  meta: Array<[string, string | number | null | undefined]>;
  sourceUrl?: string | null;
  signals: Signal[];
}) {
  return (
    <main className="mx-auto grid max-w-7xl gap-6 px-5 py-6 sm:px-8 lg:grid-cols-[320px_1fr]">
      <aside className="h-fit border border-neutral-300 bg-white p-5">
        <p className="font-mono text-xs uppercase tracking-[0.18em] text-neutral-500">
          {eyebrow}
        </p>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight">{title}</h1>
        <dl className="mt-5 space-y-4 text-sm">
          {meta.map(([label, value]) => (
            <div key={label}>
              <dt className="font-mono text-xs uppercase tracking-[0.12em] text-neutral-500">
                {label}
              </dt>
              <dd className="mt-1">{value ?? "Unknown"}</dd>
            </div>
          ))}
        </dl>
        {sourceUrl ? (
          <a className="mt-5 inline-block text-sm font-medium underline underline-offset-4" href={sourceUrl}>
            FEC source
          </a>
        ) : null}
      </aside>
      <section className="border border-neutral-300 bg-white">
        <div className="border-b border-neutral-300 px-5 py-4">
          <h2 className="text-sm font-semibold uppercase tracking-[0.14em] text-neutral-600">
            Related signals
          </h2>
        </div>
        {signals.length ? (
          signals.map((signal) => <SignalCard signal={signal} key={signal.dedupeKey} />)
        ) : (
          <p className="p-5 text-sm text-neutral-600">No related signals in the current slice.</p>
        )}
      </section>
    </main>
  );
}
