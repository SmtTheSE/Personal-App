-- Nexus v3 — Spreadsheet automation workbooks

create table if not exists public.spreadsheets (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references auth.users on delete cascade not null,
  title text not null,
  icon text default '📊',
  template text default 'custom' check (template in ('custom', 'semester', 'assignments', 'interview', 'study_budget')),
  doc jsonb not null default '{"sheets":[],"activeSheetId":null}'::jsonb,
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null
);

create index if not exists spreadsheets_user_id_idx on public.spreadsheets(user_id);

alter table public.spreadsheets enable row level security;

create policy "Users can CRUD own spreadsheets"
  on public.spreadsheets for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop trigger if exists spreadsheets_updated_at on public.spreadsheets;
create trigger spreadsheets_updated_at
  before update on public.spreadsheets
  for each row execute procedure public.set_updated_at();
