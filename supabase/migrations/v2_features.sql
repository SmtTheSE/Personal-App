-- Nexus v2 — Run after schema.sql in Supabase SQL Editor

-- Project milestones / checklist
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

-- Notes enhancements
alter table public.notes add column if not exists is_pinned boolean default false;
alter table public.notes add column if not exists tags text[] default '{}';

-- Study session metadata
alter table public.study_sessions add column if not exists session_type text default 'focus'
  check (session_type in ('focus', 'short_break', 'long_break', 'review'));

create index if not exists notes_user_pinned_idx on public.notes(user_id, is_pinned);
