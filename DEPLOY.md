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

5. Click **Deploy** → copy your Vercel URL (e.g. `https://personal-app-xxx.vercel.app`)
6. Update GitHub OAuth **Homepage URL** and Supabase **Site URL** / **Redirect URLs** with your real Vercel URL

### Option B — Vercel CLI

```bash
npm install -g vercel
vercel login
vercel link
vercel env add VITE_SUPABASE_URL
vercel env add VITE_SUPABASE_ANON_KEY
vercel --prod
```

## 5. Verify

- [ ] Email sign-up / sign-in works
- [ ] GitHub OAuth redirects back to your Vercel site
- [ ] Tasks, projects, resources load after login
