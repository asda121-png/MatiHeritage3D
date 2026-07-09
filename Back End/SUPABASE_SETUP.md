# Supabase setup — Mati Heritage 3D

This project currently stores data in **localStorage** (auth, admin edits) and **IndexedDB** (uploads). Supabase is wired in as the backend layer for the next phase.

All backend files live in **`Back End/`**.

## 1. Create a Supabase project

1. Go to [https://supabase.com/dashboard](https://supabase.com/dashboard)
2. **New project** → pick a name, password, region
3. Wait for the database to finish provisioning

## 2. Run the database schema

Open **SQL Editor** in Supabase and run the full contents of:

`Back End/supabase/migrations/20250628120000_initial_schema.sql`

This creates:

| Table | Purpose |
|-------|---------|
| `profiles` | Players, points, admin role |
| `heritage_sites` | Built / natural / intangible sites |
| `heritage_media` | Photos, videos, 3D models, etc. |
| Storage buckets | `heritage-photos`, `heritage-maps`, `heritage-models`, … |

## 3. Add your API keys

### Browser (admin & future pages)

Edit `Back End/supabase-config.js` (or copy from `Back End/supabase-config.example.js`):

```js
window.MATI_SUPABASE_CONFIG = {
  enabled: true,
  url: "https://xxxx.supabase.co",
  anonKey: "eyJ...",
  useSupabaseAuth: false, // set true when switching auth from localStorage
};
```

Get **URL** and **anon public** key from:  
**Project Settings → API**

> The anon key is designed for browser use; RLS policies protect write access.

### Node scripts

```powershell
cd "Back End"
copy .env.example .env
```

Fill in the same URL and keys in `Back End/.env`.

## 4. Install dependencies & test

The test script works **without** `npm install` (uses built-in Node fetch):

```powershell
cd "Back End"
node scripts/test-supabase.mjs
```

Or from the project root:

```powershell
npm run supabase:test
```

You should see: `Supabase connection OK.`

### If `npm install` fails with certificate error

This is a Windows/Node SSL issue (common on school networks). Try:

```powershell
set NODE_OPTIONS=--use-system-ca
npm install
```

If that still fails, you can skip `npm install` for now — browser admin and `node scripts/test-supabase.mjs` do not need it.

## 5. Seed built heritage into the database

The admin connects to Supabase, but **`heritage_sites` starts empty** until you seed it.

### Option A — SQL Editor + admin button (recommended)

1. Open **Supabase Dashboard → SQL Editor**
2. Run `Back End/supabase/seed/bootstrap_built_heritage_rpc.sql` (one time)
3. In the admin dashboard, click **Import built heritage**

Or run the plain insert file instead (no button needed):

`Back End/supabase/seed/built_heritage_sites.sql`

Regenerate both files after editing `Front End/admin-heritage-base.js`:

```powershell
node Back End/scripts/generate-built-heritage-seed-sql.mjs
node Back End/scripts/generate-bootstrap-rpc.mjs
```

### Option B — Node seed script

Add your **service role key** to `Back End/.env` (Dashboard → API → `service_role`), then:

```powershell
cd "Back End"
npm install
npm run supabase:seed
```

> The anon key alone cannot insert rows (RLS). Use SQL Editor or the service role key for seeding.

## 5a. Seed built heritage photographs/maps

Built heritage sites used to show **0 photos** on the admin Dashboard/Reports because only site rows were seeded — not `heritage_media`.

1. Open **Supabase Dashboard → SQL Editor**
2. Run `Back End/supabase/seed/built_heritage_media.sql` (sites must exist first)

Regenerate after adding/removing files under `Front End/data/Built Heritage/`:

```powershell
node Back End/scripts/generate-built-heritage-media-seed.mjs
```

The same catalog is also available offline via `Front End/admin-built-media.js` for admin counts before DB seed.

## 5c. Persist gallery media order (admin → visitor)

Admin Gallery photo/video/audio placement is stored in `heritage_media.sort_order`.

1. Run `Back End/supabase/migrations/20260708170000_heritage_media_sort_order.sql` once in SQL Editor  
2. Open Admin once (or open a media folder / drag to reorder) so the current Admin order is pushed to Supabase  
3. Hard-refresh the visitor gallery page (`galleryintangibleculturalheritage.html`, etc.) — it follows Admin order via DB `sort_order` (and, on the same browser, any stored Admin order)

## 5d. Seed intangible & natural heritage (gallery)

Visitor gallery pages load intangible/natural sites from Supabase (with static fallback).

### Option A — SQL Editor (recommended)

1. Generate (or regenerate) the seed file:

```powershell
cd "Back End"
npm run supabase:seed-gallery-sql
```

2. Open **Supabase Dashboard → SQL Editor**
3. Run `Back End/supabase/seed/gallery_heritage_catalog.sql`

### Option B — Node seed script

Requires the **service role key** in `Back End/.env` (anon key is blocked by RLS):

```powershell
cd "Back End"
npm run supabase:seed-gallery
```

## 5e. Enable admin cloud writes (required for deploy)

Admin saves and Storage uploads need this once. In **SQL Editor**, run:

`Back End/supabase/migrations/20260708120000_deployment_heritage_writes.sql`

This allows heritage table/storage writes while `app_settings.allow_heritage_writes = 'true'` (needed because the admin panel currently uses the anon key).

To lock writes later (after you enable real Supabase Auth admins):

```sql
update public.app_settings
set value = 'false', updated_at = now()
where key = 'allow_heritage_writes';
```

After this migration, admin **Add site / upload photo-video-audio / map pin coords** persist in Supabase and appear on gallery + map for all visitors.

## 6. Make yourself admin

### Option A — create-admin script (recommended)

1. Add your **service role key** to `Back End/.env`
2. Run:

```powershell
cd "Back End"
node scripts/create-admin.mjs
```

Default credentials (change after first login):

| Field | Default |
|-------|---------|
| Email | `matiheritage.admin@cityofmati.gov.ph` |
| Username | `matiadmin` |
| Password | `MatiHeritage2026!` |

Override with env vars: `ADMIN_EMAIL`, `ADMIN_PASSWORD`, `ADMIN_USERNAME`, `ADMIN_DISPLAY_NAME`.

3. Sign in at `Front End/login.html?redirect=admin.html`

### Option B — promote an existing player

After you register your first account, run in SQL Editor:

```sql
update public.profiles
set role = 'admin'
where email = 'your-email@example.com';
```

Only admins can open `admin.html` (role check) and write heritage data (RLS policies).

## 6b. Player auth + forgot password (Gmail SMTP)

**You do not download SMTP software.** Gmail SMTP is configured inside the **Supabase Dashboard** (Supabase sends the reset email for you).

### A. Enable Supabase Auth in the portal

In `Back End/supabase-config.js`:

```js
useSupabaseAuth: true,
```

New registrations and logins then use Supabase instead of browser localStorage.

### B. Configure Gmail SMTP in Supabase (one-time)

1. In Gmail, turn on **2-Step Verification** for the sending account.
2. Create a **Google App Password**: Google Account → Security → App passwords → Mail.
3. Supabase Dashboard → **Project Settings** → **Authentication** → **SMTP Settings**
4. Enable custom SMTP and enter:

| Field | Value |
|-------|--------|
| Host | `smtp.gmail.com` |
| Port | `587` |
| Username | your Gmail address |
| Password | the 16-character **App Password** (not your normal Gmail password) |
| Sender email | same Gmail address |
| Sender name | `Mati Heritage 3D` |

5. **Authentication** → **URL Configuration**
   - **Site URL**: your live portal URL (e.g. `http://127.0.0.1:5504/Front%20End/` for local testing)
   - **Redirect URLs**: add your reset page, e.g.  
     `http://127.0.0.1:5504/Front%20End/reset-password.html`

### C. Forgot-password flow (built in)

| Step | Page |
|------|------|
| Enter email | `Front End/forgot-password.html` |
| Email link opens | `Front End/reset-password.html` |
| Sign in with new password | `Front End/login.html` |

After the player saves a new password, they are signed out and redirected to **Login** to sign in with the new password.

## 7. Folder reference

| File | Role |
|------|------|
| `Back End/.env` | Server/script API keys (gitignored) |
| `Back End/supabase-config.js` | Browser API keys |
| `Back End/supabase-client.js` | Creates Supabase client |
| `Back End/supabase-api.js` | Sites, media, leaderboard, storage helpers |
| `Back End/supabase-auth.js` | Optional auth bridge (`useSupabaseAuth`) |
| `Back End/supabase/migrations/...sql` | Database schema + RLS |
| `Back End/scripts/` | Connection test & seed scripts |

## 8. Migration path (frontend → backend)

**Phase 1 (now)** — Connected, frontend still uses localStorage  
- Scripts load on `admin.html` from `../Back End/`  
- Connection tested on page load  
- No breaking changes

**Phase 2 (next)** — Wire admin saves to Supabase  
- `MatiAdminStore.saveSite` → `MatiSupabaseApi.upsertSite`  
- Uploads → Supabase Storage instead of IndexedDB  
- Seed base catalog into `heritage_sites`

**Phase 3** — Auth & leaderboard  
- Optional: set `useSupabaseAuth: true` for full Supabase Auth  
- Game points sync via `sync_heritage_points` → `leaderboard_entries` (+ `profiles` when present)  
- Admin/visitor leaderboards read live rankings (Realtime on `leaderboard_entries`)  
- Run migration `20260708140000_live_leaderboard.sql` once in SQL Editor  
- Run migration `20260708150000_realtime_heritage_catalog.sql` once for live sites/media across admin, visitors, and players  
- Shared client hub: `Front End/heritage-realtime.js`

## 9. Browser console check

Open admin, then in DevTools:

```js
await MatiSupabase.testConnection()
```

Expected: `{ ok: true, message: "Connected to Supabase." }`

## 10. Deploy for free (Netlify / Vercel / GitHub Pages)

The site is **static HTML + JS**. Supabase is already hosted in the cloud (free tier). You only need a free static host for the files.

### Folder layout on the host

Pages load config from `../Back End/`, so deploy the **whole repo** (not only `Front End/`):

```
MatiHeritage3D/
  Front End/     ← visitor portal, games, admin UI
  Back End/      ← supabase-config.js, supabase-client.js, …
```

The repo includes `netlify.toml` and `vercel.json` so `/` opens the visitor home page.

---

### Option A — Netlify (easiest, recommended)

1. Push the project to **GitHub** (do not commit `Back End/.env` or secrets).
2. Go to [https://app.netlify.com](https://app.netlify.com) → **Add new site** → **Import from Git**.
3. Select your repo. Netlify reads `netlify.toml` automatically:
   - **Publish directory:** `.` (repo root)
   - **Build command:** leave empty
4. Click **Deploy**. You get a URL like `https://random-name.netlify.app`.
5. Optional: **Domain settings** → change site name to e.g. `mati-heritage-3d.netlify.app`.

**Visitor portal:** `https://YOUR-SITE.netlify.app/Front%20End/index.html`  
(or just `https://YOUR-SITE.netlify.app/` — redirects to home)

---

### Option B — Vercel (free)

1. Push to GitHub.
2. [https://vercel.com](https://vercel.com) → **Add New Project** → import repo.
3. Vercel uses `vercel.json` — no build step needed.
4. Deploy. URL like `https://mati-heritage-3d.vercel.app`.

---

### Option C — GitHub Pages (free)

1. Repo → **Settings** → **Pages**.
2. **Source:** Deploy from branch `main`, folder **`/ (root)`**.
3. Site: `https://YOUR_USERNAME.github.io/MatiHeritage3D/Front%20End/index.html`

Add a `index.html` at repo root that redirects to `Front End/index.html` if you want a shorter entry URL.

---

### After deploy — Supabase (required for login)

In **Supabase Dashboard → Authentication → URL Configuration**:

| Setting | Example |
|---------|---------|
| **Site URL** | `https://YOUR-SITE.netlify.app/Front%20End/` |
| **Redirect URLs** | `https://YOUR-SITE.netlify.app/Front%20End/reset-password.html` |
| | `http://127.0.0.1:5504/Front%20End/reset-password.html` (keep for local testing) |

Under **Authentication → Providers → Email**, keep email auth enabled.

---

### Pre-deploy checklist

1. Run all SQL migrations in Supabase (see sections 2, 5c, 5e, and Phase 3 list in section 8).
2. `useSupabaseAuth: true` in `Back End/supabase-config.js` (already set).
3. Gmail SMTP for password reset (section 6b), if you use forgot-password.
4. Admin account: `cd "Back End"` → `npm run supabase:create-admin` (needs service role in `.env`).
5. Seed heritage data (sections 5 / 5d).
6. Test live: register → login → games → points → admin.

---

### Free tier limits (typical)

| Service | Free tier |
|---------|-----------|
| **Netlify / Vercel / GitHub Pages** | Static hosting, enough for a capstone |
| **Supabase** | 500 MB database, 50k monthly active users, 1 GB file storage |

No credit card required for basic Netlify/Vercel/Supabase free plans.
