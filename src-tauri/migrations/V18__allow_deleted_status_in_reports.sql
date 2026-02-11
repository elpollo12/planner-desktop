-- Add soft delete column to reports
-- Using a separate column avoids modifying the CHECK constraint on status
ALTER TABLE reports ADD COLUMN is_deleted INTEGER DEFAULT 0;
