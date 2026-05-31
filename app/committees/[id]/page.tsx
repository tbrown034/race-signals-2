import { notFound } from "next/navigation";
import Link from "next/link";
import { EntityPage } from "@/src/components/entity-page";
import { PageShell } from "@/src/components/page-shell";
import { PartySquare } from "@/src/components/party-square";
import { ReporterRead } from "@/src/components/reporter-read";
import {
  getCandidate,
  getCommittee,
  getCommitteeIndependentExpenditures,
  getSignalsForEntity,
} from "@/src/lib/db/repository";
import { committeeContext, committeeDesignationLabel, committeeTypeLabel } from "@/src/lib/fec-codes";
import { formatCount, formatDate, formatMoney } from "@/src/lib/format";
import type { Metadata } from "next";

export const revalidate = 21600;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const committee = await getCommittee(id);
  if (!committee) return { title: "Committee not found" };
  return {
    title: committee.name,
    description: `${committee.name} FEC committee signals, source records and outside-spending context.`,
  };
}

export default async function CommitteePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [committee, signals, independentExpenditures] = await Promise.all([
    getCommittee(id),
    getSignalsForEntity("committee", id),
    getCommitteeIndependentExpenditures(id),
  ]);

  if (!committee) notFound();
  const linkedCandidate = committee.candidateId ? await getCandidate(committee.candidateId) : null;
  const touchedRaces = summarizeTouchedRaces(independentExpenditures);
  const spendingSummary = summarizeSpending(independentExpenditures);

  return (
    <PageShell>
      <EntityPage
        eyebrow="Committee"
        title={committee.name}
        titleAccessory={linkedCandidate ? <PartySquare party={linkedCandidate.party} size="md" /> : null}
        sourceUrl={committee.sourceUrl}
        independentExpenditures={independentExpenditures}
        signals={signals}
        allSignalsHref={`/?q=${encodeURIComponent(committee.name)}`}
        meta={[
          ["FEC ID", committee.fecCommitteeId],
          ["Type", committeeTypeLabel(committee.committeeType)],
          ["Designation", committeeDesignationLabel(committee.designation)],
          ["Context", committeeContext(committee)],
          ["Party", committee.party],
          [
            "Race",
            committee.raceId ? (
              <Link className="font-medium underline underline-offset-4" href={`/races/${committee.raceId}`}>
                {committee.raceId}
              </Link>
            ) : touchedRaces.length ? (
              <span>
                {touchedRaces.map((race, index) => (
                  <span key={race.id}>
                    {index ? ", " : ""}
                    <Link className="font-medium underline underline-offset-4" href={`/races/${race.id}`}>
                      {race.name}
                    </Link>
                  </span>
                ))}
              </span>
            ) : null,
          ],
          ["Treasurer", committee.treasurerName],
        ]}
      >
        <nav
          aria-label="Committee page sections"
          className="border-b border-neutral-300 px-5 py-3 font-mono text-[11px] uppercase tracking-[0.12em] text-neutral-600"
        >
          <div className="flex flex-wrap gap-x-4 gap-y-2">
            <a className="underline-offset-4 hover:underline" href="#reporter-read">Reporter read</a>
            {independentExpenditures.length ? (
              <a className="underline-offset-4 hover:underline" href="#schedule-e-records">Schedule E</a>
            ) : null}
            {independentExpenditures.length ? (
              <Link className="underline-offset-4 hover:underline" href={`/records/schedule-e?committee=${committee.id}`}>Full Schedule E evidence</Link>
            ) : null}
            <a className="underline-offset-4 hover:underline" href="#related-signals">Signals</a>
          </div>
        </nav>
        <ReporterRead
          id="reporter-read"
          notes={[
            linkedCandidate
              ? `Directly linked to ${linkedCandidate.name}; party context comes from that candidate record.`
              : "No direct candidate affiliation is stored for this committee, so the page does not assign a party reading.",
            independentExpenditures.length
              ? `Showing ${formatMoney(spendingSummary.total) ?? "$0"} across the latest ${formatCount(independentExpenditures.length, "displayed current-cycle Schedule E independent expenditure record")} attached to this committee.`
              : "No current-cycle Schedule E independent expenditures are attached to this committee in this slice.",
            independentExpenditures.length
              ? `Displayed position split: support ${formatMoney(spendingSummary.support) ?? "$0"}; oppose ${formatMoney(spendingSummary.oppose) ?? "$0"}; not classified ${formatMoney(spendingSummary.uncoded) ?? "$0"}.`
              : null,
            spendingSummary.latestDate
              ? `Latest stored Schedule E date: ${formatDate(spendingSummary.latestDate)}.`
              : null,
            touchedRaces[0]
              ? `Largest matched race exposure: ${touchedRaces[0].name} at ${formatMoney(touchedRaces[0].amount) ?? "$0"}.`
              : independentExpenditures.length
                ? "No matched race exposure is available for these Schedule E records yet."
                : null,
            "Low-cost mode does not store itemized Schedule A donor receipts; use the FEC source link for donor-level lookup.",
          ].filter((note): note is string => Boolean(note))}
        />
      </EntityPage>
    </PageShell>
  );
}

function summarizeTouchedRaces(
  expenditures: Awaited<ReturnType<typeof getCommitteeIndependentExpenditures>>,
) {
  const races = new Map<string, { id: string; name: string; amount: number }>();
  for (const expenditure of expenditures) {
    if (!expenditure.raceId) continue;
    const current = races.get(expenditure.raceId);
    races.set(expenditure.raceId, {
      id: expenditure.raceId,
      name: expenditure.raceName ?? expenditure.raceId,
      amount: (current?.amount ?? 0) + expenditure.amount,
    });
  }
  return [...races.values()].sort((a, b) => b.amount - a.amount).slice(0, 3);
}

function summarizeSpending(
  expenditures: Awaited<ReturnType<typeof getCommitteeIndependentExpenditures>>,
) {
  return expenditures.reduce(
    (summary, expenditure) => {
      summary.total += expenditure.amount;
      if (expenditure.supportOpposeIndicator === "S") summary.support += expenditure.amount;
      else if (expenditure.supportOpposeIndicator === "O") summary.oppose += expenditure.amount;
      else summary.uncoded += expenditure.amount;
      if (
        expenditure.expenditureDate &&
        (!summary.latestDate || expenditure.expenditureDate > summary.latestDate)
      ) {
        summary.latestDate = expenditure.expenditureDate;
      }
      return summary;
    },
    { latestDate: null, oppose: 0, support: 0, total: 0, uncoded: 0 } as {
      latestDate: string | null;
      oppose: number;
      support: number;
      total: number;
      uncoded: number;
    },
  );
}
