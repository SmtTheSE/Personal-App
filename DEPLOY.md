# Deploy Nexus to Vercel + GitHub OAuth

## 1. Database (one-time)

Run `supabase/schema.sql` in [Supabase SQL Editor](https://supabase.com/dashboard/project/qeocmqftodajblvajnhg/sql).

## 2. GitHub OAuth App

1. Go to [GitHub Developer Settings → OAuth Apps → New](https://github.com/settings/applications/new)
2. Fill in:
   - **Application name:** Nexus Student OS
   - **Homepage URL:** `https://your-app.vercel.app` (update after first Vercel deploy)
   - **Authorization callback URL:** `https://qeocmqftodajblvajnhg.supabase.co/auth/v1/callback`
3. Click **Register application**
4. Copy the **Client ID**
5. Generate a **Client Secret** and copy it

## 3. Supabase Auth Config

1. Open [Supabase → Authentication → Providers → GitHub](https://supabase.com/dashboard/project/qeocmqftodajblvajnhg/auth/providers)
2. Enable **GitHub**
3. Paste **Client ID** and **Client Secret**
4. Save

### Redirect URLs

In [Supabase → Authentication → URL Configuration](https://supabase.com/dashboard/project/qeocmqftodajblvajnhg/auth/url-configuration):

| Setting | Value |
|---------|-------|
| Site URL | `https://YOUR-APP.vercel.app` |
| Redirect URLs | `http://localhost:5173/**` |
| | `https://YOUR-APP.vercel.app/**` |

## 4. Vercel Deploy

### Option A — Connect GitHub repo (recommended)

1. Repo is at [github.com/SmtTheSE/Personal-App](https://github.com/SmtTheSE/Personal-App)
2. Go to [vercel.com/new](https://vercel.com/new) → **Import** `SmtTheSE/Personal-App`
3. Vercel auto-detects Vite from `vercel.json`:
   - Framework: Vite
   - Build command: `npm run build`
   - Output directory: `dist`
4. Add **Environment Variables** before deploying:

| Key | Value |
|-----|-------|
| `VITE_SUPABASE_URL` | `https://qeocmqftodajblvajnhg.supabase.co` |
| `VITE_SUPABASE_ANON_KEY` | your Supabase anon key |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase **service role** key (server-only — never expose as `VITE_`) |
| `GOOGLE_CLIENT_ID` | Google Cloud OAuth client ID (Calendar sync) |
| `GOOGLE_CLIENT_SECRET` | Google Cloud OAuth client secret |
| `GOOGLE_REDIRECT_URI` | Optional — defaults to `https://YOUR-APP.vercel.app/api/google/calendar/callback` |

The service role key powers `/api/github/repos`, `/api/vercel/dashboard`, and `/api/google/calendar/*` so integration tokens stay off the client.

5. Click **Deploy** → copy your Vercel URL (e.g. `https://personal-app-xxx.vercel.app`)
6. Update GitHub OAuth **Homepage URL** and Supabase **Site URL** / **Redirect URLs** with your real Vercel URL

### Option B — Vercel CLI

```bash
npm install -g vercel
vercel login
vercel link
vercel env add VITE_SUPABASE_URL
vercel env add VITE_SUPABASE_ANON_KEY
vercel env add SUPABASE_SERVICE_ROLE_KEY
vercel --prod
```

## 6. Integrations (GitHub repos + Vercel deploys)

1. Run `supabase/migrations/v5_integrations.sql` (or the tail of `schema.sql`) in Supabase SQL Editor if not already applied.
2. In Nexus **Settings → Integrations**:
   - **GitHub:** sign in with GitHub (requests `repo` scope). Token is saved to `user_integrations` after OAuth.
   - **Vercel:** paste a [personal access token](https://vercel.com/account/tokens).
3. Use **Projects → import** to pick a repo and auto-fill `repo_url`.
4. Open **Deployments** for linked repos, live status, and deploy charts.

API routes run as Vercel serverless functions (`nexus/api/`). Local dev: use `vercel dev` (not `vite` alone) to hit `/api/*`.

## 7. Google Calendar

1. Run `supabase/migrations/v6_google_calendar.sql` (or the tail of `schema.sql`) in Supabase SQL Editor.
2. In [Google Cloud Console](https://console.cloud.google.com/):
   - Create a project (or use existing)
   - Enable **Google Calendar API**
   - **APIs & Services → Credentials → Create OAuth client ID** (Web application)
   - **Authorized redirect URIs:** `https://YOUR-APP.vercel.app/api/google/calendar/callback` and `http://localhost:3000/api/google/calendar/callback` (for `vercel dev`)
3. Add env vars to Vercel: `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, optional `GOOGLE_REDIRECT_URI`
4. In Nexus **Settings → Integrations → Google Calendar → Connect**
   - Task due dates and exams sync as Google Calendar events
   - Toggle sync per entity type; use **Sync now** for a full reconcile
   - Focus and Calendar views show imported busy blocks (excluding Nexus-created events)

Scopes: `calendar.events` (write) + `calendar.readonly` (busy import).

## 8. Telegram quick capture

1. Run `supabase/migrations/v7_telegram.sql` (or tail of `schema.sql`) in Supabase SQL Editor.
2. Create a bot with [@BotFather](https://t.me/BotFather) → `/newbot` → copy the **bot token**.
3. Add Vercel env vars:

| Key | Value |
|-----|-------|
| `TELEGRAM_BOT_TOKEN` | Bot token from BotFather |
| `TELEGRAM_WEBHOOK_SECRET` | Random string (e.g. `openssl rand -hex 24`) |
| `TELEGRAM_BOT_USERNAME` | Optional — bot username without `@` |

4. Register the webhook (once per deploy URL):

```bash
curl -X POST "https://api.telegram.org/bot<TOKEN>/setWebhook" \
  -H "Content-Type: application/json" \
  -d '{"url":"https://YOUR-APP.vercel.app/api/telegram/webhook","secret_token":"YOUR_WEBHOOK_SECRET"}'
```

5. In Nexus **Settings → Integrations → Telegram → Connect** → open the bot in Telegram → tap **Start**.
6. Message the bot:
   - `task Buy milk tomorrow`
   - `note LeetCode 347`
   - `note Lecture recap | Key ideas from class`

Aliases: `t` / `n`. Due hints: `today`, `tomorrow`, or `YYYY-MM-DD`.

## 9. GitHub Issues → Tasks

1. Run `supabase/migrations/v8_github_issues.sql` (or tail of `schema.sql`) in Supabase SQL Editor.
2. Connect **GitHub** in Settings (sign in with GitHub or reconnect for `repo` scope).
3. Open **GitHub Issues** (Settings → Data, or Integrations → Sync GitHub Issues).
4. Enable sync, select repositories, tap **Sync now**.

Synced tasks store a mapping in `github_issue_sync_mappings` for idempotent updates. Labels map to priority; milestone `due_on` becomes task `due_date`. Closed issues can mark linked tasks done.

## 10. Verify

- [ ] Email sign-up / sign-in works
- [ ] GitHub OAuth redirects back to your Vercel site
- [ ] Tasks, projects, resources load after login
- [ ] GitHub repo import works (Settings → connect, Projects → import)
- [ ] Vercel token saves and Deployments dashboard loads
