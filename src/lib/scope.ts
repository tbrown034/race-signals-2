import type { Race } from "@/src/lib/types";

export const DEFAULT_CYCLE = 2026;
export const DEFAULT_STATE = "IN";

export const TARGET_RACES: Race[] = [
  {
    id: "2026-IN-01-H",
    cycle: 2026,
    state: "IN",
    district: "01",
    office: "H",
    name: "Indiana 1st Congressional District",
    competitiveness: "watch",
  },
  {
    id: "2026-IN-05-H",
    cycle: 2026,
    state: "IN",
    district: "05",
    office: "H",
    name: "Indiana 5th Congressional District",
    competitiveness: "watch",
  },
  {
    id: "2026-IN-09-H",
    cycle: 2026,
    state: "IN",
    district: "09",
    office: "H",
    name: "Indiana 9th Congressional District",
    competitiveness: "watch",
  },
];

export function raceIdFor(state?: string | null, district?: string | number | null, cycle = DEFAULT_CYCLE) {
  if (!state || district === undefined || district === null) return null;
  const normalizedDistrict = String(district).padStart(2, "0");
  return `${cycle}-${state.toUpperCase()}-${normalizedDistrict}-H`;
}
