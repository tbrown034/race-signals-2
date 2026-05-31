import { notFound } from "next/navigation";
import { buildDigest } from "@/src/lib/digest/build";
import { getSavedFilter } from "@/src/lib/db/saved-filters";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const saved = await getSavedFilter(id);
  if (!saved) notFound();

  const digest = await buildDigest(saved);
  return new Response(digest.rss, {
    headers: {
      "content-type": "application/rss+xml; charset=utf-8",
    },
  });
}
