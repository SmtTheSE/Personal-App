-- Nexus v4 — Exams, prep checklists, interview spaced repetition

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

-- Spaced repetition fields for interview problems
alter table public.interview_problems add column if not exists review_count integer default 0;
alter table public.interview_problems add column if not exists interval_days integer default 1;
alter table public.interview_problems add column if not exists next_review_at date;
