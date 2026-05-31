import { PageShell } from "@/src/components/page-shell";
import { getStatus } from "@/src/lib/db/repository";
import { formatDateTime } from "@/src/lib/format";
import { endpointHealthClass } from "@/src/lib/status-health";

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
          <div className="border-b border-neutral-300 px-5 py-4">
            <h2 className="text-sm font-semibold uppercase tracking-[0.14em] text-neutral-600">
              Endpoint freshness
            </h2>
          </div>
          <table className="w-full text-left text-sm">
            <caption className="border-b border-neutral-300 px-4 py-3 text-left">
              {/* Status uses the same square shape with operational meanings, bounded to this page. */}
              <span className="inline-flex flex-wrap items-center gap-x-4 gap-y-2 font-mono text-[11px] uppercase tracking-[0.12em] text-neutral-600">
                <LegendSquare className="bg-emerald-700" label="Healthy" />
                <LegendSquare className="bg-amber-700" label="Stale" />
                <LegendSquare className="bg-red-700" label="Error" />
                <LegendSquare className="border border-neutral-500" label="No runs" />
              </span>
            </caption>
            <thead className="bg-neutral-100 text-xs uppercase tracking-[0.12em] text-neutral-500">
              <tr>
                <th className="px-4 py-3 font-medium">Endpoint</th>
                <th className="px-4 py-3 font-medium">Last successful run</th>
                <th className="px-4 py-3 font-medium">Records fetched</th>
                <th className="px-4 py-3 font-medium">Validation issues</th>
                <th className="px-4 py-3 font-medium">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-200">
              {status.endpoints.length ? (
                status.endpoints.map((endpoint) => (
                  <tr key={endpoint.endpoint}>
                    <td className="px-4 py-3 font-mono">
                      <span className="inline-flex items-center gap-2">
                        <HealthSquare endpoint={endpoint} />
                        {endpoint.endpoint}
                      </span>
                    </td>
                    <td className="px-4 py-3">{formatDateTime(endpoint.completedAt)}</td>
                    <td className="px-4 py-3">{endpoint.recordsFetched}</td>
                    <td className="px-4 py-3">{endpoint.validationIssuesCount}</td>
                    <td className="px-4 py-3">{endpoint.status}</td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td className="px-4 py-3 text-neutral-600" colSpan={5}>
                    <span className="inline-flex items-center gap-2">
                      <span aria-hidden="true" className="inline-block h-2 w-2 border border-neutral-500" />
                      No endpoint-level freshness has been recorded yet.
                    </span>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </section>

        <section className="mt-6 overflow-hidden border border-neutral-300 bg-white">
          <table className="w-full text-left text-sm">
            <thead className="bg-neutral-100 text-xs uppercase tracking-[0.12em] text-neutral-500">
              <tr>
                <th className="px-4 py-3 font-medium">Source</th>
                <th className="px-4 py-3 font-medium">Mode</th>
                <th className="px-4 py-3 font-medium">Scope</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium">Window</th>
                <th className="px-4 py-3 font-medium">Finished</th>
                <th className="px-4 py-3 font-medium">Records</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-200">
              {status.runs.map((run) => (
                <tr key={run.id}>
                  <td className="px-4 py-3">{run.source}</td>
                  <td className="px-4 py-3">{run.mode ?? "watch"}</td>
                  <td className="px-4 py-3">{run.scope}</td>
                  <td className="px-4 py-3">{run.status}</td>
                  <td className="px-4 py-3">
                    {run.windowStart && run.windowEnd
                      ? `${run.windowStart} to ${run.windowEnd}`
                      : "Current"}
                  </td>
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

function LegendSquare({ className, label }: { className: string; label: string }) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <span aria-hidden="true" className={`inline-block h-2 w-2 ${className}`} />
      {label}
    </span>
  );
}

function HealthSquare({
  endpoint,
}: {
  endpoint: { completedAt: string; status: string };
}) {
  return <span aria-hidden="true" className={`inline-block h-2 w-2 ${endpointHealthClass(endpoint)}`} />;
}
