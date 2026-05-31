export function IncumbentBadge({ className = "" }: { className?: string }) {
  return (
    <span
      className={`inline-flex border border-neutral-900 px-1.5 py-0.5 align-middle font-mono text-[10px] uppercase leading-none tracking-[0.12em] text-neutral-900 ${className}`}
    >
      Incumbent
    </span>
  );
}
