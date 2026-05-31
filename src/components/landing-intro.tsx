import Link from "next/link";

export function LandingIntro() {
  return (
    <section aria-labelledby="landing-intro-title">
      <div className="border border-neutral-950 bg-neutral-950 px-5 py-8 text-white sm:px-10 sm:py-12">
        <p className="flex items-center gap-2 font-mono text-[11px] uppercase tracking-[0.22em] text-neutral-400">
          Race Signals
          <span aria-hidden="true" className="inline-flex items-center gap-0.5">
            <span className="inline-block h-2 w-2 bg-red-500" />
            <span className="inline-block h-2 w-2 bg-blue-500" />
            <span className="inline-block h-2 w-2 bg-emerald-500" />
          </span>
          <span className="ml-1 text-neutral-500">·</span>
          <span className="text-neutral-400">FEC alert desk</span>
        </p>
        <h2
          className="mt-3 max-w-4xl text-3xl font-semibold leading-tight tracking-tight sm:text-4xl"
          id="landing-intro-title"
        >
          A source-linked FEC signal feed for 2026 House and Senate races.
        </h2>
        <p className="mt-4 max-w-3xl text-sm leading-6 text-neutral-300 sm:text-base sm:leading-7">
          <strong className="font-semibold text-white">A signal is one FEC record that crossed a flat publishing rule</strong>{" "}
          — large outside spending, a fresh filing, a new candidate committee
          or a filing-level activity jump. Each signal carries a plain-English
          headline, a stable source ID, a why-it-matters line and a link back
          to the original FEC page. Built for reporters who need to verify
          paperwork before it becomes a story.
        </p>
        <p className="mt-3 max-w-3xl text-xs leading-5 text-neutral-400 sm:text-sm sm:leading-6">
          Not in scope: live election results, donor-by-donor receipts, paid
          race ratings, presidential, state and local races. Follow the FEC
          source link or use AP, DDHQ or your state authority for those.
        </p>

        <div className="mt-7 flex flex-wrap gap-2 text-sm">
          <Link
            className="border border-white bg-white px-4 py-2 font-semibold text-neutral-950 hover:bg-neutral-200"
            href="#signal-feed"
          >
            Browse the feed ↓
          </Link>
          <Link
            className="border border-neutral-600 px-4 py-2 font-medium text-white hover:border-white"
            href="/spending"
          >
            Outside spending →
          </Link>
          <Link
            className="border border-neutral-600 px-4 py-2 font-medium text-white hover:border-white"
            href="/raised"
          >
            Top fundraisers →
          </Link>
          <Link
            className="border border-neutral-600 px-4 py-2 font-medium text-white hover:border-white"
            href="/review"
          >
            Review queue →
          </Link>
          <Link
            className="border border-neutral-600 px-4 py-2 font-medium text-white hover:border-white"
            href="/methodology"
          >
            How it works →
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-1 divide-neutral-300 border-x border-b border-neutral-300 bg-white md:grid-cols-3 md:divide-x">
        <Step
          number="1"
          eyebrow="Ingest"
          title="FEC records"
          body="Candidates, committees, filings and Schedule E independent expenditures from the FEC API."
        />
        <Step
          number="2"
          eyebrow="Apply"
          title="Flat rules"
          body="Schedule E ≥ $25k, review flag at $100k, filing activity spikes ≥ $50k and ≥ 2× the prior filing."
        />
        <Step
          number="3"
          eyebrow="Publish"
          title="Source-linked alert"
          body="Plain headline, why-it-matters, rule text, FEC source URL and stable source ID for citation."
        />
      </div>

      <div className="grid grid-cols-1 gap-px border-x border-b border-neutral-300 bg-neutral-300 md:grid-cols-[1.1fr_1fr]">
        <SignalAnatomy />
        <ScopeMatrix />
      </div>
    </section>
  );
}

function Step({
  number,
  eyebrow,
  title,
  body,
}: {
  number: string;
  eyebrow: string;
  title: string;
  body: string;
}) {
  return (
    <div className="px-5 py-5 sm:px-6 sm:py-6">
      <p className="flex items-center gap-2 font-mono text-[11px] uppercase tracking-[0.18em] text-neutral-500">
        <span aria-hidden="true" className="inline-block h-2 w-2 bg-neutral-900" />
        Step {number} · {eyebrow}
      </p>
      <h3 className="mt-2 text-base font-semibold tracking-tight">{title}</h3>
      <p className="mt-1 text-sm leading-6 text-neutral-700">{body}</p>
    </div>
  );
}

function SignalAnatomy() {
  return (
    <div className="bg-white p-5 sm:p-6">
      <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-neutral-500">
        Anatomy of a signal
      </p>
      <p className="mt-1 text-xs text-neutral-600">
        Example. Generic placeholder candidate and committee, not a real record.
      </p>
      <article
        aria-label="Example signal card"
        className="mt-4 grid grid-cols-1 gap-3 border-l-[3px] border-l-red-700 border-y border-r border-neutral-300 bg-stone-50 px-4 py-4 md:grid-cols-[112px_1fr_140px]"
      >
        <div className="font-mono text-xs text-neutral-600">
          <p className="flex items-center gap-1.5 text-neutral-950">
            <span aria-hidden="true" className="inline-block h-2 w-2 bg-emerald-700" />
            May 15, 2026
          </p>
          <p className="mt-1 uppercase tracking-[0.12em]">Independent expenditure</p>
        </div>
        <div className="min-w-0">
          <h4 className="text-sm font-semibold leading-snug tracking-tight">
            ACME PAC reported a $250,000 Schedule E independent expenditure supporting Jane Doe in OH-12.
          </h4>
          <p className="mt-1 text-xs leading-5 text-neutral-700">
            Schedule E records show outside spending that is supposed to be independent of a campaign; verify the support/oppose code, purpose, amount and race before citing.
          </p>
          <p className="mt-2 font-mono text-[11px] uppercase tracking-[0.12em] text-neutral-600">
            Rule: Schedule E IE ≥ $25k; review at $100k.
          </p>
          <p className="mt-2 inline-flex flex-wrap items-center gap-1.5 text-xs text-neutral-600">
            <span aria-hidden="true" className="inline-block h-2 w-2 bg-blue-700" />
            <span>Jane Doe (DEM, OH-12, incumbent)</span>
          </p>
        </div>
        <div className="flex flex-wrap items-start gap-2 text-xs md:flex-col md:items-end">
          <span className="font-mono text-sm font-semibold text-neutral-950">$250,000</span>
          <span className="border border-red-700 px-2 py-1 font-mono text-[10px] uppercase tracking-[0.12em] text-red-800">
            REVIEW
          </span>
          <span className="font-mono text-[10px] uppercase tracking-[0.12em] text-neutral-500">
            Confidence: high
          </span>
          <span className="font-medium underline underline-offset-4">FEC source</span>
        </div>
      </article>
      <ul className="mt-4 space-y-2 text-xs leading-5 text-neutral-700">
        <Legend swatch="emerald" label="Fresh marker — event date within the last 48 hours." />
        <Legend swatch="red-stripe" label="Left stripe encodes signal type. Red is outside spending." />
        <Legend swatch="party" label="Party square: red Republican, blue Democrat, hollow other." />
        <Legend swatch="review" label="Review flag for $100k+ outside spending and other records that need editor checks." />
      </ul>
    </div>
  );
}

function Legend({
  swatch,
  label,
}: {
  swatch: "emerald" | "red-stripe" | "party" | "review";
  label: string;
}) {
  return (
    <li className="flex items-start gap-2">
      <SwatchGlyph kind={swatch} />
      <span>{label}</span>
    </li>
  );
}

function SwatchGlyph({ kind }: { kind: "emerald" | "red-stripe" | "party" | "review" }) {
  if (kind === "emerald") {
    return <span aria-hidden="true" className="mt-1 inline-block h-2 w-2 shrink-0 bg-emerald-700" />;
  }
  if (kind === "red-stripe") {
    return <span aria-hidden="true" className="mt-1 inline-block h-3 w-[3px] shrink-0 bg-red-700" />;
  }
  if (kind === "party") {
    return (
      <span aria-hidden="true" className="mt-1 inline-flex shrink-0 items-center gap-0.5">
        <span className="inline-block h-2 w-2 bg-red-700" />
        <span className="inline-block h-2 w-2 bg-blue-700" />
        <span className="inline-block h-2 w-2 border border-neutral-500" />
      </span>
    );
  }
  return (
    <span
      aria-hidden="true"
      className="mt-0.5 inline-flex h-3.5 shrink-0 items-center border border-red-700 px-1 font-mono text-[8px] uppercase tracking-[0.12em] text-red-800"
    >
      REV
    </span>
  );
}

function ScopeMatrix() {
  const rows = [
    ["In scope", true, "U.S. House and Senate, 2026 cycle"],
    ["In scope", true, "Schedule E independent expenditures (outside spending)"],
    ["In scope", true, "FEC committee filings, totals and committee records"],
    ["In scope", true, "Election timeline rows from Wikidata / Wikipedia, when available"],
    ["Not in scope", false, "Itemized Schedule A donor receipts (cost cap)"],
    ["Not in scope", false, "Live election-night results or projections"],
    ["Not in scope", false, "Presidential, state and local races"],
    ["Not in scope", false, "Paid race ratings, FCC ad files, dark-money overlays"],
  ] as const;
  return (
    <div className="bg-white p-5 sm:p-6">
      <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-neutral-500">
        What is and is not tracked
      </p>
      <p className="mt-1 text-xs text-neutral-600">
        Reporter verification still required for anything cited from this feed.
      </p>
      <ul className="mt-4 space-y-2 text-sm leading-5 text-neutral-800">
        {rows.map(([, present, body], index) => (
          <li className="flex items-start gap-3" key={index}>
            <span
              aria-hidden="true"
              className={`mt-1 inline-block h-2.5 w-2.5 shrink-0 ${present ? "bg-emerald-700" : "border border-neutral-500"}`}
            />
            <span>{body}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
