"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const nav = [
  { href: "/", label: "Feed" },
  { href: "/spending", label: "Spending" },
  { href: "/records/schedule-e", label: "Records" },
  { href: "/spenders", label: "Spenders" },
  { href: "/status", label: "Status" },
  { href: "/methodology", label: "Method" },
  { href: "/docs", label: "Docs" },
];

export function NavLinks() {
  const pathname = usePathname();
  return (
    <nav className="-mx-5 flex max-w-[calc(100vw-1rem)] flex-nowrap gap-x-2 overflow-x-auto px-5 pb-1 text-[12px] whitespace-nowrap sm:mx-0 sm:max-w-full sm:flex-wrap sm:gap-x-4 sm:px-0 sm:pb-0 sm:text-sm">
      {nav.map((item) => {
        const active = item.href === "/"
          ? pathname === "/"
          : pathname === item.href || pathname.startsWith(`${item.href}/`);
        return (
          <Link
            aria-current={active ? "page" : undefined}
            className={`shrink-0 underline-offset-4 hover:underline ${active ? "font-semibold text-neutral-950 underline" : "font-medium text-neutral-700"}`}
            href={item.href}
            key={item.href}
          >
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
