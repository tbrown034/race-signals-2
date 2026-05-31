import { fetchWikipediaWikitext, sparqlQuery } from "@/src/lib/sources/wikidata/client";
import { normalizeWikidataElection, type RawWikidataElection } from "@/src/lib/sources/wikidata/normalize";
import type { Candidate, Election, ValidationIssue } from "@/src/lib/types";

export type ElectionLookupResult = {
  elections: Election[];
  issues: ValidationIssue[];
};

export async function fetchCandidateElections(candidate: Candidate): Promise<ElectionLookupResult> {
  const issues: ValidationIssue[] = [];
  if (candidate.wikidataId) {
    try {
      const rows = await fetchWikidataRows(candidate);
      const elections = rows
        .map(normalizeWikidataElection)
        .filter((election): election is Election => Boolean(election));
      if (elections.length) return { elections, issues };
    } catch (error) {
      issues.push(electionIssue(candidate, error));
    }
  }

  if (candidate.wikipediaUrl) {
    try {
      return {
        elections: await fetchWikipediaFallback(candidate),
        issues,
      };
    } catch (error) {
      issues.push(electionIssue(candidate, error));
    }
  }

  return { elections: [], issues };
}

async function fetchWikidataRows(candidate: Candidate): Promise<RawWikidataElection[]> {
  const qid = candidate.wikidataId;
  if (!qid) return [];
  const query = `
    SELECT ?election ?electionLabel ?date ?type ?typeLabel ?winner ?candidateCount WHERE {
      VALUES ?person { wd:${qid} }
      {
        ?person wdt:P3602 ?election.
      }
      UNION
      {
        ?election wdt:P726 ?person.
      }
      OPTIONAL { ?election wdt:P585 ?date. }
      OPTIONAL { ?election wdt:P31 ?type. }
      OPTIONAL { ?election wdt:P991 ?winner. }
      {
        SELECT ?election (COUNT(DISTINCT ?candidate) AS ?candidateCount) WHERE {
          VALUES ?person { wd:${qid} }
          {
            ?person wdt:P3602 ?election.
            OPTIONAL { ?candidate wdt:P3602 ?election. }
          }
          UNION
          {
            ?election wdt:P726 ?person.
            OPTIONAL { ?election wdt:P726 ?candidate. }
          }
        }
        GROUP BY ?election
      }
      SERVICE wikibase:label { bd:serviceParam wikibase:language "en". }
    }
    LIMIT 50
  `;
  const bindings = await sparqlQuery(query);
  return bindings.flatMap((binding) => {
    const electionQid = qidFromUri(binding.election?.value);
    if (!electionQid) return [];
    return [{
      candidateId: candidate.id,
      candidateQid: qid,
      electionQid,
      electionLabel: binding.electionLabel?.value ?? null,
      electionDate: binding.date?.value ?? null,
      typeQid: qidFromUri(binding.type?.value),
      typeLabel: binding.typeLabel?.value ?? null,
      winnerQid: qidFromUri(binding.winner?.value),
      candidateCount: binding.candidateCount ? Number(binding.candidateCount.value) : null,
    }];
  });
}

async function fetchWikipediaFallback(candidate: Candidate): Promise<Election[]> {
  const title = wikipediaTitle(candidate.wikipediaUrl);
  if (!title) return [];
  const page = await fetchWikipediaWikitext(title);
  const permalink = page.oldId
    ? `https://en.wikipedia.org/w/index.php?oldid=${page.oldId}`
    : candidate.wikipediaUrl ?? `https://en.wikipedia.org/wiki/${encodeURIComponent(title)}`;
  return parseConservativeWikipediaRows(candidate, page.wikitext, permalink);
}

function parseConservativeWikipediaRows(
  candidate: Candidate,
  wikitext: string,
  sourceUrl: string,
): Election[] {
  void candidate;
  void wikitext;
  void sourceUrl;
  return [];
}

function wikipediaTitle(url?: string | null) {
  if (!url) return null;
  try {
    const parsed = new URL(url);
    return decodeURIComponent(parsed.pathname.replace(/^\/wiki\//, ""));
  } catch {
    return null;
  }
}

function qidFromUri(value?: string) {
  return value?.match(/Q\d+$/)?.[0] ?? null;
}

function electionIssue(candidate: Candidate, error: unknown): ValidationIssue {
  return {
    entityType: "candidate",
    sourceId: candidate.fecCandidateId,
    severity: "warning",
    rule: "elections_lookup",
    message: error instanceof Error ? error.message : String(error),
    sourceUrl: candidate.sourceUrl,
  };
}
