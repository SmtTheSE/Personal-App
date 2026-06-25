# Deploy Nexus to Netlify + GitHub OAuth

## 1. Database (one-time)

Run `supabase/schema.sql` in [Supabase SQL Editor](https://supabase.com/dashboard/project/qeocmqftodajblvajnhg/sql).

## 2. GitHub OAuth App

1. Go to [GitHub Developer Settings → OAuth Apps → New](https://github.com/settings/applications/new)
2. Fill in:
   - **Application name:** Nexus Student OS
   - **Homepage URL:** `https://personal-app-nexus.netlify.app` (update after first Netlify deploy if different)
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
| Site URL | `https://YOUR-NETLIFY-SITE.netlify.app` |
| Redirect URLs | `http://localhost:5173/**` |
| | `https://YOUR-NETLIFY-SITE.netlify.app/**` |

## 4. Netlify Deploy

### Option A — Connect GitHub repo (recommended)

1. Push this repo to [github.com/SmtTheSE/Personal-App](https://github.com/SmtTheSE/Personal-App)
2. Go to [Netlify](https://app.netlify.com) → **Add new site** → **Import an existing project**
3. Connect **GitHub** → select `SmtTheSE/Personal-App`
4. Build settings (auto-detected from `netlify.toml`):
   - Build command: `npm run build`
   - Publish directory: `dist`
5. Add **Environment variables** (Site settings → Environment variables):

| Key | Value |
|-----|-------|
| `VITE_SUPABASE_URL` | `https://qeocmqftodajblvajnhg.supabase.co` |
| `VITE_SUPABASE_ANON_KEY` | your Supabase anon key |

6. Deploy → copy your Netlify URL
7. Update GitHub OAuth **Homepage URL** and Supabase **Site URL** / **Redirect URLs** with the real Netlify URL

### Option B — Netlify CLI

```bash
npm install -g netlify-cli
netlify login
netlify init
netlify env:set VITE_SUPABASE_URL "https://qeocmqftodajblvajnhg.supabase.co"
netlify env:set VITE_SUPABASE_ANON_KEY "your-anon-key"
netlify deploy --prod
```

## 5. Verify

- [ ] Email sign-up / sign-in works
- [ ] GitHub OAuth redirects back to your Netlify site
- [ ] Tasks, projects, resources load after login
