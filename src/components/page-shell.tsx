import Link from "next/link";
import type { ReactNode } from "react";
import { BrandMark } from "@/src/components/brand-mark";
import { getStatus } from "@/src/lib/db/repository";
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
  const status = await getStatus();
  const latestRun = status.runs[0];
  const latestFinishedAt = latestRun?.finishedAt ?? latestRun?.startedAt ?? null;
  const stale = isOlderThanHours(latestFinishedAt, 36);

  return (
    <div className="min-h-screen bg-stone-50 text-neutral-950">
      <header className="border-b border-neutral-300 bg-white">
        <div className="mx-auto flex max-w-7xl flex-col gap-4 px-5 py-4 sm:px-8 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <BrandMark />
            <p className="mt-1 text-sm text-neutral-600">
              Early campaign-finance alerts for reporters covering 2026 House and Senate races.
            </p>
          </div>
          <div className="flex flex-col gap-2 lg:items-end">
            <nav className="flex flex-wrap gap-4 text-sm">
              {nav.map((item) => (
                <Link
                  className="font-medium text-neutral-700 underline-offset-4 hover:underline"
                  href={item.href}
                  key={item.href}
                >
                  {item.label}
                </Link>
              ))}
            </nav>
            <Link
              className={`font-mono text-[11px] uppercase tracking-[0.12em] underline-offset-4 hover:underline ${stale ? "font-semibold text-neutral-950" : "text-neutral-500"}`}
              href="/status"
              title={latestFinishedAt ? `Last ingestion finished ${formatDateTime(latestFinishedAt)}` : "No ingestion run recorded"}
            >
              {status.mode === "demo" ? "Demo data" : `Data as of ${formatRelativeTime(latestFinishedAt)}`}
            </Link>
          </div>
        </div>
      </header>
      {children}
      <footer className="border-t border-neutral-300 bg-white px-5 py-3 text-xs leading-5 text-neutral-600 sm:px-8">
        FEC records via the Federal Election Commission API. Election timeline data, when available, cites Wikidata (CC0) and Wikipedia (CC BY-SA 4.0). Member photos use public-domain Bioguide images mirrored by theunitedstates.io. Identifier crosswalks use unitedstates/congress-legislators.
      </footer>
    </div>
  );
}
