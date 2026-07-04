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

## 6. Make yourself admin

After you register your first account (once auth is on Supabase), run in SQL Editor:

```sql
update public.profiles
set role = 'admin'
where email = 'your-email@example.com';
```

Only admins can create/update heritage sites and upload files (RLS policies).

## 6. Folder reference

| File | Role |
|------|------|
| `Back End/.env` | Server/script API keys (gitignored) |
| `Back End/supabase-config.js` | Browser API keys |
| `Back End/supabase-client.js` | Creates Supabase client |
| `Back End/supabase-api.js` | Sites, media, leaderboard, storage helpers |
| `Back End/supabase-auth.js` | Optional auth bridge (`useSupabaseAuth`) |
| `Back End/supabase/migrations/...sql` | Database schema + RLS |
| `Back End/scripts/` | Connection test & seed scripts |

## 7. Migration path (frontend → backend)

**Phase 1 (now)** — Connected, frontend still uses localStorage  
- Scripts load on `admin.html` from `../Back End/`  
- Connection tested on page load  
- No breaking changes

**Phase 2 (next)** — Wire admin saves to Supabase  
- `MatiAdminStore.saveSite` → `MatiSupabaseApi.upsertSite`  
- Uploads → Supabase Storage instead of IndexedDB  
- Seed base catalog into `heritage_sites`

**Phase 3** — Auth & leaderboard  
- Set `useSupabaseAuth: true`  
- Game points → `profiles.heritage_points`  
- Leaderboard reads from Supabase

## 8. Browser console check

Open admin, then in DevTools:

```js
await MatiSupabase.testConnection()
```

Expected: `{ ok: true, message: "Connected to Supabase." }`
