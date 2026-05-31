const WIKIDATA_SPARQL_URL = "https://query.wikidata.org/sparql";
export const WIKIMEDIA_USER_AGENT =
  "RaceSignals/0.1 (https://github.com/tbrown034/race-signals-2; contact via repo issues)";

export type SparqlBinding = Record<
  string,
  {
    type: string;
    value: string;
  }
>;

export async function sparqlQuery(query: string) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 30000);
  try {
    const url = new URL(WIKIDATA_SPARQL_URL);
    url.searchParams.set("query", query);
    url.searchParams.set("format", "json");
    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        accept: "application/sparql-results+json",
        "user-agent": WIKIMEDIA_USER_AGENT,
      },
    });
    if (!response.ok) {
      throw new Error(`Wikidata SPARQL failed with ${response.status}.`);
    }
    const data = (await response.json()) as { results?: { bindings?: SparqlBinding[] } };
    return data.results?.bindings ?? [];
  } finally {
    clearTimeout(timeout);
  }
}

export async function fetchWikipediaWikitext(title: string) {
  const url = new URL("https://en.wikipedia.org/w/api.php");
  url.searchParams.set("action", "query");
  url.searchParams.set("prop", "revisions");
  url.searchParams.set("titles", title);
  url.searchParams.set("rvprop", "ids|content");
  url.searchParams.set("rvslots", "main");
  url.searchParams.set("format", "json");
  url.searchParams.set("formatversion", "2");
  url.searchParams.set("origin", "*");

  const response = await fetch(url, {
    headers: {
      accept: "application/json",
      "user-agent": WIKIMEDIA_USER_AGENT,
    },
  });
  if (!response.ok) {
    throw new Error(`Wikipedia API failed with ${response.status}.`);
  }
  const data = (await response.json()) as {
    query?: {
      pages?: Array<{
        title?: string;
        revisions?: Array<{ revid?: number; slots?: { main?: { content?: string } } }>;
      }>;
    };
  };
  const page = data.query?.pages?.[0];
  const revision = page?.revisions?.[0];
  return {
    title: page?.title ?? title,
    oldId: revision?.revid ?? null,
    wikitext: revision?.slots?.main?.content ?? "",
  };
}
