import { notFound } from "next/navigation";
import Link from "next/link";
import { CandidatePhoto } from "@/src/components/candidate-photo";
import { ElectionTimeline } from "@/src/components/election-timeline";
import { EntityPage } from "@/src/components/entity-page";
import { IncumbentBadge } from "@/src/components/incumbent-badge";
import { PageShell } from "@/src/components/page-shell";
import { PartySquare } from "@/src/components/party-square";
import { ReporterRead } from "@/src/components/reporter-read";
import {
  getCandidatesForRace,
  getRace,
  getRaceElections,
  getRaceRatings,
  getRaceStats,
  getSignalsForEntity,
} from "@/src/lib/db/repository";
import { formatCount, formatDate, formatDateTime, formatMoney } from "@/src/lib/format";
import type { Metadata } from "next";

export const revalidate = 21600;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const race = await getRace(id);
  if (!race) return { title: "Race not found" };
  return {
    title: race.name,
    description: `${race.name} FEC candidate, filing and outside-spending signals for the 2026 cycle.`,
  };
}

export default async function RacePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [race, signals, ratings, candidates, elections, stats] = await Promise.all([
    getRace(id),
    getSignalsForEntity("race", id),
    getRaceRatings(id),
    getCandidatesForRace(id),
    getRaceElections(id),
    getRaceStats(id),
  ]);

  if (!race) notFound();
  const signalCounts = countSignals(signals);
  const totalReceipts = candidates.reduce((sum, candidate) => sum + (candidate.totalReceiptsCycle ?? 0), 0);
  const candidatesWithMoney = candidates.filter((candidate) => (candidate.totalReceiptsCycle ?? 0) > 0).length;
  const incumbentCount = candidates.filter((candidate) => isIncumbent(candidate.incumbentChallengeStatus)).length;
  const latestSignalDate = signals.map((signal) => signal.signalDate).sort().at(-1) ?? null;
  const totalsFetchedDates = candidates
    .map((candidate) => candidate.totalsFetchedAt)
    .filter((value): value is string => Boolean(value))
    .sort();
  const oldestTotalsFetchedAt = totalsFetchedDates[0] ?? null;
  const latestTotalsFetchedAt = totalsFetchedDates.at(-1) ?? null;

  return (
    <PageShell>
      <EntityPage
        eyebrow="Race"
        title={race.name}
        titleAccessory={
          candidates.length ? (
            <span className="inline-flex items-center gap-1.5">
              {candidates.map((candidate) => (
                <Link
                  aria-label={`${candidate.name} candidate page`}
                  href={`/candidates/${candidate.id}`}
                  key={candidate.id}
                  title={candidate.name}
                >
                  <PartySquare party={candidate.party} />
                </Link>
              ))}
            </span>
          ) : null
        }
        ratings={ratings}
        signals={signals}
        allSignalsHref={`/?race=${encodeURIComponent(race.id)}`}
        meta={[
          ["Race ID", race.id],
          ["Cycle", race.cycle],
          ["State", race.state],
          ["District", race.office === "S" ? "Statewide" : race.district],
          ["Office", officeLabel(race.office)],
          ["Scope", raceScopeLabel(race.competitiveness)],
        ]}
      >
        <nav
          aria-label="Race page sections"
          className="border-b border-neutral-300 px-5 py-3 font-mono text-[11px] uppercase tracking-[0.12em] text-neutral-600"
        >
          <div className="flex flex-wrap gap-x-4 gap-y-2">
            <a className="underline-offset-4 hover:underline" href="#reporter-read">Reporter read</a>
            <a className="underline-offset-4 hover:underline" href="#race-stats">Stats</a>
            <a className="underline-offset-4 hover:underline" href="#candidate-cohort">Candidate cohort</a>
            <a className="underline-offset-4 hover:underline" href="#related-signals">Signals</a>
            <a className="underline-offset-4 hover:underline" href="#election-history">Election history</a>
          </div>
        </nav>
        <ReporterRead
          id="reporter-read"
          notes={[
            `${candidates.length} FEC candidates matched to this race; ${candidatesWithMoney} currently show cycle receipts in the FEC totals endpoint.`,
            `Known candidate receipts in this slice total ${formatMoney(totalReceipts) ?? "$0"}. Use this as FEC-filed activity, not a race forecast.`,
            `Schedule E independent expenditures currently total ${formatMoney(stats.totalIndependentExpenditures) ?? "$0"} in this race slice.`,
            `${formatCount(stats.independentExpenditureRecordCount, "stored Schedule E record")} in this race: support ${formatMoney(stats.supportIndependentExpenditures) ?? "$0"}; oppose ${formatMoney(stats.opposeIndependentExpenditures) ?? "$0"}.`,
            `Latest stored signal: ${latestSignalDate ? formatDate(latestSignalDate) : "none"}; latest stored Schedule E record: ${stats.latestIndependentExpenditureDate ? formatDate(stats.latestIndependentExpenditureDate) : "none"}.`,
            `${formatCount(signals.length, "related signal")}: ${formatCount(signalCounts.filings, "filing")}, ${formatCount(signalCounts.committees, "committee record")}, ${formatCount(signalCounts.outsideSpending, "outside-spending alert")}, ${formatCount(signalCounts.review, "review flag")}.`,
            incumbentCount
              ? `${incumbentCount} incumbent candidate${incumbentCount === 1 ? " is" : "s are"} present; compare committee and filing activity against challenger organization before treating paperwork as a launch signal.`
              : "No incumbent candidate is currently matched in this slice; verify ballot and primary context with election-office sources.",
            ]}
        />
        <div className="grid gap-px border-b border-neutral-300 bg-neutral-300 sm:grid-cols-2 xl:grid-cols-5" id="race-stats">
          <RaceStat
            detail={raceTotalsDetail(oldestTotalsFetchedAt, latestTotalsFetchedAt)}
            label="Stored FEC candidate totals"
            value={formatMoney(stats.totalRaised) ?? "$0"}
          />
          <RaceStat label="Outside spending" value={formatMoney(stats.totalIndependentExpenditures) ?? "$0"} />
          <RaceStat
            detail={`Support ${formatMoney(stats.supportIndependentExpenditures) ?? "$0"} / oppose ${formatMoney(stats.opposeIndependentExpenditures) ?? "$0"}`}
            label="IE direction"
            value={formatCount(stats.independentExpenditureRecordCount, "record")}
          />
          <RaceStat label="FEC candidate records" value={String(stats.candidateCount)} />
          <RaceStat label="Incumbents" value={String(stats.incumbentCount)} />
        </div>
        <div className="border-b border-neutral-300" id="candidate-cohort">
          <div className="border-b border-neutral-300 px-5 py-4">
            <h2 className="text-sm font-semibold uppercase tracking-[0.14em] text-neutral-600">
              Candidate cohort
            </h2>
            <p className="mt-2 max-w-3xl text-sm text-neutral-600">
              Cycle totals come from the FEC candidate totals endpoint. Verify the FEC record before treating
              cohort money as current ballot context.
            </p>
          </div>
          {candidates.length ? (
            <div className="overflow-x-auto">
              <table className="w-full min-w-0 text-left text-sm md:min-w-[920px]">
                <thead className="bg-neutral-100 font-mono text-xs uppercase tracking-[0.12em] text-neutral-500">
                  <tr>
                    <th className="px-4 py-3 font-medium" scope="col">Candidate</th>
                    <th className="hidden px-4 py-3 font-medium md:table-cell" scope="col">Party</th>
                    <th className="hidden px-4 py-3 font-medium md:table-cell" scope="col">FEC record</th>
                    <th className="hidden px-4 py-3 text-right font-medium md:table-cell" scope="col">Receipts</th>
                    <th className="hidden px-4 py-3 text-right font-medium md:table-cell" scope="col">Cash</th>
                    <th className="hidden px-4 py-3 font-medium md:table-cell" scope="col">Source records</th>
                    <th className="hidden px-4 py-3 font-medium md:table-cell" scope="col">Totals freshness</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-200">
                  {candidates.map((candidate) => (
                    <tr key={candidate.id}>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          {candidate.photoUrl ? (
                            <CandidatePhoto
                              alt={`${candidate.name} congressional portrait`}
                              size="sm"
                              src={candidate.photoUrl}
                            />
                          ) : (
                            <span aria-hidden="true" className="block h-[30px] w-6 bg-neutral-300" />
                          )}
                          <div className="min-w-0">
                            <Link className="font-medium underline underline-offset-4" href={`/candidates/${candidate.id}`}>
                              {candidate.name}
                            </Link>
                            {isIncumbent(candidate.incumbentChallengeStatus) ? (
                              <IncumbentBadge className="ml-2" />
                            ) : null}
                            <dl className="mt-2 space-y-1 text-xs leading-5 text-neutral-600 md:hidden">
                              <div>
                                <dt className="inline font-mono uppercase tracking-[0.12em] text-neutral-500">Party </dt>
                                <dd className="inline">
                                  <span className="inline-flex items-center gap-1.5">
                                    <PartySquare party={candidate.party} />
                                    {partyLabel(candidate.party)}
                                  </span>
                                </dd>
                              </div>
                              <div>
                                <dt className="inline font-mono uppercase tracking-[0.12em] text-neutral-500">Receipts </dt>
                                <dd className="inline font-mono text-neutral-950">{candidateMoney(candidate.totalReceiptsCycle, candidate.totalsFetchedAt)}</dd>
                              </div>
                              <div>
                                <dt className="inline font-mono uppercase tracking-[0.12em] text-neutral-500">Cash </dt>
                                <dd className="inline font-mono text-neutral-950">{candidateMoney(candidate.cashOnHandLatest, candidate.totalsFetchedAt)}</dd>
                              </div>
                              <div>
                                <dt className="inline font-mono uppercase tracking-[0.12em] text-neutral-500">Spent </dt>
                                <dd className="inline font-mono text-neutral-950">{candidateMoney(candidate.totalDisbursementsCycle, candidate.totalsFetchedAt)}</dd>
                              </div>
                              <div>
                                <dt className="inline font-mono uppercase tracking-[0.12em] text-neutral-500">Source </dt>
                                <dd className="inline">
                                  {candidate.sourceUrl ? (
                                    <a className="font-medium underline underline-offset-4" href={candidate.sourceUrl} rel="noreferrer" target="_blank">
                                      FEC record
                                    </a>
                                  ) : (
                                    "Source not stored"
                                  )}
                                </dd>
                              </div>
                              <div>
                                <dt className="inline font-mono uppercase tracking-[0.12em] text-neutral-500">Records </dt>
                                <dd className="inline">{sourceRecordSummary(candidate)}</dd>
                              </div>
                              <div>
                                <dt className="inline font-mono uppercase tracking-[0.12em] text-neutral-500">Fetched </dt>
                                <dd className="inline">{candidateTotalsFetched(candidate.totalsFetchedAt)}</dd>
                              </div>
                              <div>
                                <dt className="inline font-mono uppercase tracking-[0.12em] text-neutral-500">FEC load </dt>
                                <dd className="inline">{candidateTotalsAsOf(candidate.totalsUpdatedAt)}</dd>
                              </div>
                            </dl>
                          </div>
                        </div>
                      </td>
                      <td className="hidden px-4 py-3 font-mono text-xs md:table-cell">
                        <span className="inline-flex items-center gap-2">
                          <PartySquare party={candidate.party} />
                          {partyLabel(candidate.party)}
                        </span>
                      </td>
                      <td className="hidden px-4 py-3 md:table-cell">
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
                      <td className="hidden px-4 py-3 text-right font-mono md:table-cell">
                        {candidateMoney(candidate.totalReceiptsCycle, candidate.totalsFetchedAt)}
                      </td>
                      <td className="hidden px-4 py-3 text-right font-mono md:table-cell">
                        <span className="block">{candidateMoney(candidate.cashOnHandLatest, candidate.totalsFetchedAt)}</span>
                        <span className="block text-[11px] text-neutral-500">
                          spent {candidateMoney(candidate.totalDisbursementsCycle, candidate.totalsFetchedAt)}
                        </span>
                      </td>
                      <td className="hidden px-4 py-3 text-xs leading-5 text-neutral-600 md:table-cell">
                        <span className="block">{sourceRecordSummary(candidate)}</span>
                        {isAggregateOnly(candidate) ? (
                          <span className="mt-1 block font-mono text-[11px] uppercase tracking-[0.12em] text-neutral-700">
                            Totals only
                          </span>
                        ) : null}
                      </td>
                      <td className="hidden px-4 py-3 text-xs text-neutral-600 md:table-cell">
                        <span className="block">Fetched {candidateTotalsFetched(candidate.totalsFetchedAt)}</span>
                        <span className="block">FEC load {candidateTotalsAsOf(candidate.totalsUpdatedAt)}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="p-5 text-sm text-neutral-600">No FEC candidates matched this race yet.</p>
          )}
        </div>
        <ElectionTimeline
          collapseOnMobile
          elections={elections}
          emptyText={`No election timeline available for this race. Wikidata and Wikipedia coverage of congressional primaries can be thin - follow the ${race.state} secretary of state for authoritative results.`}
          id="election-history"
          note="Historical results for candidates currently matched to this race. This is not a 2026 election calendar or a real-time results feed."
          showCandidate
          title="Historical election results"
        />
      </EntityPage>
    </PageShell>
  );
}

function isIncumbent(status?: string | null) {
  return status === "I" || status === "Incumbent";
}

function officeLabel(office?: string | null) {
  if (office === "H") return "U.S. House";
  if (office === "S") return "U.S. Senate";
  return office;
}

function raceScopeLabel(scope?: string | null) {
  if (scope === "national") return "Configured 2026 federal race shell";
  return scope ?? "Configured race shell";
}

function partyLabel(party?: string | null) {
  if (party === "REP" || party === "R") return "Republican";
  if (party === "DEM" || party === "D") return "Democratic";
  if (!party || party === "NNE") return "Other/unknown";
  return party;
}

function sourceRecordSummary(candidate: {
  committeeCount?: number;
  filingCount?: number;
  signalCount?: number;
  totalReceiptsCycle?: number | null;
}) {
  const committeeCount = candidate.committeeCount ?? 0;
  const filingCount = candidate.filingCount ?? 0;
  const signalCount = candidate.signalCount ?? 0;
  if (committeeCount === 0 && filingCount === 0 && signalCount === 0 && (candidate.totalReceiptsCycle ?? 0) > 0) {
    return "FEC totals only; no matched committee/report signal yet.";
  }
  return `${formatCount(committeeCount, "committee")}, ${formatCount(filingCount, "filing")}, ${formatCount(signalCount, "signal")}`;
}

function isAggregateOnly(candidate: {
  committeeCount?: number;
  filingCount?: number;
  signalCount?: number;
  totalReceiptsCycle?: number | null;
}) {
  return (
    (candidate.totalReceiptsCycle ?? 0) > 0 &&
    (candidate.committeeCount ?? 0) === 0 &&
    (candidate.filingCount ?? 0) === 0 &&
    (candidate.signalCount ?? 0) === 0
  );
}

function candidateMoney(value?: number | null, totalsFetchedAt?: string | null) {
  return formatMoney(value) ?? (totalsFetchedAt ? "Not reported by FEC" : "FEC totals not loaded");
}

function candidateTotalsAsOf(value?: string | null) {
  return value ? formatDateTime(value) : "Not reported by FEC";
}

function candidateTotalsFetched(value?: string | null) {
  return value ? formatDateTime(value) : "Not recorded";
}

function countSignals(signals: Awaited<ReturnType<typeof getSignalsForEntity>>) {
  return {
    filings: signals.filter((signal) => signal.signalType === "new_filing").length,
    committees: signals.filter((signal) => signal.signalType === "new_committee").length,
    outsideSpending: signals.filter((signal) => signal.signalType === "large_independent_expenditure").length,
    review: signals.filter((signal) => signal.status === "review").length,
  };
}

function RaceStat({ detail, label, value }: { detail?: string; label: string; value: string }) {
  return (
    <div className="bg-white px-5 py-4">
      <p className="font-mono text-[11px] uppercase tracking-[0.12em] text-neutral-500">{label}</p>
      <p className="mt-1 text-lg font-semibold tabular-nums">{value}</p>
      {detail ? <p className="mt-1 text-xs leading-5 text-neutral-600">{detail}</p> : null}
    </div>
  );
}

function raceTotalsDetail(oldest?: string | null, latest?: string | null) {
  if (!latest) return "FEC totals not loaded for this cohort.";
  if (oldest && oldest !== latest) {
    return `Fetched ${formatDateTime(latest)}; oldest candidate fetch ${formatDateTime(oldest)}.`;
  }
  return `Fetched ${formatDateTime(latest)}.`;
}
