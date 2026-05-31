import Link from "next/link";
import { CoverageStrip } from "@/src/components/coverage-strip";
import { FeedFilters } from "@/src/components/feed-filters";
import { PageShell } from "@/src/components/page-shell";
import { getCommittee, getCoverageSummary, getRaces, getSignalStateCounts, getSignalStateFreshness, getSpendingSignals } from "@/src/lib/db/repository";
import { formatDate, formatMoney, isOlderThanHours } from "@/src/lib/format";
import { signalFiltersFromSearchParams } from "@/src/lib/signals/filters";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Outside spending watch",
  description: "Independent expenditure alerts from FEC Schedule E records.",
};
export const revalidate = 300;

export default async function SpendingPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const params = await searchParams;
  const sort = params.sort === "date" ? "date" : "amount";
  const q = typeof params.q === "string" ? params.q : undefined;
  const state = typeof params.state === "string" ? params.state : undefined;
  const office = typeof params.office === "string" ? params.office : undefined;
  const raceId = typeof params.race === "string" ? params.race : undefined;
  const statusFilter = typeof params.status === "string" ? params.status : undefined;
  const since = typeof params.since === "string" ? params.since : undefined;
  const ingestedSince = typeof params.ingestedSince === "string" ? params.ingestedSince : undefined;
  const minAmount = typeof params.minAmount === "string" ? params.minAmount : undefined;
  const position = typeof params.position === "string" ? params.position : undefined;
  const targetParty = typeof params.targetParty === "string" ? params.targetParty : undefined;
  const targetStatus = typeof params.targetStatus === "string" ? params.targetStatus : undefined;
  const committeeId = typeof params.committee === "string" ? params.committee : undefined;
  const [signals, races, status, stateSignalCounts, stateSignalFreshness, committeeFilter] = await Promise.all([
    getSpendingSignals(signalFiltersFromSearchParams(params, 101), sort),
    getRaces(),
    getCoverageSummary(),
    getSignalStateCounts("large_independent_expenditure"),
    getSignalStateFreshness("large_independent_expenditure"),
    committeeId ? getCommittee(committeeId) : Promise.resolve(null),
  ]);
  const visibleSignals = signals.slice(0, 100);
  const hasMoreSignals = signals.length > visibleSignals.length;
  const amountHref = spendingSortHref(params, "amount");
  const dateHref = spendingSortHref(params, "date");
  const exportQuery = spendingExportQuery(params);
  const exportSuffix = exportQuery.toString();

  return (
    <PageShell>
      <main className="mx-auto max-w-7xl px-5 py-6 sm:px-8">
        <section className="w-full max-w-[calc(100vw-2.5rem)] min-w-0 border border-neutral-300 bg-white sm:max-w-none">
          <div className="border-b border-neutral-300 px-5 py-5">
            <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
              <div className="min-w-0 max-w-full">
                <p className="font-mono text-xs uppercase tracking-[0.18em] text-neutral-500">
                  Schedule E watch
                </p>
                <h1 className="mt-1 text-xl font-semibold tracking-tight">
                  Outside spending watch
                </h1>
                <p className="mt-2 max-w-[min(280px,100%)] break-words text-sm leading-5 text-neutral-700 [overflow-wrap:anywhere] sm:max-w-3xl">
                  Shows $25k+ Schedule E alert signals. Use Schedule E evidence for lower-dollar and uncoded source rows.
                </p>
              </div>
              <div className="min-w-0 max-w-full flex flex-col gap-2 md:items-end">
                <div className="flex flex-wrap gap-2 text-sm">
                  <Link
                    className={`border px-3 py-2 font-medium ${sort === "amount" ? "border-neutral-950 bg-neutral-950 text-white" : "border-neutral-400 hover:border-neutral-900"}`}
                    href={amountHref}
                  >
                    Sort by amount
                  </Link>
                  <Link
                    className={`border px-3 py-2 font-medium ${sort === "date" ? "border-neutral-950 bg-neutral-950 text-white" : "border-neutral-400 hover:border-neutral-900"}`}
                    href={dateHref}
                  >
                    Sort by date
                  </Link>
                </div>
                <div className="flex flex-wrap gap-2 text-sm">
                  <a
                    className="border border-neutral-400 px-3 py-2 font-medium hover:border-neutral-900"
                    href={`/api/signals/export.csv${exportSuffix ? `?${exportSuffix}` : ""}`}
                  >
                    Export CSV
                  </a>
                  <a
                    className="border border-neutral-400 px-3 py-2 font-medium hover:border-neutral-900"
                    href={`/api/signals/export.json${exportSuffix ? `?${exportSuffix}` : ""}`}
                  >
                    Export JSON
                  </a>
                </div>
                <p className="max-w-full break-words text-xs text-neutral-600 md:max-w-xs md:text-right">
                  All matching rows. Cap 10,000.
                </p>
              </div>
            </div>
          </div>
          <CoverageStrip counts={status.counts} latestRun={status.runs[0]} mode={status.mode} />
          <SpendingQuickFilters params={params} />
          <FeedFilters
            clearHref="/spending"
            key={[q, state, office, raceId, statusFilter, since, ingestedSince].join("|")}
            lockedType
            office={office}
            q={q}
            raceId={raceId}
            committeeId={committeeId}
            races={races}
            since={since}
            ingestedSince={ingestedSince}
            state={state}
            stateSignalCounts={stateSignalCounts}
            stateSignalFreshness={stateSignalFreshness}
            status={statusFilter}
            type="large_independent_expenditure"
          />
          <div className="border-b border-neutral-300 px-5 py-3 font-mono text-[11px] uppercase tracking-[0.12em] text-neutral-500">
            <p className="max-w-[min(280px,100%)] break-words [overflow-wrap:anywhere] sm:max-w-full">
            Showing {visibleSignals.length}{hasMoreSignals ? "+" : ""} outside-spending signals
            {committeeId ? ` for ${committeeFilter?.name ?? committeeId}` : ""}
            {position ? ` / ${supportOpposeLabel(position)}` : ""}
            {targetParty ? ` / target ${targetParty}` : ""}
            {targetStatus ? ` / ${targetStatusLabel(targetStatus)} targets` : ""}
            {minAmount ? ` / $${Number(minAmount).toLocaleString("en-US")}+` : ""}
            </p>
            {committeeId ? (
              <>
                {" / "}
                <Link className="font-medium underline underline-offset-4" href="/spending">
                  clear committee filter
                </Link>
              </>
            ) : null}
          </div>
          {visibleSignals.length ? (
            <div className="border-b border-neutral-300">
              <div className="overflow-x-hidden md:overflow-x-auto">
                <table className="w-full min-w-0 table-fixed text-left text-sm md:min-w-[1220px] md:table-auto">
                  <thead className="bg-neutral-100 font-mono text-xs uppercase tracking-[0.12em] text-neutral-500">
                    <tr>
                      <th className="hidden px-4 py-3 font-medium md:table-cell" scope="col">Date</th>
                      <th className="px-4 py-3 font-medium" scope="col">Alert</th>
                      <th className="hidden px-4 py-3 text-right font-medium md:table-cell" scope="col">Amount</th>
                      <th className="hidden px-4 py-3 font-medium md:table-cell" scope="col">Spender</th>
                      <th className="hidden px-4 py-3 font-medium md:table-cell" scope="col">Target</th>
                      <th className="hidden px-4 py-3 font-medium md:table-cell" scope="col">Target code</th>
                      <th className="hidden px-4 py-3 font-medium md:table-cell" scope="col">Purpose</th>
                      <th className="hidden px-4 py-3 font-medium md:table-cell" scope="col">Race</th>
                      <th className="hidden px-4 py-3 font-medium md:table-cell" scope="col">Source</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-neutral-200">
                    {visibleSignals.map((signal) => (
                      <tr id={signalAnchorId(signal.dedupeKey)} key={`row-${signal.dedupeKey}`}>
                        <td className="hidden px-4 py-3 font-mono md:table-cell">{formatDate(signal.signalDate)}</td>
                        <td className="min-w-0 max-w-[280px] px-4 py-3 md:max-w-[320px]">
                          <Link
                            className="block max-w-full break-words font-medium underline underline-offset-4"
                            href={signalPermalinkHref(signal)}
                            style={{ overflowWrap: "anywhere", wordBreak: "break-word" }}
                          >
                            {signal.headline}
                          </Link>
                          <p className="mt-1 text-xs leading-5 text-neutral-600">
                            {signal.sourceUrl ? (
                              <>
                                <a
                                  className="font-medium underline underline-offset-4"
                                  href={signal.sourceUrl}
                                  rel="noreferrer"
                                  target="_blank"
                                >
                                  FEC Schedule E
                                </a>
                                <span className="font-mono uppercase tracking-[0.12em] text-neutral-500">
                                  {" "}
                                  / {sourceRecordLabel(signal.metadata?.sourceId)}
                                </span>
                              </>
                            ) : (
                              "Source not stored"
                            )}
                          </p>
                          <dl className="mt-2 space-y-1 text-xs leading-5 text-neutral-600 md:hidden">
                            <div>
                              <dt className="inline font-mono uppercase tracking-[0.12em] text-neutral-500">Date </dt>
                              <dd className="inline font-mono text-neutral-950">{formatDate(signal.signalDate)}</dd>
                            </div>
                            <div>
                              <dt className="inline font-mono uppercase tracking-[0.12em] text-neutral-500">Amount </dt>
                              <dd className="inline font-mono font-semibold text-neutral-950">{formatMoney(signal.amount)}</dd>
                            </div>
                            <div>
                              <dt className="inline font-mono uppercase tracking-[0.12em] text-neutral-500">Spender </dt>
                              <dd className="inline">
                                <EntityLink
                                  fallback="Spender not resolved"
                                  hrefBase="/committees"
                                  id={signal.committeeId}
                                  label={signal.committeeName}
                                />
                              </dd>
                            </div>
                            <div>
                              <dt className="inline font-mono uppercase tracking-[0.12em] text-neutral-500">Target </dt>
                              <dd className="inline">
                                <EntityLink
                                  fallback="Candidate not resolved"
                                  hrefBase="/candidates"
                                  id={signal.candidateId}
                                  label={signal.candidateName}
                                />
                                {targetContext(signal) ? ` (${targetContext(signal)})` : ""}
                              </dd>
                            </div>
                            <div>
                              <dt className="inline font-mono uppercase tracking-[0.12em] text-neutral-500">Target code </dt>
                              <dd className="inline">{supportOpposeLabel(signal.metadata?.supportOpposeIndicator)}</dd>
                            </div>
                            <div>
                              <dt className="inline font-mono uppercase tracking-[0.12em] text-neutral-500">Purpose </dt>
                              <dd className="inline">{sourcePurpose(signal.metadata?.purpose)}</dd>
                            </div>
                            <div>
                              <dt className="inline font-mono uppercase tracking-[0.12em] text-neutral-500">Race </dt>
                              <dd className="inline">
                                {signal.raceId ? (
                                  <Link className="font-medium underline underline-offset-4" href={`/races/${signal.raceId}`}>
                                    {signal.raceName ?? signal.raceId}
                                  </Link>
                                ) : (
                                  "Unmatched"
                                )}
                              </dd>
                            </div>
                            <div>
                              <dt className="inline font-mono uppercase tracking-[0.12em] text-neutral-500">Source </dt>
                              <dd className="inline">
                                {signal.sourceUrl ? (
                                  <a className="font-medium underline underline-offset-4" href={signal.sourceUrl} rel="noreferrer" target="_blank">
                                    FEC Schedule E
                                  </a>
                                ) : (
                                  "Source not stored"
                              )}
                            </dd>
                          </div>
                            <div>
                              <dt className="inline font-mono uppercase tracking-[0.12em] text-neutral-500">Record </dt>
                              <dd className="inline font-mono text-neutral-950">{sourceRecordLabel(signal.metadata?.sourceId)}</dd>
                            </div>
                          </dl>
                        </td>
                        <td className="hidden px-4 py-3 text-right font-mono font-semibold md:table-cell">
                          {formatMoney(signal.amount)}
                        </td>
                        <td className="hidden px-4 py-3 md:table-cell">
                          <EntityLink
                            fallback="Spender not resolved"
                            hrefBase="/committees"
                            id={signal.committeeId}
                            label={signal.committeeName}
                          />
                        </td>
                        <td className="hidden px-4 py-3 md:table-cell">
                          <EntityLink
                            fallback="Candidate not resolved"
                            hrefBase="/candidates"
                            id={signal.candidateId}
                            label={signal.candidateName}
                          />
                          {targetContext(signal) ? (
                            <p className="mt-1 font-mono text-[11px] uppercase tracking-[0.12em] text-neutral-500">
                              {targetContext(signal)}
                            </p>
                          ) : null}
                        </td>
                        <td className="hidden px-4 py-3 md:table-cell">{supportOpposeLabel(signal.metadata?.supportOpposeIndicator)}</td>
                        <td className="hidden px-4 py-3 text-neutral-700 md:table-cell">{sourcePurpose(signal.metadata?.purpose)}</td>
                        <td className="hidden px-4 py-3 md:table-cell">
                          {signal.raceId ? (
                            <Link className="font-medium underline underline-offset-4" href={`/races/${signal.raceId}`}>
                              {signal.raceName ?? signal.raceId}
                            </Link>
                          ) : (
                            "Unmatched"
                          )}
                        </td>
                        <td className="hidden px-4 py-3 md:table-cell">
                          {signal.sourceUrl ? (
                            <span className="inline-flex flex-col gap-1">
                              <a
                                className="font-medium underline underline-offset-4"
                                href={signal.sourceUrl}
                                rel="noreferrer"
                                target="_blank"
                              >
                                FEC Schedule E
                              </a>
                              <span className="font-mono text-[11px] uppercase tracking-[0.12em] text-neutral-500">
                                {sourceRecordLabel(signal.metadata?.sourceId)}
                              </span>
                            </span>
                          ) : (
                            <span className="text-neutral-600">Source not stored</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ) : null}
          {!visibleSignals.length ? (
            <SpendingEmptyState
              isStale={isOlderThanHours(status.runs[0]?.finishedAt ?? status.runs[0]?.startedAt, 48)}
              raceId={raceId}
              state={state}
              evidenceHref={scheduleERecordsHref({ candidateId: undefined, committeeId, raceId, state })}
            />
          ) : null}
        </section>
      </main>
    </PageShell>
  );
}

function SpendingEmptyState({
  evidenceHref,
  isStale,
  raceId,
  state,
}: {
  evidenceHref: string;
  isStale: boolean;
  raceId?: string;
  state?: string;
}) {
  return (
    <div className="min-w-0 max-w-full border-b border-neutral-300 p-5 text-sm text-neutral-700">
      <p className="font-semibold text-neutral-950">No outside-spending signals match this view.</p>
      <p className="mt-1 max-w-[min(280px,100%)] break-words leading-6 [overflow-wrap:anywhere] sm:max-w-3xl">
        Signal filters can hide lower-dollar Schedule E records. Check the evidence table before concluding there is no outside-spending activity in this scope.
      </p>
      {isStale ? (
        <p className="mt-2 max-w-[min(280px,100%)] break-words leading-6 text-neutral-800 [overflow-wrap:anywhere] sm:max-w-3xl">
          The latest ingest is older than 48 hours, so verify pipeline status before treating this race as quiet.
        </p>
      ) : null}
      <div className="mt-3 grid max-w-[min(280px,100%)] gap-2 sm:max-w-full sm:grid-flow-col sm:auto-cols-max sm:justify-start">
        <Link className="max-w-full break-words font-medium underline underline-offset-4 [overflow-wrap:anywhere]" href={evidenceHref}>
          Check Schedule E evidence
        </Link>
        {state ? (
          <Link className="max-w-full break-words font-medium underline underline-offset-4 [overflow-wrap:anywhere]" href={`/spending?state=${state}`}>
            Show all {state} outside spending
          </Link>
        ) : null}
        {raceId ? (
          <Link className="max-w-full break-words font-medium underline underline-offset-4 [overflow-wrap:anywhere]" href={`/races/${raceId}`}>
            Open race page
          </Link>
        ) : null}
        <Link className="max-w-full break-words font-medium underline underline-offset-4 [overflow-wrap:anywhere]" href="/spending">
          Show all outside spending
        </Link>
        <Link className="max-w-full break-words font-medium underline underline-offset-4 [overflow-wrap:anywhere]" href="/status">
          Check ingestion status
        </Link>
      </div>
    </div>
  );
}

function supportOpposeLabel(value: unknown) {
  if (value === "S") return "FEC code: supports target";
  if (value === "O") return "FEC code: opposes target";
  return "Not coded by FEC";
}

function EntityLink({
  fallback,
  hrefBase,
  id,
  label,
}: {
  fallback: string;
  hrefBase: "/candidates" | "/committees";
  id?: string | null;
  label?: string | null;
}) {
  if (!id) return label ?? fallback;
  return (
    <Link className="font-medium underline underline-offset-4" href={`${hrefBase}/${id}`}>
      {label ?? id}
    </Link>
  );
}

function sourceRecordLabel(value: unknown) {
  if (typeof value === "string" && value) return `Record ${value}`;
  return "Record not stored";
}

function sourcePurpose(value: unknown) {
  if (typeof value === "string" && value) return value;
  return "Not specified";
}

function targetContext(signal: {
  candidateParty?: string | null;
  candidateState?: string | null;
  candidateDistrict?: string | null;
  candidateIncumbentChallengeStatus?: string | null;
}) {
  const parts = [
    signal.candidateParty,
    signal.candidateState && signal.candidateDistrict
      ? `${signal.candidateState}-${signal.candidateDistrict}`
      : signal.candidateState,
    targetStatusLabel(signal.candidateIncumbentChallengeStatus),
  ].filter(Boolean);
  return parts.join(", ");
}

function SpendingQuickFilters({
  params,
}: {
  params: { [key: string]: string | string[] | undefined };
}) {
  const selectedPosition = typeof params.position === "string" ? params.position : "";
  const selectedMinAmount = typeof params.minAmount === "string" ? params.minAmount : "";
  const selectedTargetParty = typeof params.targetParty === "string" ? params.targetParty : "";
  const selectedTargetStatus = typeof params.targetStatus === "string" ? params.targetStatus : "";
  const activeTokens = [
    selectedPosition ? { key: "position" as const, label: supportOpposeLabel(selectedPosition) } : null,
    selectedMinAmount ? { key: "minAmount" as const, label: `Amount ${formatMoney(Number(selectedMinAmount))}+` } : null,
    selectedTargetParty ? { key: "targetParty" as const, label: `Target party ${selectedTargetParty}` } : null,
    selectedTargetStatus ? { key: "targetStatus" as const, label: `Target ${targetStatusLabel(selectedTargetStatus)}` } : null,
  ].filter((token): token is { key: "minAmount" | "position" | "targetParty" | "targetStatus"; label: string } => Boolean(token));
  return (
    <div className="border-b border-neutral-300 px-5 py-3 text-sm">
      {activeTokens.length ? (
        <div className="mb-3 flex min-w-0 flex-wrap items-center gap-2 border border-neutral-200 bg-neutral-50 p-2 text-xs">
          <span className="shrink-0 font-mono uppercase tracking-[0.12em] text-neutral-500">
            Spending filters
          </span>
          {activeTokens.map((token) => (
            <Link
              className="w-full max-w-full min-w-0 break-words border border-neutral-300 bg-white px-2 py-1 text-neutral-700 underline-offset-4 [overflow-wrap:anywhere] hover:border-neutral-900 hover:underline sm:w-auto sm:max-w-[32rem]"
              href={spendingToggleHref(params, token.key, "")}
              key={token.key}
              title={`Remove ${token.label}`}
            >
              {token.label} x
            </Link>
          ))}
        </div>
      ) : null}
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        <div>
          <p className="font-mono text-[11px] uppercase tracking-[0.12em] text-neutral-500">
            Target code
          </p>
          <div className="mt-2 flex flex-wrap gap-2">
            <Link className={quickFilterClass(!selectedPosition)} href={spendingToggleHref(params, "position", "")}>All</Link>
            <Link className={quickFilterClass(selectedPosition === "S")} href={spendingToggleHref(params, "position", "S")}>FEC: supports</Link>
            <Link className={quickFilterClass(selectedPosition === "O")} href={spendingToggleHref(params, "position", "O")}>FEC: opposes</Link>
          </div>
        </div>
        <div>
          <p className="font-mono text-[11px] uppercase tracking-[0.12em] text-neutral-500">
            Amount floor
          </p>
          <div className="mt-2 flex flex-wrap gap-2">
            <Link className={quickFilterClass(!selectedMinAmount)} href={spendingToggleHref(params, "minAmount", "")}>All</Link>
            <Link className={quickFilterClass(selectedMinAmount === "25000")} href={spendingToggleHref(params, "minAmount", "25000")}>$25k+</Link>
            <Link className={quickFilterClass(selectedMinAmount === "100000")} href={spendingToggleHref(params, "minAmount", "100000")}>$100k+</Link>
            <Link className={quickFilterClass(selectedMinAmount === "250000")} href={spendingToggleHref(params, "minAmount", "250000")}>$250k+</Link>
          </div>
        </div>
        <details className="md:hidden">
          <summary className="cursor-pointer font-mono text-[11px] uppercase tracking-[0.12em] text-neutral-600 md:hidden">
            More spending filters
          </summary>
          <div className="mt-3 grid gap-3">
            <TargetPartyFilters params={params} selectedTargetParty={selectedTargetParty} />
            <TargetStatusFilters params={params} selectedTargetStatus={selectedTargetStatus} />
          </div>
        </details>
        <TargetPartyFilters className="hidden md:block" params={params} selectedTargetParty={selectedTargetParty} />
        <TargetStatusFilters className="hidden md:block" params={params} selectedTargetStatus={selectedTargetStatus} />
      </div>
    </div>
  );
}

function TargetPartyFilters({
  className,
  params,
  selectedTargetParty,
}: {
  className?: string;
  params: { [key: string]: string | string[] | undefined };
  selectedTargetParty: string;
}) {
  return (
    <div className={className}>
      <p className="font-mono text-[11px] uppercase tracking-[0.12em] text-neutral-500">
        Target party
      </p>
      <div className="mt-2 flex flex-wrap gap-2">
        <Link className={quickFilterClass(!selectedTargetParty)} href={spendingToggleHref(params, "targetParty", "")}>All</Link>
        <Link className={quickFilterClass(selectedTargetParty === "REP")} href={spendingToggleHref(params, "targetParty", "REP")}>REP</Link>
        <Link className={quickFilterClass(selectedTargetParty === "DEM")} href={spendingToggleHref(params, "targetParty", "DEM")}>DEM</Link>
      </div>
    </div>
  );
}

function TargetStatusFilters({
  className,
  params,
  selectedTargetStatus,
}: {
  className?: string;
  params: { [key: string]: string | string[] | undefined };
  selectedTargetStatus: string;
}) {
  return (
    <div className={className}>
      <p className="font-mono text-[11px] uppercase tracking-[0.12em] text-neutral-500">
        Target status
      </p>
      <div className="mt-2 flex flex-wrap gap-2">
        <Link className={quickFilterClass(!selectedTargetStatus)} href={spendingToggleHref(params, "targetStatus", "")}>All</Link>
        <Link className={quickFilterClass(selectedTargetStatus === "I")} href={spendingToggleHref(params, "targetStatus", "I")}>Incumbent</Link>
        <Link className={quickFilterClass(selectedTargetStatus === "C")} href={spendingToggleHref(params, "targetStatus", "C")}>Challenger</Link>
        <Link className={quickFilterClass(selectedTargetStatus === "O")} href={spendingToggleHref(params, "targetStatus", "O")}>Open seat</Link>
      </div>
    </div>
  );
}

function quickFilterClass(active: boolean) {
  return active
    ? "border border-neutral-950 bg-neutral-950 px-2.5 py-1.5 font-medium text-white"
    : "border border-neutral-300 px-2.5 py-1.5 font-medium hover:border-neutral-900";
}

function spendingToggleHref(
  params: { [key: string]: string | string[] | undefined },
  key: "minAmount" | "position" | "targetParty" | "targetStatus",
  value: string,
) {
  const next = spendingExportQuery(params);
  next.delete("type");
  if (value) next.set(key, value);
  else next.delete(key);
  const query = next.toString();
  return query ? `/spending?${query}` : "/spending";
}

function signalAnchorId(dedupeKey: string) {
  return `signal-${dedupeKey.replace(/[^a-zA-Z0-9_-]/g, "-")}`;
}

function signalPermalinkHref(signal: { dedupeKey: string; metadata?: Record<string, unknown> }) {
  const sourceId = typeof signal.metadata?.sourceId === "string" ? signal.metadata.sourceId : signal.dedupeKey;
  const params = new URLSearchParams({
    q: sourceId,
    type: "large_independent_expenditure",
  });
  return `/?${params.toString()}#${signalAnchorId(signal.dedupeKey)}`;
}

function spendingSortHref(
  params: { [key: string]: string | string[] | undefined },
  sort: "amount" | "date",
) {
  const next = new URLSearchParams();
  for (const key of ["q", "state", "office", "race", "status", "since", "ingestedSince", "committee", "minAmount", "position", "targetParty", "targetStatus"]) {
    const value = params[key];
    if (typeof value === "string" && value) next.set(key, value);
  }
  if (sort !== "amount") next.set("sort", sort);
  const query = next.toString();
  return query ? `/spending?${query}` : "/spending";
}

function spendingExportQuery(params: { [key: string]: string | string[] | undefined }) {
  const next = new URLSearchParams();
  for (const key of ["q", "state", "office", "race", "status", "since", "ingestedSince", "committee", "minAmount", "position", "targetParty", "targetStatus"]) {
    const value = params[key];
    if (typeof value === "string" && value) next.set(key, value);
  }
  next.set("type", "large_independent_expenditure");
  return next;
}

function scheduleERecordsHref({
  candidateId,
  committeeId,
  raceId,
  state,
}: {
  candidateId?: string;
  committeeId?: string;
  raceId?: string;
  state?: string;
}) {
  const params = new URLSearchParams();
  if (candidateId) params.set("candidate", candidateId);
  if (committeeId) params.set("committee", committeeId);
  if (raceId) params.set("race", raceId);
  if (state) params.set("state", state);
  const query = params.toString();
  return query ? `/records/schedule-e?${query}` : "/records/schedule-e";
}

function targetStatusLabel(value?: string | null) {
  if (value === "I") return "incumbent";
  if (value === "C") return "challenger";
  if (value === "O") return "open seat";
  return null;
}
