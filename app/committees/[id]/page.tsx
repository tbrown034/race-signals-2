import { notFound } from "next/navigation";
import Link from "next/link";
import { EntityPage } from "@/src/components/entity-page";
import { PageShell } from "@/src/components/page-shell";
import { PartySquare } from "@/src/components/party-square";
import { ReporterRead } from "@/src/components/reporter-read";
import {
  getCandidate,
  getCommittee,
  getCommitteeFilings,
  getCommitteeIndependentExpenditures,
  getSignalsForEntity,
} from "@/src/lib/db/repository";
import { committeeContext, committeeDesignationLabel, committeeTypeLabel } from "@/src/lib/fec-codes";
import { reportTypeDisplay } from "@/src/lib/fec-report-types";
import { formatCount, formatDate, formatMoney } from "@/src/lib/format";
import { displayCandidateName } from "@/src/lib/names";
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
  const [committee, signals, independentExpenditures, filings] = await Promise.all([
    getCommittee(id),
    getSignalsForEntity("committee", id),
    getCommitteeIndependentExpenditures(id),
    getCommitteeFilings(id),
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
        titleAccessory={linkedCandidate ? (
          <span className="inline-flex items-center gap-2">
            <PartySquare party={linkedCandidate.party} size="md" />
            <span className="font-mono text-[11px] uppercase tracking-[0.12em] text-neutral-600">
              {partyLabel(linkedCandidate.party)}
            </span>
          </span>
        ) : null}
        sourceUrl={committee.sourceUrl}
        independentExpenditures={independentExpenditures}
        signals={signals}
        allSignalsHref={`/?q=${encodeURIComponent(committee.name)}`}
        meta={[
          ["FEC ID", committee.fecCommitteeId],
          ["Type", committeeTypeLabel(committee.committeeType)],
          ["Designation", committeeDesignationLabel(committee.designation)],
          ["Context", committeeContext(committee)],
          ["Party", partyLabel(committee.party)],
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
          className="overflow-x-auto border-b border-neutral-300 px-5 py-3 font-mono text-[11px] uppercase tracking-[0.12em] text-neutral-600"
        >
          <div className="flex min-w-max flex-nowrap gap-x-4 whitespace-nowrap">
            <a className="underline-offset-4 hover:underline" href="#reporter-read">Reporter read</a>
            {filings.length ? (
              <a className="underline-offset-4 hover:underline" href="#source-filings">Filings</a>
            ) : null}
            {independentExpenditures.length ? (
              <a className="underline-offset-4 hover:underline" href="#schedule-e-records">Schedule E</a>
            ) : null}
            {independentExpenditures.length ? (
              <Link className="underline-offset-4 hover:underline" href={`/records/schedule-e?committee=${committee.id}`}>Evidence table</Link>
            ) : null}
            <a className="underline-offset-4 hover:underline" href="#related-signals">Signals</a>
          </div>
        </nav>
        <ReporterRead
          id="reporter-read"
          notes={[
            linkedCandidate
              ? `Directly linked to ${displayCandidateName(linkedCandidate.name) ?? linkedCandidate.name}; party context comes from that candidate record.`
              : "No direct candidate affiliation is stored for this committee, so the page does not assign a party reading.",
            filings.length
              ? `Showing ${formatCount(filings.length, "stored FEC filing")} for this committee, including amendments or termination reports when present.`
              : "No stored FEC filing rows are attached to this committee in this slice.",
            independentExpenditures.length
              ? `Showing ${formatMoney(spendingSummary.total) ?? "$0"} across the latest ${formatCount(independentExpenditures.length, "displayed current-cycle Schedule E independent expenditure record")} attached to this committee.`
              : "No current-cycle Schedule E independent expenditures are attached to this committee in this slice.",
            independentExpenditures.length
              ? `Displayed FEC target-position split: supports ${formatMoney(spendingSummary.support) ?? "$0"}; opposes ${formatMoney(spendingSummary.oppose) ?? "$0"}; not classified ${formatMoney(spendingSummary.uncoded) ?? "$0"}.`
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
        {filings.length ? <CommitteeFilingsTable filings={filings} /> : null}
      </EntityPage>
    </PageShell>
  );
}

function CommitteeFilingsTable({
  filings,
}: {
  filings: Awaited<ReturnType<typeof getCommitteeFilings>>;
}) {
  return (
    <div className="border-b border-neutral-300" id="source-filings">
      <div className="border-b border-neutral-300 px-5 py-4">
        <h2 className="text-sm font-semibold uppercase tracking-[0.14em] text-neutral-600">
          Source filings
        </h2>
        <p className="mt-1 text-sm text-neutral-600">
          FEC reports stored for this committee. These are source records behind filing signals and committee activity-spike checks.
        </p>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-0 text-left text-sm md:min-w-[860px]">
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
                  <p className="mt-1 font-mono text-[11px] uppercase tracking-[0.12em] text-neutral-500">
                    {filing.fecCommitteeId ?? "No FEC committee ID"}
                  </p>
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
