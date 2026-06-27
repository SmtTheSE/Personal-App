-- Nexus Student OS — Supabase Schema
-- Run this in Supabase SQL Editor or via psql

-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- Profiles (extends auth.users)
create table if not exists public.profiles (
  id uuid references auth.users on delete cascade primary key,
  username text unique,
  avatar_url text,
  study_goal_mins integer default 120,
  created_at timestamptz default now() not null
);

alter table public.profiles enable row level security;

create policy "Users can view own profile"
  on public.profiles for select
  using (auth.uid() = id);

create policy "Users can update own profile"
  on public.profiles for update
  using (auth.uid() = id);

create policy "Users can insert own profile"
  on public.profiles for insert
  with check (auth.uid() = id);

-- Auto-create profile on signup
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, username)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'username', split_part(new.email, '@', 1))
  )
  on conflict (id) do nothing;
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- Projects
create table if not exists public.projects (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references auth.users on delete cascade not null,
  title text not null,
  description text,
  status text default 'active' check (status in ('active', 'paused', 'completed', 'archived')),
  tech_stack text[] default '{}',
  repo_url text,
  demo_url text,
  thumbnail text,
  started_at date default current_date,
  completed_at date,
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null
);

create index if not exists projects_user_id_idx on public.projects(user_id);
create index if not exists projects_status_idx on public.projects(status);

alter table public.projects enable row level security;

create policy "Users can CRUD own projects"
  on public.projects for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Resources
create table if not exists public.resources (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references auth.users on delete cascade not null,
  title text not null,
  url text,
  type text default 'article' check (type in ('article', 'paper', 'tutorial', 'video', 'book', 'tool', 'other')),
  tags text[] default '{}',
  notes text,
  is_favorite boolean default false,
  created_at timestamptz default now() not null
);

create index if not exists resources_user_id_idx on public.resources(user_id);
create index if not exists resources_tags_idx on public.resources using gin(tags);

alter table public.resources enable row level security;

create policy "Users can CRUD own resources"
  on public.resources for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Tasks
create table if not exists public.tasks (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references auth.users on delete cascade not null,
  title text not null,
  description text,
  priority text default 'medium' check (priority in ('low', 'medium', 'high')),
  status text default 'todo' check (status in ('todo', 'in_progress', 'done')),
  due_date date,
  project_id uuid references public.projects on delete set null,
  sort_order integer default 0,
  completed_at timestamptz,
  created_at timestamptz default now() not null
);

create index if not exists tasks_user_id_idx on public.tasks(user_id);
create index if not exists tasks_due_date_idx on public.tasks(due_date);
create index if not exists tasks_status_idx on public.tasks(status);

alter table public.tasks enable row level security;

create policy "Users can CRUD own tasks"
  on public.tasks for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Study sessions (v2 prep)
create table if not exists public.study_sessions (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references auth.users on delete cascade not null,
  topic text not null,
  duration_mins integer not null default 0,
  project_id uuid references public.projects on delete set null,
  started_at timestamptz default now() not null
);

alter table public.study_sessions enable row level security;

create policy "Users can CRUD own study sessions"
  on public.study_sessions for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Interview problems (v2 prep)
create table if not exists public.interview_problems (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references auth.users on delete cascade not null,
  title text not null,
  difficulty text default 'medium' check (difficulty in ('easy', 'medium', 'hard')),
  topics text[] default '{}',
  platform text,
  url text,
  solved_at timestamptz,
  revisit_date date,
  notes text,
  created_at timestamptz default now() not null
);

alter table public.interview_problems enable row level security;

create policy "Users can CRUD own interview problems"
  on public.interview_problems for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Notes (v2 prep)
create table if not exists public.notes (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references auth.users on delete cascade not null,
  title text not null,
  content text,
  project_id uuid references public.projects on delete set null,
  resource_id uuid references public.resources on delete set null,
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null
);

alter table public.notes enable row level security;

create policy "Users can CRUD own notes"
  on public.notes for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Enable realtime for tasks
alter publication supabase_realtime add table public.tasks;

-- Updated_at trigger for projects
create or replace function public.set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists projects_updated_at on public.projects;
create trigger projects_updated_at
  before update on public.projects
  for each row execute procedure public.set_updated_at();

drop trigger if exists notes_updated_at on public.notes;
create trigger notes_updated_at
  before update on public.notes
  for each row execute procedure public.set_updated_at();

-- v2: Project milestones
create table if not exists public.project_milestones (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references auth.users on delete cascade not null,
  project_id uuid references public.projects on delete cascade not null,
  title text not null,
  completed boolean default false not null,
  sort_order integer default 0 not null,
  created_at timestamptz default now() not null
);

create index if not exists milestones_project_id_idx on public.project_milestones(project_id);

alter table public.project_milestones enable row level security;

create policy "Users can CRUD own milestones"
  on public.project_milestones for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

alter table public.notes add column if not exists is_pinned boolean default false;
alter table public.notes add column if not exists tags text[] default '{}';

alter table public.study_sessions add column if not exists session_type text default 'focus'
  check (session_type in ('focus', 'short_break', 'long_break', 'review'));

-- v3: Spreadsheet automation workbooks
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

-- v4: Exams + interview spaced repetition
create table if not exists public.exams (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references auth.users on delete cascade not null,
  title text not null,
  course text,
  exam_at timestamptz not null,
  location text,
  notes text,
  color text default 'blue' check (color in ('blue', 'purple', 'orange', 'red', 'green')),
  created_at timestamptz default now() not null
);

create index if not exists exams_user_id_idx on public.exams(user_id);
create index if not exists exams_exam_at_idx on public.exams(exam_at);

alter table public.exams enable row level security;

create policy "Users can CRUD own exams"
  on public.exams for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create table if not exists public.exam_prep_items (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references auth.users on delete cascade not null,
  exam_id uuid references public.exams on delete cascade not null,
  title text not null,
  completed boolean default false not null,
  sort_order integer default 0 not null,
  created_at timestamptz default now() not null
);

create index if not exists exam_prep_exam_id_idx on public.exam_prep_items(exam_id);

alter table public.exam_prep_items enable row level security;

create policy "Users can CRUD own exam prep items"
  on public.exam_prep_items for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

alter table public.interview_problems add column if not exists review_count integer default 0;
alter table public.interview_problems add column if not exists interval_days integer default 1;
alter table public.interview_problems add column if not exists next_review_at date;

-- GitHub + Vercel integration tokens (server reads via service role in API routes)

create table if not exists public.user_integrations (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references auth.users on delete cascade not null,
  provider text not null check (provider in ('github', 'vercel')),
  access_token text not null,
  refresh_token text,
  metadata jsonb default '{}'::jsonb not null,
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null,
  unique (user_id, provider)
);

create index if not exists user_integrations_user_id_idx on public.user_integrations(user_id);

alter table public.user_integrations enable row level security;

create policy "Users can manage own integrations"
  on public.user_integrations for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Google Calendar sync (v6)

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

-- Telegram quick capture (v7)

alter table public.user_integrations drop constraint if exists user_integrations_provider_check;
alter table public.user_integrations add constraint user_integrations_provider_check
  check (provider in ('github', 'vercel', 'google_calendar', 'telegram'));

-- GitHub Issues → tasks (v8)

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
