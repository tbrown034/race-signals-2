import { CandidatePhoto } from "@/src/components/candidate-photo";
import { notFound } from "next/navigation";
import { EntityPage } from "@/src/components/entity-page";
import { IncumbentBadge } from "@/src/components/incumbent-badge";
import { PageShell } from "@/src/components/page-shell";
import { PartySquare } from "@/src/components/party-square";
import { getCandidate, getSignalsForEntity } from "@/src/lib/db/repository";
import { formatDate, formatMoney } from "@/src/lib/format";

export default async function CandidatePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [candidate, signals] = await Promise.all([
    getCandidate(id),
    getSignalsForEntity("candidate", id),
  ]);

  if (!candidate) notFound();

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
          ["Party", candidate.party],
          ["Office", candidate.office],
          ["Race", candidate.raceId],
          ["Status", incumbentStatus(candidate.incumbentChallengeStatus)],
          ["Filed", `Filed with FEC for the ${candidate.electionYear ?? "current"} cycle.`],
          ["Cycle receipts", formatMoney(candidate.totalReceiptsCycle)],
          ["Cash on hand", formatMoney(candidate.cashOnHandLatest)],
          ["Cash as of", formatDate(candidate.cashOnHandAsOf)],
          ["Bioguide", candidate.bioguideId],
        ]}
      />
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
