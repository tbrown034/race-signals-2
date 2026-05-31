import Link from "next/link";

export function BrandMark() {
  return (
    <Link className="flex items-center gap-3" href="/">
      <span className="grid h-10 w-10 place-items-center bg-neutral-950 text-white">
        <span className="relative h-6 w-6">
          <span className="absolute left-0 top-1 h-0.5 w-6 bg-stone-100" />
          <span className="absolute left-0 top-3 h-0.5 w-4 bg-stone-100" />
          <span className="absolute left-0 top-5 h-0.5 w-3 bg-stone-100" />
          <span className="absolute bottom-0 right-0 h-5 w-2.5 bg-red-700" />
        </span>
      </span>
      <span className="leading-none">
        <span className="block text-2xl font-semibold tracking-tight">Race Signals</span>
        <span className="mt-1 block font-mono text-[10px] uppercase tracking-[0.18em] text-neutral-500">
          FEC alert desk
        </span>
      </span>
    </Link>
  );
}
