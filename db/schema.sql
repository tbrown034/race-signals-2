create extension if not exists pgcrypto;

create table if not exists races (
  id text primary key,
  cycle integer not null,
  state text not null,
  district text not null,
  office text not null default 'H',
  name text not null,
  competitiveness text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (cycle, state, district, office)
);

create table if not exists candidates (
  id text primary key,
  fec_candidate_id text not null unique,
  name text not null,
  party text,
  office text not null,
  state text not null,
  district text,
  election_year integer,
  incumbent_challenge_status text,
  race_id text references races(id),
  source_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists committees (
  id text primary key,
  fec_committee_id text not null unique,
  name text not null,
  committee_type text,
  designation text,
  party text,
  treasurer_name text,
  candidate_id text references candidates(id),
  race_id text references races(id),
  discovered_via text,
  source_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table committees add column if not exists discovered_via text;

create table if not exists filings (
  id uuid primary key default gen_random_uuid(),
  source text not null default 'fec',
  source_id text not null,
  committee_id text references committees(id),
  fec_committee_id text,
  report_type text,
  coverage_start_date date,
  coverage_end_date date,
  receipt_date date,
  total_receipts numeric,
  total_disbursements numeric,
  cash_on_hand numeric,
  source_url text,
  raw jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (source, source_id)
);

create table if not exists transactions (
  id uuid primary key default gen_random_uuid(),
  source text not null default 'fec',
  source_id text not null,
  committee_id text references committees(id),
  fec_committee_id text,
  contributor_name text,
  contributor_name_normalized text,
  contributor_employer text,
  contributor_employer_normalized text,
  contributor_occupation text,
  amount numeric not null,
  transaction_date date,
  transaction_type text,
  memo_text text,
  source_url text,
  raw jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  unique (source, source_id)
);

alter table transactions add column if not exists contributor_name_normalized text;
alter table transactions add column if not exists contributor_employer_normalized text;

create table if not exists independent_expenditures (
  id uuid primary key default gen_random_uuid(),
  source text not null default 'fec',
  source_id text not null,
  spender_committee_id text references committees(id),
  fec_committee_id text,
  candidate_id text references candidates(id),
  fec_candidate_id text,
  race_id text references races(id),
  support_oppose_indicator text,
  amount numeric not null,
  expenditure_date date,
  purpose text,
  source_url text,
  raw jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  unique (source, source_id)
);

create table if not exists source_records (
  id uuid primary key default gen_random_uuid(),
  source text not null,
  source_table text not null,
  source_id text not null,
  fetched_at timestamptz not null default now(),
  source_url text,
  content_hash text not null,
  raw jsonb not null,
  unique (source, source_table, source_id)
);

create table if not exists signals (
  id uuid primary key default gen_random_uuid(),
  source text not null default 'fec',
  dedupe_key text not null unique,
  signal_type text not null,
  headline text not null,
  why_it_matters text not null,
  candidate_id text references candidates(id),
  committee_id text references committees(id),
  race_id text references races(id),
  amount numeric,
  signal_date date not null,
  source_url text,
  confidence text not null default 'medium',
  status text not null default 'new',
  data_freshness timestamptz not null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists race_ratings (
  id uuid primary key default gen_random_uuid(),
  race_id text not null references races(id),
  source_name text not null,
  source_url text,
  rating text not null,
  rating_date date,
  rationale text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (race_id, source_name)
);

create table if not exists saved_filters (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  owner_email text not null,
  filter_json jsonb not null default '{}'::jsonb,
  cadence text not null default 'off',
  last_sent_at timestamptz,
  created_at timestamptz not null default now(),
  constraint saved_filters_cadence_check check (cadence in ('daily', 'hourly', 'off'))
);

create table if not exists ingestion_runs (
  id uuid primary key default gen_random_uuid(),
  source text not null,
  scope text not null,
  status text not null,
  started_at timestamptz not null default now(),
  finished_at timestamptz,
  records_seen integer not null default 0,
  records_inserted integer not null default 0,
  records_updated integer not null default 0,
  errors jsonb not null default '[]'::jsonb,
  metadata jsonb not null default '{}'::jsonb
);

alter table ingestion_runs add column if not exists mode text not null default 'watch';
alter table ingestion_runs add column if not exists window_start date;
alter table ingestion_runs add column if not exists window_end date;
alter table ingestion_runs add column if not exists state text;

create table if not exists validation_issues (
  id uuid primary key default gen_random_uuid(),
  source text not null,
  entity_type text not null,
  source_id text,
  severity text not null,
  rule text not null,
  message text not null,
  source_url text,
  raw jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists ingestion_endpoint_runs (
  id uuid primary key default gen_random_uuid(),
  ingestion_run_id uuid references ingestion_runs(id),
  source text not null default 'fec',
  endpoint text not null,
  status text not null,
  records_fetched integer not null default 0,
  validation_issues_count integer not null default 0,
  completed_at timestamptz not null default now()
);

create index if not exists candidates_race_idx on candidates(race_id);
create index if not exists committees_candidate_idx on committees(candidate_id);
create index if not exists committees_race_idx on committees(race_id);
create index if not exists filings_committee_date_idx on filings(committee_id, receipt_date desc);
create index if not exists transactions_committee_date_idx on transactions(committee_id, transaction_date desc);
create index if not exists transactions_future_dedupe_idx on transactions(committee_id, contributor_name_normalized, transaction_date, amount);
create index if not exists independent_expenditures_race_date_idx on independent_expenditures(race_id, expenditure_date desc);
create index if not exists signals_date_idx on signals(signal_date desc, created_at desc);
create index if not exists signals_type_idx on signals(signal_type);
create index if not exists signals_race_idx on signals(race_id);
create index if not exists signals_status_idx on signals(status);
create index if not exists race_ratings_race_idx on race_ratings(race_id);
create index if not exists saved_filters_cadence_idx on saved_filters(cadence, last_sent_at);
create index if not exists ingestion_runs_mode_idx on ingestion_runs(mode, started_at desc);
create index if not exists ingestion_endpoint_runs_latest_idx on ingestion_endpoint_runs(endpoint, completed_at desc);
