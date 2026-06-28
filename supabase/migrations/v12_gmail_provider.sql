-- Allow gmail as an integration provider (OAuth tokens storage)

alter table public.user_integrations drop constraint if exists user_integrations_provider_check;
alter table public.user_integrations add constraint user_integrations_provider_check
  check (provider in ('github', 'vercel', 'google_calendar', 'telegram', 'gmail'));
