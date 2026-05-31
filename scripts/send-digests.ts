import { loadEnvConfig } from "@next/env";
import { buildDigest } from "@/src/lib/digest/build";
import { listDueSavedFilters, markSavedFilterSent } from "@/src/lib/db/saved-filters";

loadEnvConfig(process.cwd());

async function main() {
  const webhookUrl = process.env.DIGEST_WEBHOOK_URL;
  if (!webhookUrl) throw new Error("DIGEST_WEBHOOK_URL is required.");

  const dueFilters = await listDueSavedFilters();
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
      throw new Error(`Digest webhook failed ${response.status} for ${savedFilter.id}`);
    }

    await markSavedFilterSent(savedFilter.id);
    console.log(`Sent digest for ${savedFilter.name} (${digest.signals.length} signals).`);
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
