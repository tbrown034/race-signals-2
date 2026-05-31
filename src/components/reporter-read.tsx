export function ReporterRead({ notes, title = "Reporter read" }: { notes: string[]; title?: string }) {
  const visibleNotes = notes.filter(Boolean);
  if (!visibleNotes.length) return null;

  return (
    <div className="border-b border-neutral-300">
      <div className="border-b border-neutral-300 px-5 py-4">
        <h2 className="text-sm font-semibold uppercase tracking-[0.14em] text-neutral-600">
          {title}
        </h2>
      </div>
      <ul className="divide-y divide-neutral-200 text-sm leading-6 text-neutral-700">
        {visibleNotes.map((note) => (
          <li className="px-5 py-3" key={note}>
            {note}
          </li>
        ))}
      </ul>
    </div>
  );
}
