import type { MetadataRoute } from "next";
import { getSitemapEntities } from "@/src/lib/db/repository";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://race-signals.vercel.app";
  const entities = await getSitemapEntities();
  const staticRoutes = ["", "/review", "/spending", "/records/schedule-e", "/spenders", "/status", "/methodology", "/docs"];

  return [
    ...staticRoutes.map((path) => ({ url: `${baseUrl}${path}` })),
    ...entities.races.map((id) => ({ url: `${baseUrl}/races/${encodeURIComponent(id)}` })),
    ...entities.candidates.map((id) => ({ url: `${baseUrl}/candidates/${encodeURIComponent(id)}` })),
    ...entities.committees.map((id) => ({ url: `${baseUrl}/committees/${encodeURIComponent(id)}` })),
  ].slice(0, 50000);
}
