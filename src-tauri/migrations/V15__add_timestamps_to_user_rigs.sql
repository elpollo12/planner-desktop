-- Add timestamp columns to user_rigs for sync support
ALTER TABLE user_rigs ADD COLUMN created_at TEXT;
ALTER TABLE user_rigs ADD COLUMN updated_at TEXT;

-- Set default values for existing records
UPDATE user_rigs
SET created_at = COALESCE(assigned_at, datetime('now')),
    updated_at = COALESCE(assigned_at, datetime('now'))
WHERE created_at IS NULL;
