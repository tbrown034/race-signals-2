export function formatMoney(amount?: number | null) {
  if (amount === undefined || amount === null) return null;
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(amount);
}

export function formatCount(count: number, singular: string, plural = `${singular}s`) {
  return `${count} ${count === 1 ? singular : plural}`;
}

export function formatDate(value?: string | null) {
  if (!value) return "Unknown date";
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(value));
}

export function formatDateTime(value?: string | null) {
  if (!value) return "Unknown";
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    timeZoneName: "short",
  }).format(new Date(value));
}

export function formatRelativeTime(value?: string | null, now = new Date()) {
  if (!value) return "unknown";
  const then = new Date(value);
  const diffMs = now.getTime() - then.getTime();
  if (!Number.isFinite(diffMs)) return "unknown";

  const absMs = Math.abs(diffMs);
  const minutes = Math.round(absMs / 60000);
  const hours = Math.round(absMs / 3600000);
  const days = Math.round(absMs / 86400000);

  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes} min${minutes === 1 ? "" : "s"} ago`;
  if (hours < 48) return `${hours} hr${hours === 1 ? "" : "s"} ago`;
  return `${days} day${days === 1 ? "" : "s"} ago`;
}

export function isOlderThanHours(value: string | null | undefined, hours: number, now = new Date()) {
  if (!value) return true;
  const then = new Date(value);
  const ageMs = now.getTime() - then.getTime();
  return !Number.isFinite(ageMs) || ageMs > hours * 60 * 60 * 1000;
}
