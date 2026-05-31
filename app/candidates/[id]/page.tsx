import { CandidatePhoto } from "@/src/components/candidate-photo";
import { ElectionTimeline } from "@/src/components/election-timeline";
import { notFound } from "next/navigation";
import { EntityPage } from "@/src/components/entity-page";
import { IncumbentBadge } from "@/src/components/incumbent-badge";
import { PageShell } from "@/src/components/page-shell";
import { PartySquare } from "@/src/components/party-square";
import { ReporterRead } from "@/src/components/reporter-read";
import { getCandidate, getCandidateElections, getSignalsForEntity } from "@/src/lib/db/repository";
import { formatDate, formatDateTime, formatMoney } from "@/src/lib/format";

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
        sourceUrl={candidate.sourceUrl}
        signals={signals}
        meta={[
          ["FEC ID", candidate.fecCandidateId],
          ["Party", partyLabel(candidate.party)],
          ["Office", officeLabel(candidate.office)],
          ["Race", candidate.raceId],
          ["Status", incumbentStatus(candidate.incumbentChallengeStatus)],
          ["FEC cycle", `Filed with FEC for the ${candidate.electionYear ?? "current"} cycle.`],
          ["Cycle receipts", formatMoney(candidate.totalReceiptsCycle)],
          ["Cash on hand", formatMoney(candidate.cashOnHandLatest)],
          ["Cash as of", formatDate(candidate.cashOnHandAsOf)],
          ["Totals updated", candidate.totalsUpdatedAt ? formatDateTime(candidate.totalsUpdatedAt) : null],
          ...(candidate.bioguideId ? ([["Bioguide", candidate.bioguideId]] as Array<[string, string]>) : []),
        ]}
      >
        <ReporterRead
          notes={[
            `Money position: ${formatMoney(candidate.totalReceiptsCycle) ?? "receipts not available"} raised this cycle; ${formatMoney(candidate.cashOnHandLatest) ?? "cash not available"} cash on hand${candidate.cashOnHandAsOf ? ` as of ${formatDate(candidate.cashOnHandAsOf)}` : ""}.`,
            `${signals.length} related signals in this slice: ${signalCounts.filings} filings, ${signalCounts.committees} committee records, ${signalCounts.outsideSpending} outside-spending alerts, ${signalCounts.review} review flags.`,
            isIncumbent(candidate.incumbentChallengeStatus)
              ? "Incumbent context: committee records usually reflect cycle operations or continuing campaign infrastructure, not a first-time launch."
              : "Non-incumbent context: a principal committee is useful early evidence of campaign organization, but ballot status still needs election-office verification.",
            "Low-cost mode does not store itemized Schedule A donor receipts; use FEC source links for donor-level lookup.",
          ]}
        />
        <ElectionTimeline
          elections={elections}
          emptyText={`No election timeline available for this candidate. Wikidata and Wikipedia coverage of congressional primaries can be thin - follow the ${candidate.state} secretary of state for authoritative results.`}
          title="Election timeline"
        />
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
  return party;
}

function countSignals(signals: Awaited<ReturnType<typeof getSignalsForEntity>>) {
  return {
    filings: signals.filter((signal) => signal.signalType === "new_filing").length,
    committees: signals.filter((signal) => signal.signalType === "new_committee").length,
    outsideSpending: signals.filter((signal) => signal.signalType === "large_independent_expenditure").length,
    review: signals.filter((signal) => signal.status === "review").length,
  };
}
