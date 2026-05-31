import Link from "next/link";

export function BrandMark() {
  return (
    <Link className="inline-flex items-end gap-3" href="/" aria-label="Race Signals home">
      <span className="leading-none">
        <span className="inline-flex items-center gap-2">
          <span className="text-2xl font-semibold tracking-tight">Race Signals</span>
          <span aria-hidden="true" className="inline-flex items-center gap-0.5">
            <span className="inline-block h-2 w-2 bg-red-700" />
            <span className="inline-block h-2 w-2 bg-blue-700" />
            <span className="inline-block h-2 w-2 bg-emerald-700" />
          </span>
        </span>
        <span className="mt-1 block font-mono text-[10px] uppercase tracking-[0.18em] text-neutral-500">
          FEC alert desk
        </span>
      </span>
    </Link>
  );
}
