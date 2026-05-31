import { SignalCard } from "@/src/components/signal-card";
import { formatDate, formatMoney } from "@/src/lib/format";
import type { RaceRating, Signal, Transaction } from "@/src/lib/types";

export function EntityPage({
  eyebrow,
  title,
  meta,
  sourceUrl,
  ratings = [],
  transactions = [],
  signals,
}: {
  eyebrow: string;
  title: string;
  meta: Array<[string, string | number | null | undefined]>;
  sourceUrl?: string | null;
  ratings?: RaceRating[];
  transactions?: Transaction[];
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
        {ratings.length ? (
          <div className="mt-6 border-t border-neutral-300 pt-5">
            <h2 className="font-mono text-xs uppercase tracking-[0.12em] text-neutral-500">
              Race ratings
            </h2>
            <div className="mt-3 space-y-3">
              {ratings.map((rating) => (
                <div className="text-sm" key={`${rating.raceId}-${rating.sourceName}`}>
                  <p className="font-semibold">{rating.rating}</p>
                  <p className="mt-1 text-neutral-700">{rating.rationale}</p>
                  {rating.sourceUrl ? (
                    <a
                      className="mt-2 inline-block text-xs font-medium underline underline-offset-4"
                      href={rating.sourceUrl}
                    >
                      {rating.sourceName}
                    </a>
                  ) : (
                    <p className="mt-2 text-xs text-neutral-600">{rating.sourceName}</p>
                  )}
                </div>
              ))}
            </div>
          </div>
        ) : null}
      </aside>
      <section className="border border-neutral-300 bg-white">
        {transactions.length ? (
          <div className="border-b border-neutral-300">
            <div className="border-b border-neutral-300 px-5 py-4">
              <h2 className="text-sm font-semibold uppercase tracking-[0.14em] text-neutral-600">
                Recent receipts
              </h2>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-neutral-100 text-xs uppercase tracking-[0.12em] text-neutral-500">
                  <tr>
                    <th className="px-4 py-3 font-medium">Date</th>
                    <th className="px-4 py-3 font-medium">Contributor</th>
                    <th className="px-4 py-3 font-medium">Employer</th>
                    <th className="px-4 py-3 text-right font-medium">Amount</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-200">
                  {transactions.map((transaction) => (
                    <tr key={transaction.sourceId}>
                      <td className="px-4 py-3">{formatDate(transaction.transactionDate)}</td>
                      <td className="px-4 py-3" title={transaction.contributorName ?? undefined}>
                        {transaction.contributorNameNormalized ?? transaction.contributorName ?? "Unknown"}
                      </td>
                      <td className="px-4 py-3" title={transaction.contributorEmployer ?? undefined}>
                        {transaction.contributorEmployerNormalized ?? transaction.contributorEmployer ?? "Unknown"}
                      </td>
                      <td className="px-4 py-3 text-right font-mono">
                        {formatMoney(transaction.amount)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ) : null}
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
