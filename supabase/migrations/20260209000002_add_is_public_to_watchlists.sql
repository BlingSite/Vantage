-- Add the is_public column to watchlists if it doesn't already exist.
-- This column was defined in the initial schema migration but may not have been
-- applied if the table already existed (CREATE TABLE IF NOT EXISTS skips silently).

ALTER TABLE watchlists ADD COLUMN IF NOT EXISTS is_public BOOLEAN DEFAULT FALSE;
