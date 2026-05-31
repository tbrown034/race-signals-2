# Race Signals

Race Signals is a serious portfolio MVP for spotting early campaign-finance signals before they become obvious stories.

It is built for reporters and editors who need a fast answer to: what changed, who filed, who formed a committee, where money is moving and what deserves follow-up.

The MVP is intentionally focused: FEC API only, covering 2026 U.S. House races across all 50 states.

## Why It Matters Journalistically

Campaign-finance stories often start as paperwork before they become public campaign narratives. A new committee, a large receipt, a filing, or outside spending can show intent, momentum or outside interest earlier than speeches, polling or ads.

Race Signals turns those records into a chronological feed of source-linked alerts with plain-English context.

## Data Sources

Current source:

- Federal Election Commission API

Initial endpoints:

- Candidate search
- Candidate committees
- Committee reports
- Schedule A itemized receipts
- Schedule E independent expenditures

Not included yet:

- Meta ads
- Google ads
- FCC public files
- OpenSecrets
- IRS nonprofits
- Dark-money datasets

## Pipeline Overview

1. `scripts/ingest-fec.ts` loads `.env.local`, migrates the schema and starts an ingestion run.
2. `src/lib/sources/fec/` fetches 2026 House candidates, candidate committees, reports, receipts and independent expenditures from the FEC API.
3. `src/lib/normalization/` maps raw FEC records into internal entities.
4. `src/lib/validation/` flags missing names, dates, IDs, source URLs, unmatched races and suspicious amounts.
5. `src/lib/db/` upserts normalized records into Postgres.
6. `src/lib/signals/` converts records into feed-ready reporting alerts.
7. Server Components read from Postgres, with demo fallback when `DATABASE_URL` is missing.

## Database Schema Overview

Schema lives in `db/schema.sql`.

Core tables:

- `races`
- `candidates`
- `committees`
- `filings`
- `transactions`
- `independent_expenditures`
- `source_records`
- `signals`
- `ingestion_runs`
- `validation_issues`

The schema is Neon-compatible Postgres and uses raw SQL. Prisma is intentionally not used.

## Deduping Strategy

Source records keep stable FEC IDs such as candidate IDs, committee IDs, filing image/file numbers and schedule `sub_id` values.

Tables use unique constraints on source/source ID pairs. Signals use a `dedupe_key` derived from the source record and signal type, such as `fec:large_ie:{sub_id}`.

Upserts update changed metadata without creating duplicate feed entries.

## Validation Rules

Current validation checks:

- Missing candidate name
- Missing committee ID
- Missing date
- Missing or unstable source ID
- Suspiciously large amount
- Broken or missing FEC source URL
- Unmatched race

Issues are stored in `validation_issues` during ingestion.

## How Signals Are Generated

Signal generation lives in `src/lib/signals/generate.ts`.

Initial signal types:

- New candidate committee
- New filing
- Large contribution
- Large independent expenditure
- Committee activity spike

Each signal includes a type, headline, why-it-matters explanation, related candidate/committee/race, amount when relevant, signal date, FEC source URL, confidence/status and data freshness timestamp.

Backfill mode generates historical signals from the requested date window. Those signals preserve the original event date in `signal_date` and use `status = historical` so old records do not look like fresh alerts.

## Known Limitations

- Coverage is national for 2026 U.S. House races, but not for Senate, presidential, state or local races.
- FEC API results are page-limited for development ergonomics.
- Demo data is illustrative and clearly marked as demo mode.
- Signal thresholds are simple editorial heuristics, not statistical anomaly detection.
- The app does not yet reconcile every outside spender committee that appears only in Schedule E.

## How To Run Locally

Install dependencies:

```bash
npm install
```

Run the app:

```bash
npm run dev
```

Open `http://localhost:3000`.

Without `DATABASE_URL`, the app runs in demo mode. To ingest real FEC data, add:

```bash
DATABASE_URL=postgres://...
FEC_API_KEY=...
```

Then run:

```bash
npm run ingest
```

Backfill a bounded historical window:

```bash
INGESTION_MODE=backfill BACKFILL_START_DATE=2025-01-01 BACKFILL_END_DATE=2025-03-31 RACE_SIGNALS_STATE=IN npm run ingest
```

Useful ingestion controls:

```bash
FEC_MAX_CANDIDATE_PAGES=3 npm run ingest
FEC_MAX_CANDIDATES=25 npm run ingest
FEC_REQUEST_DELAY_MS=4000 npm run ingest
FEC_MAX_RETRIES=6 npm run ingest
```

Without those caps, candidate discovery attempts the full 2026 House candidate search and then fetches related committee/report/receipt/expenditure records.

For a first production smoke test, use:

```bash
FEC_MAX_CANDIDATES=25 FEC_REQUEST_DELAY_MS=1500 npm run ingest
```

The default request delay is 4000 ms so uncapped national runs stay under the normal FEC API hourly limit. National ingestion should be treated as a paced background job or scheduled task, not a route handler.

Verification:

```bash
npm run lint
npm run build
```

## How To Add A Source Adapter Later

Add a new adapter under `src/lib/sources/{source}/`. Keep the same boundaries:

- Fetch raw records in the source adapter.
- Normalize into internal entities.
- Validate source-specific failure modes.
- Preserve source IDs, source URLs and raw records.
- Generate source-specific signals in the signal layer.
- Keep route handlers and UI free of ingestion logic.

## Future Expansion

The source-adapter boundary is designed for later expansion:

- FCC public files: TV/radio ad buys and station-level filings.
- Google and Meta ads: digital ad spend, sponsor and creative changes.
- IRS nonprofits: politically active nonprofit filings.
- OpenSecrets: contextual committee and donor network enrichment.
- Dark-money datasets: source-specific investigative overlays once provenance is clear.

Those sources should come after the FEC-only MVP works end to end.

## Agent Context

Agent-facing context lives in `docs/agent-context.md` and is exposed in the app at `/docs`.
