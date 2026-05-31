import Link from "next/link";
import { formatDateTime, formatRelativeTime } from "@/src/lib/format";
import type { IngestionRun } from "@/src/lib/types";

export function CoverageStrip({
  counts,
  latestRun,
  mode,
}: {
  counts: Record<string, number>;
  latestRun?: IngestionRun;
  mode: string;
}) {
  const finishedAt = latestRun?.finishedAt ?? latestRun?.startedAt ?? null;
  const isPartial = latestRun?.status === "partial";
  const isError = latestRun?.status === "failed" || latestRun?.status === "error";
  const stateScope = latestRun?.state ? `State ${latestRun.state}` : latestRun?.scope ?? "Configured slice";
  const statusLabel = isError ? "Needs attention" : isPartial ? "Partial ingest" : latestRun?.status ?? mode;

  return (
    <div className="border-b border-neutral-300 bg-neutral-50 px-5 py-3 text-sm">
      <div className="grid gap-3 md:grid-cols-[1fr_auto] md:items-center">
        <div>
          <p className="font-mono text-[11px] uppercase tracking-[0.12em] text-neutral-500">
            Coverage check
          </p>
          <p className="mt-1 leading-5 text-neutral-700">
            Current readout reflects the latest stored ingest slice, not a real-time national tabulator.
            Absence of a signal is not confirmation that no FEC activity exists.
          </p>
        </div>
        <dl className="grid grid-cols-2 gap-x-5 gap-y-2 font-mono text-[11px] uppercase tracking-[0.12em] text-neutral-600 sm:grid-cols-4">
          <div>
            <dt>Status</dt>
            <dd className="mt-1 font-semibold text-neutral-950">{statusLabel}</dd>
          </div>
          <div>
            <dt>Scope</dt>
            <dd className="mt-1 font-semibold text-neutral-950">{stateScope}</dd>
          </div>
          <div>
            <dt>Signals</dt>
            <dd className="mt-1 font-semibold text-neutral-950">{counts.signals ?? 0}</dd>
          </div>
          <div>
            <dt>Finished</dt>
            <dd className="mt-1">
              <Link
                className="font-semibold text-neutral-950 underline-offset-4 hover:underline"
                href="/status"
                title={finishedAt ? formatDateTime(finishedAt) : "No ingestion run recorded"}
              >
                {formatRelativeTime(finishedAt)}
              </Link>
            </dd>
          </div>
        </dl>
      </div>
    </div>
  );
}
