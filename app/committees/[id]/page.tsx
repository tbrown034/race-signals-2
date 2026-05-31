import { notFound } from "next/navigation";
import { EntityPage } from "@/src/components/entity-page";
import { PageShell } from "@/src/components/page-shell";
import { PartySquare } from "@/src/components/party-square";
import {
  getCandidate,
  getCommittee,
  getCommitteeIndependentExpenditures,
  getCommitteeTransactions,
  getSignalsForEntity,
} from "@/src/lib/db/repository";
import { committeeContext, committeeDesignationLabel, committeeTypeLabel } from "@/src/lib/fec-codes";

export default async function CommitteePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [committee, signals, transactions, independentExpenditures] = await Promise.all([
    getCommittee(id),
    getSignalsForEntity("committee", id),
    getCommitteeTransactions(id),
    getCommitteeIndependentExpenditures(id),
  ]);

  if (!committee) notFound();
  const linkedCandidate = committee.candidateId ? await getCandidate(committee.candidateId) : null;

  return (
    <PageShell>
      <EntityPage
        eyebrow="Committee"
        title={committee.name}
        titleAccessory={linkedCandidate ? <PartySquare party={linkedCandidate.party} size="md" /> : null}
        sourceUrl={committee.sourceUrl}
        independentExpenditures={independentExpenditures}
        transactions={transactions}
        signals={signals}
        allSignalsHref={`/?q=${encodeURIComponent(committee.name)}`}
        meta={[
          ["FEC ID", committee.fecCommitteeId],
          ["Type", committeeTypeLabel(committee.committeeType)],
          ["Designation", committeeDesignationLabel(committee.designation)],
          ["Context", committeeContext(committee)],
          ["Party", committee.party],
          ["Race", committee.raceId],
          ["Treasurer", committee.treasurerName],
        ]}
      />
    </PageShell>
  );
}
