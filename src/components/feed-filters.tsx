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
  const hasFilters = Boolean(q || state || office || raceId || status || since || (!lockedType && type));
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
  const selectedUncoveredState = selectedState && !stateSignalCounts[selectedState]
    ? sortedStateOptions.find((item) => item.code === selectedState)
    : null;

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

  function stateHref(code: string) {
    const next = new URLSearchParams(searchParams.toString());
    next.set("state", code);
    next.delete("race");
    return `${pathname}?${next.toString()}`;
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
        <div className="grid min-w-0 grid-cols-1 gap-3 sm:grid-cols-2 xl:flex xl:flex-wrap">
          <label className="min-w-0 text-xs font-medium uppercase tracking-[0.12em] text-neutral-500 xl:min-w-[96px] xl:flex-none">
          State
          <select
            className="mt-1 block h-9 w-full min-w-0 border border-neutral-300 bg-white px-2 text-sm normal-case tracking-normal text-neutral-950"
            value={selectedState}
            name="state"
            onChange={(event) => updateFilter("state", event.target.value)}
          >
            <option value="">All</option>
            {selectedUncoveredState ? (
              <optgroup label="Selected scope state">
                <option value={selectedUncoveredState.code}>
                  {selectedUncoveredState.name} ({selectedUncoveredState.code}) - no stored signals
                </option>
              </optgroup>
            ) : null}
            {coveredStates.length ? (
              <optgroup label="States with stored signals">
                {coveredStates.map((item) => (
                  <option value={item.code} key={item.code}>
                    {item.name} ({item.code}) - {stateSignalCounts[item.code]}
                  </option>
                ))}
              </optgroup>
            ) : null}
          </select>
          {uncoveredStates.length ? (
            <details className="mt-2 normal-case tracking-normal text-neutral-600">
              <summary className="cursor-pointer text-xs underline underline-offset-4">
                All scope states
              </summary>
              <div className="mt-2 grid max-h-44 grid-cols-2 gap-x-3 gap-y-1 overflow-y-auto border border-neutral-200 p-2 text-xs sm:grid-cols-3">
                {uncoveredStates.map((item) => (
                  <Link className="underline underline-offset-4" href={stateHref(item.code)} key={item.code}>
                    {item.name} ({item.code})
                  </Link>
                ))}
              </div>
            </details>
          ) : null}
        </label>
          <details className="min-w-0 border border-neutral-300 p-3 text-xs font-medium uppercase tracking-[0.12em] text-neutral-500 sm:hidden">
            <summary className="cursor-pointer">More filters</summary>
            <div className="mt-3 space-y-3">
              <label className="block min-w-0">
                Office
                <select
                  className="mt-1 block h-9 w-full min-w-0 border border-neutral-300 bg-white px-2 text-sm normal-case tracking-normal text-neutral-950"
                  value={selectedOffice}
                  name="office-mobile"
                  onChange={(event) => updateFilter("office", event.target.value)}
                >
                  <option value="">All</option>
                  <option value="H">House</option>
                  <option value="S">Senate</option>
                </select>
              </label>
              <label className="block min-w-0">
                Race
                <select
                  className="mt-1 block h-9 w-full min-w-0 border border-neutral-300 bg-white px-2 text-sm normal-case tracking-normal text-neutral-950"
                  value={selectedRaceId}
                  name="race-mobile"
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
                <div className="min-w-0">
                  Type
                  <div className="mt-1 flex h-9 items-center border border-neutral-300 bg-neutral-100 px-2 text-sm normal-case tracking-normal text-neutral-700">
                    {signalTypes.find(([value]) => value === selectedType)?.[1] ?? "Locked"}
                  </div>
                </div>
              ) : (
                <label className="block min-w-0">
                  Type
                  <select
                    className="mt-1 block h-9 w-full min-w-0 border border-neutral-300 bg-white px-2 text-sm normal-case tracking-normal text-neutral-950"
                    value={selectedType}
                    name="type-mobile"
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
              <label className="block min-w-0">
                Status
                <select
                  className="mt-1 block h-9 w-full min-w-0 border border-neutral-300 bg-white px-2 text-sm normal-case tracking-normal text-neutral-950"
                  value={selectedStatus}
                  name="status-mobile"
                  onChange={(event) => updateFilter("status", event.target.value)}
                >
                  {statuses.map(([value, label]) => (
                    <option value={value} key={value}>
                      {label}
                    </option>
                  ))}
                </select>
              </label>
              <label className="block min-w-0">
                Window
                <select
                  className="mt-1 block h-9 w-full min-w-0 border border-neutral-300 bg-white px-2 text-sm normal-case tracking-normal text-neutral-950"
                  value={selectedSince}
                  name="since-mobile"
                  onChange={(event) => updateFilter("since", event.target.value)}
                >
                  {windows.map(([value, label]) => (
                    <option value={value} key={value}>
                      {label}
                    </option>
                  ))}
                </select>
              </label>
            </div>
          </details>
          <label className="hidden min-w-0 text-xs font-medium uppercase tracking-[0.12em] text-neutral-500 sm:block xl:min-w-[120px] xl:flex-none">
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
          <label className="hidden min-w-0 text-xs font-medium uppercase tracking-[0.12em] text-neutral-500 sm:col-span-2 sm:block xl:min-w-[180px] xl:flex-1">
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
          <div className="hidden min-w-0 text-xs font-medium uppercase tracking-[0.12em] text-neutral-500 sm:col-span-2 sm:block xl:min-w-[210px] xl:flex-none">
            Type
            <div className="mt-1 flex h-9 items-center border border-neutral-300 bg-neutral-100 px-2 text-sm normal-case tracking-normal text-neutral-700">
              {signalTypes.find(([value]) => value === selectedType)?.[1] ?? "Locked"}
            </div>
          </div>
        ) : (
          <label className="hidden min-w-0 text-xs font-medium uppercase tracking-[0.12em] text-neutral-500 sm:col-span-2 sm:block xl:min-w-[210px] xl:flex-none">
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
          <label className="hidden min-w-0 text-xs font-medium uppercase tracking-[0.12em] text-neutral-500 sm:block xl:min-w-[150px] xl:flex-none">
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
          <label className="hidden min-w-0 text-xs font-medium uppercase tracking-[0.12em] text-neutral-500 sm:block xl:min-w-[150px] xl:flex-none">
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
          <button className="w-full self-end border border-neutral-900 bg-neutral-950 px-4 py-2 text-sm font-medium text-white sm:w-auto xl:self-end">
          Search
        </button>
        {hasFilters ? (
          <Link className="w-full self-end border border-neutral-300 px-4 py-2 text-center text-sm font-medium sm:w-auto xl:self-end" href={clearHref ?? "/"}>
            Clear
          </Link>
        ) : null}
        </div>
      </div>
    </form>
  );
}
