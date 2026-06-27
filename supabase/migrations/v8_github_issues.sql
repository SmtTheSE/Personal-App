-- GitHub Issues → Nexus tasks (idempotent sync mappings)

create table if not exists public.github_issue_sync_mappings (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references auth.users on delete cascade not null,
  repo_full_name text not null,
  external_issue_number integer not null,
  external_issue_id bigint not null,
  task_id uuid references public.tasks on delete cascade not null,
  content_hash text not null,
  last_synced_at timestamptz default now() not null,
  created_at timestamptz default now() not null,
  unique (user_id, repo_full_name, external_issue_number),
  unique (user_id, task_id)
);

create index if not exists github_issue_sync_mappings_user_id_idx
  on public.github_issue_sync_mappings(user_id);

create index if not exists github_issue_sync_mappings_repo_idx
  on public.github_issue_sync_mappings(user_id, repo_full_name);

alter table public.github_issue_sync_mappings enable row level security;

create policy "Users can read own github issue sync mappings"
  on public.github_issue_sync_mappings for select
  using (auth.uid() = user_id);
