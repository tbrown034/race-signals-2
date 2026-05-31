import { DEFAULT_CYCLE } from "@/src/lib/scope";
import type { Race, RaceRating } from "@/src/lib/types";

const SENATE_KEY_RACES = new Set(["GA", "ME", "MI", "NC", "OH", "TX"]);

export function getPublicWatchlistRatings(
  races: Race[],
  cycle = DEFAULT_CYCLE,
): RaceRating[] {
  return races
    .filter((race) => race.cycle === cycle && race.office === "S" && SENATE_KEY_RACES.has(race.state))
    .map((race) => ({
      raceId: race.id,
      sourceName: "Race Signals public-source watchlist",
      sourceUrl: "https://en.wikipedia.org/wiki/2026_United_States_Senate_elections",
      rating: "Key race watch",
      ratingDate: "2026-05-31",
      rationale:
        "Public election-rating summaries and campaign coverage identify this Senate race as unusually competitive or strategically important.",
    }));
}
