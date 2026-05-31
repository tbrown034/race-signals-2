import Link from "next/link";
import type { Metadata } from "next";
import { CoverageStrip } from "@/src/components/coverage-strip";
import { IncumbentBadge } from "@/src/components/incumbent-badge";
import { PageShell } from "@/src/components/page-shell";
import { PartySquare } from "@/src/components/party-square";
import { getCoverageSummary, getTopFundraisers } from "@/src/lib/db/repository";
import { formatDate, formatMoney } from "@/src/lib/format";
import { displayCandidateName } from "@/src/lib/names";

export const revalidate = 21600;
export const metadata: Metadata = {
  title: "Top stored fundraisers",
  description: "Candidates ranked by FEC cycle receipts in the Race Signals slice.",
};

export default async function RaisedPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const params = await searchParams;
  const state = typeof params.state === "string" ? params.state.toUpperCase() : undefined;
  const office = typeof params.office === "string" && (params.office === "H" || params.office === "S") ? params.office : undefined;
  const [fundraisers, stateOptionFundraisers, status] = await Promise.all([
    getTopFundraisers(100, state, office),
    getTopFundraisers(500),
    getCoverageSummary(),
  ]);
  const stateOptions = [...new Set(stateOptionFundraisers.map((f) => f.state))].sort();
  const stateCounts = countByState(stateOptionFundraisers);
  const exportQuery = new URLSearchParams();
  if (state) exportQuery.set("state", state);
  if (office) exportQuery.set("office", office);
  const exportSuffix = exportQuery.toString() ? `?${exportQuery.toString()}` : "";

  return (
    <PageShell>
      <main className="mx-auto max-w-7xl px-5 py-6 sm:px-8">
        <section className="min-w-0 overflow-hidden border border-neutral-300 bg-white">
          <div className="border-b border-neutral-300 px-5 py-5">
            <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
              <div className="min-w-0">
                <p className="font-mono text-xs uppercase tracking-[0.18em] text-neutral-500">
                  FEC totals ranking
                </p>
                <h1 className="mt-1 text-xl font-semibold tracking-tight">
                  Top stored fundraisers
                </h1>
                <p className="mt-2 max-w-3xl text-sm leading-5 text-neutral-700">
                  Candidates ranked by cycle receipts from the FEC candidate totals endpoint. This is
                  stored database coverage, not a national ranking. Verify the FEC record before
                  citing.
                </p>
              </div>
              <div className="flex flex-wrap gap-2 text-sm">
                <a className="border border-neutral-400 px-3 py-2 font-medium hover:border-neutral-900" href={`/api/raised/export.csv${exportSuffix}`}>
                  Export CSV
                </a>
                <a className="border border-neutral-400 px-3 py-2 font-medium hover:border-neutral-900" href={`/api/raised/export.json${exportSuffix}`}>
                  Export JSON
                </a>
              </div>
            </div>
          </div>

          <CoverageStrip counts={status.counts} latestRun={status.runs[0]} mode={status.mode} />

          <div className="border-b border-neutral-300 bg-stone-50 px-5 py-4">
            <div className="flex flex-wrap items-end gap-4">
              <Facet
                label="Office"
                options={[
                  { value: "", label: "All", href: hrefFor(state, undefined) },
                  { value: "H", label: "House", href: hrefFor(state, "H") },
                  { value: "S", label: "Senate", href: hrefFor(state, "S") },
                ]}
                active={office ?? ""}
              />
              <StateFilter active={state} options={stateOptions} stateCounts={stateCounts} office={office} />
            </div>
          </div>

          {fundraisers.length === 0 ? (
            <div className="p-5 text-sm text-neutral-700">
              <p className="font-semibold text-neutral-950">
                No stored candidate totals match this view.
              </p>
              <p className="mt-1">
                Try clearing the filter, or check the{" "}
                <Link className="font-medium underline underline-offset-4" href="/status">
                  ingestion status
                </Link>{" "}
                to see what candidates are currently stored.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-0 text-left text-sm md:min-w-[860px]">
                <thead className="bg-neutral-100 font-mono text-xs uppercase tracking-[0.12em] text-neutral-500">
                  <tr>
                    <th className="px-4 py-3 font-medium" scope="col">Rank</th>
                    <th className="px-4 py-3 font-medium" scope="col">Candidate</th>
                    <th className="px-4 py-3 font-medium" scope="col">Race</th>
                    <th className="px-4 py-3 text-right font-medium" scope="col">Cycle receipts</th>
                    <th className="hidden px-4 py-3 text-right font-medium md:table-cell" scope="col">Cash</th>
                    <th className="hidden px-4 py-3 font-medium md:table-cell" scope="col">Funding mix</th>
                    <th className="hidden px-4 py-3 font-medium md:table-cell" scope="col">Source</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-200">
                  {fundraisers.map((fundraiser, index) => (
                    <tr key={fundraiser.candidateId}>
                      <td className="px-4 py-3 font-mono text-neutral-600">{index + 1}</td>
                      <td className="px-4 py-3">
                        <div className="flex flex-wrap items-center gap-2">
                          <PartySquare party={fundraiser.party} />
                          <Link className="font-medium underline underline-offset-4" href={`/candidates/${fundraiser.candidateId}`}>
                            {displayCandidateName(fundraiser.name) ?? fundraiser.name}
                          </Link>
                          {isIncumbent(fundraiser.incumbentChallengeStatus) ? <IncumbentBadge /> : null}
                        </div>
                        <p className="mt-1 font-mono text-[11px] uppercase tracking-[0.12em] text-neutral-500">
                          {officeLabel(fundraiser.office)} · {fundraiser.state}{fundraiser.district ? `-${fundraiser.district}` : ""} · {fundraiser.fecCandidateId}
                        </p>
                      </td>
                      <td className="px-4 py-3 text-sm">
                        {fundraiser.raceId ? (
                          <Link className="underline underline-offset-4" href={`/races/${fundraiser.raceId}`}>
                            {fundraiser.raceName ?? fundraiser.raceId}
                          </Link>
                        ) : (
                          <span className="text-neutral-500">No matched race</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right font-mono">{formatMoney(fundraiser.totalReceiptsCycle) ?? "—"}</td>
                      <td className="hidden px-4 py-3 text-right font-mono md:table-cell">
                        {formatMoney(fundraiser.cashOnHandLatest) ?? "—"}
                        {fundraiser.cashOnHandAsOf ? (
                          <span className="block font-mono text-[10px] uppercase tracking-[0.12em] text-neutral-500">
                            as of {formatDate(fundraiser.cashOnHandAsOf)}
                          </span>
                        ) : null}
                      </td>
                      <td className="hidden px-4 py-3 text-xs md:table-cell">
                        {fundingMixLabel(fundraiser.individualContributionPct, fundraiser.pacContributionPct)}
                      </td>
                      <td className="hidden px-4 py-3 text-xs md:table-cell">
                        {fundraiser.sourceUrl ? (
                          <a className="font-medium underline underline-offset-4" href={fundraiser.sourceUrl} rel="noreferrer" target="_blank">
                            FEC record
                          </a>
                        ) : (
                          <span className="text-neutral-500">No source URL</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </main>
    </PageShell>
  );
}

function Facet({
  label,
  options,
  active,
}: {
  label: string;
  options: Array<{ value: string; label: string; href: string }>;
  active: string;
}) {
  return (
    <div>
      <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-neutral-500">{label}</p>
      <div className="mt-2 flex flex-wrap gap-2">
        {options.map((option) => {
          const isActive = option.value === active;
          return (
            <Link
              className={`border px-2.5 py-1.5 text-sm font-medium ${isActive ? "border-neutral-950 bg-neutral-950 text-white" : "border-neutral-300 hover:border-neutral-900"}`}
              href={option.href}
              key={option.value || "all"}
            >
              {option.label}
            </Link>
          );
        })}
      </div>
    </div>
  );
}

function StateFilter({
  active,
  options,
  stateCounts,
  office,
}: {
  active: string | undefined;
  options: string[];
  stateCounts: Map<string, number>;
  office: string | undefined;
}) {
  return (
    <div className="min-w-0">
      <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-neutral-500">State</p>
      <div className="mt-2 flex max-w-full flex-wrap gap-2">
        <Link
          className={`border px-2.5 py-1.5 text-sm font-medium ${!active ? "border-neutral-950 bg-neutral-950 text-white" : "border-neutral-300 hover:border-neutral-900"}`}
          href={hrefFor(undefined, office)}
        >
          All
        </Link>
        {options.map((opt) => {
          const isActive = active === opt;
          const count = stateCounts.get(opt) ?? 0;
          return (
            <Link
              className={`border px-2.5 py-1.5 text-sm font-medium ${isActive ? "border-neutral-950 bg-neutral-950 text-white" : "border-neutral-300 hover:border-neutral-900"}`}
              href={hrefFor(opt, office)}
              key={opt}
            >
              {opt} <span className="ml-1 font-mono text-[10px] uppercase tracking-[0.12em] opacity-80">{count}</span>
            </Link>
          );
        })}
      </div>
    </div>
  );
}

function hrefFor(state: string | undefined, office: string | undefined) {
  const params = new URLSearchParams();
  if (state) params.set("state", state);
  if (office) params.set("office", office);
  const qs = params.toString();
  return qs ? `/raised?${qs}` : "/raised";
}

function countByState(rows: Array<{ state: string }>) {
  const map = new Map<string, number>();
  for (const row of rows) {
    map.set(row.state, (map.get(row.state) ?? 0) + 1);
  }
  return map;
}

function fundingMixLabel(individualPct?: number | null, pacPct?: number | null) {
  if (individualPct === null && pacPct === null) return <span className="text-neutral-500">—</span>;
  return (
    <span>
      {individualPct !== null && individualPct !== undefined ? `${individualPct.toFixed(1)}% individual` : "—"}
      {" / "}
      {pacPct !== null && pacPct !== undefined ? `${pacPct.toFixed(1)}% PAC` : "—"}
    </span>
  );
}

function officeLabel(office: string) {
  if (office === "H") return "U.S. House";
  if (office === "S") return "U.S. Senate";
  return office;
}

function isIncumbent(status?: string | null) {
  return status === "I" || status === "Incumbent";
}
