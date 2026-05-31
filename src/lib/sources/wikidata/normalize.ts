import type { Election } from "@/src/lib/types";

const TYPE_QIDS: Record<string, Election["electionType"]> = {
  Q15283424: "primary",
  Q40231: "general",
  Q3589328: "runoff",
  Q161204: "special",
};

export type RawWikidataElection = {
  candidateId: string;
  candidateQid: string;
  electionQid: string;
  electionLabel?: string | null;
  electionDate?: string | null;
  typeQid?: string | null;
  typeLabel?: string | null;
  winnerQid?: string | null;
  candidateCount?: number | null;
};

export function normalizeWikidataElection(raw: RawWikidataElection): Election | null {
  if (!raw.electionDate) return null;
  const electionType = electionTypeFromRaw(raw);
  if (!electionType) return null;
  const date = raw.electionDate.slice(0, 10);
  return {
    candidateId: raw.candidateId,
    electionType,
    electionDate: date,
    status: statusFromRaw(raw, date),
    voteShare: null,
    opponentCount: raw.candidateCount === null || raw.candidateCount === undefined
      ? null
      : Math.max(0, raw.candidateCount - 1),
    source: "wikidata",
    sourceUrl: `https://www.wikidata.org/wiki/${raw.electionQid}`,
    sourceEntityId: raw.electionQid,
  };
}

function electionTypeFromRaw(raw: RawWikidataElection): Election["electionType"] | null {
  if (raw.typeQid && TYPE_QIDS[raw.typeQid]) return TYPE_QIDS[raw.typeQid];
  const label = `${raw.electionLabel ?? ""} ${raw.typeLabel ?? ""}`.toLowerCase();
  if (label.includes("runoff")) return "runoff";
  if (label.includes("primary")) return "primary";
  if (label.includes("special")) return "special";
  if (label.includes("general")) return "general";
  if (label.includes("election")) return "general";
  return null;
}

function statusFromRaw(raw: RawWikidataElection, date: string): Election["status"] {
  const today = new Date().toISOString().slice(0, 10);
  if (date > today) return "scheduled";
  if (!raw.winnerQid) return "pending";
  return raw.winnerQid === raw.candidateQid ? "won" : "lost";
}
