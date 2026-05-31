import Link from "next/link";
import { PageShell } from "@/src/components/page-shell";
import { getStatus } from "@/src/lib/db/repository";
import { formatDateTime, formatMoney, isOlderThanHours } from "@/src/lib/format";
import { endpointHealthClass } from "@/src/lib/status-health";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Pipeline status",
  description: "Race Signals data freshness, ingestion runs and validation issue rollups.",
};

const countLabels: Record<string, string> = {
  races: "Race shells",
  candidates: "Candidates",
  committees: "Committees",
  independentExpenditures: "Independent expenditures",
  signals: "Signals",
};

export default async function StatusPage() {
  const status = await getStatus();
  const latestRun = status.runs[0];

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

        <PublishabilityPanel
          latestRun={latestRun}
          mode={status.mode}
          validationIssueCount={status.validationIssues.reduce((sum, issue) => sum + issue.count, 0)}
        />
        <ReporterActionPanel
          latestRun={latestRun}
          validationIssueCount={status.validationIssues.reduce((sum, issue) => sum + issue.count, 0)}
        />

        <section className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          {Object.entries(status.counts).map(([name, count]) => (
            <div className="border border-neutral-300 bg-white p-4" key={name}>
              <p className="font-mono text-xs uppercase tracking-[0.12em] text-neutral-500">
                {countLabels[name] ?? name}
              </p>
              <p className="mt-2 text-2xl font-semibold">{count}</p>
            </div>
          ))}
        </section>

        <section className="mt-6 border border-neutral-300 bg-white p-5">
          <h2 className="text-sm font-semibold uppercase tracking-[0.14em] text-neutral-600">
            Election timeline coverage
          </h2>
          <p className="mt-2 text-sm leading-6 text-neutral-700">
            {status.electionCoverage.withRows} of {status.electionCoverage.candidates} candidates
            currently have at least one Wikidata/Wikipedia election row. {status.electionCoverage.checked} candidates
            have been checked; {status.electionCoverage.withIdentifiers} have a Wikidata or Wikipedia identifier.
            Missing timelines usually mean the open sources have not been structured yet, not that no election exists.
          </p>
          <dl className="mt-4 grid gap-3 sm:grid-cols-5">
            <CoverageStat label="Candidates" value={status.electionCoverage.candidates} />
            <CoverageStat label="With IDs" value={status.electionCoverage.withIdentifiers} />
            <CoverageStat label="Checked" value={status.electionCoverage.checked} />
            <CoverageStat label="With rows" value={status.electionCoverage.withRows} />
            <CoverageStat label="Rows" value={status.electionCoverage.electionRows} />
          </dl>
        </section>

        <section className="mt-6 border border-neutral-300 bg-white p-5">
          <h2 className="text-sm font-semibold uppercase tracking-[0.14em] text-neutral-600">
            Storage footprint
          </h2>
          <p className="mt-2 text-sm leading-6 text-neutral-700">
            Database size is {formatBytes(status.storageUsage.databaseSizeBytes)}. The target operating model is Neon free-tier compatible; large storage jumps usually mean an ingest scope changed.
          </p>
          {status.storageUsage.largestTables.length ? (
            <div className="mt-4 overflow-x-auto">
              <table className="w-full min-w-[560px] text-left text-sm">
                <thead className="bg-neutral-100 font-mono text-xs uppercase tracking-[0.12em] text-neutral-500">
                  <tr>
                    <th className="px-4 py-3 font-medium" scope="col">Table</th>
                    <th className="px-4 py-3 text-right font-medium" scope="col">Size</th>
                    <th className="px-4 py-3 text-right font-medium" scope="col">Rows</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-200">
                  {status.storageUsage.largestTables.map((table) => (
                    <tr key={table.tableName}>
                      <td className="px-4 py-3 font-mono">{table.tableName}</td>
                      <td className="px-4 py-3 text-right font-mono">{formatBytes(table.totalBytes)}</td>
                      <td className="px-4 py-3 text-right font-mono">{table.rowCount ?? "Estimate unavailable"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : null}
        </section>

        <section className="mt-6 border border-neutral-300 bg-white">
          <div className="border-b border-neutral-300 px-5 py-4">
            <h2 className="text-sm font-semibold uppercase tracking-[0.14em] text-neutral-600">
              Endpoint freshness
            </h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] text-left text-sm">
              <caption className="border-b border-neutral-300 px-4 py-3 text-left">
                {/* Status uses the same square shape with operational meanings, bounded to this page. */}
                <span className="inline-flex flex-wrap items-center gap-x-4 gap-y-2 font-mono text-[11px] uppercase tracking-[0.12em] text-neutral-600">
                  <LegendSquare className="bg-emerald-700" label="Healthy" />
                  <LegendSquare className="bg-amber-700" label="Stale/partial" />
                  <LegendSquare className="bg-red-700" label="Error" />
                  <LegendSquare className="border border-neutral-500" label="No runs" />
                </span>
              </caption>
              <thead className="bg-neutral-100 text-xs uppercase tracking-[0.12em] text-neutral-500">
                <tr>
                  <th className="px-4 py-3 font-medium" scope="col">Endpoint</th>
                  <th className="px-4 py-3 font-medium" scope="col">Latest run</th>
                  <th className="px-4 py-3 font-medium" scope="col">Records fetched</th>
                  <th className="px-4 py-3 font-medium" scope="col">Validation issues</th>
                  <th className="px-4 py-3 font-medium" scope="col">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-200">
                {status.endpoints.length ? (
                  status.endpoints.map((endpoint) => (
                    <tr key={endpoint.endpoint}>
                      <td className="px-4 py-3 font-mono">
                        <span className="inline-flex items-center gap-2">
                          <HealthSquare endpoint={endpoint} />
                          {endpointLabel(endpoint.endpoint)}
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
          </div>
        </section>

        {status.candidateSignalGaps.length ? (
          <section className="mt-6 border border-neutral-300 bg-white">
            <div className="border-b border-neutral-300 px-5 py-4">
              <h2 className="text-sm font-semibold uppercase tracking-[0.14em] text-neutral-600">
                Candidate signal gaps
              </h2>
              <p className="mt-1 text-sm text-neutral-600">
                FEC candidates in this database slice with no generated signal yet. Treat these as coverage caveats, not as proof of inactivity.
              </p>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[760px] text-left text-sm">
                <thead className="bg-neutral-100 text-xs uppercase tracking-[0.12em] text-neutral-500">
                  <tr>
                    <th className="px-4 py-3 font-medium" scope="col">Candidate</th>
                    <th className="px-4 py-3 font-medium" scope="col">Race</th>
                    <th className="px-4 py-3 text-right font-medium" scope="col">Cycle receipts</th>
                    <th className="px-4 py-3 font-medium" scope="col">FEC record</th>
                    <th className="px-4 py-3 font-medium" scope="col">Totals loaded</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-200">
                  {status.candidateSignalGaps.map((candidate) => (
                    <tr key={candidate.id}>
                      <td className="px-4 py-3">
                        <Link className="font-medium underline underline-offset-4" href={`/candidates/${candidate.id}`}>
                          {candidate.name}
                        </Link>
                      </td>
                      <td className="px-4 py-3">
                        {candidate.raceId ? (
                          <Link className="font-medium underline underline-offset-4" href={`/races/${candidate.raceId}`}>
                            {candidate.raceName ?? candidate.raceId}
                          </Link>
                        ) : (
                          "Race not matched"
                        )}
                      </td>
                      <td className="px-4 py-3 text-right font-mono">
                        {formatMoney(candidate.totalReceiptsCycle) ?? "FEC totals not loaded"}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex flex-col gap-1">
                          <span className="font-mono text-xs text-neutral-700">{candidate.fecCandidateId}</span>
                          {candidate.sourceUrl ? (
                            <a
                              className="text-xs font-medium underline underline-offset-4"
                              href={candidate.sourceUrl}
                              rel="noreferrer"
                              target="_blank"
                            >
                              Verify at FEC
                            </a>
                          ) : (
                            <span className="text-xs text-neutral-500">Source not stored</span>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-xs text-neutral-600">
                        {candidate.totalsUpdatedAt ? formatDateTime(candidate.totalsUpdatedAt) : "FEC totals not loaded"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        ) : null}

        <section className="mt-6 border border-neutral-300 bg-white">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[980px] text-left text-sm">
            <thead className="bg-neutral-100 text-xs uppercase tracking-[0.12em] text-neutral-500">
              <tr>
                <th className="px-4 py-3 font-medium" scope="col">Source</th>
                <th className="px-4 py-3 font-medium" scope="col">Mode</th>
                <th className="px-4 py-3 font-medium" scope="col">Scope</th>
                <th className="px-4 py-3 font-medium" scope="col">Status</th>
                <th className="px-4 py-3 font-medium" scope="col">Window</th>
                <th className="px-4 py-3 font-medium" scope="col">Finished</th>
                <th className="px-4 py-3 font-medium" scope="col">Records</th>
                <th className="px-4 py-3 font-medium" scope="col">Run notes</th>
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
                  <td className="px-4 py-3 text-xs leading-5 text-neutral-700">
                    {runNotes(run)}
                  </td>
                </tr>
              ))}
            </tbody>
            </table>
          </div>
        </section>

        <section className="mt-6 border border-neutral-300 bg-white">
          <div className="border-b border-neutral-300 px-5 py-4">
            <h2 className="text-sm font-semibold uppercase tracking-[0.14em] text-neutral-600">
              Validation issue rollup
            </h2>
            <p className="mt-1 text-sm text-neutral-600">
              Data-quality checks opened by ingest. These are reporting caveats, not fatal errors.
            </p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[680px] text-left text-sm">
              <thead className="bg-neutral-100 text-xs uppercase tracking-[0.12em] text-neutral-500">
                <tr>
                  <th className="px-4 py-3 font-medium" scope="col">Rule</th>
                  <th className="px-4 py-3 font-medium" scope="col">Severity</th>
                  <th className="px-4 py-3 text-right font-medium" scope="col">Count</th>
                  <th className="px-4 py-3 font-medium" scope="col">Latest</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-200">
                {status.validationIssues.length ? (
                  status.validationIssues.map((issue) => (
                    <tr key={`${issue.rule}-${issue.severity}`}>
                      <td className="px-4 py-3">
                        <span className="block font-medium">{validationRuleLabel(issue.rule)}</span>
                        <span className="mt-1 block font-mono text-xs text-neutral-500">{issue.rule}</span>
                      </td>
                      <td className="px-4 py-3">{issue.severity}</td>
                      <td className="px-4 py-3 text-right font-mono">{issue.count}</td>
                      <td className="px-4 py-3">{formatDateTime(issue.latestAt)}</td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td className="px-4 py-3 text-neutral-600" colSpan={4}>
                      No validation issues have been recorded in this database.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>
      </main>
    </PageShell>
  );
}

function ReporterActionPanel({
  latestRun,
  validationIssueCount,
}: {
  latestRun?: {
    status: string;
    state?: string | null;
    scope: string;
    finishedAt?: string | null;
    startedAt: string;
  };
  validationIssueCount: number;
}) {
  const finishedAt = latestRun?.finishedAt ?? latestRun?.startedAt ?? null;
  const stale = isOlderThanHours(finishedAt, 36);
  const scope = latestRun?.state ? `${latestRun.state} slice` : latestRun?.scope ?? "no recorded ingest";
  const absenceRead = stale
    ? "Do not treat absence of a signal as meaningful until the next ingest succeeds."
    : "Absence of a signal only means no stored FEC record matched this slice and threshold.";

  return (
    <section className="mt-4 border border-neutral-300 bg-white p-5">
      <h2 className="text-sm font-semibold uppercase tracking-[0.14em] text-neutral-600">
        What this means
      </h2>
      <div className="mt-3 grid gap-3 text-sm leading-6 text-neutral-700 md:grid-cols-3">
        <p>
          Latest usable scope: <span className="font-semibold text-neutral-950">{scope}</span>. Use filters with that scope in mind.
        </p>
        <p>{absenceRead}</p>
        <p>
          Before publication, open the FEC source link and account for {validationIssueLabel(validationIssueCount)}.
        </p>
      </div>
    </section>
  );
}

function PublishabilityPanel({
  latestRun,
  mode,
  validationIssueCount,
}: {
  latestRun?: {
    status: string;
    state?: string | null;
    scope: string;
    finishedAt?: string | null;
    startedAt: string;
    errors: unknown[];
  };
  mode: string;
  validationIssueCount: number;
}) {
  const finishedAt = latestRun?.finishedAt ?? latestRun?.startedAt ?? null;
  const isPartial = latestRun?.status === "partial";
  const isError = latestRun?.status === "failed" || latestRun?.status === "error";
  const headline = isError
    ? "Use with caution: latest ingest recorded an error."
    : isPartial
      ? "Use with caution: latest ingest is partial."
      : "Usable with source checks.";
  const scope = latestRun?.state ? `State ${latestRun.state}` : latestRun?.scope ?? "No ingest run recorded";

  return (
    <section className="mt-6 border border-neutral-300 bg-white p-5">
      <p className="font-mono text-xs uppercase tracking-[0.18em] text-neutral-500">
        Publishability read
      </p>
      <h2 className="mt-2 text-lg font-semibold">{headline}</h2>
      <p className="mt-2 max-w-3xl text-sm leading-6 text-neutral-700">
        Race Signals is a source-finding desk, not an election-night wire. Cite the linked FEC record,
        check the current ingest scope, and do not treat an empty result as proof of no activity.
      </p>
      <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-4">
        <div>
          <dt className="font-mono text-[11px] uppercase tracking-[0.12em] text-neutral-500">Mode</dt>
          <dd className="mt-1 font-medium">{mode}</dd>
        </div>
        <div>
          <dt className="font-mono text-[11px] uppercase tracking-[0.12em] text-neutral-500">Latest scope</dt>
          <dd className="mt-1 font-medium">{scope}</dd>
        </div>
        <div>
          <dt className="font-mono text-[11px] uppercase tracking-[0.12em] text-neutral-500">Finished</dt>
          <dd className="mt-1 font-medium">{formatDateTime(finishedAt)}</dd>
        </div>
        <div>
          <dt className="font-mono text-[11px] uppercase tracking-[0.12em] text-neutral-500">Open caveats</dt>
          <dd className="mt-1 font-medium">{validationIssueLabel(validationIssueCount)}</dd>
        </div>
      </dl>
      {latestRun?.errors?.length ? (
        <p className="mt-3 text-sm leading-6 text-neutral-700">
          Latest run recorded {latestRun.errors.length} error{latestRun.errors.length === 1 ? "" : "s"}:
          {" "}<span className="font-mono text-xs">{runErrorSummary(latestRun.errors[0])}</span>.
          Inspect run notes before relying on freshness.
        </p>
      ) : null}
    </section>
  );
}

function validationIssueLabel(count: number) {
  return `${count} validation ${count === 1 ? "issue" : "issues"}`;
}

function runErrorSummary(error: unknown) {
  if (error && typeof error === "object") {
    const record = error as Record<string, unknown>;
    const message = typeof record.message === "string" ? record.message : "error";
    const context = [
      typeof record.candidateId === "string" ? `candidate ${record.candidateId}` : null,
      typeof record.endpoint === "string" ? `endpoint ${record.endpoint}` : null,
    ].filter(Boolean);
    return context.length ? `${message} (${context.join(", ")})` : message;
  }
  return String(error ?? "error");
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

function runNotes(run: {
  recordsInserted: number;
  recordsUpdated: number;
  errors: unknown[];
  metadata: Record<string, unknown>;
  state?: string | null;
}) {
  const caps = [
    noteValue("state", run.state),
    noteValue("max candidates", run.metadata.maxCandidates),
    noteValue("candidate pages", run.metadata.maxCandidatePages),
    noteValue("delay", run.metadata.requestDelayMs ? `${run.metadata.requestDelayMs}ms` : null),
  ].filter(Boolean);
  const changes = `${run.recordsInserted} inserted, ${run.recordsUpdated} updated`;
  const errorCount = Array.isArray(run.errors) ? run.errors.length : 0;
  return [changes, ...caps, errorCount ? `${errorCount} errors` : null].filter(Boolean).join(" | ");
}

function noteValue(label: string, value: unknown) {
  if (value === null || value === undefined || value === "") return null;
  return `${label}: ${String(value)}`;
}

function validationRuleLabel(rule: string) {
  const labels: Record<string, string> = {
    broken_source_url: "Broken or missing source URL",
    missing_candidate_name: "Missing candidate name",
    missing_committee_id: "Missing committee ID",
    missing_date: "Missing date",
    missing_source_id: "Missing source ID",
    unmatched_race: "Unmatched race",
    suspicious_amount: "Suspicious amount",
    duplicate_source_record: "Duplicate source record",
    elections_lookup: "Election timeline lookup",
  };
  return labels[rule] ?? rule.replaceAll("_", " ");
}

function endpointLabel(endpoint: string) {
  if (endpoint === "schedule_a") return "schedule_a (disabled)";
  return endpoint;
}

function CoverageStat({ label, value }: { label: string; value: number }) {
  return (
    <div>
      <dt className="font-mono text-[11px] uppercase tracking-[0.12em] text-neutral-500">{label}</dt>
      <dd className="mt-1 text-lg font-semibold tabular-nums">{value}</dd>
    </div>
  );
}

function formatBytes(bytes?: number | null) {
  if (bytes === null || bytes === undefined) return "unknown";
  if (bytes < 1024) return `${bytes} B`;
  const units = ["KB", "MB", "GB"];
  let value = bytes / 1024;
  let unit = units[0];
  for (let index = 1; index < units.length && value >= 1024; index += 1) {
    value /= 1024;
    unit = units[index];
  }
  return `${value.toFixed(value >= 10 ? 1 : 2)} ${unit}`;
}
