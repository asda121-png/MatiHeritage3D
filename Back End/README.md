# Back End — Mati Heritage 3D

All database and Supabase-related code lives here.

```
Back End/
├── .env.example          # Copy to .env for Node scripts
├── package.json          # npm deps + supabase CLI scripts
├── SUPABASE_SETUP.md     # Full setup guide
├── supabase-config.js    # Browser API keys (loaded by admin.html)
├── supabase-client.js    # Supabase client bootstrap
├── supabase-api.js       # Sites, media, leaderboard, storage
├── supabase-auth.js      # Optional auth bridge
├── scripts/
│   ├── test-supabase.mjs
│   └── seed-built-heritage.mjs
└── supabase/
    └── migrations/
        └── 20250628120000_initial_schema.sql
```

## Quick start

```powershell
cd "Back End"
copy .env.example .env
# Edit .env with your Supabase keys
npm install
npm run supabase:test
npm run supabase:seed
```

From the project root you can also run:

```powershell
npm run supabase:test
npm run supabase:seed
```

See [SUPABASE_SETUP.md](./SUPABASE_SETUP.md) for the full guide.
