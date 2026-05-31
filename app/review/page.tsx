import Link from "next/link";
import { PageShell } from "@/src/components/page-shell";
import { SignalCard } from "@/src/components/signal-card";
import { SignalKeyboardNav } from "@/src/components/signal-keyboard-nav";
import { getCandidateSignalGaps, getSignals, getStateCoverageBoard, getStatus } from "@/src/lib/db/repository";
import { formatCount, formatDateTime, formatMoney } from "@/src/lib/format";
import { displayCandidateName } from "@/src/lib/names";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Review queue",
  description: "Review-flagged Race Signals records and coverage caveats for editor verification.",
};
export const revalidate = 300;

export default async function ReviewPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const params = await searchParams;
  const state = typeof params.state === "string" ? params.state.toUpperCase() : undefined;
  const [reviewSignals, status, aggregateGaps, stateCoverage] = await Promise.all([
    getSignals({ status: "review", state, limit: 100, sort: "amount" }),
    getStatus(),
    getCandidateSignalGaps({ state, limit: 100 }),
    getStateCoverageBoard(),
  ]);
  const moneyGaps = aggregateGaps.rows;
  const retainedWarnings = status.validationIssues.reduce((sum, issue) => sum + issue.count, 0);
  const exportSuffix = reviewExportQuery(state).toString();

  return (
    <PageShell>
      <main className="mx-auto max-w-7xl px-5 py-6 sm:px-8">
        <section className="border border-neutral-300 bg-white">
          <div className="border-b border-neutral-300 px-5 py-5">
            <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
              <div>
                <p className="font-mono text-xs uppercase tracking-[0.18em] text-neutral-500">
                  Review queue
                </p>
                <h1 className="mt-1 text-xl font-semibold tracking-tight">
                  Records that need human attention
                </h1>
                <p className="mt-2 max-w-3xl text-sm leading-6 text-neutral-700">
                  Review flags are workflow cues, not story grades. Open the FEC source, check the stored scope,
                  and account for validation caveats before publication.
                </p>
                {state ? (
                  <p className="mt-2 font-mono text-[11px] uppercase tracking-[0.12em] text-neutral-500">
                    Filtered by state {state}
                  </p>
                ) : null}
              </div>
              <div className="flex flex-wrap gap-2 text-sm">
                {state ? (
                  <Link className="border border-neutral-400 px-3 py-2 font-medium hover:border-neutral-900" href="/review">
                    All states
                  </Link>
                ) : null}
                <Link className="border border-neutral-400 px-3 py-2 font-medium hover:border-neutral-900" href="/?status=review">
                  Open in feed
                </Link>
                <a
                  className="border border-neutral-400 px-3 py-2 font-medium hover:border-neutral-900"
                  href={`/api/signals/export.csv?${exportSuffix}`}
                >
                  Export CSV
                </a>
                <a
                  className="border border-neutral-400 px-3 py-2 font-medium hover:border-neutral-900"
                  href={`/api/signals/export.json?${exportSuffix}`}
                >
                  Export JSON
                </a>
                <Link className="border border-neutral-400 px-3 py-2 font-medium hover:border-neutral-900" href="/status">
                  Pipeline status
                </Link>
              </div>
            </div>
          </div>

          <div className="grid gap-px border-b border-neutral-300 bg-neutral-300 md:grid-cols-4">
            <ReviewStat label="Review signals" value={String(reviewSignals.length)} detail="$100k+ and other records marked for verification." />
            <ReviewStat label="Aggregate-only money" value={String(aggregateGaps.total)} detail="Candidates with FEC totals but no matched source-record signal." />
            <ReviewStat label="Retained caveats" value={String(retainedWarnings)} detail="Validation issues still visible in this database slice." />
            <ReviewStat
              label="Latest ingest"
              value={status.runs[0]?.status ?? "none"}
              detail={status.runs[0] ? `Finished ${formatDateTime(status.runs[0].finishedAt ?? status.runs[0].startedAt)}` : "No run recorded."}
            />
          </div>

          {stateCoverage.length ? (
            <nav
              aria-label="Review queue state filters"
              className="flex min-w-0 max-w-full flex-nowrap gap-2 overflow-x-auto border-b border-neutral-300 px-5 py-3 text-sm"
            >
              <Link
                className={`shrink-0 border px-2.5 py-1.5 font-mono text-[11px] uppercase tracking-[0.12em] ${!state ? "border-neutral-950 bg-neutral-950 text-white" : "border-neutral-300 hover:border-neutral-900"}`}
                href="/review"
              >
                All
              </Link>
              {stateCoverage.map((row) => (
                <Link
                  className={`shrink-0 border px-2.5 py-1.5 font-mono text-[11px] uppercase tracking-[0.12em] ${state === row.state ? "border-neutral-950 bg-neutral-950 text-white" : "border-neutral-300 hover:border-neutral-900"}`}
                  href={`/review?state=${row.state}`}
                  key={row.state}
                  title={`${row.state}: ${row.signalCount.toLocaleString("en-US")} stored signals`}
                >
                  {row.state}
                </Link>
              ))}
            </nav>
          ) : null}

          <section className="border-b border-neutral-300" id="review-signals">
            <div className="border-b border-neutral-300 px-5 py-4">
              <h2 className="text-sm font-semibold uppercase tracking-[0.14em] text-neutral-600">
                Review-flagged signals
              </h2>
              <p className="mt-1 text-sm text-neutral-600">
                Highest-dollar records first. These are source-linked alerts that should get editor or reporter verification before use.
              </p>
            </div>
            {reviewSignals.length ? (
              <SignalKeyboardNav>
                {reviewSignals.map((signal) => <SignalCard key={signal.dedupeKey} signal={signal} />)}
              </SignalKeyboardNav>
            ) : (
              <p className="p-5 text-sm text-neutral-600">
                No review-flagged signals match this scope.
              </p>
            )}
          </section>

          <section className="border-b border-neutral-300" id="aggregate-only-money">
            <div className="border-b border-neutral-300 px-5 py-4">
              <h2 className="text-sm font-semibold uppercase tracking-[0.14em] text-neutral-600">
                Aggregate-only candidate money
              </h2>
              <p className="mt-1 max-w-3xl text-sm leading-6 text-neutral-600">
                These candidates have FEC aggregate totals in Race Signals, but no matched committee, filing or Schedule E signal in the current slice.
              </p>
            </div>
            {moneyGaps.length ? (
              <div className="overflow-x-auto">
                <table className="w-full min-w-0 text-left text-sm md:min-w-[780px]">
                  <thead className="bg-neutral-100 font-mono text-xs uppercase tracking-[0.12em] text-neutral-500">
                    <tr>
                      <th className="px-4 py-3 font-medium" scope="col">Candidate</th>
                      <th className="hidden px-4 py-3 font-medium md:table-cell" scope="col">Race</th>
                      <th className="hidden px-4 py-3 text-right font-medium md:table-cell" scope="col">Stored receipts</th>
                      <th className="hidden px-4 py-3 font-medium md:table-cell" scope="col">Source records</th>
                      <th className="hidden px-4 py-3 font-medium md:table-cell" scope="col">Verify</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-neutral-200">
                    {moneyGaps.map((candidate) => (
                      <tr key={candidate.id}>
                        <td className="px-4 py-3">
                          <Link className="font-medium underline underline-offset-4" href={`/candidates/${candidate.id}`}>
                            {displayCandidateName(candidate.name) ?? candidate.name}
                          </Link>
                          <dl className="mt-2 space-y-1 text-xs leading-5 text-neutral-600 md:hidden">
                            <ReviewMobileRow label="Race" value={candidate.raceName ?? candidate.raceId ?? "Race not matched"} />
                            <ReviewMobileRow label="Receipts" value={formatMoney(candidate.totalReceiptsCycle) ?? "FEC totals not loaded"} />
                            <ReviewMobileRow label="Records" value={sourceRecordSummary(candidate)} />
                          </dl>
                        </td>
                        <td className="hidden px-4 py-3 md:table-cell">
                          {candidate.raceId ? (
                            <Link className="font-medium underline underline-offset-4" href={`/races/${candidate.raceId}`}>
                              {candidate.raceName ?? candidate.raceId}
                            </Link>
                          ) : (
                            "Race not matched"
                          )}
                        </td>
                        <td className="hidden px-4 py-3 text-right font-mono md:table-cell">
                          {formatMoney(candidate.totalReceiptsCycle) ?? "FEC totals not loaded"}
                        </td>
                        <td className="hidden px-4 py-3 text-xs text-neutral-600 md:table-cell">
                          {sourceRecordSummary(candidate)}
                        </td>
                        <td className="hidden px-4 py-3 md:table-cell">
                          <div className="flex flex-col gap-1 text-xs">
                            {candidate.sourceUrl ? (
                              <a className="font-medium underline underline-offset-4" href={candidate.sourceUrl} rel="noreferrer" target="_blank">
                                FEC candidate record
                              </a>
                            ) : null}
                            <Link className="font-medium underline underline-offset-4" href={`/records/schedule-e?candidate=${candidate.id}`}>
                              Schedule E evidence
                            </Link>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="p-5 text-sm text-neutral-600">
                No aggregate-only money gaps match this scope.
              </p>
            )}
            {aggregateGaps.total > moneyGaps.length ? (
              <p className="border-t border-neutral-200 px-5 py-3 text-xs leading-5 text-neutral-600">
                Showing the top {moneyGaps.length.toLocaleString("en-US")} of {aggregateGaps.total.toLocaleString("en-US")} aggregate-only candidates by stored receipts.
              </p>
            ) : null}
          </section>

          <section className="px-5 py-4" id="validation-caveats">
            <h2 className="text-sm font-semibold uppercase tracking-[0.14em] text-neutral-600">
              Retained validation caveats
            </h2>
            {status.validationIssues.length ? (
              <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                {status.validationIssues.map((issue) => (
                  <div className="border border-neutral-300 p-3 text-sm" key={`${issue.rule}-${issue.severity}`}>
                    <p className="font-medium">{issue.rule.replaceAll("_", " ")}</p>
                    <p className="mt-1 font-mono text-[11px] uppercase tracking-[0.12em] text-neutral-500">
                      {issue.severity} / {formatCount(issue.count, "issue")} / latest {formatDateTime(issue.latestAt)}
                    </p>
                  </div>
                ))}
              </div>
            ) : (
              <p className="mt-2 text-sm text-neutral-600">
                No retained validation caveats are recorded.
              </p>
            )}
            {status.recentValidationIssues.length ? (
              <div className="mt-5 border border-neutral-300">
                <div className="border-b border-neutral-300 px-3 py-2">
                  <h3 className="font-mono text-[11px] uppercase tracking-[0.12em] text-neutral-600">
                    Latest caveat examples
                  </h3>
                  <p className="mt-1 text-xs leading-5 text-neutral-600">
                    Specific retained examples for publication checks; rollups above show broader pipeline volume.
                  </p>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full min-w-0 text-left text-xs md:min-w-[760px]">
                    <thead className="bg-neutral-100 font-mono uppercase tracking-[0.12em] text-neutral-500">
                      <tr>
                        <th className="px-3 py-2 font-medium" scope="col">Rule</th>
                        <th className="hidden px-3 py-2 font-medium md:table-cell" scope="col">Source ID</th>
                        <th className="px-3 py-2 font-medium" scope="col">Message</th>
                        <th className="hidden px-3 py-2 font-medium md:table-cell" scope="col">Source</th>
                        <th className="hidden px-3 py-2 font-medium lg:table-cell" scope="col">Recorded</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-neutral-200">
                      {status.recentValidationIssues.map((issue) => (
                        <tr key={`${issue.rule}-${issue.sourceId ?? "no-source"}-${issue.createdAt}`}>
                          <td className="px-3 py-2 font-medium">{issue.rule.replaceAll("_", " ")}</td>
                          <td className="hidden px-3 py-2 font-mono md:table-cell">{issue.sourceId ?? "No source ID"}</td>
                          <td className="px-3 py-2">
                            <p className="max-w-full break-words leading-5 [overflow-wrap:anywhere]">{issue.message}</p>
                            <p className="mt-1 font-mono uppercase tracking-[0.12em] text-neutral-500 md:hidden">
                              {issue.sourceId ?? "No source ID"}
                            </p>
                          </td>
                          <td className="hidden px-3 py-2 md:table-cell">
                            {issue.sourceUrl ? (
                              <a className="font-medium underline underline-offset-4" href={issue.sourceUrl} rel="noreferrer" target="_blank">
                                Open source
                              </a>
                            ) : (
                              "No source URL"
                            )}
                          </td>
                          <td className="hidden px-3 py-2 font-mono text-neutral-600 lg:table-cell">{formatDateTime(issue.createdAt)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ) : null}
          </section>
        </section>
      </main>
    </PageShell>
  );
}

function ReviewStat({
  detail,
  label,
  value,
}: {
  detail: string;
  label: string;
  value: string;
}) {
  return (
    <div className="min-w-0 bg-white p-4">
      <p className="font-mono text-[11px] uppercase tracking-[0.12em] text-neutral-500">{label}</p>
      <p className="mt-1 break-words text-lg font-semibold tabular-nums">{value}</p>
      <p className="mt-1 text-xs leading-5 text-neutral-600">{detail}</p>
    </div>
  );
}

function ReviewMobileRow({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="inline font-mono uppercase tracking-[0.12em] text-neutral-500">{label} </dt>
      <dd className="inline">{value}</dd>
    </div>
  );
}

function sourceRecordSummary(candidate: {
  committeeCount?: number;
  filingCount?: number;
  independentExpenditureCount?: number;
}) {
  return [
    formatCount(candidate.committeeCount ?? 0, "committee"),
    formatCount(candidate.filingCount ?? 0, "filing"),
    formatCount(candidate.independentExpenditureCount ?? 0, "Schedule E record"),
  ].join(" / ");
}

function reviewExportQuery(state?: string) {
  const params = new URLSearchParams();
  params.set("status", "review");
  params.set("sort", "amount");
  if (state) params.set("state", state);
  return params;
}
