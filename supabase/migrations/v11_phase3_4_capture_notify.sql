-- Phase 3/4: capture from anywhere, notification hub, time tracking sources

-- Extend task provenance
alter table public.tasks drop constraint if exists tasks_source_check;
alter table public.tasks add constraint tasks_source_check
  check (source in (
    'manual', 'github_issue', 'github_pr', 'telegram', 'vercel_deploy', 'gmail', 'shortcut'
  ));

-- Gmail message → task/note idempotency
create table if not exists public.gmail_message_sync_mappings (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references auth.users on delete cascade not null,
  gmail_message_id text not null,
  entity_type text not null check (entity_type in ('task', 'note')),
  entity_id uuid not null,
  content_hash text not null,
  last_synced_at timestamptz default now() not null,
  created_at timestamptz default now() not null,
  unique (user_id, gmail_message_id)
);

create index if not exists gmail_message_sync_mappings_user_id_idx
  on public.gmail_message_sync_mappings(user_id);

alter table public.gmail_message_sync_mappings enable row level security;

create policy "Users can read own gmail sync mappings"
  on public.gmail_message_sync_mappings for select
  using (auth.uid() = user_id);

-- Apple Shortcuts / external capture tokens (hashed at rest)
create table if not exists public.capture_api_tokens (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references auth.users on delete cascade not null,
  label text not null default 'Shortcuts',
  token_hash text not null,
  token_prefix text not null,
  last_used_at timestamptz,
  created_at timestamptz default now() not null,
  unique (user_id, token_hash)
);

create index if not exists capture_api_tokens_user_id_idx on public.capture_api_tokens(user_id);
create index if not exists capture_api_tokens_hash_idx on public.capture_api_tokens(token_hash);

alter table public.capture_api_tokens enable row level security;

create policy "Users manage own capture tokens"
  on public.capture_api_tokens for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Unified notification hub (in-app feed + dedupe)
create table if not exists public.notification_events (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references auth.users on delete cascade not null,
  event_type text not null check (event_type in (
    'deploy_fail', 'exam_reminder', 'streak_at_risk', 'pr_review_requested', 'daily_digest'
  )),
  title text not null,
  body text not null,
  payload jsonb not null default '{}'::jsonb,
  dedupe_key text,
  read_at timestamptz,
  created_at timestamptz default now() not null,
  unique (user_id, dedupe_key)
);

create index if not exists notification_events_user_id_idx
  on public.notification_events(user_id, created_at desc);

alter table public.notification_events enable row level security;

create policy "Users manage own notification events"
  on public.notification_events for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Web push subscriptions (when Telegram not connected)
create table if not exists public.push_subscriptions (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references auth.users on delete cascade not null,
  endpoint text not null,
  p256dh text not null,
  auth text not null,
  user_agent text,
  created_at timestamptz default now() not null,
  unique (user_id, endpoint)
);

create index if not exists push_subscriptions_user_id_idx on public.push_subscriptions(user_id);

alter table public.push_subscriptions enable row level security;

create policy "Users manage own push subscriptions"
  on public.push_subscriptions for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Study session provenance (manual timer vs shortcuts vs github activity)
alter table public.study_sessions add column if not exists source text not null default 'manual';
alter table public.study_sessions drop constraint if exists study_sessions_source_check;
alter table public.study_sessions add constraint study_sessions_source_check
  check (source in ('manual', 'focus_timer', 'shortcut', 'github_activity', 'rescuetime'));

alter table public.study_sessions add column if not exists external_ref jsonb;

-- Extend user_integrations provider for gmail (application-level; no DB constraint on provider text)
-- Gmail uses provider = 'gmail' with metadata: { label_name, last_history_id, ... }

-- Resources can be captured via shortcuts
alter table public.resources add column if not exists source text not null default 'manual';
