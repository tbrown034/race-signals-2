import { getSignals } from "@/src/lib/db/repository";
import { isFresh } from "@/src/components/fresh-mark";
import type { SavedFilter } from "@/src/lib/types";

export async function buildDigest(savedFilter: SavedFilter, since?: string | null) {
  const signals = await getSignals({
    ...savedFilter.filterJson,
    raceId: savedFilter.filterJson.race,
    since: since ?? undefined,
    limit: 100,
  });

  return {
    signals,
    text: renderTextDigest(savedFilter, signals),
    rss: renderRss(savedFilter, signals),
  };
}

export async function hasNewSinceSent(savedFilter: SavedFilter) {
  const signals = await getSignals({
    ...savedFilter.filterJson,
    raceId: savedFilter.filterJson.race,
    since: savedFilter.lastSentAt ?? undefined,
    limit: 1,
  });
  return signals.length > 0;
}

function renderTextDigest(savedFilter: SavedFilter, signals: Awaited<ReturnType<typeof getSignals>>) {
  if (!signals.length) {
    return `Race Signals: ${savedFilter.name}\n\nNo new signals matched this saved view.`;
  }

  return [
    `Race Signals: ${savedFilter.name}`,
    "",
    ...signals.map((signal) =>
      [
        `${signal.signalDate} | ${signal.signalType} | ${signal.headline}`,
        signal.whyItMatters,
        signal.sourceUrl ? `Source: ${signal.sourceUrl}` : "Source URL missing",
      ].join("\n"),
    ),
  ].join("\n\n");
}

function renderRss(savedFilter: SavedFilter, signals: Awaited<ReturnType<typeof getSignals>>) {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
  const items = signals
    .map(
      (signal) => `
        <item>
          <title>${escapeXml(`${isFresh(signal.signalDate, signal.status) ? "● " : ""}${signal.headline}`)}</title>
          <link>${escapeXml(signal.sourceUrl ?? `${siteUrl}/saved/${savedFilter.id}`)}</link>
          <guid isPermaLink="false">${escapeXml(signal.dedupeKey)}</guid>
          <pubDate>${new Date(signal.signalDate).toUTCString()}</pubDate>
          <description>${escapeXml(signal.whyItMatters)}</description>
        </item>`,
    )
    .join("");

  return `<?xml version="1.0" encoding="UTF-8" ?>
<rss version="2.0">
  <channel>
    <title>${escapeXml(`Race Signals: ${savedFilter.name}`)}</title>
    <link>${escapeXml(`${siteUrl}/saved/${savedFilter.id}`)}</link>
    <description>${escapeXml("Source-linked campaign-finance signals for a saved Race Signals view.")}</description>
    <lastBuildDate>${new Date().toUTCString()}</lastBuildDate>
    ${items}
  </channel>
</rss>`;
}

function escapeXml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&apos;");
}
