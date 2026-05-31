import { getCoverageSummary, getStateRaceBoard } from "@/src/lib/db/repository";
import { type RaceBoardExportManifest, raceBoardToExportRow } from "@/src/lib/export/race-board";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const state = url.searchParams.get("state")?.toUpperCase();
  if (!state) {
    return Response.json(
      { error: "A state query parameter is required, for example /api/races/export.json?state=IN." },
      { status: 400, headers: exportHeaders() },
    );
  }

  const [rows, manifest] = await Promise.all([
    getStateRaceBoard(state),
    exportManifest(state),
  ]);

  return Response.json(rows.map((row) => raceBoardToExportRow(row, state, manifest)), {
    headers: {
      ...exportHeaders(),
      "content-disposition": `attachment; filename="race-signals-${state.toLowerCase()}-races.json"`,
    },
  });
}

async function exportManifest(state: string): Promise<RaceBoardExportManifest> {
  const status = await getCoverageSummary();
  return {
    exportedAt: new Date().toISOString(),
    filters: { state },
    latestRun: status.runs[0] ?? null,
  };
}

function exportHeaders() {
  return {
    "cache-control": "public, s-maxage=3600, stale-while-revalidate=86400",
    "x-robots-tag": "noindex, nofollow",
  };
}
