import { getSignals } from "@/src/lib/db/repository";
import { EXPORT_LIMIT, signalToExportRow } from "@/src/lib/export/signals";
import { signalFiltersFromUrl } from "@/src/lib/signals/filters";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const signals = await getSignals(signalFiltersFromUrl(url, EXPORT_LIMIT + 1));

  if (signals.length > EXPORT_LIMIT) {
    return Response.json(
      {
        error: "Export exceeds 10,000 rows. Narrow the feed filters before exporting.",
      },
      { status: 413 },
    );
  }

  return Response.json(signals.map(signalToExportRow), {
    headers: {
      "content-disposition": 'attachment; filename="race-signals.json"',
    },
  });
}
