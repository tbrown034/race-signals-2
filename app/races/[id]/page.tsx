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
import { formatCount, formatDateTime, formatMoney } from "@/src/lib/format";
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
          ["Competitiveness", race.competitiveness],
        ]}
      >
        <ReporterRead
          notes={[
            `${candidates.length} FEC candidates matched to this race; ${candidatesWithMoney} currently show cycle receipts in the FEC totals endpoint.`,
            `Known candidate receipts in this slice total ${formatMoney(totalReceipts) ?? "$0"}. Use this as FEC-filed activity, not a race forecast.`,
            `Schedule E independent expenditures currently total ${formatMoney(stats.totalIndependentExpenditures) ?? "$0"} in this race slice.`,
            `${formatCount(signals.length, "related signal")}: ${formatCount(signalCounts.filings, "filing")}, ${formatCount(signalCounts.committees, "committee record")}, ${formatCount(signalCounts.outsideSpending, "outside-spending alert")}, ${formatCount(signalCounts.review, "review flag")}.`,
            incumbentCount
              ? `${incumbentCount} incumbent candidate${incumbentCount === 1 ? " is" : "s are"} present; compare committee and filing activity against challenger organization before treating paperwork as a launch signal.`
              : "No incumbent candidate is currently matched in this slice; verify ballot and primary context with election-office sources.",
            ]}
        />
        <div className="grid gap-px border-b border-neutral-300 bg-neutral-300 sm:grid-cols-4">
          <RaceStat label="Cohort receipts" value={formatMoney(stats.totalRaised) ?? "$0"} />
          <RaceStat label="Outside spending" value={formatMoney(stats.totalIndependentExpenditures) ?? "$0"} />
          <RaceStat label="Candidates filed" value={String(stats.candidateCount)} />
          <RaceStat label="Incumbents" value={String(stats.incumbentCount)} />
        </div>
        <ElectionTimeline
          elections={elections}
          emptyText={`No election timeline available for this race. Wikidata and Wikipedia coverage of congressional primaries can be thin - follow the ${race.state} secretary of state for authoritative results.`}
          showCandidate
          title="Race timeline"
        />
        <div className="border-b border-neutral-300">
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
              <table className="w-full min-w-[920px] text-left text-sm">
                <thead className="bg-neutral-100 font-mono text-xs uppercase tracking-[0.12em] text-neutral-500">
                  <tr>
                    <th className="px-4 py-3 font-medium" scope="col">Candidate</th>
                    <th className="px-4 py-3 font-medium" scope="col">Party</th>
                    <th className="px-4 py-3 font-medium" scope="col">FEC record</th>
                    <th className="px-4 py-3 text-right font-medium" scope="col">Receipts</th>
                    <th className="px-4 py-3 text-right font-medium" scope="col">Cash</th>
                    <th className="px-4 py-3 font-medium" scope="col">FEC API totals timestamp</th>
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
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 font-mono text-xs">
                        <span className="inline-flex items-center gap-2">
                          <PartySquare party={candidate.party} />
                          {partyLabel(candidate.party)}
                        </span>
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
                      <td className="px-4 py-3 text-right font-mono">
                        {candidateMoney(candidate.totalReceiptsCycle, candidate.totalsUpdatedAt)}
                      </td>
                      <td className="px-4 py-3 text-right font-mono">
                        {candidateMoney(candidate.cashOnHandLatest, candidate.totalsUpdatedAt)}
                      </td>
                      <td className="px-4 py-3 text-xs text-neutral-600">
                        {candidateTotalsAsOf(candidate.totalsUpdatedAt)}
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

function partyLabel(party?: string | null) {
  if (party === "REP" || party === "R") return "Republican";
  if (party === "DEM" || party === "D") return "Democratic";
  if (!party || party === "NNE") return "Other/unknown";
  return party;
}

function candidateMoney(value?: number | null, totalsUpdatedAt?: string | null) {
  return formatMoney(value) ?? (totalsUpdatedAt ? "Not reported by FEC" : "FEC totals not loaded");
}

function candidateTotalsAsOf(value?: string | null) {
  return value ? formatDateTime(value) : "FEC totals not loaded";
}

function countSignals(signals: Awaited<ReturnType<typeof getSignalsForEntity>>) {
  return {
    filings: signals.filter((signal) => signal.signalType === "new_filing").length,
    committees: signals.filter((signal) => signal.signalType === "new_committee").length,
    outsideSpending: signals.filter((signal) => signal.signalType === "large_independent_expenditure").length,
    review: signals.filter((signal) => signal.status === "review").length,
  };
}

function RaceStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-white px-5 py-4">
      <p className="font-mono text-[11px] uppercase tracking-[0.12em] text-neutral-500">{label}</p>
      <p className="mt-1 text-lg font-semibold tabular-nums">{value}</p>
    </div>
  );
}
