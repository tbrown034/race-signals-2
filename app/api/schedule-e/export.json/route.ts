import { getCoverageSummary, getScheduleERecords } from "@/src/lib/db/repository";
import {
  SCHEDULE_E_EXPORT_LIMIT,
  type ScheduleEExportManifest,
  scheduleEToExportRow,
} from "@/src/lib/export/schedule-e";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const records = await getScheduleERecords({
    candidateId: url.searchParams.get("candidate") ?? undefined,
    committeeId: url.searchParams.get("committee") ?? undefined,
    raceId: url.searchParams.get("race") ?? undefined,
    state: url.searchParams.get("state")?.toUpperCase() ?? undefined,
    limit: SCHEDULE_E_EXPORT_LIMIT + 1,
  });
  const headers = exportHeaders();
  if (records.length > SCHEDULE_E_EXPORT_LIMIT) {
    return Response.json(
      { error: "Export exceeds 10,000 Schedule E rows. Narrow by state, race, committee or candidate." },
      { status: 413, headers },
    );
  }

  const manifest = await exportManifest(url);
  return Response.json(records.map((record) => scheduleEToExportRow(record, manifest)), {
    headers: {
      ...headers,
      "content-disposition": 'attachment; filename="race-signals-schedule-e.json"',
    },
  });
}

async function exportManifest(url: URL): Promise<ScheduleEExportManifest> {
  const status = await getCoverageSummary();
  return {
    exportedAt: new Date().toISOString(),
    filters: exportFilters(url),
    latestRun: status.runs[0] ?? null,
  };
}

function exportFilters(url: URL) {
  const filters: Record<string, string> = {};
  for (const key of ["candidate", "committee", "race", "state"]) {
    const value = url.searchParams.get(key);
    if (value) filters[key] = key === "state" ? value.toUpperCase() : value;
  }
  return filters;
}

function exportHeaders() {
  return {
    "cache-control": "public, s-maxage=300, stale-while-revalidate=3600",
    "x-robots-tag": "noindex, nofollow",
  };
}
