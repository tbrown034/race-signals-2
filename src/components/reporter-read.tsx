export function ReporterRead({
  id,
  mobileLimit,
  notes,
  title = "Reporter read",
}: {
  id?: string;
  mobileLimit?: number;
  notes: string[];
  title?: string;
}) {
  const visibleNotes = notes.filter(Boolean);
  if (!visibleNotes.length) return null;
  const mobileNotes = mobileLimit ? visibleNotes.slice(0, mobileLimit) : visibleNotes;
  const hasMobileSummary = Boolean(mobileLimit && visibleNotes.length > mobileNotes.length);
  const listClassName = "min-w-0 divide-y divide-neutral-200 text-sm leading-6 text-neutral-700";
  const itemClassName = "max-w-[min(280px,100%)] break-words px-5 py-3 [overflow-wrap:anywhere] sm:max-w-full";

  return (
    <div className="border-b border-neutral-300" id={id}>
      <div className="border-b border-neutral-300 px-5 py-4">
        <h2 className="text-sm font-semibold uppercase tracking-[0.14em] text-neutral-600">
          {title}
        </h2>
      </div>
      <ul className={`${listClassName} ${mobileLimit ? "hidden sm:block" : ""}`}>
        {visibleNotes.map((note) => (
          <li className={itemClassName} key={note}>
            {note}
          </li>
        ))}
      </ul>
      {mobileLimit ? (
        <ul className={`${listClassName} sm:hidden`}>
          {mobileNotes.map((note) => (
            <li className={itemClassName} key={`mobile-${note}`}>
              {note}
            </li>
          ))}
          {hasMobileSummary ? (
            <li className={itemClassName}>
              More source caveats continue in the stats, evidence and signal sections below.
            </li>
          ) : null}
        </ul>
      ) : null}
    </div>
  );
}
