export type SignalFilters = {
  committeeId?: string;
  q?: string;
  raceId?: string;
  state?: string;
  office?: string;
  type?: string;
  status?: string;
  since?: string;
  ingestedSince?: string;
  minAmount?: string;
  position?: string;
  targetParty?: string;
  targetStatus?: string;
  limit?: number;
};

export function sinceLabel(value?: string) {
  if (value === "24h") return "last 24 hours";
  if (value === "7d") return "last 7 days";
  if (value === "30d") return "last 30 days";
  return value;
}

function first(value: string | string[] | undefined) {
  if (Array.isArray(value)) return value[0];
  return value;
}

export function signalFiltersFromSearchParams(
  params: Record<string, string | string[] | undefined>,
  limit?: number,
): SignalFilters {
  return {
    q: first(params.q),
    committeeId: first(params.committee),
    state: first(params.state),
    office: first(params.office),
    raceId: first(params.race),
    type: first(params.type),
    status: first(params.status),
    since: first(params.since),
    ingestedSince: first(params.ingestedSince),
    minAmount: first(params.minAmount),
    position: first(params.position),
    targetParty: first(params.targetParty),
    targetStatus: first(params.targetStatus),
    limit,
  };
}

export function signalFiltersFromUrl(url: URL, limit?: number): SignalFilters {
  return {
    q: url.searchParams.get("q") ?? undefined,
    committeeId: url.searchParams.get("committee") ?? undefined,
    state: url.searchParams.get("state") ?? undefined,
    office: url.searchParams.get("office") ?? undefined,
    raceId: url.searchParams.get("race") ?? undefined,
    type: url.searchParams.get("type") ?? undefined,
    status: url.searchParams.get("status") ?? undefined,
    since: url.searchParams.get("since") ?? undefined,
    ingestedSince: url.searchParams.get("ingestedSince") ?? undefined,
    minAmount: url.searchParams.get("minAmount") ?? undefined,
    position: url.searchParams.get("position") ?? undefined,
    targetParty: url.searchParams.get("targetParty") ?? undefined,
    targetStatus: url.searchParams.get("targetStatus") ?? undefined,
    limit,
  };
}
