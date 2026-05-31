import { getCoverageSummary, getStateRaceBoard } from "@/src/lib/db/repository";
import {
  type RaceBoardExportManifest,
  raceBoardRowsToCsv,
  raceBoardToExportRow,
} from "@/src/lib/export/race-board";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const state = url.searchParams.get("state")?.toUpperCase();
  if (!state) {
    return Response.json(
      { error: "A state query parameter is required, for example /api/races/export.csv?state=IN." },
      { status: 400, headers: exportHeaders() },
    );
  }

  const [rows, manifest] = await Promise.all([
    getStateRaceBoard(state),
    exportManifest(state, url.origin),
  ]);

  return new Response(raceBoardRowsToCsv(rows.map((row) => raceBoardToExportRow(row, state, manifest))), {
    headers: {
      ...exportHeaders(),
      "content-type": "text/csv; charset=utf-8",
      "content-disposition": `attachment; filename="race-signals-${state.toLowerCase()}-races.csv"`,
    },
  });
}

async function exportManifest(state: string, baseUrl: string): Promise<RaceBoardExportManifest> {
  const status = await getCoverageSummary();
  return {
    exportedAt: new Date().toISOString(),
    filters: { state },
    baseUrl,
    latestRun: status.runs[0] ?? null,
  };
}

function exportHeaders() {
  return {
    "cache-control": "public, s-maxage=3600, stale-while-revalidate=86400",
    "x-robots-tag": "noindex, nofollow",
  };
}
