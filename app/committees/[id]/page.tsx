import { notFound } from "next/navigation";
import { EntityPage } from "@/src/components/entity-page";
import { PageShell } from "@/src/components/page-shell";
import { getCommittee, getCommitteeTransactions, getSignalsForEntity } from "@/src/lib/db/repository";

export default async function CommitteePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [committee, signals, transactions] = await Promise.all([
    getCommittee(id),
    getSignalsForEntity("committee", id),
    getCommitteeTransactions(id),
  ]);

  if (!committee) notFound();

  return (
    <PageShell>
      <EntityPage
        eyebrow="Committee"
        title={committee.name}
        sourceUrl={committee.sourceUrl}
        transactions={transactions}
        signals={signals}
        meta={[
          ["FEC ID", committee.fecCommitteeId],
          ["Type", committee.committeeType],
          ["Designation", committee.designation],
          ["Party", committee.party],
          ["Race", committee.raceId],
          ["Treasurer", committee.treasurerName],
        ]}
      />
    </PageShell>
  );
}
