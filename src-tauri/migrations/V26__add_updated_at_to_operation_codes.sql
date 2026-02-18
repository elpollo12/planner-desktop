-- Add updated_at to operation_codes so incremental sync can detect edits
ALTER TABLE operation_codes ADD COLUMN updated_at TEXT;

-- Backfill: set updated_at = created_at for existing rows
UPDATE operation_codes SET updated_at = created_at WHERE updated_at IS NULL;
