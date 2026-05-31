import { notFound } from "next/navigation";
import { EntityPage } from "@/src/components/entity-page";
import { PageShell } from "@/src/components/page-shell";
import { getCandidate, getSignalsForEntity } from "@/src/lib/db/repository";

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
        eyebrow="Candidate"
        title={candidate.name}
        sourceUrl={candidate.sourceUrl}
        signals={signals}
        meta={[
          ["FEC ID", candidate.fecCandidateId],
          ["Party", candidate.party],
          ["Office", candidate.office],
          ["Race", candidate.raceId],
          ["Status", candidate.incumbentChallengeStatus],
        ]}
      />
    </PageShell>
  );
}
