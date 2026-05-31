import { buildDigest } from "@/src/lib/digest/build";
import { listDueSavedFilters, markSavedFilterSent } from "@/src/lib/db/saved-filters";

export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (secret && request.headers.get("authorization") !== `Bearer ${secret}`) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const webhookUrl = process.env.DIGEST_WEBHOOK_URL;
  if (!webhookUrl) {
    return Response.json({ error: "DIGEST_WEBHOOK_URL is not configured." }, { status: 500 });
  }

  const dueFilters = await listDueSavedFilters();
  let sent = 0;

  for (const savedFilter of dueFilters) {
    const digest = await buildDigest(savedFilter, savedFilter.lastSentAt);
    const response = await fetch(webhookUrl, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        saved_filter_id: savedFilter.id,
        name: savedFilter.name,
        owner_email: savedFilter.ownerEmail,
        cadence: savedFilter.cadence,
        text: digest.text,
        rss: digest.rss,
        signal_count: digest.signals.length,
      }),
    });

    if (!response.ok) {
      return Response.json(
        { error: `Digest webhook failed ${response.status}`, saved_filter_id: savedFilter.id },
        { status: 502 },
      );
    }

    await markSavedFilterSent(savedFilter.id);
    sent += 1;
  }

  return Response.json({ sent });
}
