import { CandidatePhoto } from "@/src/components/candidate-photo";
import { CoverageWarning } from "@/src/components/coverage-warning";
import { ElectionTimeline } from "@/src/components/election-timeline";
import { notFound } from "next/navigation";
import Link from "next/link";
import { EntityPage } from "@/src/components/entity-page";
import { IncumbentBadge } from "@/src/components/incumbent-badge";
import { PageShell } from "@/src/components/page-shell";
import { PartySquare } from "@/src/components/party-square";
import { ReporterRead } from "@/src/components/reporter-read";
import { getCandidate, getCandidateElections, getCandidateFilings, getCandidateIndependentExpenditures, getCandidatesForRace, getRace, getSignalsForEntity, getValidationWarningsForScope } from "@/src/lib/db/repository";
import { reportTypeDisplay } from "@/src/lib/fec-report-types";
import { formatCount, formatDate, formatDateTime, formatMoney } from "@/src/lib/format";
import { displayCandidateName } from "@/src/lib/names";
import type { Metadata } from "next";

export const revalidate = 21600;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const candidate = await getCandidate(id);
  if (!candidate) return { title: "Candidate not found" };
  const name = displayCandidateName(candidate.name) ?? candidate.name;
  return {
    title: name,
    description: `${name} campaign-finance signals, FEC totals and race context for ${candidate.raceId ?? "the current Race Signals slice"}.`,
  };
}

export default async function CandidatePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [candidate, signals, elections, independentExpenditures, filings] = await Promise.all([
    getCandidate(id),
    getSignalsForEntity("candidate", id),
    getCandidateElections(id),
    getCandidateIndependentExpenditures(id),
    getCandidateFilings(id),
  ]);

  if (!candidate) notFound();
  const candidateDisplayName = displayCandidateName(candidate.name) ?? candidate.name;
  const [raceCohort, race, validationWarnings] = candidate.raceId
    ? await Promise.all([
      getCandidatesForRace(candidate.raceId),
      getRace(candidate.raceId),
      getValidationWarningsForScope({
        sourceIds: [candidate.fecCandidateId],
        sourcePrefixes: [`candidate-scope:${candidate.state}:`],
      }),
    ])
    : [[], null, await getValidationWarningsForScope({ sourceIds: [candidate.fecCandidateId] })] as const;
  const signalCounts = countSignals(signals);
  const reporterNotes = candidateReporterNotes(candidate, signalCounts, signals.length, independentExpenditures.length);

  return (
    <PageShell>
      <EntityPage
        asideMedia={
          candidate.photoUrl ? (
            <CandidatePhoto alt={`${candidateDisplayName} congressional portrait`} size="lg" src={candidate.photoUrl} />
          ) : null
        }
        eyebrow="Candidate"
        title={candidateDisplayName}
        titleAccessory={
          <span className="inline-flex items-center gap-2">
            <PartySquare party={candidate.party} size="md" />
            <span className="font-mono text-[11px] uppercase tracking-[0.12em] text-neutral-600">
              {partyLabel(candidate.party)}
            </span>
            {isIncumbent(candidate.incumbentChallengeStatus) ? <IncumbentBadge /> : null}
          </span>
        }
        mobileLead={<MobileCandidateRead notes={candidateMobileNotes(candidate, signalCounts, signals.length, independentExpenditures.length)} />}
        quickActions={
          <CandidateSourceActions
            candidateId={candidate.id}
            candidateName={candidate.name}
            raceId={race?.id ?? null}
            sourceUrl={candidate.sourceUrl}
          />
        }
        primaryMetaCount={7}
        sourceUrl={candidate.sourceUrl}
        signals={signals}
        allSignalsHref={`/?q=${encodeURIComponent(candidate.name)}`}
        emptySignalsMessage={<CandidateNoSignalsMessage candidate={candidate} />}
        meta={[
          ["FEC ID", candidate.fecCandidateId],
          ["Party", partyLabel(candidate.party)],
          ["Office", officeLabel(candidate.office)],
          [
            "Race",
            race ? (
              <Link className="font-medium underline underline-offset-4" href={`/races/${race.id}`}>
                {race.name}
              </Link>
            ) : (
              candidate.raceId
            ),
          ],
          ["Status", incumbentStatus(candidate.incumbentChallengeStatus)],
          ["FEC cycle", `Filed with FEC for the ${candidate.electionYear ?? "current"} cycle.`],
          ["Stored FEC receipts", candidateMoney(candidate.totalReceiptsCycle, candidate.totalsFetchedAt)],
          ["Stored FEC cash", candidateMoney(candidate.cashOnHandLatest, candidate.totalsFetchedAt)],
          ["Cash as of", formatDate(candidate.cashOnHandAsOf)],
          ["Race Signals fetched totals", candidate.totalsFetchedAt ? formatDateTime(candidate.totalsFetchedAt) : "Not recorded"],
          [
            "FEC record last updated",
            candidate.totalsUpdatedAt ? (
              <span title="Date reported by FEC, not the Race Signals ingest time.">
                {formatDateTime(candidate.totalsUpdatedAt)}
              </span>
            ) : (
              "Not reported by FEC"
            ),
          ],
          ...(candidate.sourceUrl ? ([[
            "Verify current totals",
            <a className="font-medium underline underline-offset-4" href={candidate.sourceUrl} key="fec-totals" rel="noreferrer" target="_blank">
              FEC candidate page
            </a>,
          ]] as Array<[string, React.ReactNode]>) : []),
          ...profileSourceRows(candidate),
        ]}
      >
        <nav
          aria-label="Candidate page sections"
          className="overflow-x-auto border-b border-neutral-300 px-5 py-3 font-mono text-[11px] uppercase tracking-[0.12em] text-neutral-600"
        >
          <div className="flex min-w-max flex-nowrap gap-x-4 whitespace-nowrap">
            <a className="hidden underline-offset-4 hover:underline md:inline" href="#reporter-read">Reporter read</a>
            <a className="underline-offset-4 hover:underline" href="#race-context">Race context</a>
            {filings.length ? (
              <a className="underline-offset-4 hover:underline" href="#source-filings">Filings</a>
            ) : null}
            {independentExpenditures.length ? (
              <a className="underline-offset-4 hover:underline" href="#outside-spending-records">Schedule E</a>
            ) : null}
            <a className="underline-offset-4 hover:underline" href="#related-signals">Signals</a>
            <a className="underline-offset-4 hover:underline" href="#election-history">Election history</a>
          </div>
        </nav>
        <div className="hidden md:block">
          <ReporterRead
            id="reporter-read"
            notes={reporterNotes}
          />
        </div>
        <CoverageWarning issues={validationWarnings} />
        {isAggregateOnlyCandidate(candidate, signals.length, filings.length, independentExpenditures.length) ? (
          <AggregateOnlyNotice candidate={candidate} />
        ) : null}
        {raceCohort.length ? (
          <div className="border-b border-neutral-300" id="race-context">
            <div className="border-b border-neutral-300 px-5 py-4">
              <h2 className="text-sm font-semibold uppercase tracking-[0.14em] text-neutral-600">
                Race context
              </h2>
              <p className="mt-1 text-sm text-neutral-600">
                Other FEC candidates currently matched to {race?.name ?? candidate.raceId}. Totals come from the FEC candidate aggregate endpoint.
              </p>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full min-w-0 text-left text-sm md:min-w-[900px]">
                <thead className="bg-neutral-100 font-mono text-xs uppercase tracking-[0.12em] text-neutral-500">
                  <tr>
                    <th className="px-4 py-3 font-medium" scope="col">Candidate</th>
                    <th className="hidden px-4 py-3 font-medium md:table-cell" scope="col">Status</th>
                    <th className="hidden px-4 py-3 text-right font-medium md:table-cell" scope="col">Stored receipts</th>
                    <th className="hidden px-4 py-3 text-right font-medium md:table-cell" scope="col">Stored cash</th>
                    <th className="hidden px-4 py-3 font-medium md:table-cell" scope="col">Funding mix</th>
                    <th className="hidden px-4 py-3 font-medium md:table-cell" scope="col">Source</th>
                    <th className="hidden px-4 py-3 font-medium md:table-cell" scope="col">Fetched</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-200">
                  {raceCohort.map((otherCandidate) => (
                    <tr className={otherCandidate.id === candidate.id ? "bg-neutral-50" : undefined} key={otherCandidate.id}>
                      <td className="px-4 py-3">
                        <span className="inline-flex items-center gap-2">
                          <PartySquare party={otherCandidate.party} />
                          <Link className="font-medium underline underline-offset-4" href={`/candidates/${otherCandidate.id}`}>
                            {displayCandidateName(otherCandidate.name) ?? otherCandidate.name}
                          </Link>
                          {otherCandidate.id === candidate.id ? (
                            <span className="font-mono text-[10px] uppercase tracking-[0.12em] text-neutral-500">
                              This page
                            </span>
                          ) : null}
                        </span>
                        <dl className="mt-2 space-y-1 text-xs leading-5 text-neutral-600 md:hidden">
                          <div>
                            <dt className="inline font-mono uppercase tracking-[0.12em] text-neutral-500">Status </dt>
                            <dd className="inline">{incumbentStatus(otherCandidate.incumbentChallengeStatus) ?? "Not classified by FEC"}</dd>
                          </div>
                          <div>
                            <dt className="inline font-mono uppercase tracking-[0.12em] text-neutral-500">Stored receipts </dt>
                            <dd className="inline font-mono text-neutral-950">{candidateMoney(otherCandidate.totalReceiptsCycle, otherCandidate.totalsFetchedAt)}</dd>
                          </div>
                          <div>
                            <dt className="inline font-mono uppercase tracking-[0.12em] text-neutral-500">Spent </dt>
                            <dd className="inline font-mono text-neutral-950">{candidateMoney(otherCandidate.totalDisbursementsCycle, otherCandidate.totalsFetchedAt)}</dd>
                          </div>
                          <div>
                            <dt className="inline font-mono uppercase tracking-[0.12em] text-neutral-500">Stored cash </dt>
                            <dd className="inline font-mono text-neutral-950">{candidateMoney(otherCandidate.cashOnHandLatest, otherCandidate.totalsFetchedAt)}</dd>
                          </div>
                          <div>
                            <dt className="inline font-mono uppercase tracking-[0.12em] text-neutral-500">Funding mix </dt>
                            <dd className="inline">{fundingMix(otherCandidate.individualContributionPct, otherCandidate.pacContributionPct)}</dd>
                          </div>
                          <div>
                            <dt className="inline font-mono uppercase tracking-[0.12em] text-neutral-500">Source </dt>
                            <dd className="inline">
                              {otherCandidate.sourceUrl ? (
                                <a className="font-medium underline underline-offset-4" href={otherCandidate.sourceUrl} rel="noreferrer" target="_blank">
                                  FEC record
                                </a>
                              ) : (
                                "Source not stored"
                              )}
                            </dd>
                          </div>
                          <div>
                            <dt className="inline font-mono uppercase tracking-[0.12em] text-neutral-500">Fetched </dt>
                            <dd className="inline">{candidateTotalsFetched(otherCandidate.totalsFetchedAt)}</dd>
                          </div>
                        </dl>
                      </td>
                      <td className="hidden px-4 py-3 md:table-cell">
                        {incumbentStatus(otherCandidate.incumbentChallengeStatus) ?? "Not classified by FEC"}
                      </td>
                      <td className="hidden px-4 py-3 text-right font-mono md:table-cell">
                        {candidateMoney(otherCandidate.totalReceiptsCycle, otherCandidate.totalsFetchedAt)}
                      </td>
                      <td className="hidden px-4 py-3 text-right font-mono md:table-cell">
                        <span className="block">{candidateMoney(otherCandidate.cashOnHandLatest, otherCandidate.totalsFetchedAt)}</span>
                        <span className="block text-[11px] text-neutral-500">
                          spent {candidateMoney(otherCandidate.totalDisbursementsCycle, otherCandidate.totalsFetchedAt)}
                        </span>
                      </td>
                      <td className="hidden px-4 py-3 text-xs text-neutral-600 md:table-cell">
                        {fundingMix(otherCandidate.individualContributionPct, otherCandidate.pacContributionPct)}
                      </td>
                      <td className="hidden px-4 py-3 md:table-cell">
                        {otherCandidate.sourceUrl ? (
                          <a className="font-medium underline underline-offset-4" href={otherCandidate.sourceUrl} rel="noreferrer" target="_blank">
                            FEC record
                          </a>
                        ) : (
                          <span className="text-neutral-600">Source not stored</span>
                        )}
                      </td>
                      <td className="hidden px-4 py-3 text-xs text-neutral-600 md:table-cell">
                        {candidateTotalsFetched(otherCandidate.totalsFetchedAt)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ) : null}
        {filings.length ? (
          <CandidateFilingsTable filings={filings} />
        ) : null}
        {independentExpenditures.length ? (
          <CandidateOutsideSpendingTable candidateId={candidate.id} expenditures={independentExpenditures} />
        ) : null}
        <ElectionTimeline
          collapseOnMobile
          elections={elections}
          emptyText={`No election timeline available for this candidate. ${electionLookupStatus(candidate)} Wikidata and Wikipedia coverage of congressional primaries can be thin - follow the ${candidate.state} secretary of state for authoritative results.`}
          id="election-history"
          note="Historical election rows from Wikidata or conservative Wikipedia parsing. This is not a live 2026 election calendar."
          title="Historical election results"
        />
      </EntityPage>
    </PageShell>
  );
}

function AggregateOnlyNotice({
  candidate,
}: {
  candidate: NonNullable<Awaited<ReturnType<typeof getCandidate>>>;
}) {
  return (
    <section className="border-b border-neutral-300 bg-neutral-50 px-5 py-4" id="aggregate-only">
      <h2 className="text-sm font-semibold uppercase tracking-[0.14em] text-neutral-600">
        Aggregate-only FEC activity
      </h2>
      <p className="mt-2 max-w-3xl text-sm leading-6 text-neutral-700">
        FEC candidate totals show {candidateMoney(candidate.totalReceiptsCycle, candidate.totalsFetchedAt).toLowerCase()} raised this cycle, but Race Signals has not matched a committee report, committee-formation record or Schedule E record that produces a feed signal for this candidate in the current stored slice.
      </p>
      <div className="mt-3 flex flex-wrap gap-x-4 gap-y-2 text-sm">
        {candidate.sourceUrl ? (
          <a className="font-medium underline underline-offset-4" href={candidate.sourceUrl} rel="noreferrer" target="_blank">
            Verify candidate totals at FEC
          </a>
        ) : null}
        <Link className="font-medium underline underline-offset-4" href="/status#candidate-gaps">
          See candidate coverage gaps
        </Link>
      </div>
    </section>
  );
}

function CandidateNoSignalsMessage({
  candidate,
}: {
  candidate: NonNullable<Awaited<ReturnType<typeof getCandidate>>>;
}) {
  const hasAggregateMoney = Boolean(candidate.totalReceiptsCycle && candidate.totalReceiptsCycle > 0);
  return (
    <div className="max-w-3xl space-y-2">
      <p className="font-medium text-neutral-950">
        No source-record signals are matched to this candidate in the current stored slice.
      </p>
      <p>
        {hasAggregateMoney
          ? "FEC aggregate totals show cycle receipts, but Race Signals has not matched a committee filing or Schedule E record that generates a signal for this candidate yet."
          : "This is not proof of no activity; it only means the current stored FEC slice has no matched record that meets this product's signal rules."}
      </p>
      <div className="flex flex-wrap gap-x-4 gap-y-2">
        {candidate.sourceUrl ? (
          <a className="font-medium underline underline-offset-4" href={candidate.sourceUrl} rel="noreferrer" target="_blank">
            Open the FEC candidate record
          </a>
        ) : null}
        <Link className="font-medium underline underline-offset-4" href={`/records/schedule-e?candidate=${candidate.id}`}>
          Check Schedule E evidence
        </Link>
        {candidate.raceId ? (
          <Link className="font-medium underline underline-offset-4" href={`/races/${candidate.raceId}`}>
            Open race context
          </Link>
        ) : null}
        <Link className="font-medium underline underline-offset-4" href="/status#candidate-gaps">
          Check coverage gaps
        </Link>
      </div>
    </div>
  );
}

function CandidateSourceActions({
  candidateId,
  candidateName,
  raceId,
  sourceUrl,
}: {
  candidateId: string;
  candidateName: string;
  raceId?: string | null;
  sourceUrl?: string | null;
}) {
  return (
    <nav
      aria-label="Candidate source actions"
      className="border border-neutral-300 px-3 py-2 font-mono text-[11px] uppercase tracking-[0.12em] text-neutral-600"
    >
      <div className="flex flex-wrap gap-x-4 gap-y-2">
        {sourceUrl ? (
          <a className="underline-offset-4 hover:underline" href={sourceUrl} rel="noreferrer" target="_blank">
            FEC source
          </a>
        ) : null}
        {raceId ? (
          <Link className="underline-offset-4 hover:underline" href={`/races/${raceId}`}>
            Race page
          </Link>
        ) : null}
        <Link className="underline-offset-4 hover:underline" href={`/?q=${encodeURIComponent(candidateName)}`}>
          Matching feed
        </Link>
        <Link className="underline-offset-4 hover:underline" href={`/records/schedule-e?candidate=${candidateId}`}>
          Schedule E evidence
        </Link>
      </div>
    </nav>
  );
}

function CandidateFilingsTable({
  filings,
}: {
  filings: Awaited<ReturnType<typeof getCandidateFilings>>;
}) {
  return (
    <div className="border-b border-neutral-300" id="source-filings">
      <div className="border-b border-neutral-300 px-5 py-4">
        <h2 className="text-sm font-semibold uppercase tracking-[0.14em] text-neutral-600">
          Source filings
        </h2>
        <p className="mt-1 text-sm text-neutral-600">
          FEC committee reports stored for this candidate. Filing signals are generated from these source records, not from aggregate totals alone.
        </p>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-0 text-left text-sm md:min-w-[900px]">
          <thead className="bg-neutral-100 font-mono text-xs uppercase tracking-[0.12em] text-neutral-500">
            <tr>
              <th className="px-4 py-3 font-medium" scope="col">Report</th>
              <th className="hidden px-4 py-3 font-medium md:table-cell" scope="col">Period</th>
              <th className="hidden px-4 py-3 text-right font-medium md:table-cell" scope="col">Receipts</th>
              <th className="hidden px-4 py-3 text-right font-medium md:table-cell" scope="col">Disbursements</th>
              <th className="hidden px-4 py-3 text-right font-medium md:table-cell" scope="col">Cash</th>
              <th className="hidden px-4 py-3 font-medium md:table-cell" scope="col">Source</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-neutral-200">
            {filings.map((filing) => (
              <tr key={filing.sourceId}>
                <td className="px-4 py-3">
                  <span className="font-medium">{reportTypeDisplay(filing.reportType)}</span>
                  <p className="mt-1 text-xs text-neutral-600">{filing.committeeName ?? filing.fecCommitteeId ?? "Committee not resolved"}</p>
                  <dl className="mt-2 space-y-1 text-xs leading-5 text-neutral-600 md:hidden">
                    <div>
                      <dt className="inline font-mono uppercase tracking-[0.12em] text-neutral-500">Received </dt>
                      <dd className="inline font-mono text-neutral-950">{formatDate(filing.receiptDate)}</dd>
                    </div>
                    <div>
                      <dt className="inline font-mono uppercase tracking-[0.12em] text-neutral-500">Period </dt>
                      <dd className="inline">{filingPeriod(filing.coverageStartDate, filing.coverageEndDate)}</dd>
                    </div>
                    <div>
                      <dt className="inline font-mono uppercase tracking-[0.12em] text-neutral-500">Receipts </dt>
                      <dd className="inline font-mono text-neutral-950">
                        {formatMoney(filing.totalReceipts) ?? "Not reported"} ({receiptBasisLabel(filing.totalReceiptsBasis)})
                      </dd>
                    </div>
                    <div>
                      <dt className="inline font-mono uppercase tracking-[0.12em] text-neutral-500">Spent </dt>
                      <dd className="inline font-mono text-neutral-950">{formatMoney(filing.totalDisbursements) ?? "Not reported"}</dd>
                    </div>
                    <div>
                      <dt className="inline font-mono uppercase tracking-[0.12em] text-neutral-500">Source </dt>
                      <dd className="inline">
                        {filing.sourceUrl ? (
                          <a className="font-medium underline underline-offset-4" href={filing.sourceUrl} rel="noreferrer" target="_blank">
                            FEC filing
                          </a>
                        ) : (
                          "Source not stored"
                        )}
                      </dd>
                    </div>
                  </dl>
                </td>
                <td className="hidden px-4 py-3 text-neutral-700 md:table-cell">
                  <span className="block">{filingPeriod(filing.coverageStartDate, filing.coverageEndDate)}</span>
                  <span className="font-mono text-[11px] uppercase tracking-[0.12em] text-neutral-500">
                    Received {formatDate(filing.receiptDate)}
                  </span>
                </td>
                <td className="hidden px-4 py-3 text-right md:table-cell">
                  <span className="block font-mono">{formatMoney(filing.totalReceipts) ?? "Not reported"}</span>
                  <span className="block font-mono text-[11px] uppercase tracking-[0.12em] text-neutral-500">
                    {receiptBasisLabel(filing.totalReceiptsBasis)}
                  </span>
                </td>
                <td className="hidden px-4 py-3 text-right font-mono md:table-cell">{formatMoney(filing.totalDisbursements) ?? "Not reported"}</td>
                <td className="hidden px-4 py-3 text-right font-mono md:table-cell">{formatMoney(filing.cashOnHand) ?? "Not reported"}</td>
                <td className="hidden px-4 py-3 md:table-cell">
                  <div className="flex flex-col gap-1">
                    {filing.sourceUrl ? (
                      <a className="font-medium underline underline-offset-4" href={filing.sourceUrl} rel="noreferrer" target="_blank">
                        FEC filing
                      </a>
                    ) : (
                      <span className="text-neutral-600">Source not stored</span>
                    )}
                    <span className="font-mono text-[11px] uppercase tracking-[0.12em] text-neutral-500">
                      {filing.sourceId}
                    </span>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function candidateReporterNotes(
  candidate: NonNullable<Awaited<ReturnType<typeof getCandidate>>>,
  signalCounts: ReturnType<typeof countSignals>,
  totalSignals: number,
  independentExpenditureCount: number,
) {
  return [
    `Stored FEC money snapshot: ${candidateMoney(candidate.totalReceiptsCycle, candidate.totalsFetchedAt).toLowerCase()} raised this cycle; ${candidateMoney(candidate.cashOnHandLatest, candidate.totalsFetchedAt).toLowerCase()} cash on hand${candidate.cashOnHandAsOf ? ` as of ${formatDate(candidate.cashOnHandAsOf)}` : ""}.`,
    `${formatCount(totalSignals, "related signal")} in this slice: ${formatCount(signalCounts.filings, "filing")}, ${formatCount(signalCounts.committees, "committee record")}, ${formatCount(signalCounts.outsideSpending, "outside-spending alert")}, ${formatCount(signalCounts.review, "review flag")}.`,
    candidate.totalReceiptsCycle && candidate.totalReceiptsCycle > 0 && totalSignals === 0
      ? "FEC aggregate totals show activity, but Race Signals has not matched a committee, filing or Schedule E record that generates a source-record signal for this candidate yet."
      : null,
    independentExpenditureCount
      ? `Showing the latest ${formatCount(independentExpenditureCount, "stored Schedule E record")} naming this candidate; records below the $25,000 alert threshold are shown as context but do not become signals.`
      : "No stored current-cycle Schedule E records name this candidate in the current slice.",
    isIncumbent(candidate.incumbentChallengeStatus)
      ? "Incumbent context: committee records usually reflect cycle operations or continuing campaign infrastructure, not a first-time launch."
      : "Non-incumbent context: a principal committee is useful early evidence of campaign organization, but ballot status still needs election-office verification.",
    "Low-cost mode does not store itemized Schedule A donor receipts; use FEC source links for donor-level lookup.",
  ].filter((note): note is string => Boolean(note));
}

function isAggregateOnlyCandidate(
  candidate: NonNullable<Awaited<ReturnType<typeof getCandidate>>>,
  signalCount: number,
  filingCount: number,
  independentExpenditureCount: number,
) {
  return Boolean(
    candidate.totalReceiptsCycle &&
    candidate.totalReceiptsCycle > 0 &&
    signalCount === 0 &&
    filingCount === 0 &&
    independentExpenditureCount === 0
  );
}

function candidateMobileNotes(
  candidate: NonNullable<Awaited<ReturnType<typeof getCandidate>>>,
  signalCounts: ReturnType<typeof countSignals>,
  totalSignals: number,
  independentExpenditureCount: number,
) {
  return [
    `FEC totals: ${candidateMoney(candidate.totalReceiptsCycle, candidate.totalsFetchedAt)} raised; ${candidateMoney(candidate.cashOnHandLatest, candidate.totalsFetchedAt)} cash${candidate.cashOnHandAsOf ? ` as of ${formatDate(candidate.cashOnHandAsOf)}` : ""}${candidate.totalsFetchedAt ? `, fetched ${formatDate(candidate.totalsFetchedAt)}` : ""}.`,
    totalSignals
      ? `${formatCount(totalSignals, "signal")}: ${signalCounts.filings} filings, ${signalCounts.committees} committees, ${signalCounts.outsideSpending} IE, ${signalCounts.review} review.`
      : "No matched source-record signals in this stored slice yet.",
    candidate.totalReceiptsCycle && candidate.totalReceiptsCycle > 0 && totalSignals === 0
      ? "FEC totals show activity; no matched signal yet."
      : null,
    independentExpenditureCount
      ? `Latest ${formatCount(independentExpenditureCount, "Schedule E record")} naming this candidate; below-threshold records are context.`
      : "No stored current-cycle Schedule E rows name this candidate in this slice.",
  ].filter((note): note is string => Boolean(note));
}

function MobileCandidateRead({ notes }: { notes: string[] }) {
  return (
    <div className="w-full min-w-0 max-w-full overflow-hidden border border-neutral-300 bg-neutral-50">
      <p className="border-b border-neutral-300 px-3 py-2 font-mono text-[11px] uppercase tracking-[0.12em] text-neutral-500">
        Reporter read
      </p>
      <ul className="w-full min-w-0 max-w-full divide-y divide-neutral-200 text-sm leading-5 text-neutral-700">
        {notes.map((note) => (
          <li className="min-w-0 max-w-full whitespace-normal break-words px-3 py-2 [overflow-wrap:anywhere] [word-break:break-word]" key={note}>
            {note}
          </li>
        ))}
      </ul>
    </div>
  );
}

function supportLabel(value?: string | null) {
  if (value === "S") return "FEC code: supports target";
  if (value === "O") return "FEC code: opposes target";
  return "Not classified by FEC";
}

function CandidateOutsideSpendingTable({
  candidateId,
  expenditures,
}: {
  candidateId: string;
  expenditures: Awaited<ReturnType<typeof getCandidateIndependentExpenditures>>;
}) {
  return (
    <div className="border-b border-neutral-300" id="outside-spending-records">
      <div className="border-b border-neutral-300 px-5 py-4">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <h2 className="text-sm font-semibold uppercase tracking-[0.14em] text-neutral-600">
            Outside spending records
          </h2>
          <Link className="text-sm font-medium underline underline-offset-4" href={`/records/schedule-e?candidate=${candidateId}`}>
            Open full Schedule E evidence
          </Link>
        </div>
        <p className="mt-1 text-sm text-neutral-600">
          Latest current-cycle Schedule E records naming this candidate. Records below the $25,000 alert threshold are context, not signal cards.
        </p>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-0 text-left text-sm md:min-w-[760px]">
          <thead className="bg-neutral-100 font-mono text-xs uppercase tracking-[0.12em] text-neutral-500">
            <tr>
              <th className="hidden px-4 py-3 font-medium md:table-cell" scope="col">Date</th>
              <th className="px-4 py-3 font-medium" scope="col">Spender</th>
              <th className="hidden px-4 py-3 font-medium md:table-cell" scope="col">Position</th>
              <th className="hidden px-4 py-3 font-medium md:table-cell" scope="col">Purpose</th>
              <th className="hidden px-4 py-3 font-medium md:table-cell" scope="col">Source</th>
              <th className="hidden px-4 py-3 text-right font-medium md:table-cell" scope="col">Amount</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-neutral-200">
            {expenditures.map((expenditure) => (
              <tr key={expenditure.sourceId}>
                <td className="hidden px-4 py-3 font-mono md:table-cell">{formatDate(expenditure.expenditureDate)}</td>
                <td className="px-4 py-3">
                  {expenditure.spenderCommitteeId ? (
                    <Link className="font-medium underline underline-offset-4" href={`/committees/${expenditure.spenderCommitteeId}`}>
                      {expenditure.committeeName ?? expenditure.fecCommitteeId ?? "Spender not resolved"}
                    </Link>
                  ) : (
                    expenditure.committeeName ?? expenditure.fecCommitteeId ?? "Spender not resolved"
                  )}
                  <dl className="mt-2 space-y-1 text-xs leading-5 text-neutral-600 md:hidden">
                    <div>
                      <dt className="inline font-mono uppercase tracking-[0.12em] text-neutral-500">Date </dt>
                      <dd className="inline font-mono text-neutral-950">{formatDate(expenditure.expenditureDate)}</dd>
                    </div>
                    <div>
                      <dt className="inline font-mono uppercase tracking-[0.12em] text-neutral-500">Amount </dt>
                      <dd className="inline font-mono font-semibold text-neutral-950">{formatMoney(expenditure.amount)}</dd>
                    </div>
                    <div>
                      <dt className="inline font-mono uppercase tracking-[0.12em] text-neutral-500">Position </dt>
                      <dd className="inline">{supportLabel(expenditure.supportOpposeIndicator)}</dd>
                    </div>
                    <div>
                      <dt className="inline font-mono uppercase tracking-[0.12em] text-neutral-500">Purpose </dt>
                      <dd className="inline">{expenditure.purpose ?? "Not specified"}</dd>
                    </div>
                    <div>
                      <dt className="inline font-mono uppercase tracking-[0.12em] text-neutral-500">Source </dt>
                      <dd className="inline">
                        {expenditure.sourceUrl ? (
                          <>
                            <a className="font-medium underline underline-offset-4" href={expenditure.sourceUrl} rel="noreferrer" target="_blank">
                              FEC Schedule E
                            </a>
                            <span> / </span>
                            <Link className="font-medium underline underline-offset-4" href={candidateScheduleERecordHref(candidateId, expenditure)}>
                              Local row
                            </Link>
                          </>
                        ) : (
                          "Source not stored"
                        )}
                      </dd>
                    </div>
                  </dl>
                </td>
                <td className="hidden px-4 py-3 md:table-cell">{supportLabel(expenditure.supportOpposeIndicator)}</td>
                <td className="hidden px-4 py-3 text-neutral-700 md:table-cell">{expenditure.purpose ?? "Not specified"}</td>
                <td className="hidden px-4 py-3 md:table-cell">
                  <div className="flex flex-col gap-1">
                    {expenditure.sourceUrl ? (
                      <a className="font-medium underline underline-offset-4" href={expenditure.sourceUrl} rel="noreferrer" target="_blank">
                        FEC Schedule E
                      </a>
                    ) : (
                      <span className="text-neutral-600">Source not stored</span>
                    )}
                    <span className="font-mono text-[11px] uppercase tracking-[0.12em] text-neutral-500">
                      {expenditure.sourceId}
                    </span>
                    <Link className="text-xs font-medium underline underline-offset-4" href={candidateScheduleERecordHref(candidateId, expenditure)}>
                      Local evidence row
                    </Link>
                  </div>
                </td>
                <td className="hidden px-4 py-3 text-right font-mono font-semibold md:table-cell">
                  {formatMoney(expenditure.amount)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function candidateScheduleERecordHref(
  candidateId: string,
  expenditure: Awaited<ReturnType<typeof getCandidateIndependentExpenditures>>[number],
) {
  const params = new URLSearchParams();
  params.set("candidate", candidateId);
  if (expenditure.spenderCommitteeId) params.set("committee", expenditure.spenderCommitteeId);
  if (expenditure.raceId) params.set("race", expenditure.raceId);
  params.set("sourceId", expenditure.sourceId);
  return `/records/schedule-e?${params.toString()}#schedule-e-${expenditure.sourceId.replace(/[^a-zA-Z0-9_-]/g, "-")}`;
}

function incumbentStatus(status?: string | null) {
  if (status === "I" || status === "Incumbent") return "Incumbent";
  if (status === "C" || status === "Challenger") return "Challenger";
  if (status === "O" || status === "Open seat") return "Open seat";
  return status;
}

function isIncumbent(status?: string | null) {
  return status === "I" || status === "Incumbent";
}

function officeLabel(office?: string | null) {
  if (office === "H") return "U.S. House";
  if (office === "S") return "U.S. Senate";
  return office;
}

function partyLabel(party?: string | null) {
  if (party === "REP" || party === "R") return "Republican";
  if (party === "DEM" || party === "D") return "Democratic";
  if (!party || party === "NNE") return "Other/unknown";
  return party;
}

function filingPeriod(start?: string | null, end?: string | null) {
  if (!start && !end) return "Period not reported";
  if (start && end) return `${formatDate(start)} to ${formatDate(end)}`;
  return formatDate(start ?? end);
}

function receiptBasisLabel(basis?: "period" | "total" | "ytd" | null) {
  if (basis === "period") return "period receipts";
  if (basis === "ytd") return "YTD receipts";
  if (basis === "total") return "total receipts";
  return "receipt basis unknown";
}

function fundingMix(individualPct?: number | null, pacPct?: number | null) {
  const parts = [
    individualPct === null || individualPct === undefined ? null : `${formatPct(individualPct)} individual`,
    pacPct === null || pacPct === undefined ? null : `${formatPct(pacPct)} PAC`,
  ].filter(Boolean);
  return parts.length ? parts.join(" / ") : "Not broken out by FEC totals";
}

function formatPct(value: number) {
  const normalized = value > 1 ? value / 100 : value;
  return new Intl.NumberFormat("en-US", {
    maximumFractionDigits: 1,
    style: "percent",
  }).format(normalized);
}

function profileSourceRows(candidate: NonNullable<Awaited<ReturnType<typeof getCandidate>>>) {
  const rows: Array<[string, React.ReactNode]> = [];
  if (candidate.bioguideId) {
    rows.push([
      "Congress profile",
      <a
        className="font-medium underline underline-offset-4"
        href={`https://bioguide.congress.gov/search/bio/${candidate.bioguideId}`}
        key="bioguide"
        rel="noreferrer"
        target="_blank"
      >
        Bioguide {candidate.bioguideId}
      </a>,
    ]);
  }
  if (candidate.wikidataId) {
    rows.push([
      "Wikidata",
      <a
        className="font-medium underline underline-offset-4"
        href={`https://www.wikidata.org/wiki/${candidate.wikidataId}`}
        key="wikidata"
        rel="noreferrer"
        target="_blank"
      >
        {candidate.wikidataId}
      </a>,
    ]);
  }
  if (candidate.wikipediaUrl) {
    rows.push([
      "Wikipedia",
      <a
        className="font-medium underline underline-offset-4"
        href={candidate.wikipediaUrl}
        key="wikipedia"
        rel="noreferrer"
        target="_blank"
      >
        Article
      </a>,
    ]);
  }
  return rows;
}

function candidateMoney(value?: number | null, totalsFetchedAt?: string | null) {
  return formatMoney(value) ?? (totalsFetchedAt ? "Not reported by FEC" : "FEC totals not loaded");
}

function candidateTotalsFetched(value?: string | null) {
  return value ? formatDateTime(value) : "FEC totals not loaded";
}

function electionLookupStatus(candidate: Awaited<ReturnType<typeof getCandidate>>) {
  if (!candidate) return "";
  if (!candidate.wikidataId && !candidate.wikipediaUrl) return "No Wikidata or Wikipedia identifier is matched yet.";
  if (candidate.electionsCheckedAt) return `Open-source lookup was checked on ${formatDate(candidate.electionsCheckedAt)} but returned no structured rows.`;
  return "Open-source lookup has not run yet for the matched identifier.";
}

function countSignals(signals: Awaited<ReturnType<typeof getSignalsForEntity>>) {
  return {
    filings: signals.filter((signal) => signal.signalType === "new_filing").length,
    committees: signals.filter((signal) => signal.signalType === "new_committee").length,
    outsideSpending: signals.filter((signal) => signal.signalType === "large_independent_expenditure").length,
    review: signals.filter((signal) => signal.status === "review").length,
  };
}
