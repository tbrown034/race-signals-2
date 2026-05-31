import Link from "next/link";
import { PageShell } from "@/src/components/page-shell";
import { getScheduleERecordSummary, getScheduleERecords } from "@/src/lib/db/repository";
import { formatCount, formatDate, formatMoney } from "@/src/lib/format";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Schedule E evidence records",
  description: "All stored current-cycle Schedule E independent expenditure records for a scoped Race Signals view.",
};
export const revalidate = 300;

export default async function ScheduleERecordsPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const params = await searchParams;
  const raceId = textParam(params.race);
  const committeeId = textParam(params.committee);
  const candidateId = textParam(params.candidate);
  const state = textParam(params.state)?.toUpperCase();
  const filters = {
    candidateId,
    committeeId,
    raceId,
    state,
  };
  const [records, summary] = await Promise.all([
    getScheduleERecords({
      ...filters,
      limit: 500,
    }),
    getScheduleERecordSummary(filters),
  ]);
  const activeScope = [
    state ? `state ${state}` : null,
    raceId ? `race ${raceId}` : null,
    committeeId ? `spender ${committeeId}` : null,
    candidateId ? `candidate ${candidateId}` : null,
  ].filter(Boolean);
  const exportQuery = new URLSearchParams();
  if (state) exportQuery.set("state", state);
  if (raceId) exportQuery.set("race", raceId);
  if (committeeId) exportQuery.set("committee", committeeId);
  if (candidateId) exportQuery.set("candidate", candidateId);
  const exportSuffix = exportQuery.toString();

  return (
    <PageShell>
      <main className="mx-auto max-w-7xl px-5 py-6 sm:px-8">
        <section className="border border-neutral-300 bg-white">
          <div className="border-b border-neutral-300 px-5 py-5">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
              <div className="min-w-0 max-w-[calc(100vw-5rem)] sm:max-w-none">
                <p className="font-mono text-xs uppercase tracking-[0.18em] text-neutral-500">
                  Schedule E evidence
                </p>
                <h1 className="mt-1 max-w-full whitespace-normal break-words text-xl font-semibold tracking-tight [overflow-wrap:anywhere]">
                  Schedule E records
                </h1>
                <p className="mt-2 max-w-full whitespace-normal break-words text-sm leading-6 text-neutral-700 [overflow-wrap:anywhere] sm:max-w-3xl">
                  Stored Schedule E rows. Includes records below the $25,000 alert threshold, with source links for checking totals before publication.
                </p>
                {activeScope.length ? (
                  <p className="mt-2 font-mono text-[11px] uppercase tracking-[0.12em] text-neutral-500">
                    Filtered by {activeScope.join(" / ")}
                  </p>
                ) : null}
              </div>
              <div className="grid max-w-[calc(100vw-5rem)] grid-cols-1 gap-2 text-sm sm:flex sm:max-w-none sm:flex-wrap">
                <a
                  className="w-[280px] max-w-full border border-neutral-400 px-3 py-2 font-medium hover:border-neutral-900 sm:w-auto"
                  href={`/api/schedule-e/export.csv${exportSuffix ? `?${exportSuffix}` : ""}`}
                >
                  Export CSV
                </a>
                <a
                  className="w-[280px] max-w-full border border-neutral-400 px-3 py-2 font-medium hover:border-neutral-900 sm:w-auto"
                  href={`/api/schedule-e/export.json${exportSuffix ? `?${exportSuffix}` : ""}`}
                >
                  Export JSON
                </a>
                <Link className="w-[280px] max-w-full border border-neutral-400 px-3 py-2 font-medium hover:border-neutral-900 sm:w-auto" href="/spending">
                  Signals
                </Link>
                <Link className="w-[280px] max-w-full border border-neutral-400 px-3 py-2 font-medium hover:border-neutral-900 sm:w-auto" href="/spenders">
                  Top spenders
                </Link>
              </div>
            </div>
          </div>

          <div className="grid gap-px border-b border-neutral-300 bg-neutral-300 sm:grid-cols-2 xl:grid-cols-5">
            <RecordStat label="Stored records" value={formatCount(summary.recordCount, "record")} />
            <RecordStat label="Stored IE" value={formatMoney(summary.totalAmount) ?? "$0"} />
            <RecordStat label="Supports target" value={formatMoney(summary.supportAmount) ?? "$0"} />
            <RecordStat label="Opposes target" value={formatMoney(summary.opposeAmount) ?? "$0"} />
            <RecordStat label="Not classified" value={formatMoney(summary.uncodedAmount) ?? "$0"} />
          </div>

          <div className="max-w-[calc(100vw-2.5rem)] border-b border-neutral-300 px-5 py-3 text-sm text-neutral-600 sm:max-w-none">
            Latest {formatCount(records.length, "record")} shown. Summary totals cover the full stored scope; exports return up to 10,000 scoped rows.
          </div>

          {records.length ? (
            <div className="overflow-x-auto">
              <table className="w-full min-w-0 text-left text-sm md:min-w-[980px]">
                <thead className="bg-neutral-100 font-mono text-xs uppercase tracking-[0.12em] text-neutral-500">
                  <tr>
                    <th className="hidden px-4 py-3 font-medium md:table-cell" scope="col">Date</th>
                    <th className="px-4 py-3 font-medium" scope="col">Spender</th>
                    <th className="hidden px-4 py-3 font-medium md:table-cell" scope="col">Target</th>
                    <th className="hidden px-4 py-3 font-medium md:table-cell" scope="col">Target code</th>
                    <th className="hidden px-4 py-3 font-medium md:table-cell" scope="col">Race</th>
                    <th className="hidden px-4 py-3 font-medium md:table-cell" scope="col">Source</th>
                    <th className="hidden px-4 py-3 text-right font-medium md:table-cell" scope="col">Amount</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-200">
                  {records.map((record) => (
                    <tr key={record.sourceId}>
                      <td className="hidden px-4 py-3 font-mono md:table-cell">
                        {formatDate(record.expenditureDate)}
                      </td>
                      <td className="px-4 py-3">
                        {record.spenderCommitteeId ? (
                          <Link className="font-medium underline underline-offset-4" href={`/committees/${record.spenderCommitteeId}`}>
                            {record.committeeName ?? record.fecCommitteeId ?? "Spender not resolved"}
                          </Link>
                        ) : (
                          record.committeeName ?? record.fecCommitteeId ?? "Spender not resolved"
                        )}
                        <p className="mt-1 text-xs text-neutral-600">{record.purpose ?? "Purpose not specified"}</p>
                        <dl className="mt-2 space-y-1 text-xs leading-5 text-neutral-600 md:hidden">
                          <RecordMobileRow label="Date" value={formatDate(record.expenditureDate)} />
                          <RecordMobileRow label="Amount" value={formatMoney(record.amount) ?? "$0"} />
                          <RecordMobileRow label="Target code" value={supportLabel(record.supportOpposeIndicator)} />
                          <div>
                            <dt className="inline font-mono uppercase tracking-[0.12em] text-neutral-500">Target </dt>
                            <dd className="inline">{targetLink(record)}</dd>
                          </div>
                          <div>
                            <dt className="inline font-mono uppercase tracking-[0.12em] text-neutral-500">Race </dt>
                            <dd className="inline">{raceLink(record)}</dd>
                          </div>
                          <div>
                            <dt className="inline font-mono uppercase tracking-[0.12em] text-neutral-500">Source </dt>
                            <dd className="inline">{sourceLink(record)}</dd>
                          </div>
                        </dl>
                      </td>
                      <td className="hidden px-4 py-3 md:table-cell">{targetLink(record)}</td>
                      <td className="hidden px-4 py-3 md:table-cell">{supportLabel(record.supportOpposeIndicator)}</td>
                      <td className="hidden px-4 py-3 md:table-cell">{raceLink(record)}</td>
                      <td className="hidden px-4 py-3 md:table-cell">
                        <div className="flex flex-col gap-1">{sourceLink(record)}</div>
                      </td>
                      <td className="hidden px-4 py-3 text-right font-mono font-semibold md:table-cell">
                        {formatMoney(record.amount)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="p-5 text-sm text-neutral-700">
              <p className="font-semibold text-neutral-950">No stored Schedule E records match this scope.</p>
              <p className="mt-1">Broaden the filter or check the status page to see the latest ingest scope.</p>
              <div className="mt-3 flex flex-wrap gap-3">
                <Link className="font-medium underline underline-offset-4" href="/records/schedule-e">
                  Show all stored Schedule E records
                </Link>
                <Link className="font-medium underline underline-offset-4" href="/status">
                  Check status
                </Link>
              </div>
            </div>
          )}
        </section>
      </main>
    </PageShell>
  );
}

function textParam(value: string | string[] | undefined) {
  return typeof value === "string" && value ? value : undefined;
}

function RecordStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-white px-5 py-4">
      <p className="font-mono text-[11px] uppercase tracking-[0.12em] text-neutral-500">{label}</p>
      <p className="mt-1 text-lg font-semibold tabular-nums">{value}</p>
    </div>
  );
}

function RecordMobileRow({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="inline font-mono uppercase tracking-[0.12em] text-neutral-500">{label} </dt>
      <dd className="inline font-mono text-neutral-950">{value}</dd>
    </div>
  );
}

function supportLabel(value?: string | null) {
  if (value === "S") return "Supports target";
  if (value === "O") return "Opposes target";
  return "Not classified by FEC";
}

function targetLink(record: Awaited<ReturnType<typeof getScheduleERecords>>[number]) {
  if (!record.candidateId) return record.candidateName ?? record.fecCandidateId ?? "Candidate not resolved";
  return (
    <Link className="font-medium underline underline-offset-4" href={`/candidates/${record.candidateId}`}>
      {record.candidateName ?? record.fecCandidateId ?? record.candidateId}
    </Link>
  );
}

function raceLink(record: Awaited<ReturnType<typeof getScheduleERecords>>[number]) {
  if (!record.raceId) return "Unmatched";
  return (
    <Link className="font-medium underline underline-offset-4" href={`/races/${record.raceId}`}>
      {record.raceName ?? record.raceId}
    </Link>
  );
}

function sourceLink(record: Awaited<ReturnType<typeof getScheduleERecords>>[number]) {
  return (
    <>
      {record.sourceUrl ? (
        <a className="font-medium underline underline-offset-4" href={record.sourceUrl} rel="noreferrer" target="_blank">
          FEC Schedule E
        </a>
      ) : (
        <span className="text-neutral-600">Source not stored</span>
      )}
      <span className="font-mono text-[11px] uppercase tracking-[0.12em] text-neutral-500">
        {record.sourceId}
      </span>
    </>
  );
}
