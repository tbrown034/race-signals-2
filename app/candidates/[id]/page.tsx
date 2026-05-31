import { CandidatePhoto } from "@/src/components/candidate-photo";
import { ElectionTimeline } from "@/src/components/election-timeline";
import { notFound } from "next/navigation";
import Link from "next/link";
import { EntityPage } from "@/src/components/entity-page";
import { IncumbentBadge } from "@/src/components/incumbent-badge";
import { PageShell } from "@/src/components/page-shell";
import { PartySquare } from "@/src/components/party-square";
import { ReporterRead } from "@/src/components/reporter-read";
import { getCandidate, getCandidateElections, getCandidatesForRace, getRace, getSignalsForEntity } from "@/src/lib/db/repository";
import { formatCount, formatDate, formatDateTime, formatMoney } from "@/src/lib/format";
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
  return {
    title: candidate.name,
    description: `${candidate.name} campaign-finance signals, FEC totals and race context for ${candidate.raceId ?? "the current Race Signals slice"}.`,
  };
}

export default async function CandidatePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [candidate, signals, elections] = await Promise.all([
    getCandidate(id),
    getSignalsForEntity("candidate", id),
    getCandidateElections(id),
  ]);

  if (!candidate) notFound();
  const [raceCohort, race] = candidate.raceId
    ? await Promise.all([getCandidatesForRace(candidate.raceId), getRace(candidate.raceId)])
    : [[], null] as const;
  const signalCounts = countSignals(signals);

  return (
    <PageShell>
      <EntityPage
        asideMedia={
          candidate.photoUrl ? (
            <CandidatePhoto alt={`${candidate.name} congressional portrait`} size="lg" src={candidate.photoUrl} />
          ) : null
        }
        eyebrow="Candidate"
        title={candidate.name}
        titleAccessory={
          <span className="inline-flex items-center gap-2">
            <PartySquare party={candidate.party} size="md" />
            {isIncumbent(candidate.incumbentChallengeStatus) ? <IncumbentBadge /> : null}
          </span>
        }
        primaryMetaCount={11}
        sourceUrl={candidate.sourceUrl}
        signals={signals}
        allSignalsHref={`/?q=${encodeURIComponent(candidate.name)}`}
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
          ["Cycle receipts", candidateMoney(candidate.totalReceiptsCycle, candidate.totalsFetchedAt)],
          ["Cash on hand", candidateMoney(candidate.cashOnHandLatest, candidate.totalsFetchedAt)],
          ["Cash as of", formatDate(candidate.cashOnHandAsOf)],
          ["Race Signals fetched totals", candidate.totalsFetchedAt ? formatDateTime(candidate.totalsFetchedAt) : "Not recorded"],
          ["FEC totals load date", candidate.totalsUpdatedAt ? formatDateTime(candidate.totalsUpdatedAt) : "Not reported by FEC"],
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
          className="border-b border-neutral-300 px-5 py-3 font-mono text-[11px] uppercase tracking-[0.12em] text-neutral-600"
        >
          <div className="flex flex-wrap gap-x-4 gap-y-2">
            <a className="underline-offset-4 hover:underline" href="#reporter-read">Reporter read</a>
            <a className="underline-offset-4 hover:underline" href="#race-context">Race context</a>
            <a className="underline-offset-4 hover:underline" href="#related-signals">Signals</a>
            <a className="underline-offset-4 hover:underline" href="#election-history">Election history</a>
          </div>
        </nav>
        <ReporterRead
          id="reporter-read"
          notes={[
            `Money position: ${candidateMoney(candidate.totalReceiptsCycle, candidate.totalsFetchedAt).toLowerCase()} raised this cycle; ${candidateMoney(candidate.cashOnHandLatest, candidate.totalsFetchedAt).toLowerCase()} cash on hand${candidate.cashOnHandAsOf ? ` as of ${formatDate(candidate.cashOnHandAsOf)}` : ""}.`,
            `${formatCount(signals.length, "related signal")} in this slice: ${formatCount(signalCounts.filings, "filing")}, ${formatCount(signalCounts.committees, "committee record")}, ${formatCount(signalCounts.outsideSpending, "outside-spending alert")}, ${formatCount(signalCounts.review, "review flag")}.`,
            isIncumbent(candidate.incumbentChallengeStatus)
              ? "Incumbent context: committee records usually reflect cycle operations or continuing campaign infrastructure, not a first-time launch."
              : "Non-incumbent context: a principal committee is useful early evidence of campaign organization, but ballot status still needs election-office verification.",
            "Low-cost mode does not store itemized Schedule A donor receipts; use FEC source links for donor-level lookup.",
          ]}
        />
        <ElectionTimeline
          collapseOnMobile
          elections={elections}
          emptyText={`No election timeline available for this candidate. ${electionLookupStatus(candidate)} Wikidata and Wikipedia coverage of congressional primaries can be thin - follow the ${candidate.state} secretary of state for authoritative results.`}
          id="election-history"
          note="Historical election rows from Wikidata or conservative Wikipedia parsing. This is not a live 2026 election calendar."
          title="Historical election results"
        />
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
              <table className="w-full min-w-0 text-left text-sm md:min-w-[680px]">
                <thead className="bg-neutral-100 font-mono text-xs uppercase tracking-[0.12em] text-neutral-500">
                  <tr>
                    <th className="px-4 py-3 font-medium" scope="col">Candidate</th>
                    <th className="hidden px-4 py-3 font-medium md:table-cell" scope="col">Status</th>
                    <th className="hidden px-4 py-3 text-right font-medium md:table-cell" scope="col">Receipts</th>
                    <th className="hidden px-4 py-3 text-right font-medium md:table-cell" scope="col">Cash</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-200">
                  {raceCohort.map((otherCandidate) => (
                    <tr className={otherCandidate.id === candidate.id ? "bg-neutral-50" : undefined} key={otherCandidate.id}>
                      <td className="px-4 py-3">
                        <span className="inline-flex items-center gap-2">
                          <PartySquare party={otherCandidate.party} />
                          <Link className="font-medium underline underline-offset-4" href={`/candidates/${otherCandidate.id}`}>
                            {otherCandidate.name}
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
                            <dt className="inline font-mono uppercase tracking-[0.12em] text-neutral-500">Receipts </dt>
                            <dd className="inline font-mono text-neutral-950">{candidateMoney(otherCandidate.totalReceiptsCycle, otherCandidate.totalsFetchedAt)}</dd>
                          </div>
                          <div>
                            <dt className="inline font-mono uppercase tracking-[0.12em] text-neutral-500">Cash </dt>
                            <dd className="inline font-mono text-neutral-950">{candidateMoney(otherCandidate.cashOnHandLatest, otherCandidate.totalsFetchedAt)}</dd>
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
                        {candidateMoney(otherCandidate.cashOnHandLatest, otherCandidate.totalsFetchedAt)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ) : null}
      </EntityPage>
    </PageShell>
  );
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
