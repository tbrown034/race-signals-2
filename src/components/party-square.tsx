const PARTY_FILLS: Record<string, string> = {
  R: "bg-red-700",
  REP: "bg-red-700",
  D: "bg-blue-700",
  DEM: "bg-blue-700",
};

const PARTY_LABELS: Record<string, string> = {
  R: "Republican",
  REP: "Republican",
  D: "Democrat",
  DEM: "Democrat",
  I: "Independent",
  IND: "Independent",
  L: "Libertarian",
  LIB: "Libertarian",
  G: "Green",
  GRE: "Green",
};

const SIZE: Record<"sm" | "md", string> = {
  sm: "h-2 w-2",
  md: "h-2.5 w-2.5",
};

export function PartySquare({
  party,
  size = "sm",
}: {
  party?: string | null;
  size?: "sm" | "md";
}) {
  const key = (party ?? "").toUpperCase();
  const fill = PARTY_FILLS[key];
  const label = PARTY_LABELS[key] ?? (party ? `${party} party` : "No party affiliation");
  const sizing = SIZE[size];
  return (
    <span
      role="img"
      aria-label={label}
      title={label}
      className={`inline-block ${sizing} ${fill ?? "border border-neutral-500"}`}
    />
  );
}
