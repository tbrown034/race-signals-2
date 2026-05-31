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
  return parseConservativeWikipediaRows(candidate, page.wikitext, permalink, title);
}

function parseConservativeWikipediaRows(
  candidate: Candidate,
  wikitext: string,
  sourceUrl: string,
  title: string,
): Election[] {
  const rows: Election[] = [];
  const displayName = normalizePersonName(title.replace(/_/g, " ").replace(/\s+\(.+\)$/, ""));
  const candidateLastName = candidate.name.includes(",")
    ? normalizePersonName(candidate.name.split(",")[0])
    : normalizePersonName(candidate.name).split(" ").at(-1) ?? "";

  for (const block of electionBoxBlocks(wikitext)) {
    const boxTitle = templateParam(block.begin, "title");
    if (!boxTitle) continue;
    if (/primary|runoff|special/i.test(boxTitle)) continue;
    if (!/congressional district/i.test(boxTitle)) continue;
    const year = boxTitle.match(/\b(20\d{2}|19\d{2})\b/)?.[1];
    if (!year) continue;

    const candidateRows = candidateTemplates(block.body);
    const ownRow = candidateRows.find((row) => {
      const rowName = normalizePersonName(row.candidate);
      return rowName === displayName || (Boolean(candidateLastName) && rowName.includes(candidateLastName));
    });
    if (!ownRow) continue;

    rows.push({
      candidateId: candidate.id,
      electionType: "general",
      electionDate: federalGeneralElectionDate(Number(year)),
      status: ownRow.winning ? "won" : "lost",
      voteShare: ownRow.percentage === null ? null : ownRow.percentage / 100,
      opponentCount: Math.max(0, candidateRows.length - 1),
      source: "wikipedia",
      sourceUrl,
      sourceEntityId: null,
    });
  }

  return dedupeElections(rows);
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

function electionBoxBlocks(wikitext: string) {
  const blocks: Array<{ begin: string; body: string }> = [];
  const regex = /(\{\{Election box begin[^}]*\}\})([\s\S]*?)\{\{Election box end\}\}/gi;
  for (const match of wikitext.matchAll(regex)) {
    blocks.push({ begin: match[1], body: match[2] });
  }
  return blocks;
}

function candidateTemplates(body: string) {
  const rows: Array<{ candidate: string; percentage: number | null; winning: boolean }> = [];
  const regex = /\{\{Election box (winning candidate|candidate)[\s\S]*?\}\}/gi;
  for (const match of body.matchAll(regex)) {
    const candidate = templateParam(match[0], "candidate");
    if (!candidate) continue;
    rows.push({
      candidate: stripWikiMarkup(candidate),
      percentage: percentageValue(templateParam(match[0], "percentage")),
      winning: match[1].toLowerCase().includes("winning"),
    });
  }
  return rows;
}

function templateParam(template: string, name: string) {
  const regex = new RegExp(`\\|\\s*${name}\\s*=\\s*([^|}]+)`, "i");
  return template.match(regex)?.[1]?.trim() ?? null;
}

function stripWikiMarkup(value: string) {
  return value
    .replace(/\[\[(?:[^|\]]*\|)?([^\]]+)\]\]/g, "$1")
    .replace(/\{\{[^}]+\}\}/g, "")
    .replace(/<[^>]+>/g, "")
    .trim();
}

function normalizePersonName(value: string) {
  return stripWikiMarkup(value)
    .replace(/\(.+?\)/g, "")
    .replace(/[^a-zA-Z,\s]/g, " ")
    .split(",")
    .reverse()
    .join(" ")
    .replace(/\b(dr|mr|mrs|ms|jr|sr)\b/gi, " ")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

function percentageValue(value: string | null) {
  if (!value) return null;
  const parsed = Number(value.replace("%", "").trim());
  return Number.isFinite(parsed) ? parsed : null;
}

function federalGeneralElectionDate(year: number) {
  const date = new Date(Date.UTC(year, 10, 2));
  while (date.getUTCDay() !== 2) {
    date.setUTCDate(date.getUTCDate() + 1);
  }
  return date.toISOString().slice(0, 10);
}

function dedupeElections(rows: Election[]) {
  const byKey = new Map<string, Election>();
  for (const row of rows) {
    byKey.set(`${row.candidateId}:${row.electionType}:${row.electionDate}`, row);
  }
  return [...byKey.values()].sort((a, b) => a.electionDate.localeCompare(b.electionDate));
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
