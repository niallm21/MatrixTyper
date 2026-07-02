-- Accountabillibuddy beta schema (run in Supabase SQL editor)
-- Beta security model: possession of the pair code is the credential.
-- Good enough for invited testers; replace with real auth before any launch.

create table pairs (
  id bigint generated always as identity primary key,
  code text not null unique,
  created_at timestamptz default now()
);

create table members (
  id bigint generated always as identity primary key,
  pair_id bigint not null references pairs(id),
  device_id text not null,
  name text not null,
  goal text not null default '',
  created_at timestamptz default now(),
  unique (pair_id, device_id)
);

create table events (
  id bigint generated always as identity primary key,
  pair_id bigint not null references pairs(id),
  device_id text not null,
  day text not null,            -- YYYY-MM-DD
  type text not null,           -- checkin | note | photo | react
  payload jsonb not null default '{}',
  created_at timestamptz default now()
);

create index events_pair_idx on events (pair_id, id);

-- Beta: anon key may read/write these tables (pair code gates discovery).
alter table pairs enable row level security;
alter table members enable row level security;
alter table events enable row level security;
create policy beta_all_pairs on pairs for all using (true) with check (true);
create policy beta_all_members on members for all using (true) with check (true);
create policy beta_all_events on events for all using (true) with check (true);
