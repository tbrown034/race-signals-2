import type { RecentValidationIssue } from "@/src/lib/types";
import { formatDateTime } from "@/src/lib/format";

export function CoverageWarning({
  issues,
  title = "Coverage warning",
}: {
  issues: RecentValidationIssue[];
  title?: string;
}) {
  if (!issues.length) return null;

  return (
    <section className="border-b border-neutral-300 bg-neutral-50 px-5 py-4">
      <h2 className="font-mono text-xs uppercase tracking-[0.14em] text-neutral-700">
        {title}
      </h2>
      <p className="mt-1 max-w-3xl text-sm leading-6 text-neutral-700">
        This scope has retained ingest warnings. Treat totals and empty results as partial until the linked source records are checked.
      </p>
      <ul className="mt-3 space-y-2 text-sm leading-5 text-neutral-700">
        {issues.map((issue) => (
          <li className="max-w-full break-words [overflow-wrap:anywhere]" key={`${issue.rule}-${issue.sourceId}-${issue.createdAt}`}>
            <span className="font-mono text-[11px] uppercase tracking-[0.12em] text-neutral-500">
              {issue.rule.replaceAll("_", " ")}
            </span>
            {": "}
            {issue.message}
            {issue.sourceUrl ? (
              <>
                {" "}
                <a className="font-medium underline underline-offset-4" href={issue.sourceUrl} rel="noreferrer" target="_blank">
                  Source
                </a>
              </>
            ) : null}
            <span className="ml-1 text-xs text-neutral-500">
              Recorded {formatDateTime(issue.createdAt)}
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}
