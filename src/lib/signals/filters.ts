export type SignalFilters = {
  q?: string;
  raceId?: string;
  state?: string;
  office?: string;
  type?: string;
  status?: string;
  limit?: number;
};

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
    state: first(params.state),
    office: first(params.office),
    raceId: first(params.race),
    type: first(params.type),
    status: first(params.status),
    limit,
  };
}

export function signalFiltersFromUrl(url: URL, limit?: number): SignalFilters {
  return {
    q: url.searchParams.get("q") ?? undefined,
    state: url.searchParams.get("state") ?? undefined,
    office: url.searchParams.get("office") ?? undefined,
    raceId: url.searchParams.get("race") ?? undefined,
    type: url.searchParams.get("type") ?? undefined,
    status: url.searchParams.get("status") ?? undefined,
    limit,
  };
}
