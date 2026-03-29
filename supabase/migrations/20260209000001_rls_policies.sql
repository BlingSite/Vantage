-- Run this in Supabase SQL Editor if you get "row-level security policy" errors.
-- This allows anonymous (anon key) access when not using Supabase Auth.

-- Watchlists
DROP POLICY IF EXISTS "Allow anonymous watchlists" ON watchlists;
CREATE POLICY "Allow anonymous watchlists" ON watchlists FOR ALL USING (true) WITH CHECK (true);

-- Stocks
DROP POLICY IF EXISTS "Allow anonymous stocks" ON stocks;
CREATE POLICY "Allow anonymous stocks" ON stocks FOR ALL USING (true) WITH CHECK (true);

-- Watchlist Items (junction table)
DROP POLICY IF EXISTS "Allow anonymous watchlist_items" ON watchlist_items;
CREATE POLICY "Allow anonymous watchlist_items" ON watchlist_items FOR ALL USING (true) WITH CHECK (true);

-- Alerts
DROP POLICY IF EXISTS "Allow anonymous alerts" ON alerts;
CREATE POLICY "Allow anonymous alerts" ON alerts FOR ALL USING (true) WITH CHECK (true);
