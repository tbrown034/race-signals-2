import Link from "next/link";
import { PageShell } from "@/src/components/page-shell";
import { getTopSpenders } from "@/src/lib/db/repository";
import { committeeDesignationLabel, committeeTypeLabel } from "@/src/lib/fec-codes";
import { formatMoney } from "@/src/lib/format";

export const revalidate = 21600;

export default async function SpendersPage() {
  const spenders = await getTopSpenders(100);

  return (
    <PageShell>
      <main className="mx-auto max-w-7xl px-5 py-6 sm:px-8">
        <section className="border border-neutral-300 bg-white">
          <div className="border-b border-neutral-300 px-5 py-5">
            <p className="font-mono text-xs uppercase tracking-[0.18em] text-neutral-500">
              Schedule E ranking
            </p>
            <h1 className="mt-1 text-xl font-semibold tracking-tight">
              Top outside spenders
            </h1>
            <p className="mt-2 max-w-3xl text-sm leading-5 text-neutral-700">
              Committees ranked by independent expenditure totals in the current
              database slice. Amounts are sourced from FEC Schedule E records and
              should be checked against the linked committee source before publication.
            </p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[820px] text-left text-sm">
              <thead className="bg-neutral-100 font-mono text-xs uppercase tracking-[0.12em] text-neutral-500">
                <tr>
                  <th className="px-4 py-3 font-medium" scope="col">Committee</th>
                  <th className="px-4 py-3 font-medium" scope="col">Type</th>
                  <th className="px-4 py-3 text-right font-medium" scope="col">Total IE</th>
                  <th className="px-4 py-3 text-right font-medium" scope="col">Records</th>
                  <th className="px-4 py-3 font-medium" scope="col">Source</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-200">
                {spenders.length ? (
                  spenders.map((spender) => (
                    <tr key={spender.committeeId ?? spender.fecCommitteeId ?? spender.committeeName}>
                      <td className="px-4 py-3">
                        {spender.committeeId ? (
                          <Link
                            className="font-medium underline underline-offset-4"
                            href={`/committees/${spender.committeeId}`}
                          >
                            {spender.committeeName}
                          </Link>
                        ) : (
                          <span className="font-medium">{spender.committeeName}</span>
                        )}
                        <p className="mt-1 font-mono text-[11px] uppercase tracking-[0.12em] text-neutral-500">
                          {spender.fecCommitteeId ?? "No FEC committee ID"}
                        </p>
                      </td>
                      <td className="px-4 py-3 text-neutral-700">
                        <span>{committeeTypeLabel(spender.committeeType)}</span>
                        <span className="block text-xs text-neutral-500">
                          {committeeDesignationLabel(spender.designation)}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right font-mono font-semibold">
                        {formatMoney(spender.totalAmount)}
                      </td>
                      <td className="px-4 py-3 text-right font-mono">{spender.recordCount}</td>
                      <td className="px-4 py-3">
                        {spender.sourceUrl ? (
                          <a
                            className="font-medium underline underline-offset-4"
                            href={spender.sourceUrl}
                            rel="noreferrer"
                            target="_blank"
                          >
                            FEC committee
                          </a>
                        ) : (
                          <span className="text-neutral-600">Missing source</span>
                        )}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td className="px-4 py-4 text-neutral-600" colSpan={5}>
                      No Schedule E spender records are available in the current database slice.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>
      </main>
    </PageShell>
  );
}
