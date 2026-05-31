import Link from "next/link";

const sections = [
  {
    title: "North Star",
    body: "Race Signals is a feed-first civic data product for spotting early campaign-finance signals before they become obvious stories. The first version is narrow: FEC API only, focused on 2026 Indiana House races.",
  },
  {
    title: "Agent Memory",
    body: "The persistent working context for agentic tools lives in docs/agent-context.md. It stores product principles, FEC endpoint notes, Next.js caveats, schema boundaries and implementation guardrails.",
  },
  {
    title: "FEC API",
    body: "The first adapter uses FEC candidate search, candidate committees, committee reports, Schedule A receipts and Schedule E independent expenditures. Source URLs and raw IDs must be preserved for verification and deduping.",
  },
  {
    title: "Next.js",
    body: "This repo uses Next 16 App Router. Before changing framework-specific code, agents should read the relevant local docs under node_modules/next/dist/docs and follow AGENTS.md.",
  },
  {
    title: "MVP Discipline",
    body: "Do not add Meta, Google, FCC, IRS, OpenSecrets or dark-money datasets yet. Keep those as future source adapters after the FEC pipeline is working.",
  },
];

export default function DocsPage() {
  return (
    <main className="min-h-screen bg-stone-50 text-neutral-950">
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-8 px-5 py-8 sm:px-8">
        <header className="border-b border-neutral-300 pb-5">
          <p className="font-mono text-xs uppercase tracking-[0.18em] text-neutral-500">
            Internal documentation
          </p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight">
            Race Signals Agent Context
          </h1>
          <p className="mt-3 max-w-3xl text-sm leading-6 text-neutral-700">
            A compact reference page for the product north star, FEC API scope,
            local Next.js guidance and implementation boundaries.
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
          <div className="mt-4 overflow-hidden border border-neutral-300 bg-white">
            <table className="w-full text-left text-sm">
              <thead className="bg-neutral-100 text-xs uppercase tracking-[0.12em] text-neutral-500">
                <tr>
                  <th className="px-4 py-3 font-medium">File</th>
                  <th className="px-4 py-3 font-medium">Purpose</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-200">
                <tr>
                  <td className="px-4 py-3 font-mono text-xs">docs/agent-context.md</td>
                  <td className="px-4 py-3 text-neutral-700">
                    Long-lived agent memory and product guardrails.
                  </td>
                </tr>
                <tr>
                  <td className="px-4 py-3 font-mono text-xs">AGENTS.md</td>
                  <td className="px-4 py-3 text-neutral-700">
                    Repo-specific instruction to check local Next.js docs before edits.
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
                    Narrow 2026 Indiana House race scope.
                  </td>
                </tr>
              </tbody>
            </table>
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
  );
}
