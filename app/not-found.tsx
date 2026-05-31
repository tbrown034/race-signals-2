import Link from "next/link";
import { PageShell } from "@/src/components/page-shell";

export default function NotFound() {
  return (
    <PageShell>
      <main className="mx-auto max-w-3xl px-5 py-10 sm:px-8">
        <section className="border border-neutral-300 bg-white p-6">
          <p className="font-mono text-xs uppercase tracking-[0.18em] text-neutral-500">
            Not in scope
          </p>
          <h1 className="mt-2 text-2xl font-semibold tracking-tight">
            This page is not in the current Race Signals slice.
          </h1>
          <p className="mt-3 text-sm leading-6 text-neutral-700">
            Return to the feed, check outside spending, or review pipeline status
            to see what the current FEC ingest contains.
          </p>
          <div className="mt-5 flex flex-wrap gap-3 text-sm">
            <Link className="font-medium underline underline-offset-4" href="/">
              Feed
            </Link>
            <Link className="font-medium underline underline-offset-4" href="/spending">
              Outside spending
            </Link>
            <Link className="font-medium underline underline-offset-4" href="/status">
              Status
            </Link>
          </div>
        </section>
      </main>
    </PageShell>
  );
}
