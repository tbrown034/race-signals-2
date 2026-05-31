import { getCoverageSummary, getTopFundraisers } from "@/src/lib/db/repository";
import {
  FUNDRAISER_EXPORT_LIMIT,
  type FundraiserExportManifest,
  fundraiserRowsToCsv,
  fundraiserToExportRow,
} from "@/src/lib/export/fundraisers";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const state = url.searchParams.get("state")?.toUpperCase() ?? null;
  const office = url.searchParams.get("office");
  const [fundraisers, manifest] = await Promise.all([
    getTopFundraisers(FUNDRAISER_EXPORT_LIMIT + 1, state, office),
    exportManifest(url),
  ]);
  const headers = exportHeaders();

  if (fundraisers.length > FUNDRAISER_EXPORT_LIMIT) {
    return Response.json(
      { error: "Export exceeds 10,000 rows. Narrow the fundraiser filters before exporting." },
      { status: 413, headers },
    );
  }

  return new Response(
    fundraiserRowsToCsv(fundraisers.map((fundraiser) => fundraiserToExportRow(fundraiser, manifest))),
    {
      headers: {
        ...headers,
        "content-type": "text/csv; charset=utf-8",
        "content-disposition": 'attachment; filename="race-signals-fundraisers.csv"',
      },
    },
  );
}

async function exportManifest(url: URL): Promise<FundraiserExportManifest> {
  const status = await getCoverageSummary();
  return {
    exportedAt: new Date().toISOString(),
    filters: exportFilters(url),
    baseUrl: url.origin,
    latestRun: status.runs[0] ?? null,
  };
}

function exportFilters(url: URL) {
  const filters: Record<string, string> = {};
  const state = url.searchParams.get("state");
  if (state) filters.state = state.toUpperCase();
  const office = url.searchParams.get("office");
  if (office) filters.office = office;
  return filters;
}

function exportHeaders() {
  return {
    "cache-control": "public, s-maxage=3600, stale-while-revalidate=86400",
    "x-robots-tag": "noindex, nofollow",
  };
}
