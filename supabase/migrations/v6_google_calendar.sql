-- Google Calendar sync: OAuth tokens + entity ↔ event mappings

alter table public.user_integrations drop constraint if exists user_integrations_provider_check;
alter table public.user_integrations add constraint user_integrations_provider_check
  check (provider in ('github', 'vercel', 'google_calendar'));

create table if not exists public.calendar_sync_mappings (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references auth.users on delete cascade not null,
  provider text not null default 'google_calendar',
  entity_type text not null check (entity_type in ('task', 'exam')),
  entity_id uuid not null,
  external_calendar_id text not null,
  external_event_id text not null,
  content_hash text not null,
  last_synced_at timestamptz default now() not null,
  created_at timestamptz default now() not null,
  unique (user_id, entity_type, entity_id),
  unique (user_id, provider, external_event_id)
);

create index if not exists calendar_sync_mappings_user_id_idx on public.calendar_sync_mappings(user_id);

alter table public.calendar_sync_mappings enable row level security;

create policy "Users can read own calendar sync mappings"
  on public.calendar_sync_mappings for select
  using (auth.uid() = user_id);

-- Writes happen via service role in API routes only
