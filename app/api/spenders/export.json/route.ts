import { getCoverageSummary, getTopSpenders } from "@/src/lib/db/repository";
import { SPENDER_EXPORT_LIMIT, type SpenderExportManifest, spenderToExportRow } from "@/src/lib/export/spenders";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const [spenders, manifest] = await Promise.all([
    getTopSpenders(SPENDER_EXPORT_LIMIT + 1),
    exportManifest(url),
  ]);
  const rows = filterSpenders(spenders, url);
  const headers = exportHeaders();

  if (rows.length > SPENDER_EXPORT_LIMIT) {
    return Response.json(
      { error: "Export exceeds 10,000 rows. Narrow the spender filters before exporting." },
      { status: 413, headers },
    );
  }

  return Response.json(rows.map((spender) => spenderToExportRow(spender, manifest)), {
    headers: {
      ...headers,
      "content-disposition": 'attachment; filename="race-signals-spenders.json"',
    },
  });
}

async function exportManifest(url: URL): Promise<SpenderExportManifest> {
  const status = await getCoverageSummary();
  return {
    exportedAt: new Date().toISOString(),
    filters: exportFilters(url),
    latestRun: status.runs[0] ?? null,
  };
}

function filterSpenders<T extends { states: string[] }>(spenders: T[], url: URL) {
  const state = url.searchParams.get("state")?.toUpperCase();
  if (!state) return spenders;
  return spenders.filter((spender) => spender.states.includes(state));
}

function exportFilters(url: URL) {
  const filters: Record<string, string> = {};
  const state = url.searchParams.get("state");
  if (state) filters.state = state.toUpperCase();
  return filters;
}

function exportHeaders() {
  return {
    "cache-control": "public, s-maxage=3600, stale-while-revalidate=86400",
    "x-robots-tag": "noindex, nofollow",
  };
}
