import type { Race } from "@/src/lib/types";

export const DEFAULT_CYCLE = 2026;
export const DEFAULT_OFFICE = "H";

export type StateScope = {
  code: string;
  name: string;
  districts: number;
};

export const STATE_SCOPES: StateScope[] = [
  { code: "AL", name: "Alabama", districts: 7 },
  { code: "AK", name: "Alaska", districts: 1 },
  { code: "AZ", name: "Arizona", districts: 9 },
  { code: "AR", name: "Arkansas", districts: 4 },
  { code: "CA", name: "California", districts: 52 },
  { code: "CO", name: "Colorado", districts: 8 },
  { code: "CT", name: "Connecticut", districts: 5 },
  { code: "DE", name: "Delaware", districts: 1 },
  { code: "FL", name: "Florida", districts: 28 },
  { code: "GA", name: "Georgia", districts: 14 },
  { code: "HI", name: "Hawaii", districts: 2 },
  { code: "ID", name: "Idaho", districts: 2 },
  { code: "IL", name: "Illinois", districts: 17 },
  { code: "IN", name: "Indiana", districts: 9 },
  { code: "IA", name: "Iowa", districts: 4 },
  { code: "KS", name: "Kansas", districts: 4 },
  { code: "KY", name: "Kentucky", districts: 6 },
  { code: "LA", name: "Louisiana", districts: 6 },
  { code: "ME", name: "Maine", districts: 2 },
  { code: "MD", name: "Maryland", districts: 8 },
  { code: "MA", name: "Massachusetts", districts: 9 },
  { code: "MI", name: "Michigan", districts: 13 },
  { code: "MN", name: "Minnesota", districts: 8 },
  { code: "MS", name: "Mississippi", districts: 4 },
  { code: "MO", name: "Missouri", districts: 8 },
  { code: "MT", name: "Montana", districts: 2 },
  { code: "NE", name: "Nebraska", districts: 3 },
  { code: "NV", name: "Nevada", districts: 4 },
  { code: "NH", name: "New Hampshire", districts: 2 },
  { code: "NJ", name: "New Jersey", districts: 12 },
  { code: "NM", name: "New Mexico", districts: 3 },
  { code: "NY", name: "New York", districts: 26 },
  { code: "NC", name: "North Carolina", districts: 14 },
  { code: "ND", name: "North Dakota", districts: 1 },
  { code: "OH", name: "Ohio", districts: 15 },
  { code: "OK", name: "Oklahoma", districts: 5 },
  { code: "OR", name: "Oregon", districts: 6 },
  { code: "PA", name: "Pennsylvania", districts: 17 },
  { code: "RI", name: "Rhode Island", districts: 2 },
  { code: "SC", name: "South Carolina", districts: 7 },
  { code: "SD", name: "South Dakota", districts: 1 },
  { code: "TN", name: "Tennessee", districts: 9 },
  { code: "TX", name: "Texas", districts: 38 },
  { code: "UT", name: "Utah", districts: 4 },
  { code: "VT", name: "Vermont", districts: 1 },
  { code: "VA", name: "Virginia", districts: 11 },
  { code: "WA", name: "Washington", districts: 10 },
  { code: "WV", name: "West Virginia", districts: 2 },
  { code: "WI", name: "Wisconsin", districts: 8 },
  { code: "WY", name: "Wyoming", districts: 1 },
];

const atLargeStates = new Set(
  STATE_SCOPES.filter((state) => state.districts === 1).map((state) => state.code),
);

export function getDistrictCode(state: string, district: number | string) {
  const numeric = Number(district);
  if (atLargeStates.has(state.toUpperCase())) return "00";
  return String(numeric).padStart(2, "0");
}

export function getStateName(code: string) {
  return STATE_SCOPES.find((state) => state.code === code.toUpperCase())?.name ?? code;
}

export function getHouseRaces(cycle = DEFAULT_CYCLE): Race[] {
  return STATE_SCOPES.flatMap((state) =>
    Array.from({ length: state.districts }, (_, index) => {
      const district = getDistrictCode(state.code, index + 1);
      const districtLabel = district === "00" ? "At-Large" : district;
      return {
        id: `${cycle}-${state.code}-${district}-H`,
        cycle,
        state: state.code,
        district,
        office: DEFAULT_OFFICE,
        name: `${state.name} ${districtLabel} Congressional District`,
        competitiveness: "national",
      };
    }),
  );
}

export const TARGET_RACES: Race[] = getHouseRaces();

export function raceIdFor(
  state?: string | null,
  district?: string | number | null,
  cycle = DEFAULT_CYCLE,
) {
  if (!state || district === undefined || district === null) return null;
  const stateCode = state.toUpperCase();
  const normalizedDistrict = getDistrictCode(stateCode, district);
  return `${cycle}-${stateCode}-${normalizedDistrict}-H`;
}
