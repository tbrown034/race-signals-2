import Link from "next/link";
import type { ReactNode } from "react";
import { BrandMark } from "@/src/components/brand-mark";

const nav = [
  { href: "/", label: "Feed" },
  { href: "/status", label: "Status" },
  { href: "/methodology", label: "Methodology" },
  { href: "/docs", label: "Docs" },
];

export function PageShell({ children }: { children: ReactNode }) {
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
        </div>
      </header>
      {children}
      <footer className="border-t border-neutral-300 bg-white px-5 py-3 text-xs text-neutral-600 sm:px-8">
        Election timeline data, when available, cites Wikidata (CC0) and Wikipedia (CC BY-SA 4.0).
      </footer>
    </div>
  );
}
