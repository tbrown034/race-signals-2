import Link from "next/link";
import type { ReactNode } from "react";
import { BrandMark } from "@/src/components/brand-mark";
import { getCoverageSummary } from "@/src/lib/db/repository";
import { formatDateTime, formatRelativeTime, isOlderThanHours } from "@/src/lib/format";

const nav = [
  { href: "/", label: "Feed" },
  { href: "/spending", label: "Spending" },
  { href: "/spenders", label: "Spenders" },
  { href: "/status", label: "Status" },
  { href: "/methodology", label: "Methodology" },
  { href: "/docs", label: "Docs" },
];

export async function PageShell({ children }: { children: ReactNode }) {
  const status = await getCoverageSummary();
  const latestRun = status.runs[0];
  const latestFinishedAt = latestRun?.finishedAt ?? latestRun?.startedAt ?? null;
  const stale = isOlderThanHours(latestFinishedAt, 36);
  const endpointStatuses = status.endpoints.map((endpoint) => endpoint.status);
  const partial = latestRun?.status === "partial" || endpointStatuses.includes("partial");
  const error = latestRun?.status === "failed" || latestRun?.status === "error" || endpointStatuses.includes("error");
  const freshnessLabel = status.mode === "demo"
    ? "Demo data"
    : error
      ? `Latest ingest error / ${formatRelativeTime(latestFinishedAt)}`
      : partial
        ? `Latest ingest partial / ${formatRelativeTime(latestFinishedAt)}`
        : `Data as of ${formatRelativeTime(latestFinishedAt)}`;

  return (
    <div className="min-h-screen bg-stone-50 text-neutral-950">
      <header className="border-b border-neutral-300 bg-white">
        <div className="mx-auto flex max-w-7xl flex-col gap-4 px-5 py-4 sm:px-8 lg:flex-row lg:items-end lg:justify-between">
          <div className="min-w-0">
            <BrandMark />
            <p className="mt-1 text-sm text-neutral-600">
              Early campaign-finance alerts for reporters covering 2026 House and Senate races.
            </p>
          </div>
          <div className="w-full max-w-full min-w-0 lg:flex lg:w-auto lg:flex-col lg:items-end lg:gap-2">
            <nav className="flex max-w-full flex-wrap gap-x-3 gap-y-2 text-sm sm:gap-x-4">
              {nav.map((item) => (
                <Link
                  className="shrink-0 font-medium text-neutral-700 underline-offset-4 hover:underline"
                  href={item.href}
                  key={item.href}
                >
                  {item.label}
                </Link>
              ))}
            </nav>
            <Link
              className={`mt-1 block max-w-full break-words font-mono text-[11px] uppercase tracking-[0.12em] underline-offset-4 hover:underline lg:mt-0 ${stale ? "font-semibold text-neutral-950" : "text-neutral-500"}`}
              href="/status"
              title={latestFinishedAt ? `Last ingestion finished ${formatDateTime(latestFinishedAt)}` : "No ingestion run recorded"}
            >
              {freshnessLabel}
            </Link>
          </div>
        </div>
      </header>
      {children}
      <footer className="border-t border-neutral-300 bg-white px-5 py-3 text-xs leading-5 text-neutral-600 sm:px-8">
        FEC records via the Federal Election Commission API. Election timeline data, when available, cites Wikidata (CC0) and Wikipedia (CC BY-SA 4.0). Member photos use public-domain Bioguide images mirrored by unitedstates/images. Identifier crosswalks use unitedstates/congress-legislators.
      </footer>
    </div>
  );
}
