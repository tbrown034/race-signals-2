"use client";

import type { Race, StateSignalFreshness } from "@/src/lib/types";
import { STATE_SCOPES } from "@/src/lib/scope";
import { formatRelativeTime } from "@/src/lib/format";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import type { FormEvent } from "react";
import { useState } from "react";

const signalTypes = [
  ["", "All signal types"],
  ["new_committee", "Committee record"],
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
  committeeId,
  type,
  status,
  since,
  ingestedSince,
  targetParty,
  targetStatus,
  stateSignalCounts = {},
  stateSignalFreshness = {},
  lockedType,
  clearHref,
}: {
  races: Race[];
  q?: string;
  state?: string;
  office?: string;
  raceId?: string;
  committeeId?: string;
  type?: string;
  status?: string;
  since?: string;
  ingestedSince?: string;
  targetParty?: string;
  targetStatus?: string;
  stateSignalCounts?: Record<string, number>;
  stateSignalFreshness?: Record<string, StateSignalFreshness>;
  lockedType?: boolean;
  clearHref?: string;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const hasFilters = Boolean(q || state || office || raceId || committeeId || status || since || ingestedSince || targetParty || targetStatus || (!lockedType && type));
  const [selectedState, setSelectedState] = useState(state ?? "");
  const [selectedOffice, setSelectedOffice] = useState(office ?? "");
  const [selectedRaceId, setSelectedRaceId] = useState(raceId ?? "");
  const [selectedType, setSelectedType] = useState(type ?? "");
  const [selectedStatus, setSelectedStatus] = useState(status ?? "");
  const [selectedSince, setSelectedSince] = useState(since ?? "");
  const [selectedIngestedSince, setSelectedIngestedSince] = useState(ingestedSince ?? "");
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
  const activeFilterTokens = [
    q ? { key: "q", label: `Search: ${q}` } : null,
    state ? { key: "state", label: `State: ${state}` } : null,
    office ? { key: "office", label: `Office: ${officeLabel(office)}` } : null,
    raceId ? { key: "race", label: `Race: ${selectedRace?.name ?? raceId}` } : null,
    committeeId ? { key: "committee", label: `Committee: ${committeeId}` } : null,
    !lockedType && type ? { key: "type", label: `Type: ${signalTypeLabel(type)}` } : null,
    status ? { key: "status", label: `Status: ${statusLabel(status)}` } : null,
    since ? { key: "since", label: `Event: ${windowLabel(since)}` } : null,
    ingestedSince ? { key: "ingestedSince", label: `Added: ${windowLabel(ingestedSince)}` } : null,
    targetParty ? { key: "targetParty", label: `Target party: ${targetParty}` } : null,
    targetStatus ? { key: "targetStatus", label: `Target: ${targetStatusLabel(targetStatus)}` } : null,
  ].filter((token): token is { key: string; label: string } => Boolean(token));

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
    if (name === "ingestedSince") {
      setSelectedIngestedSince(value);
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

  function removeFilterHref(name: string) {
    const next = new URLSearchParams(searchParams.toString());
    next.delete(name);
    if (name === "state" || name === "office") next.delete("race");
    return next.toString() ? `${pathname}?${next.toString()}` : pathname;
  }

  return (
    <form className="border-b border-neutral-300 bg-white p-4" onSubmit={onSubmit}>
      <div className="space-y-3">
        <div className="min-w-0">
          <label className="block text-xs font-medium uppercase tracking-[0.12em] text-neutral-500" htmlFor="feed-search">
            Search
          </label>
          <div className="mt-1 flex min-w-0 flex-col gap-2 sm:flex-row">
            <input
              className="block h-9 min-w-0 flex-1 border border-neutral-300 bg-white px-3 text-sm normal-case tracking-normal text-neutral-950 outline-none focus:border-neutral-700"
              defaultValue={q}
              id="feed-search"
              name="q"
              placeholder="Candidate, committee, race, source ID"
            />
            <button className="h-9 shrink-0 border border-neutral-900 bg-neutral-950 px-3 text-sm font-medium text-white sm:hidden">
              Search
            </button>
          </div>
        </div>
        {activeFilterTokens.length ? (
          <div className="flex min-w-0 flex-wrap items-center gap-2 border border-neutral-200 bg-neutral-50 p-2 text-xs">
            <span className="shrink-0 font-mono uppercase tracking-[0.12em] text-neutral-500">
              Active filters
            </span>
            {activeFilterTokens.map((token) => (
              <Link
                className="w-full max-w-full min-w-0 break-words border border-neutral-300 bg-white px-2 py-1 text-neutral-700 underline-offset-4 [overflow-wrap:anywhere] hover:border-neutral-900 hover:underline sm:w-auto sm:max-w-[32rem]"
                href={removeFilterHref(token.key)}
                key={token.key}
                title={`Remove ${token.label}`}
              >
                {token.label} x
              </Link>
            ))}
          </div>
        ) : null}
        <p className="max-w-[min(280px,100%)] break-words text-xs leading-5 text-neutral-600 [overflow-wrap:anywhere] sm:max-w-3xl">
          Event date is the FEC record date. Added to feed is when Race Signals stored the source record.
        </p>
        <div className="grid min-w-0 grid-cols-1 gap-3 sm:grid-cols-2 xl:flex xl:flex-wrap">
          <div className="min-w-0 text-xs font-medium uppercase tracking-[0.12em] text-neutral-500 xl:min-w-[96px] xl:flex-none">
            <label htmlFor="state-filter">State</label>
            <select
              className="mt-1 block h-9 w-full min-w-0 border border-neutral-300 bg-white px-2 text-sm normal-case tracking-normal text-neutral-950"
              id="state-filter"
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
                      {stateOptionLabel(item.name, item.code, stateSignalFreshness[item.code], stateSignalCounts[item.code])}
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
          </div>
          <label className="min-w-0 text-xs font-medium uppercase tracking-[0.12em] text-neutral-500 sm:hidden">
            Added to feed
            <select
              className="mt-1 block h-9 w-full min-w-0 border border-neutral-300 bg-white px-2 text-sm normal-case tracking-normal text-neutral-950"
              value={selectedIngestedSince}
              name="ingestedSince-mobile-primary"
              onChange={(event) => updateFilter("ingestedSince", event.target.value)}
            >
              {windows.map(([value, label]) => (
                <option value={value} key={value}>
                  {value ? label : "Any ingest date"}
                </option>
              ))}
            </select>
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
                Event date
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
          Event date
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
          <label className="hidden min-w-0 text-xs font-medium uppercase tracking-[0.12em] text-neutral-500 sm:block xl:min-w-[170px] xl:flex-none">
          Added to feed
          <select
            className="mt-1 block h-9 w-full min-w-0 border border-neutral-300 bg-white px-2 text-sm normal-case tracking-normal text-neutral-950"
            value={selectedIngestedSince}
            name="ingestedSince"
            onChange={(event) => updateFilter("ingestedSince", event.target.value)}
          >
            {windows.map(([value, label]) => (
              <option value={value} key={value}>
                {value ? label : "Any ingest date"}
              </option>
            ))}
          </select>
        </label>
          <button className="hidden w-full self-end border border-neutral-900 bg-neutral-950 px-4 py-2 text-sm font-medium text-white sm:block sm:w-auto xl:self-end">
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

function stateOptionLabel(
  name: string,
  code: string,
  freshness?: StateSignalFreshness,
  fallbackCount?: number,
) {
  const count = freshness?.count ?? fallbackCount ?? 0;
  const latest = freshness?.latestDataFreshness
    ? `, refreshed ${formatRelativeTime(freshness.latestDataFreshness)}`
    : "";
  return `${name} (${code}) - ${count}${latest}`;
}

function officeLabel(value: string) {
  if (value === "H") return "House";
  if (value === "S") return "Senate";
  return value;
}

function signalTypeLabel(value: string) {
  return signalTypes.find(([key]) => key === value)?.[1] ?? value.replaceAll("_", " ");
}

function statusLabel(value: string) {
  return statuses.find(([key]) => key === value)?.[1] ?? value;
}

function windowLabel(value: string) {
  return windows.find(([key]) => key === value)?.[1] ?? value;
}

function targetStatusLabel(value: string) {
  if (value === "I") return "Incumbent";
  if (value === "C") return "Challenger";
  if (value === "O") return "Open seat";
  return value;
}
