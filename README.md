# Nexus — Personal Student OS

A unified iOS-style dashboard for data science and software engineering students. Combines knowledge management, project tracking, interview prep, and personal analytics.

## Features

- **Focus Dashboard** — Today's tasks, study streak, active project widgets
- **Daily Tasks** — Priorities, due dates, realtime updates
- **Project Hub** — Track DS/SE projects with tech stack and links
- **Resource Vault** — Bookmark articles, papers, tutorials with tags
- **Study Analytics** — Weekly study hours chart, session logging
- **Interview Prep** — LeetCode-style problem tracker with difficulty filters

## Tech Stack

- Vue 3 + TypeScript + Vite
- Pinia + Vue Router + VueUse
- Tailwind CSS (iOS design system)
- Supabase (Auth, Postgres, RLS, Realtime)
- Chart.js for analytics

## Setup

### 1. Install dependencies

```bash
cd nexus
npm install
```

### 2. Configure environment

Copy `.env.example` to `.env` and add your Supabase credentials:

```
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
```

### 3. Set up the database

Run `supabase/schema.sql` in your Supabase SQL Editor. This creates all tables with Row Level Security policies.

## Deploy to Netlify

This repo includes `netlify.toml` — connect it to [Netlify](https://app.netlify.com) and set these environment variables:

| Variable | Value |
|----------|-------|
| `VITE_SUPABASE_URL` | Your Supabase project URL |
| `VITE_SUPABASE_ANON_KEY` | Your Supabase anon key |

See **[DEPLOY.md](./DEPLOY.md)** for full Netlify + GitHub OAuth setup.

## GitHub OAuth

1. Create a [GitHub OAuth App](https://github.com/settings/applications/new)
2. Callback URL: `https://YOUR-PROJECT.supabase.co/auth/v1/callback`
3. Enable GitHub in Supabase → Authentication → Providers
4. Add redirect URLs for `http://localhost:5173/**` and your Netlify URL

## Local development

```bash
npm run dev
```

## Build

```bash
npm run build
npm run preview
```

## Project Structure

```
src/
├── components/ui/     # iOS-style UI primitives
├── components/layout/ # Tab bar, nav bar
├── layouts/           # App shell
├── stores/            # Pinia stores
├── views/             # Page components
├── lib/supabase.ts    # Supabase client
└── types/             # TypeScript types
```

## License

MIT
