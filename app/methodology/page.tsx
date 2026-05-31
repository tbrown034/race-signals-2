import { PageShell } from "@/src/components/page-shell";
import { PartySquare } from "@/src/components/party-square";

const steps = [
  ["Scope", "Start with generated 2026 U.S. House races across all 50 states plus 2026 Senate races."],
  ["Fetch", "Use FEC candidate, candidate totals, committee, report and independent expenditure endpoints."],
  ["Normalize", "Map FEC records into stable internal candidates, committees, filings and expenditures."],
  ["Validate", "Flag missing names, committee IDs, dates, source URLs, unmatched races and unusually large amounts."],
  ["Signal", "Convert source records into plain-English alerts with source links, dates, confidence and freshness."],
  [
    "Photos",
    "Member photos are sourced from the U.S. Congressional Biographical Directory, public domain, mirrored via theunitedstates.io. Photos appear only for currently sitting members of Congress. Candidate identifier crosswalk comes from the unitedstates/congress-legislators project, public domain.",
  ],
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

        <section className="mt-6 border border-neutral-300 bg-white p-5">
          <h2 className="text-base font-semibold">Visual language</h2>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-neutral-700">
            Small squares are scanning aids, not replacements for source-linked text:
            Republican candidates use red, Democratic candidates use blue, all other
            parties use a hollow neutral square, and fresh signals use emerald when
            a new signal event is within 48 hours. The status page deliberately
            reuses the square shape for operational health states, bounded to that
            page only.
          </p>
          <div className="mt-4 flex flex-wrap gap-x-5 gap-y-2 font-mono text-[11px] uppercase tracking-[0.12em] text-neutral-600">
            <span className="inline-flex items-center gap-1.5">
              <PartySquare party="REP" /> Republican
            </span>
            <span className="inline-flex items-center gap-1.5">
              <PartySquare party="DEM" /> Democrat
            </span>
            <span className="inline-flex items-center gap-1.5">
              <PartySquare party="IND" /> Other party
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span aria-hidden="true" className="inline-block h-2 w-2 bg-emerald-700" />
              Fresh signal
            </span>
          </div>
        </section>
      </main>
    </PageShell>
  );
}
