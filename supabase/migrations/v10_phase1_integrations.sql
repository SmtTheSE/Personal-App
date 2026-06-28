-- Phase 1: scalable integration foundation
-- Tasks: explicit source + external_ref (replaces description parsing)
-- GitHub PR sync mappings, Vercel deploy mappings, project integration links
-- Calendar: focus_session entity type

-- Task provenance
alter table public.tasks add column if not exists source text not null default 'manual';
alter table public.tasks add column if not exists external_ref jsonb;

alter table public.tasks drop constraint if exists tasks_source_check;
alter table public.tasks add constraint tasks_source_check
  check (source in ('manual', 'github_issue', 'github_pr', 'telegram', 'vercel_deploy'));

create index if not exists tasks_source_idx on public.tasks(user_id, source);
create index if not exists tasks_external_ref_idx on public.tasks using gin (external_ref);

-- Backfill github_issue source from existing synced tasks
update public.tasks
set source = 'github_issue'
where source = 'manual'
  and description is not null
  and description like '%GitHub:%'
  and description not like '%GitHub PR:%';

-- GitHub PR → kanban review
create table if not exists public.github_pr_sync_mappings (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references auth.users on delete cascade not null,
  repo_full_name text not null,
  external_pr_number integer not null,
  external_pr_id bigint not null,
  task_id uuid references public.tasks on delete cascade not null,
  content_hash text not null,
  last_synced_at timestamptz default now() not null,
  created_at timestamptz default now() not null,
  unique (user_id, repo_full_name, external_pr_number),
  unique (user_id, task_id)
);

create index if not exists github_pr_sync_mappings_user_id_idx
  on public.github_pr_sync_mappings(user_id);

alter table public.github_pr_sync_mappings enable row level security;

create policy "Users can read own github pr sync mappings"
  on public.github_pr_sync_mappings for select
  using (auth.uid() = user_id);

-- Vercel failed deploy → task (idempotent)
create table if not exists public.vercel_deploy_sync_mappings (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references auth.users on delete cascade not null,
  deployment_uid text not null,
  task_id uuid references public.tasks on delete cascade not null,
  project_id uuid references public.projects on delete set null,
  content_hash text not null,
  last_synced_at timestamptz default now() not null,
  created_at timestamptz default now() not null,
  unique (user_id, deployment_uid),
  unique (user_id, task_id)
);

create index if not exists vercel_deploy_sync_mappings_user_id_idx
  on public.vercel_deploy_sync_mappings(user_id);

alter table public.vercel_deploy_sync_mappings enable row level security;

create policy "Users can read own vercel deploy sync mappings"
  on public.vercel_deploy_sync_mappings for select
  using (auth.uid() = user_id);

-- Project ↔ external service links (vercel, github, future providers)
create table if not exists public.project_integration_links (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references auth.users on delete cascade not null,
  project_id uuid references public.projects on delete cascade not null,
  provider text not null check (provider in ('vercel', 'github')),
  external_id text not null,
  external_ref jsonb not null default '{}'::jsonb,
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null,
  unique (project_id, provider)
);

create index if not exists project_integration_links_user_id_idx
  on public.project_integration_links(user_id);
create index if not exists project_integration_links_provider_idx
  on public.project_integration_links(user_id, provider, external_id);

alter table public.project_integration_links enable row level security;

create policy "Users manage own project integration links"
  on public.project_integration_links for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Calendar sync: allow focus_session export
alter table public.calendar_sync_mappings drop constraint if exists calendar_sync_mappings_entity_type_check;
alter table public.calendar_sync_mappings add constraint calendar_sync_mappings_entity_type_check
  check (entity_type in ('task', 'exam', 'focus_session'));
