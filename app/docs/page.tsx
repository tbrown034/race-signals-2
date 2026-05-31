import Link from "next/link";
import { PageShell } from "@/src/components/page-shell";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Product notes",
  description: "Race Signals source notes, project scope and implementation guardrails.",
};

const sections = [
  {
    title: "North Star",
    body: "Race Signals is a feed-first civic data product for spotting early campaign-finance signals before they become obvious stories. Campaign-finance records come from the FEC API; election and photo context comes from attributed public sources when available.",
  },
  {
    title: "Working Notes",
    body: "The project reference file at docs/agent-context.md stores product principles, FEC endpoint notes, schema boundaries and implementation guardrails.",
  },
  {
    title: "FEC API",
    body: "The first adapter uses FEC candidate search, candidate totals, candidate committees, committee reports and Schedule E independent expenditures. Itemized Schedule A receipts are disabled for cost control. Source URLs, source IDs and source kinds must be preserved for verification and deduping.",
  },
  {
    title: "Coverage Truth",
    body: "The schema can represent national 2026 House and Senate race shells, but the scheduled ingest is capped to a small daily slice. Stored signal counts should be read as current database coverage, not a national activity total.",
  },
  {
    title: "Implementation",
    body: "The application uses Next 16 App Router, TypeScript, Tailwind and raw SQL against Postgres. Server-rendered read routes stay separate from ingestion logic.",
  },
  {
    title: "MVP Discipline",
    body: "Do not add Meta, Google, FCC, IRS, OpenSecrets, dark-money datasets, saved filters, RSS, email digests or donor-level storage yet. Keep future source ideas behind adapter boundaries.",
  },
];

export default function DocsPage() {
  return (
    <PageShell>
      <main>
        <div className="mx-auto flex w-full max-w-5xl flex-col gap-8 px-5 py-8 sm:px-8">
          <header className="border-b border-neutral-300 pb-5">
            <p className="font-mono text-xs uppercase tracking-[0.18em] text-neutral-500">
              Product notes
            </p>
            <h1 className="mt-2 text-3xl font-semibold tracking-tight">
              Race Signals source and project notes
            </h1>
            <p className="mt-3 max-w-3xl text-sm leading-6 text-neutral-700">
              A compact reference page for the product north star, FEC API scope,
              source boundaries and implementation guardrails.
            </p>
          </header>

        <section className="grid gap-4 md:grid-cols-2">
          {sections.map((section) => (
            <article
              className="border border-neutral-300 bg-white p-5"
              key={section.title}
            >
              <h2 className="text-base font-semibold">{section.title}</h2>
              <p className="mt-2 text-sm leading-6 text-neutral-700">
                {section.body}
              </p>
            </article>
          ))}
        </section>

        <section className="border-t border-neutral-300 pt-6">
          <h2 className="text-sm font-semibold uppercase tracking-[0.14em] text-neutral-600">
            Canonical Files
          </h2>
          <div className="mt-4 border border-neutral-300 bg-white">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[620px] text-left text-sm">
              <thead className="bg-neutral-100 text-xs uppercase tracking-[0.12em] text-neutral-500">
                <tr>
                  <th className="px-4 py-3 font-medium" scope="col">File</th>
                  <th className="px-4 py-3 font-medium" scope="col">Purpose</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-200">
                <tr>
                  <td className="px-4 py-3 font-mono text-xs">docs/agent-context.md</td>
                  <td className="px-4 py-3 text-neutral-700">
                    Product guardrails, source scope and implementation notes.
                  </td>
                </tr>
                <tr>
                  <td className="px-4 py-3 font-mono text-xs">AGENTS.md</td>
                  <td className="px-4 py-3 text-neutral-700">
                    Local development conventions for this repository.
                  </td>
                </tr>
                <tr>
                  <td className="px-4 py-3 font-mono text-xs">db/schema.sql</td>
                  <td className="px-4 py-3 text-neutral-700">
                    Neon-compatible schema for normalized FEC data and signals.
                  </td>
                </tr>
                <tr>
                  <td className="px-4 py-3 font-mono text-xs">src/lib/scope.ts</td>
                  <td className="px-4 py-3 text-neutral-700">
                    Generated 2026 U.S. House and Senate scope.
                  </td>
                </tr>
              </tbody>
              </table>
            </div>
          </div>
        </section>

        <footer className="flex flex-wrap gap-3 border-t border-neutral-300 pt-5 text-sm">
          <Link className="font-medium underline underline-offset-4" href="/">
            Feed
          </Link>
          <Link
            className="font-medium underline underline-offset-4"
            href="/methodology"
          >
            Methodology
          </Link>
          <Link className="font-medium underline underline-offset-4" href="/status">
            Data status
          </Link>
          <a
            className="font-medium underline underline-offset-4"
            href="https://api.open.fec.gov/developers/"
          >
            FEC API docs
          </a>
        </footer>
        </div>
      </main>
    </PageShell>
  );
}
