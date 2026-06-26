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
