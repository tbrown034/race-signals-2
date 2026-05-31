import Link from "next/link";
import { ElectionStatusSquare } from "@/src/components/election-status-square";
import { PartySquare } from "@/src/components/party-square";
import { formatDate } from "@/src/lib/format";
import type { Election } from "@/src/lib/types";

export function ElectionTimeline({
  emptyText,
  elections,
  showCandidate = false,
  title,
}: {
  emptyText: string;
  elections: Election[];
  showCandidate?: boolean;
  title: string;
}) {
  if (!elections.length) {
    return (
      <div className="border-b border-neutral-300 px-5 py-4">
        <p className="font-mono text-xs uppercase tracking-[0.14em] text-neutral-500">
          {title}
        </p>
        <p className="mt-2 text-sm leading-6 text-neutral-600">{emptyText}</p>
      </div>
    );
  }

  return (
    <div className="border-b border-neutral-300">
      <div className="border-b border-neutral-300 px-5 py-4">
        <h2 className="text-sm font-semibold uppercase tracking-[0.14em] text-neutral-600">
          {title}
        </h2>
      </div>
      <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-neutral-100 font-mono text-xs uppercase tracking-[0.12em] text-neutral-500">
              <tr>
                <th className="px-4 py-3 font-medium">Date</th>
                {showCandidate ? <th className="px-4 py-3 font-medium">Candidate</th> : null}
                <th className="px-4 py-3 font-medium">Election</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 text-right font-medium">Vote share</th>
                <th className="px-4 py-3 font-medium">Source</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-200">
              {elections.map((election) => (
                <tr key={`${election.candidateId}-${election.electionType}-${election.electionDate}`}>
                  <td className="px-4 py-3 font-mono text-xs">{formatDate(election.electionDate)}</td>
                  {showCandidate ? (
                    <td className="px-4 py-3">
                      <span className="inline-flex items-center gap-2">
                        <PartySquare party={election.candidateParty} />
                        <Link className="font-medium underline underline-offset-4" href={`/candidates/${election.candidateId}`}>
                          {election.candidateName ?? election.candidateId}
                        </Link>
                      </span>
                    </td>
                  ) : null}
                  <td className="px-4 py-3 capitalize">{election.electionType}</td>
                  <td className="px-4 py-3">
                    <span className="inline-flex items-center gap-2">
                      <ElectionStatusSquare status={election.status} />
                      <span className={election.status === "uncontested" ? "font-mono text-[11px] uppercase tracking-[0.12em]" : "capitalize"}>
                        {election.status}
                      </span>
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right font-mono">
                    {election.voteShare === null || election.voteShare === undefined
                      ? "-"
                      : `${(election.voteShare * 100).toFixed(1)}%`}
                  </td>
                  <td className="px-4 py-3">
                    <a className="font-medium underline underline-offset-4" href={election.sourceUrl}>
                      {sourceLabel(election.source)}
                    </a>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
      </div>
    </div>
  );
}

function sourceLabel(source: Election["source"]) {
  return source === "wikidata" ? "Wikidata" : "Wikipedia";
}
