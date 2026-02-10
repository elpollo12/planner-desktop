-- Add company column to reports table (if it doesn't exist)
-- SQLite 3.35.0+ supports IF NOT EXISTS
ALTER TABLE reports ADD COLUMN IF NOT EXISTS company TEXT;
