import { getCoverageSummary, getSignals } from "@/src/lib/db/repository";
import { EXPORT_LIMIT, type ExportManifest, signalToExportRow } from "@/src/lib/export/signals";
import { signalFiltersFromUrl } from "@/src/lib/signals/filters";

export async function GET(request: Request) {
  const url = new URL(request.url);
  if (isOverlongQuery(url)) {
    return Response.json(
      { error: "Search query is too long. Shorten q to 200 characters or fewer before exporting." },
      { status: 400, headers: exportHeaders() },
    );
  }
  const [signals, manifest] = await Promise.all([
    getSignals(signalFiltersFromUrl(url, EXPORT_LIMIT + 1)),
    exportManifest(url),
  ]);
  const headers = exportHeaders();

  if (signals.length > EXPORT_LIMIT) {
    return Response.json(
      {
        error: "Export exceeds 10,000 rows. Narrow the feed filters before exporting.",
      },
      { status: 413, headers },
    );
  }

  return Response.json(signals.map((signal) => signalToExportRow(signal, undefined, manifest)), {
    headers: {
      ...headers,
      "content-disposition": 'attachment; filename="race-signals.json"',
    },
  });
}

async function exportManifest(url: URL): Promise<ExportManifest> {
  const status = await getCoverageSummary();
  const latestRun = status.runs[0] ?? null;
  return {
    exportedAt: new Date().toISOString(),
    filters: exportFilters(url),
    latestRun: latestRun
      ? {
          id: latestRun.id,
          scope: latestRun.scope,
          mode: latestRun.mode ?? null,
          state: latestRun.state ?? null,
          status: latestRun.status,
          finishedAt: latestRun.finishedAt ?? null,
        }
      : null,
  };
}

function exportFilters(url: URL) {
  const filters: Record<string, string> = {};
  for (const key of ["q", "state", "office", "race", "type", "status", "since", "ingestedSince", "committee", "minAmount", "position", "targetParty", "targetStatus"]) {
    const value = url.searchParams.get(key);
    if (value) filters[key] = value;
  }
  return filters;
}

function exportHeaders() {
  return {
    "cache-control": "public, s-maxage=3600, stale-while-revalidate=86400",
    "x-robots-tag": "noindex, nofollow",
  };
}

function isOverlongQuery(url: URL) {
  return (url.searchParams.get("q")?.length ?? 0) > 200;
}
