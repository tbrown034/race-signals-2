import { PageShell } from "@/src/components/page-shell";

export function EntityLoading({ eyebrow }: { eyebrow: string }) {
  return (
    <PageShell>
      <main className="mx-auto grid max-w-7xl grid-cols-1 gap-6 px-5 py-6 sm:px-8 lg:grid-cols-[320px_1fr]">
        <aside className="h-fit min-w-0 border border-neutral-300 bg-white p-5">
          <p className="font-mono text-xs uppercase tracking-[0.18em] text-neutral-500">
            {eyebrow}
          </p>
          <div className="mt-3 h-7 w-3/4 bg-neutral-200" />
          <div className="mt-6 space-y-4">
            <div className="h-4 w-28 bg-neutral-200" />
            <div className="h-4 w-40 bg-neutral-200" />
            <div className="h-4 w-32 bg-neutral-200" />
          </div>
        </aside>
        <section className="min-w-0 border border-neutral-300 bg-white">
          <div className="border-b border-neutral-300 px-5 py-4">
            <div className="h-4 w-40 bg-neutral-200" />
          </div>
          <div className="space-y-4 p-5">
            <div className="h-5 w-3/4 bg-neutral-200" />
            <div className="h-4 w-full bg-neutral-200" />
            <div className="h-4 w-2/3 bg-neutral-200" />
          </div>
        </section>
      </main>
    </PageShell>
  );
}
