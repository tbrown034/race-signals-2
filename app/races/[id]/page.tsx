import { notFound } from "next/navigation";
import { EntityPage } from "@/src/components/entity-page";
import { PageShell } from "@/src/components/page-shell";
import { getRace, getSignalsForEntity } from "@/src/lib/db/repository";

export default async function RacePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [race, signals] = await Promise.all([
    getRace(id),
    getSignalsForEntity("race", id),
  ]);

  if (!race) notFound();

  return (
    <PageShell>
      <EntityPage
        eyebrow="Race"
        title={race.name}
        signals={signals}
        meta={[
          ["Race ID", race.id],
          ["Cycle", race.cycle],
          ["State", race.state],
          ["District", race.district],
          ["Office", race.office],
          ["Competitiveness", race.competitiveness],
        ]}
      />
    </PageShell>
  );
}
