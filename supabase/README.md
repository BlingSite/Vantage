# Supabase Setup

## 1. Configure environment

Copy your project URL and anon key from [Supabase Dashboard](https://supabase.com/dashboard) → Project Settings → API, then add to `.env.local`:

```
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

## 2. Create tables (if needed)

If your database doesn't have the required tables yet, run the SQL in `migrations/20260209000000_initial_schema.sql` in the Supabase SQL Editor.

Tables used:

- **api_keys** – Dashboard API keys
- **watchlists** – User watchlists
- **watchlist_stocks** – Stocks in each watchlist
- **alerts** – Price alerts

## 3. Fix RLS errors (if you see "row-level security policy" errors)

If you get errors like `new row violates row-level security policy`, run `migrations/20260209000001_rls_policies.sql` in the Supabase SQL Editor. This adds policies so the anon key can read/write without Supabase Auth.
