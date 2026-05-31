import YAML from "yaml";
import type { Candidate } from "@/src/lib/types";

const LEGISLATORS_CURRENT_URL =
  "https://unitedstates.github.io/congress-legislators/legislators-current.yaml";
const PHOTO_CDN_BASE = "https://raw.githubusercontent.com/unitedstates/images/gh-pages/congress/225x275";

type LegislatorRecord = {
  id?: {
    bioguide?: string;
    fec?: string[];
    wikipedia?: string;
    wikidata?: string;
  };
};

export type CongressLegislatorSyncResult = {
  candidates: Candidate[];
  matchedCount: number;
};

export async function applyCongressLegislatorIds(
  candidates: Candidate[],
): Promise<CongressLegislatorSyncResult> {
  const response = await fetch(LEGISLATORS_CURRENT_URL, {
    headers: { accept: "application/x-yaml,text/yaml,text/plain" },
  });
  if (!response.ok) {
    throw new Error(`Congress legislators fetch failed with ${response.status}.`);
  }

  const records = YAML.parse(await response.text()) as LegislatorRecord[];
  const byFecId = new Map<string, LegislatorRecord["id"]>();
  for (const record of records) {
    const ids = record.id;
    if (!ids?.bioguide || !Array.isArray(ids.fec)) continue;
    ids.fec.forEach((fecId) => byFecId.set(fecId, ids));
  }

  let matchedCount = 0;
  const hydrated = candidates.map((candidate) => {
    const ids = byFecId.get(candidate.fecCandidateId);
    if (!ids?.bioguide) return candidate;
    matchedCount += 1;
    return {
      ...candidate,
      bioguideId: ids.bioguide,
      wikidataId: ids.wikidata ?? null,
      photoUrl: `${PHOTO_CDN_BASE}/${ids.bioguide}.jpg`,
      wikipediaUrl: ids.wikipedia
        ? `https://en.wikipedia.org/wiki/${encodeURIComponent(ids.wikipedia.replaceAll(" ", "_"))}`
        : null,
    };
  });

  return { candidates: hydrated, matchedCount };
}
