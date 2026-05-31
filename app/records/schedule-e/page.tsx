import Link from "next/link";
import { CoverageWarning } from "@/src/components/coverage-warning";
import { PageShell } from "@/src/components/page-shell";
import { getScheduleERecordSummary, getScheduleERecords, getValidationWarningsForScope } from "@/src/lib/db/repository";
import { formatCount, formatDate, formatMoney } from "@/src/lib/format";
import { displayCandidateName } from "@/src/lib/names";
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
  const fecCommitteeId = textParam(params.fecCommittee);
  const candidateId = textParam(params.candidate);
  const sourceId = textParam(params.sourceId) ?? textParam(params.sub_id);
  const state = textParam(params.state)?.toUpperCase();
  const minAmount = textParam(params.minAmount);
  const position = positionParam(textParam(params.position));
  const targetParty = targetPartyParam(textParam(params.targetParty));
  const targetStatus = targetStatusParam(textParam(params.targetStatus));
  const filters = {
    candidateId,
    committeeId,
    fecCommitteeId,
    minAmount,
    position,
    raceId,
    sourceId,
    state,
    targetParty,
    targetStatus,
  };
  const [records, summary] = await Promise.all([
    getScheduleERecords({
      ...filters,
      limit: 500,
    }),
    getScheduleERecordSummary(filters),
  ]);
  const validationWarnings = await getValidationWarningsForScope({
    sourceIds: [
      candidateId,
      sourceId,
      ...records.map((record) => record.sourceId),
      ...records.map((record) => record.fecCandidateId),
    ],
    sourcePrefixes: state ? [`candidate-scope:${state}:`] : [],
  });
  const activeScope = [
    state ? `state ${state}` : null,
    raceId ? `race ${raceId}` : null,
    committeeId ? `spender ${committeeId}` : null,
    fecCommitteeId ? `FEC spender ${fecCommitteeId}` : null,
    candidateId ? `candidate ${candidateId}` : null,
    sourceId ? `Schedule E source ${sourceId}` : null,
    position ? supportLabel(position) : null,
    minAmount ? `amount $${Number(minAmount).toLocaleString("en-US")}+` : null,
    targetParty ? `target party ${targetParty}` : null,
    targetStatus ? `target ${targetStatusLabel(targetStatus)}` : null,
  ].filter(Boolean);
  const exportQuery = new URLSearchParams();
  if (state) exportQuery.set("state", state);
  if (raceId) exportQuery.set("race", raceId);
  if (committeeId) exportQuery.set("committee", committeeId);
  if (fecCommitteeId) exportQuery.set("fecCommittee", fecCommitteeId);
  if (candidateId) exportQuery.set("candidate", candidateId);
  if (sourceId) exportQuery.set("sourceId", sourceId);
  if (position) exportQuery.set("position", position);
  if (minAmount) exportQuery.set("minAmount", minAmount);
  if (targetParty) exportQuery.set("targetParty", targetParty);
  if (targetStatus) exportQuery.set("targetStatus", targetStatus);
  const exportSuffix = exportQuery.toString();

  return (
    <PageShell>
      <main className="mx-auto max-w-7xl px-5 py-6 sm:px-8">
        <section className="w-full max-w-[calc(100vw-2.5rem)] min-w-0 border border-neutral-300 bg-white sm:max-w-none">
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
              <div className="grid w-full max-w-[280px] grid-cols-1 gap-2 text-sm sm:flex sm:max-w-none sm:flex-wrap">
                <a
                  className="w-full max-w-full border border-neutral-400 px-3 py-2 font-medium hover:border-neutral-900 sm:w-auto"
                  href={`/api/schedule-e/export.csv${exportSuffix ? `?${exportSuffix}` : ""}`}
                >
                  Export CSV
                </a>
                <a
                  className="w-full max-w-full border border-neutral-400 px-3 py-2 font-medium hover:border-neutral-900 sm:w-auto"
                  href={`/api/schedule-e/export.json${exportSuffix ? `?${exportSuffix}` : ""}`}
                >
                  Export JSON
                </a>
                <Link className="w-full max-w-full border border-neutral-400 px-3 py-2 font-medium hover:border-neutral-900 sm:w-auto" href="/spending">
                  Signals
                </Link>
                <Link className="w-full max-w-full border border-neutral-400 px-3 py-2 font-medium hover:border-neutral-900 sm:w-auto" href="/spenders">
                  Top spenders
                </Link>
              </div>
            </div>
          </div>

          <div className="grid gap-px border-b border-neutral-300 bg-neutral-300 sm:grid-cols-2 xl:grid-cols-5">
            <RecordStat label="Stored rows" value={formatCount(summary.recordCount, "record")} />
            <RecordStat label="Stored slice IE sum" value={formatMoney(summary.totalAmount) ?? "$0"} />
            <RecordStat label="Stored slice supports" value={formatMoney(summary.supportAmount) ?? "$0"} />
            <RecordStat label="Stored slice opposes" value={formatMoney(summary.opposeAmount) ?? "$0"} />
            <RecordStat label="Stored slice uncoded" value={formatMoney(summary.uncodedAmount) ?? "$0"} />
          </div>

          <div className="border-b border-neutral-300 px-5 py-3 text-sm text-neutral-600">
            <p className="max-w-full break-words [overflow-wrap:anywhere] sm:max-w-3xl">
              Latest {formatCount(records.length, "record")} shown. Summary totals cover the full stored scope; exports return up to 10,000 scoped rows.
            </p>
            <p className="mt-1 max-w-full break-words [overflow-wrap:anywhere] sm:max-w-3xl">
              Totals are summed from stored, source-linked Schedule E rows in this database slice, not a completeness claim.
            </p>
          </div>
          <ScheduleEFilters
            candidateId={candidateId}
            committeeId={committeeId}
            fecCommitteeId={fecCommitteeId}
            minAmount={minAmount}
            position={position}
            raceId={raceId}
            sourceId={sourceId}
            state={state}
            targetParty={targetParty}
            targetStatus={targetStatus}
          />
          <CoverageWarning issues={validationWarnings} />

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
                    <tr id={scheduleEAnchorId(record.sourceId)} key={record.sourceId}>
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
                        {record.payeeName || record.disseminationDate || record.categoryCodeFull ? (
                          <p className="mt-1 text-xs leading-5 text-neutral-600">
                            {record.payeeName ? `Payee ${record.payeeName}` : "Payee not listed"}
                            {record.disseminationDate ? ` / disseminated ${formatDate(record.disseminationDate)}` : ""}
                            {record.categoryCodeFull ? ` / ${record.categoryCodeFull}` : ""}
                          </p>
                        ) : null}
                        <dl className="mt-2 space-y-1 text-xs leading-5 text-neutral-600 md:hidden">
                          <RecordMobileRow label="Date" value={formatDate(record.expenditureDate)} />
                          {record.disseminationDate ? <RecordMobileRow label="Disseminated" value={formatDate(record.disseminationDate)} /> : null}
                          <RecordMobileRow label="Amount" value={formatMoney(record.amount) ?? "$0"} />
                          {record.payeeName ? <RecordMobileRow label="Payee" value={record.payeeName} /> : null}
                          {record.categoryCodeFull ? <RecordMobileRow label="Category" value={record.categoryCodeFull} /> : null}
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
                          <div className="flex flex-col gap-1">
                            {sourceLink(record)}
                            {record.filingForm || record.fileNumber ? (
                              <span className="font-mono text-[11px] uppercase tracking-[0.12em] text-neutral-500">
                                {[record.filingForm, record.fileNumber ? `file ${record.fileNumber}` : null].filter(Boolean).join(" / ")}
                              </span>
                            ) : null}
                            {record.pdfUrl ? (
                              <a className="text-xs underline underline-offset-4" href={record.pdfUrl} rel="noreferrer" target="_blank">
                                Filing PDF
                              </a>
                            ) : null}
                          </div>
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
            <div className="min-w-0 max-w-full p-5 text-sm text-neutral-700">
              <p className="font-semibold text-neutral-950">No stored Schedule E records match this scope.</p>
              <p className="mt-1 max-w-full break-words leading-6 [overflow-wrap:anywhere] sm:max-w-3xl">
                This evidence table includes records below the alert threshold. If it is empty, broaden the scope or check whether the latest ingest covered this race, spender or candidate.
              </p>
              <div className="mt-3 grid max-w-full gap-2 sm:grid-flow-col sm:auto-cols-max sm:justify-start">
                <Link className="max-w-full break-words font-medium underline underline-offset-4 [overflow-wrap:anywhere]" href="/records/schedule-e">
                  Show all stored Schedule E records
                </Link>
                <Link className="max-w-full break-words font-medium underline underline-offset-4 [overflow-wrap:anywhere]" href={spendingHref({ raceId, state })}>
                  Check outside-spending signals
                </Link>
                {raceId ? (
                  <Link className="max-w-full break-words font-medium underline underline-offset-4 [overflow-wrap:anywhere]" href={`/races/${raceId}`}>
                    Open race page
                  </Link>
                ) : null}
                <Link className="max-w-full break-words font-medium underline underline-offset-4 [overflow-wrap:anywhere]" href="/status">
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

function positionParam(value?: string) {
  if (value === "S" || value === "O" || value === "U") return value;
  return undefined;
}

function targetPartyParam(value?: string) {
  if (value === "REP" || value === "DEM") return value;
  return undefined;
}

function targetStatusParam(value?: string) {
  if (value === "I" || value === "C" || value === "O") return value;
  return undefined;
}

function ScheduleEFilters({
  candidateId,
  committeeId,
  fecCommitteeId,
  minAmount,
  position,
  raceId,
  sourceId,
  state,
  targetParty,
  targetStatus,
}: {
  candidateId?: string;
  committeeId?: string;
  fecCommitteeId?: string;
  minAmount?: string;
  position?: string;
  raceId?: string;
  sourceId?: string;
  state?: string;
  targetParty?: string;
  targetStatus?: string;
}) {
  return (
    <form action="/records/schedule-e" className="border-b border-neutral-300 px-5 py-4">
      <div className="grid gap-3 lg:grid-cols-[repeat(6,minmax(0,1fr))]">
        <label className="min-w-0 text-sm lg:col-span-1">
          <span className="font-mono text-[11px] uppercase tracking-[0.12em] text-neutral-500">State</span>
          <input
            className="mt-1 w-full border border-neutral-300 bg-white px-2 py-2 font-mono text-sm uppercase outline-none focus:border-neutral-900"
            defaultValue={state ?? ""}
            maxLength={2}
            name="state"
            placeholder="IN"
          />
        </label>
        <label className="min-w-0 text-sm lg:col-span-2">
          <span className="font-mono text-[11px] uppercase tracking-[0.12em] text-neutral-500">Race</span>
          <input
            className="mt-1 w-full border border-neutral-300 bg-white px-2 py-2 font-mono text-sm outline-none focus:border-neutral-900"
            defaultValue={raceId ?? ""}
            name="race"
            placeholder="2026-IN-04-H"
          />
        </label>
        <label className="min-w-0 text-sm lg:col-span-1">
          <span className="font-mono text-[11px] uppercase tracking-[0.12em] text-neutral-500">Target code</span>
          <select
            className="mt-1 w-full border border-neutral-300 bg-white px-2 py-2 text-sm outline-none focus:border-neutral-900"
            defaultValue={position ?? ""}
            name="position"
          >
            <option value="">Any</option>
            <option value="S">Supports target</option>
            <option value="O">Opposes target</option>
            <option value="U">Uncoded</option>
          </select>
        </label>
        <label className="min-w-0 text-sm lg:col-span-1">
          <span className="font-mono text-[11px] uppercase tracking-[0.12em] text-neutral-500">Min amount</span>
          <input
            className="mt-1 w-full border border-neutral-300 bg-white px-2 py-2 font-mono text-sm outline-none focus:border-neutral-900"
            defaultValue={minAmount ?? ""}
            inputMode="numeric"
            name="minAmount"
            placeholder="25000"
          />
        </label>
        <label className="min-w-0 text-sm lg:col-span-1">
          <span className="font-mono text-[11px] uppercase tracking-[0.12em] text-neutral-500">Source ID</span>
          <input
            className="mt-1 w-full border border-neutral-300 bg-white px-2 py-2 font-mono text-sm outline-none focus:border-neutral-900"
            defaultValue={sourceId ?? ""}
            name="sourceId"
          />
        </label>
      </div>
      <details className="mt-3 text-sm text-neutral-700">
        <summary className="cursor-pointer font-mono text-[11px] uppercase tracking-[0.12em] text-neutral-600">
          Committee and candidate filters
        </summary>
        <div className="mt-3 grid gap-3 md:grid-cols-3">
          <label className="min-w-0">
            <span className="font-mono text-[11px] uppercase tracking-[0.12em] text-neutral-500">Candidate ID</span>
            <input className="mt-1 w-full border border-neutral-300 bg-white px-2 py-2 font-mono text-sm outline-none focus:border-neutral-900" defaultValue={candidateId ?? ""} name="candidate" />
          </label>
          <label className="min-w-0">
            <span className="font-mono text-[11px] uppercase tracking-[0.12em] text-neutral-500">Internal spender ID</span>
            <input className="mt-1 w-full border border-neutral-300 bg-white px-2 py-2 font-mono text-sm outline-none focus:border-neutral-900" defaultValue={committeeId ?? ""} name="committee" />
          </label>
          <label className="min-w-0">
            <span className="font-mono text-[11px] uppercase tracking-[0.12em] text-neutral-500">FEC spender ID</span>
            <input className="mt-1 w-full border border-neutral-300 bg-white px-2 py-2 font-mono text-sm outline-none focus:border-neutral-900" defaultValue={fecCommitteeId ?? ""} name="fecCommittee" />
          </label>
          <label className="min-w-0">
            <span className="font-mono text-[11px] uppercase tracking-[0.12em] text-neutral-500">Target party</span>
            <select className="mt-1 w-full border border-neutral-300 bg-white px-2 py-2 text-sm outline-none focus:border-neutral-900" defaultValue={targetParty ?? ""} name="targetParty">
              <option value="">Any</option>
              <option value="REP">REP</option>
              <option value="DEM">DEM</option>
            </select>
          </label>
          <label className="min-w-0">
            <span className="font-mono text-[11px] uppercase tracking-[0.12em] text-neutral-500">Target status</span>
            <select className="mt-1 w-full border border-neutral-300 bg-white px-2 py-2 text-sm outline-none focus:border-neutral-900" defaultValue={targetStatus ?? ""} name="targetStatus">
              <option value="">Any</option>
              <option value="I">Incumbent</option>
              <option value="C">Challenger</option>
              <option value="O">Open seat</option>
            </select>
          </label>
        </div>
      </details>
      <div className="mt-3 flex flex-wrap gap-2 text-sm">
        <button className="border border-neutral-400 px-3 py-2 font-medium hover:border-neutral-900" type="submit">
          Apply filters
        </button>
        <Link className="border border-neutral-300 px-3 py-2 font-medium hover:border-neutral-900" href="/records/schedule-e">
          Clear
        </Link>
      </div>
    </form>
  );
}

function spendingHref({ raceId, state }: { raceId?: string; state?: string }) {
  const params = new URLSearchParams();
  if (raceId) params.set("race", raceId);
  if (state) params.set("state", state);
  const query = params.toString();
  return query ? `/spending?${query}` : "/spending";
}

function RecordStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-white px-5 py-4">
      <p className="font-mono text-[11px] uppercase tracking-[0.12em] text-neutral-500">{label}</p>
      <p className="mt-1 text-lg font-semibold tabular-nums">{value}</p>
      <p className="mt-1 text-xs leading-5 text-neutral-600">Current scoped slice</p>
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
  if (value === "S") return "FEC code: supports target";
  if (value === "O") return "FEC code: opposes target";
  return "Not classified by FEC";
}

function targetStatusLabel(value?: string | null) {
  if (value === "I") return "incumbent";
  if (value === "C") return "challenger";
  if (value === "O") return "open seat";
  return "unknown status";
}

function targetLink(record: Awaited<ReturnType<typeof getScheduleERecords>>[number]) {
  const context = targetContext(record);
  if (!record.candidateId) return displayCandidateName(record.candidateName) ?? record.fecCandidateId ?? "Candidate not resolved";
  return (
    <span>
      <Link className="font-medium underline underline-offset-4" href={`/candidates/${record.candidateId}`}>
        {displayCandidateName(record.candidateName) ?? record.fecCandidateId ?? record.candidateId}
      </Link>
      {context ? (
        <span className="ml-1 font-mono text-[11px] uppercase tracking-[0.12em] text-neutral-500">
          {context}
        </span>
      ) : null}
    </span>
  );
}

function targetContext(record: Awaited<ReturnType<typeof getScheduleERecords>>[number]) {
  const district = [record.candidateState, record.candidateDistrict].filter(Boolean).join("-");
  return [
    record.candidateParty,
    district || null,
    targetStatusLabel(record.candidateIncumbentChallengeStatus),
  ].filter(Boolean).join(" / ");
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
    <span className="inline-flex max-w-full flex-wrap items-baseline gap-x-2 gap-y-1">
      <a className="font-medium underline underline-offset-4" href={`#${scheduleEAnchorId(record.sourceId)}`}>
        Local row
      </a>
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
    </span>
  );
}

function scheduleEAnchorId(sourceId: string) {
  return `schedule-e-${sourceId.replace(/[^a-zA-Z0-9_-]/g, "-")}`;
}
