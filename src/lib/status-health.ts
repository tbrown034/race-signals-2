const STALE_MS = 48 * 60 * 60 * 1000;

export function endpointHealthClass(endpoint: { completedAt: string; status: string }) {
  const ageMs = Date.now() - Date.parse(endpoint.completedAt);
  const isStale = Number.isNaN(ageMs) || ageMs > STALE_MS;
  const status = endpoint.status.toLowerCase();

  if (status === "error" || status === "failed") return "bg-red-700";
  if (isStale) return "bg-amber-700";
  if (status === "success") return "bg-emerald-700";
  return "border border-neutral-500";
}
