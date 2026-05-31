import type { Race } from "@/src/lib/types";
import { STATE_SCOPES } from "@/src/lib/scope";

const signalTypes = [
  ["", "All signal types"],
  ["new_committee", "New committee"],
  ["new_filing", "New filing"],
  ["large_contribution", "Large receipt"],
  ["large_independent_expenditure", "Independent expenditure"],
  ["committee_activity_spike", "Activity spike"],
];

const statuses = [
  ["", "All statuses"],
  ["new", "New"],
  ["historical", "Historical"],
  ["review", "Review"],
  ["demo", "Demo"],
];

export function FeedFilters({
  races,
  q,
  state,
  office,
  raceId,
  type,
  status,
}: {
  races: Race[];
  q?: string;
  state?: string;
  office?: string;
  raceId?: string;
  type?: string;
  status?: string;
}) {
  return (
    <form className="grid gap-3 border-b border-neutral-300 bg-white p-4 md:grid-cols-[1fr_105px_110px_170px_210px_150px_auto]">
      <input
        className="h-10 border border-neutral-300 bg-white px-3 text-sm outline-none focus:border-neutral-700"
        defaultValue={q}
        name="q"
        placeholder="Search signals, names or explanations"
      />
      <select
        className="h-10 border border-neutral-300 bg-white px-3 text-sm"
        defaultValue={state ?? ""}
        name="state"
      >
        <option value="">All states</option>
        {STATE_SCOPES.map((item) => (
          <option value={item.code} key={item.code}>
            {item.code}
          </option>
        ))}
      </select>
      <select
        className="h-10 border border-neutral-300 bg-white px-3 text-sm"
        defaultValue={office ?? ""}
        name="office"
      >
        <option value="">All offices</option>
        <option value="H">House</option>
        <option value="S">Senate</option>
      </select>
      <select
        className="h-10 border border-neutral-300 bg-white px-3 text-sm"
        defaultValue={raceId ?? ""}
        name="race"
      >
        <option value="">All races</option>
        {races
          .filter((race) => (!state || race.state === state) && (!office || race.office === office))
          .map((race) => (
          <option value={race.id} key={race.id}>
            {race.office === "S" ? `${race.state} Senate` : `${race.state}-${race.district}`}
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
      <select
        className="h-10 border border-neutral-300 bg-white px-3 text-sm"
        defaultValue={status ?? ""}
        name="status"
      >
        {statuses.map(([value, label]) => (
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
