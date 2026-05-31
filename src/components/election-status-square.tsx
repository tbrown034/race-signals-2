import type { Election } from "@/src/lib/types";

const statusStyles: Record<Election["status"], string | null> = {
  won: "bg-emerald-700",
  lost: "bg-red-700",
  scheduled: "border border-neutral-500",
  pending: "border border-neutral-500",
  uncontested: null,
  withdrawn: "bg-neutral-500",
  unknown: "border border-neutral-500",
};

export function ElectionStatusSquare({ status }: { status: Election["status"] }) {
  const style = statusStyles[status];
  if (!style) return null;
  return <span aria-hidden="true" className={`inline-block h-2 w-2 ${style}`} />;
}
