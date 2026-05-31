import { PageShell } from "@/src/components/page-shell";
import { PartySquare } from "@/src/components/party-square";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Methodology",
  description: "How Race Signals turns FEC records into source-linked campaign-finance alerts.",
};

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
  [
    "Election timeline",
    "Election dates and results are pulled from Wikidata (CC0) and Wikipedia (CC BY-SA 4.0). Wikidata is the primary source; Wikipedia is used as a fallback when structured data is not yet available. Results trail real-world election calls by 1-3 days for major races and longer for House primaries with limited volunteer coverage. Each row links to its underlying source so reporters can verify. We do not call elections or scrape real-time results. For breaking-night results, use AP, DDHQ, or your state's official tabulator.",
  ],
];

const signalTypes = [
  [
    "new_committee",
    "New committee",
    "A new candidate-linked committee can be the first durable paperwork signal that a campaign is moving from exploration to execution.",
  ],
  [
    "new_filing",
    "New filing",
    "A new report can reveal changed cash position, spending pace and committee activity before those shifts show up in public campaigning.",
  ],
  [
    "large_independent_expenditure",
    "Independent expenditure",
    "A large outside-spending report can show where groups think a race or candidate is worth influencing.",
  ],
  [
    "committee_activity_spike",
    "Activity spike",
    "A filing-level spike flags a committee whose latest stored filing receipts crossed the flat review threshold and doubled the prior stored filing.",
  ],
  [
    "large_contribution",
    "Large receipt",
    "Kept for historical compatibility. Production ingest does not currently store itemized Schedule A receipts under the low-cost MVP.",
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

        <section className="mt-6 border border-neutral-300 bg-white">
          <div className="border-b border-neutral-300 p-5">
            <h2 className="text-base font-semibold">Signal types</h2>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-neutral-700">
              Signal thresholds are intentionally flat and stable. Race Signals does
              not use adaptive scoring, percentile baselines or statistical anomaly
              detection in this MVP. Large independent expenditures start at
              $25,000. Filing-level activity spikes require at least $50,000 in
              latest filing receipts and at least 2x the prior comparable filing.
              Current-cycle Schedule E independent expenditures of $100,000 or
              more are marked for review.
            </p>
          </div>
          {signalTypes.map(([id, title, body]) => (
            <div className="border-b border-neutral-300 p-5 last:border-b-0" id={id} key={id}>
              <h3 className="font-mono text-xs uppercase tracking-[0.14em] text-neutral-500">
                {title}
              </h3>
              <p className="mt-2 text-sm leading-6 text-neutral-700">{body}</p>
            </div>
          ))}
        </section>

        <section className="mt-6 border border-neutral-300 bg-white p-5" id="confidence">
          <h2 className="text-base font-semibold">Confidence and review labels</h2>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-neutral-700">
            Confidence is a data-quality label, not an importance score. High means
            the source record links cleanly to a candidate, committee, race and FEC
            source URL. Medium means the record is useful but needs extra context,
            often because a large outside-spending record or filing-level comparison
            deserves a human check. Low is reserved for records with missing or
            weakly matched context. Review marks unusually large amounts or records
            that should be verified before publication.
          </p>
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
