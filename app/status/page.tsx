import { PageShell } from "@/src/components/page-shell";
import { getStatus } from "@/src/lib/db/repository";
import { formatDateTime } from "@/src/lib/format";

export default async function StatusPage() {
  const status = await getStatus();

  return (
    <PageShell>
      <main className="mx-auto max-w-6xl px-5 py-8 sm:px-8">
        <section className="border border-neutral-300 bg-white p-6">
          <p className="font-mono text-xs uppercase tracking-[0.18em] text-neutral-500">
            Data freshness
          </p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight">
            Pipeline status
          </h1>
          <p className="mt-3 text-sm leading-6 text-neutral-700">
            Current mode: <span className="font-semibold">{status.mode}</span>
          </p>
        </section>

        <section className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          {Object.entries(status.counts).map(([name, count]) => (
            <div className="border border-neutral-300 bg-white p-4" key={name}>
              <p className="font-mono text-xs uppercase tracking-[0.12em] text-neutral-500">
                {name}
              </p>
              <p className="mt-2 text-2xl font-semibold">{count}</p>
            </div>
          ))}
        </section>

        <section className="mt-6 overflow-hidden border border-neutral-300 bg-white">
          <table className="w-full text-left text-sm">
            <thead className="bg-neutral-100 text-xs uppercase tracking-[0.12em] text-neutral-500">
              <tr>
                <th className="px-4 py-3 font-medium">Source</th>
                <th className="px-4 py-3 font-medium">Scope</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium">Finished</th>
                <th className="px-4 py-3 font-medium">Records</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-200">
              {status.runs.map((run) => (
                <tr key={run.id}>
                  <td className="px-4 py-3">{run.source}</td>
                  <td className="px-4 py-3">{run.scope}</td>
                  <td className="px-4 py-3">{run.status}</td>
                  <td className="px-4 py-3">{formatDateTime(run.finishedAt ?? run.startedAt)}</td>
                  <td className="px-4 py-3">{run.recordsSeen}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      </main>
    </PageShell>
  );
}
