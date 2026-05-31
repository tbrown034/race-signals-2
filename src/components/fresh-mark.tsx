const FRESH_WINDOW_MS = 48 * 60 * 60 * 1000;

export function isFresh(signalDate: string, status: string): boolean {
  if (status !== "new") return false;
  const eventTime = Date.parse(signalDate);
  if (Number.isNaN(eventTime)) return false;
  return Date.now() - eventTime <= FRESH_WINDOW_MS;
}

export function FreshMark({
  signalDate,
  status,
}: {
  signalDate: string;
  status: string;
}) {
  if (!isFresh(signalDate, status)) return null;
  return (
    <span
      role="img"
      aria-label="New signal in the last 48 hours"
      title="New in the last 48 hours"
      className="inline-block h-2 w-2 bg-emerald-700"
    />
  );
}
