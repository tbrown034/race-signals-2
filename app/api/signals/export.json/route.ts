import { getSignals } from "@/src/lib/db/repository";
import { EXPORT_LIMIT, signalToExportRow } from "@/src/lib/export/signals";
import { signalFiltersFromUrl } from "@/src/lib/signals/filters";

export async function GET(request: Request) {
  const url = new URL(request.url);
  if (isOverlongQuery(url)) {
    return Response.json(
      { error: "Search query is too long. Shorten q to 200 characters or fewer before exporting." },
      { status: 400, headers: exportHeaders() },
    );
  }
  const signals = await getSignals(signalFiltersFromUrl(url, EXPORT_LIMIT + 1));
  const headers = exportHeaders();

  if (signals.length > EXPORT_LIMIT) {
    return Response.json(
      {
        error: "Export exceeds 10,000 rows. Narrow the feed filters before exporting.",
      },
      { status: 413, headers },
    );
  }

  return Response.json(signals.map((signal) => signalToExportRow(signal)), {
    headers: {
      ...headers,
      "content-disposition": 'attachment; filename="race-signals.json"',
    },
  });
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
