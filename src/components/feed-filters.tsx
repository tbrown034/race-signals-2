import type { Race } from "@/src/lib/types";
import { STATE_SCOPES } from "@/src/lib/scope";
import Link from "next/link";

const signalTypes = [
  ["", "All signal types"],
  ["new_committee", "New committee"],
  ["new_filing", "New filing"],
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
  const hasFilters = Boolean(q || state || office || raceId || type || status);

  return (
    <form className="border-b border-neutral-300 bg-white p-4">
      <div className="grid gap-3 md:grid-cols-[1fr_105px_110px_170px_210px_150px_auto_auto]">
        <label className="text-xs font-medium uppercase tracking-[0.12em] text-neutral-500">
          Search
          <input
            className="mt-1 block h-9 w-full border border-neutral-300 bg-white px-3 text-sm normal-case tracking-normal text-neutral-950 outline-none focus:border-neutral-700"
            defaultValue={q}
            name="q"
            placeholder="Name, race, explanation"
          />
        </label>
        <label className="text-xs font-medium uppercase tracking-[0.12em] text-neutral-500">
          State
          <select
            className="mt-1 block h-9 w-full border border-neutral-300 bg-white px-2 text-sm normal-case tracking-normal text-neutral-950"
            defaultValue={state ?? ""}
            name="state"
          >
            <option value="">All</option>
            {STATE_SCOPES.map((item) => (
              <option value={item.code} key={item.code}>
                {item.code}
              </option>
            ))}
          </select>
        </label>
        <label className="text-xs font-medium uppercase tracking-[0.12em] text-neutral-500">
          Office
          <select
            className="mt-1 block h-9 w-full border border-neutral-300 bg-white px-2 text-sm normal-case tracking-normal text-neutral-950"
            defaultValue={office ?? ""}
            name="office"
          >
            <option value="">All</option>
            <option value="H">House</option>
            <option value="S">Senate</option>
          </select>
        </label>
        <label className="text-xs font-medium uppercase tracking-[0.12em] text-neutral-500">
          Race
          <select
            className="mt-1 block h-9 w-full border border-neutral-300 bg-white px-2 text-sm normal-case tracking-normal text-neutral-950"
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
        </label>
        <label className="text-xs font-medium uppercase tracking-[0.12em] text-neutral-500">
          Type
          <select className="mt-1 block h-9 w-full border border-neutral-300 bg-white px-2 text-sm normal-case tracking-normal text-neutral-950" defaultValue={type ?? ""} name="type">
            {signalTypes.map(([value, label]) => (
              <option value={value} key={value}>
                {label}
              </option>
            ))}
          </select>
        </label>
        <label className="text-xs font-medium uppercase tracking-[0.12em] text-neutral-500">
          Status
          <select
            className="mt-1 block h-9 w-full border border-neutral-300 bg-white px-2 text-sm normal-case tracking-normal text-neutral-950"
            defaultValue={status ?? ""}
            name="status"
          >
            {statuses.map(([value, label]) => (
              <option value={value} key={value}>
                {label}
              </option>
            ))}
          </select>
        </label>
        <button className="self-end border border-neutral-900 bg-neutral-950 px-4 py-2 text-sm font-medium text-white">
          Apply
        </button>
        {hasFilters ? (
          <Link className="self-end border border-neutral-300 px-4 py-2 text-center text-sm font-medium" href="/">
            Clear
          </Link>
        ) : null}
      </div>
    </form>
  );
}
