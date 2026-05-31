"use client";

import type { Race } from "@/src/lib/types";
import { STATE_SCOPES } from "@/src/lib/scope";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import type { FormEvent } from "react";
import { useState } from "react";

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

const windows = [
  ["", "All dates"],
  ["24h", "Last 24h"],
  ["7d", "Last 7 days"],
  ["30d", "Last 30 days"],
];

export function FeedFilters({
  races,
  q,
  state,
  office,
  raceId,
  type,
  status,
  since,
  stateSignalCounts = {},
  lockedType,
  clearHref,
}: {
  races: Race[];
  q?: string;
  state?: string;
  office?: string;
  raceId?: string;
  type?: string;
  status?: string;
  since?: string;
  stateSignalCounts?: Record<string, number>;
  lockedType?: boolean;
  clearHref?: string;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const hasFilters = Boolean(q || state || office || raceId || type || status || since);
  const [selectedState, setSelectedState] = useState(state ?? "");
  const [selectedOffice, setSelectedOffice] = useState(office ?? "");
  const [selectedRaceId, setSelectedRaceId] = useState(raceId ?? "");
  const [selectedType, setSelectedType] = useState(type ?? "");
  const [selectedStatus, setSelectedStatus] = useState(status ?? "");
  const [selectedSince, setSelectedSince] = useState(since ?? "");
  const selectedRace = raceId ? races.find((race) => race.id === raceId) : undefined;
  const raceOptions = selectedState
    ? races.filter((race) => race.state === selectedState && (!selectedOffice || race.office === selectedOffice))
    : selectedRace
      ? [selectedRace]
      : [];
  const sortedStateOptions = [...STATE_SCOPES].sort((a, b) => {
    const countDiff = (stateSignalCounts[b.code] ?? 0) - (stateSignalCounts[a.code] ?? 0);
    return countDiff || a.code.localeCompare(b.code);
  });
  const coveredStates = sortedStateOptions.filter((item) => stateSignalCounts[item.code]);
  const uncoveredStates = sortedStateOptions.filter((item) => !stateSignalCounts[item.code]);

  function updateFilter(name: string, value: string) {
    const next = new URLSearchParams(searchParams.toString());
    if (value) {
      next.set(name, value);
    } else {
      next.delete(name);
    }
    if (name === "state") {
      next.delete("race");
      setSelectedState(value);
      setSelectedRaceId("");
    }
    if (name === "office") {
      next.delete("race");
      setSelectedOffice(value);
      setSelectedRaceId("");
    }
    if (name === "race") {
      setSelectedRaceId(value);
    }
    if (name === "type") {
      setSelectedType(value);
    }
    if (name === "status") {
      setSelectedStatus(value);
    }
    if (name === "since") {
      setSelectedSince(value);
    }
    router.replace(next.toString() ? `${pathname}?${next.toString()}` : pathname, {
      scroll: false,
    });
  }

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const next = new URLSearchParams(searchParams.toString());
    const query = String(form.get("q") ?? "").trim();
    if (query) {
      next.set("q", query);
    } else {
      next.delete("q");
    }
    router.replace(next.toString() ? `${pathname}?${next.toString()}` : pathname);
  }

  return (
    <form className="border-b border-neutral-300 bg-white p-4" onSubmit={onSubmit}>
      <div className="space-y-3">
        <label className="block text-xs font-medium uppercase tracking-[0.12em] text-neutral-500">
          Search
          <input
            className="mt-1 block h-9 w-full min-w-0 border border-neutral-300 bg-white px-3 text-sm normal-case tracking-normal text-neutral-950 outline-none focus:border-neutral-700"
            defaultValue={q}
            name="q"
            placeholder="Candidate, committee, race, source ID"
          />
        </label>
        <div className="grid grid-cols-1 gap-3 xl:flex xl:flex-wrap">
          <label className="min-w-0 text-xs font-medium uppercase tracking-[0.12em] text-neutral-500 xl:min-w-[96px] xl:flex-none">
          State
          <select
            className="mt-1 block h-9 w-full min-w-0 border border-neutral-300 bg-white px-2 text-sm normal-case tracking-normal text-neutral-950"
            value={selectedState}
            name="state"
            onChange={(event) => updateFilter("state", event.target.value)}
          >
            <option value="">All</option>
            {coveredStates.length ? (
              <optgroup label="States with stored signals">
                {coveredStates.map((item) => (
                  <option value={item.code} key={item.code}>
                    {item.name} ({item.code}) - {stateSignalCounts[item.code]}
                  </option>
                ))}
              </optgroup>
            ) : null}
            <optgroup label="All scope states">
              {uncoveredStates.map((item) => (
                <option value={item.code} key={item.code}>
                  {item.name} ({item.code})
                </option>
              ))}
            </optgroup>
          </select>
        </label>
          <label className="min-w-0 text-xs font-medium uppercase tracking-[0.12em] text-neutral-500 xl:min-w-[120px] xl:flex-none">
          Office
          <select
            className="mt-1 block h-9 w-full min-w-0 border border-neutral-300 bg-white px-2 text-sm normal-case tracking-normal text-neutral-950"
            value={selectedOffice}
            name="office"
            onChange={(event) => updateFilter("office", event.target.value)}
          >
            <option value="">All</option>
            <option value="H">House</option>
            <option value="S">Senate</option>
          </select>
        </label>
          <label className="col-span-2 min-w-0 text-xs font-medium uppercase tracking-[0.12em] text-neutral-500 xl:min-w-[180px] xl:flex-1">
          Race
          <select
            className="mt-1 block h-9 w-full min-w-0 border border-neutral-300 bg-white px-2 text-sm normal-case tracking-normal text-neutral-950"
            value={selectedRaceId}
            name="race"
            onChange={(event) => updateFilter("race", event.target.value)}
          >
            <option value="">
              {selectedState ? "All races" : "Choose a state to list races"}
            </option>
            {raceOptions.map((race) => (
              <option value={race.id} key={race.id}>
                {race.office === "S" ? `${race.state} Senate` : `${race.state}-${race.district}`}
              </option>
            ))}
          </select>
        </label>
        {lockedType ? (
          <div className="col-span-2 min-w-0 text-xs font-medium uppercase tracking-[0.12em] text-neutral-500 xl:min-w-[210px] xl:flex-none">
            Type
            <div className="mt-1 flex h-9 items-center border border-neutral-300 bg-neutral-100 px-2 text-sm normal-case tracking-normal text-neutral-700">
              {signalTypes.find(([value]) => value === selectedType)?.[1] ?? "Locked"}
            </div>
          </div>
        ) : (
          <label className="col-span-2 min-w-0 text-xs font-medium uppercase tracking-[0.12em] text-neutral-500 xl:min-w-[210px] xl:flex-none">
            Type
            <select
              className="mt-1 block h-9 w-full min-w-0 border border-neutral-300 bg-white px-2 text-sm normal-case tracking-normal text-neutral-950"
              value={selectedType}
              name="type"
              onChange={(event) => updateFilter("type", event.target.value)}
            >
              {signalTypes.map(([value, label]) => (
                <option value={value} key={value}>
                  {label}
                </option>
              ))}
            </select>
          </label>
        )}
          <label className="min-w-0 text-xs font-medium uppercase tracking-[0.12em] text-neutral-500 xl:min-w-[150px] xl:flex-none">
          Status
          <select
            className="mt-1 block h-9 w-full min-w-0 border border-neutral-300 bg-white px-2 text-sm normal-case tracking-normal text-neutral-950"
            value={selectedStatus}
            name="status"
            onChange={(event) => updateFilter("status", event.target.value)}
          >
            {statuses.map(([value, label]) => (
              <option value={value} key={value}>
                {label}
              </option>
            ))}
          </select>
        </label>
          <label className="min-w-0 text-xs font-medium uppercase tracking-[0.12em] text-neutral-500 xl:min-w-[150px] xl:flex-none">
          Window
          <select
            className="mt-1 block h-9 w-full min-w-0 border border-neutral-300 bg-white px-2 text-sm normal-case tracking-normal text-neutral-950"
            value={selectedSince}
            name="since"
            onChange={(event) => updateFilter("since", event.target.value)}
          >
            {windows.map(([value, label]) => (
              <option value={value} key={value}>
                {label}
              </option>
            ))}
          </select>
        </label>
          <button className="self-end border border-neutral-900 bg-neutral-950 px-4 py-2 text-sm font-medium text-white xl:self-end">
          Search
        </button>
        {hasFilters ? (
          <Link className="self-end border border-neutral-300 px-4 py-2 text-center text-sm font-medium xl:self-end" href={clearHref ?? "/"}>
            Clear
          </Link>
        ) : null}
        </div>
      </div>
    </form>
  );
}
