import type { Race } from "@/src/lib/types";

const signalTypes = [
  ["", "All signal types"],
  ["new_committee", "New committee"],
  ["new_filing", "New filing"],
  ["large_contribution", "Large receipt"],
  ["large_independent_expenditure", "Independent expenditure"],
  ["committee_activity_spike", "Activity spike"],
];

export function FeedFilters({
  races,
  q,
  raceId,
  type,
}: {
  races: Race[];
  q?: string;
  raceId?: string;
  type?: string;
}) {
  return (
    <form className="grid gap-3 border-b border-neutral-300 bg-white p-4 md:grid-cols-[1fr_220px_240px_auto]">
      <input
        className="h-10 border border-neutral-300 bg-white px-3 text-sm outline-none focus:border-neutral-700"
        defaultValue={q}
        name="q"
        placeholder="Search signals, names or explanations"
      />
      <select
        className="h-10 border border-neutral-300 bg-white px-3 text-sm"
        defaultValue={raceId ?? ""}
        name="race"
      >
        <option value="">All races</option>
        {races.map((race) => (
          <option value={race.id} key={race.id}>
            {race.state}-{race.district}
          </option>
        ))}
      </select>
      <select className="h-10 border border-neutral-300 bg-white px-3 text-sm" defaultValue={type ?? ""} name="type">
        {signalTypes.map(([value, label]) => (
          <option value={value} key={value}>
            {label}
          </option>
        ))}
      </select>
      <button className="h-10 border border-neutral-900 bg-neutral-950 px-4 text-sm font-medium text-white">
        Filter
      </button>
    </form>
  );
}
