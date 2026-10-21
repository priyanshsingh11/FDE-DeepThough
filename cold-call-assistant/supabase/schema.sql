-- Cold Call Assistant schema. Run in the Supabase SQL editor.
create extension if not exists "pgcrypto";

create table if not exists calls (
  id            uuid primary key default gen_random_uuid(),
  owner_id      text not null,                       -- anonymous per-browser id (demo isolation)
  prospect_name text,
  company_name  text,
  status        text not null default 'in_progress' check (status in ('in_progress','completed')),
  current_stage smallint not null default 1 check (current_stage between 1 and 8),
  outcome       text,
  close_notes   text,
  started_at    timestamptz not null default now(),
  ended_at      timestamptz,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  constraint completed_has_end check (status <> 'completed' or (ended_at is not null and outcome is not null))
);
create index if not exists calls_owner_created_idx on calls (owner_id, created_at desc);
create index if not exists calls_status_idx on calls (status);

create table if not exists call_stage_results (
  id              uuid primary key default gen_random_uuid(),
  call_id         uuid not null references calls(id) on delete cascade,
  stage_number    smallint not null check (stage_number between 1 and 8),
  selected_result text not null,
  prospect_words  text,
  notes           text,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  unique (call_id, stage_number)
);
create index if not exists call_stage_results_call_idx on call_stage_results (call_id);

-- Reference data. The app reads stages from backend/app/data/stages.json (single source of truth);
-- this table mirrors it so the data is queryable. Load with: python scripts/seed_stages.py
create table if not exists call_stages (
  stage_number     smallint primary key check (stage_number between 1 and 8),
  name             text not null,
  purpose          text not null,
  guidance         jsonb not null default '[]',
  common_responses jsonb not null default '[]',
  result_options   jsonb not null default '[]'
);

-- The backend uses the service-role key and filters by owner_id. Lock out direct anon/public access:
alter table calls enable row level security;
alter table call_stage_results enable row level security;
alter table call_stages enable row level security;
