# Race Signals Agent Context

This document is the working memory for agentic tools helping with Race Signals. Keep it current when product direction, data assumptions or architecture decisions change.

## North Star

Race Signals is a serious portfolio MVP for a journalist-developer. It is not a generic election dashboard.

The product is a feed-first civic data tool that helps reporters spot early campaign-finance signals before they become obvious stories.

The core questions are:

- What changed?
- Who filed?
- Who formed a new committee?
- Where is money moving?
- Who is spending in a race?
- What looks unusual enough to deserve a reporter's attention?

The MVP is FEC API only and now targets 2026 U.S. House races across all 50 states. Do not imply coverage beyond U.S. House races or beyond FEC-derived records.

## Editorial Product Principles

- Feed first, text forward, built around fast reporter judgment.
- Every screen should help a reporter spot a signal, verify a source, understand context or decide whether to follow up.
- Use plain-English headlines and short "why this matters" explanations.
- Preserve source transparency with FEC source links and freshness timestamps.
- Avoid fake certainty. Use confidence/status fields when records need caveats.
- Do not add Meta ads, Google ads, FCC files, OpenSecrets, IRS nonprofits or dark-money datasets in the MVP. Design source adapters so they can be added later.

## Visual Direction

Race Signals should feel like a credible newsroom intelligence tool: AP/Reuters/ProPublica alert desk meets campaign-finance notebook.

Use restrained typography, dense readable layouts, neutral colors and minimal decoration. Avoid glossy gradients, generic SaaS dashboard cards, fake election-night visuals, decorative charts and oversized empty spacing. Use color only for meaning such as urgency, party/race context, confidence, status or anomaly level.

## Current Technical Stack

- Next.js App Router, currently Next `16.2.6`
- React `19.2.4`
- TypeScript
- Tailwind CSS v4
- Postgres, Neon-compatible
- Raw SQL / lightweight query functions
- No Prisma
- Server Components by default
- Client Components only when needed
- Vercel-friendly deployment
- Python is allowed for ingestion later, but current ingestion is TypeScript

## Next.js Notes For Agents

This repo has `AGENTS.md` instructions stating this is not the Next.js version you may remember. Before changing Next-specific code, read relevant files in:

`node_modules/next/dist/docs/`

Useful docs already checked:

- `01-app/index.md`
- `01-app/01-getting-started/02-project-structure.md`
- `01-app/01-getting-started/05-server-and-client-components.md`
- `01-app/01-getting-started/06-fetching-data.md`
- `01-app/03-api-reference/03-file-conventions/page.md`

Important convention: in this Next version, App Router `params` and `searchParams` props are promises and should be awaited in Server Components.

## FEC API Notes

Official docs:

- Developer docs: `https://api.open.fec.gov/developers/`
- API root / Swagger: `https://api.open.fec.gov/`

Useful first-slice endpoints:

- Candidate search: `/v1/candidates/search/`
- Candidate committees: `/v1/candidate/{candidate_id}/committees/`
- Committee reports: `/v1/committee/{committee_id}/reports/`
- Itemized receipts: `/v1/schedules/schedule_a/`
- Independent expenditures: `/v1/schedules/schedule_e/`

Official docs note that FEC API data is updated nightly. API calls are limited to 100 results per page. A normal key allows 1,000 calls per hour.

The local `.env.local` includes `FEC_API_KEY`. Keep demo fallback mode available for reviewers without credentials.

Ingestion controls:

- `FEC_MAX_CANDIDATE_PAGES` limits national candidate discovery pages.
- `FEC_MAX_CANDIDATES` limits downstream candidate processing.
- `FEC_REQUEST_DELAY_MS` paces API calls. Default is 750 ms.
- `FEC_MAX_RETRIES` controls retry attempts for 429/5xx responses.

National ingestion should be paced and scheduled. Do not put broad FEC ingestion in a route handler.

## National House Scope

Default scope lives in `src/lib/scope.ts`.

Current target scope:

- All 435 U.S. House districts across the 50 states for the 2026 cycle.
- At-large states use district `00`.
- State/district definitions are generated from `STATE_SCOPES`.

The goal is a working national House MVP, not a generic all-office election dashboard.

## Data Model

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

Use unique source keys and upserts to prevent duplicates. Preserve FEC IDs, source URLs and raw JSON where useful.

## Pipeline Boundaries

Keep concerns separate:

- Source adapters: `src/lib/sources/`
- Normalization: `src/lib/normalization/`
- Validation: `src/lib/validation/`
- Database access: `src/lib/db/`
- Signal generation: `src/lib/signals/`
- Demo fallback: `src/lib/demo/`
- UI components: `src/components/`
- Routes: `app/`

Do not cram ingestion or signal logic into route handlers.

## Validation Rules

Implemented or expected validation rules:

- Missing candidate name
- Missing committee ID
- Missing date
- Duplicate or unstable source record
- Suspiciously large amount
- Broken or missing source URL
- Unmatched race

Validation issues should be stored and visible through status/freshness surfaces where practical.

## Signal Logic

Signals should turn raw records into reporter-readable feed events.

Initial signal types:

- `new_committee`
- `new_filing`
- `large_contribution`
- `large_independent_expenditure`
- `outside_spending_increase`
- `committee_activity_spike`

Every signal needs:

- Signal type
- Plain-English headline
- Short "why this matters"
- Candidate, committee or race
- Amount when relevant
- Date
- FEC source link
- Confidence/status if needed
- Data freshness timestamp

## Agent Operating Notes

- Prefer small, readable changes that preserve the national House MVP.
- Do not invent coverage outside the FEC records currently ingested.
- Do not add new data sources before the FEC-only MVP works.
- Keep README and this context doc in sync when architecture changes.
- Run `npm run lint` and, when useful, `npm run build` before finalizing.
- If working on UI, keep it dense, calm and source-transparent.
