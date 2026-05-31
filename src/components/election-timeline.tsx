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
  note,
}: {
  emptyText: string;
  elections: Election[];
  note?: string;
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
        {note ? <p className="mt-2 text-sm leading-6 text-neutral-600">{note}</p> : null}
      </div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-0 text-left text-sm md:min-w-[760px]">
          <thead className="bg-neutral-100 font-mono text-xs uppercase tracking-[0.12em] text-neutral-500">
            <tr>
                <th className="px-4 py-3 font-medium" scope="col">Date</th>
                {showCandidate ? <th className="hidden px-4 py-3 font-medium md:table-cell" scope="col">Candidate</th> : null}
                <th className="hidden px-4 py-3 font-medium md:table-cell" scope="col">Election</th>
                <th className="hidden px-4 py-3 font-medium md:table-cell" scope="col">Status</th>
                <th className="hidden px-4 py-3 text-right font-medium md:table-cell" scope="col">Vote share</th>
                <th className="hidden px-4 py-3 font-medium md:table-cell" scope="col">Source</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-neutral-200">
            {elections.map((election) => (
              <tr key={`${election.candidateId}-${election.electionType}-${election.electionDate}`}>
                  <td className="px-4 py-3 align-top">
                    <span className="font-mono text-xs">{formatDate(election.electionDate)}</span>
                    <dl className="mt-2 space-y-1 text-xs leading-5 text-neutral-600 md:hidden">
                      {showCandidate ? (
                        <div>
                          <dt className="inline font-mono uppercase tracking-[0.12em] text-neutral-500">Candidate </dt>
                          <dd className="inline">
                            <span className="inline-flex items-center gap-1.5">
                              <PartySquare party={election.candidateParty} />
                              <Link className="font-medium underline underline-offset-4" href={`/candidates/${election.candidateId}`}>
                                {election.candidateName ?? election.candidateId}
                              </Link>
                            </span>
                          </dd>
                        </div>
                      ) : null}
                      <div>
                        <dt className="inline font-mono uppercase tracking-[0.12em] text-neutral-500">Election </dt>
                        <dd className="inline capitalize">{election.electionType}</dd>
                      </div>
                      <div>
                        <dt className="inline font-mono uppercase tracking-[0.12em] text-neutral-500">Status </dt>
                        <dd className="inline">
                          <span className="inline-flex items-center gap-1.5">
                            <ElectionStatusSquare status={election.status} />
                            <span className={election.status === "uncontested" ? "font-mono text-[11px] uppercase tracking-[0.12em]" : "capitalize"}>
                              {election.status}
                            </span>
                          </span>
                        </dd>
                      </div>
                      <div>
                        <dt className="inline font-mono uppercase tracking-[0.12em] text-neutral-500">Vote </dt>
                        <dd className="inline font-mono text-neutral-950">{formatVoteShare(election.voteShare)}</dd>
                      </div>
                      <div>
                        <dt className="inline font-mono uppercase tracking-[0.12em] text-neutral-500">Source </dt>
                        <dd className="inline">
                          <a className="font-medium underline underline-offset-4" href={election.sourceUrl} rel="noreferrer" target="_blank">
                            {sourceLabel(election.source)}
                          </a>
                        </dd>
                      </div>
                    </dl>
                  </td>
                  {showCandidate ? (
                    <td className="hidden px-4 py-3 md:table-cell">
                      <span className="inline-flex items-center gap-2">
                        <PartySquare party={election.candidateParty} />
                        <Link className="font-medium underline underline-offset-4" href={`/candidates/${election.candidateId}`}>
                          {election.candidateName ?? election.candidateId}
                        </Link>
                      </span>
                    </td>
                  ) : null}
                  <td className="hidden px-4 py-3 capitalize md:table-cell">{election.electionType}</td>
                  <td className="hidden px-4 py-3 md:table-cell">
                    <span className="inline-flex items-center gap-2">
                      <ElectionStatusSquare status={election.status} />
                      <span className={election.status === "uncontested" ? "font-mono text-[11px] uppercase tracking-[0.12em]" : "capitalize"}>
                        {election.status}
                      </span>
                    </span>
                  </td>
                  <td className="hidden px-4 py-3 text-right font-mono md:table-cell">
                    {formatVoteShare(election.voteShare)}
                  </td>
                  <td className="hidden px-4 py-3 md:table-cell">
                    <a className="font-medium underline underline-offset-4" href={election.sourceUrl} rel="noreferrer" target="_blank">
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

function formatVoteShare(voteShare?: number | null) {
  return voteShare === null || voteShare === undefined ? "-" : `${(voteShare * 100).toFixed(1)}%`;
}

function sourceLabel(source: Election["source"]) {
  return source === "wikidata" ? "Wikidata" : "Wikipedia";
}
