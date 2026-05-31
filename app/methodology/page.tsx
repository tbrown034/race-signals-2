import { PageShell } from "@/src/components/page-shell";

const steps = [
  ["Scope", "Start with generated 2026 U.S. House races across all 50 states plus 2026 Senate races."],
  ["Fetch", "Use FEC candidate, committee, report, receipt and independent expenditure endpoints."],
  ["Normalize", "Map FEC records into stable internal candidates, committees, filings, transactions and expenditures."],
  ["Validate", "Flag missing names, committee IDs, dates, source URLs, unmatched races and unusually large amounts."],
  ["Signal", "Convert source records into plain-English alerts with source links, dates, confidence and freshness."],
];

export default function MethodologyPage() {
  return (
    <PageShell>
      <main className="mx-auto max-w-5xl px-5 py-8 sm:px-8">
        <section className="border border-neutral-300 bg-white p-6">
          <p className="font-mono text-xs uppercase tracking-[0.18em] text-neutral-500">
            Methodology
          </p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight">
            How Race Signals turns FEC records into alerts
          </h1>
          <p className="mt-4 max-w-3xl text-sm leading-6 text-neutral-700">
            Race Signals is intentionally focused. The MVP does not score elections
            or claim all-office coverage. It watches 2026 House and Senate races
            and turns fresh FEC paperwork into source-linked reporting leads.
          </p>
        </section>

        <section className="mt-6 border border-neutral-300 bg-white">
          {steps.map(([title, body]) => (
            <div className="border-b border-neutral-300 p-5 last:border-b-0" key={title}>
              <h2 className="text-base font-semibold">{title}</h2>
              <p className="mt-2 text-sm leading-6 text-neutral-700">{body}</p>
            </div>
          ))}
        </section>
      </main>
    </PageShell>
  );
}
