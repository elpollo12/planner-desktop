-- Add is_deleted column to all management tables for soft delete support
-- This prevents sync from restoring records that were deleted from the UI

ALTER TABLE users ADD COLUMN is_deleted INTEGER DEFAULT 0;
ALTER TABLE areas ADD COLUMN is_deleted INTEGER DEFAULT 0;
ALTER TABLE rigs ADD COLUMN is_deleted INTEGER DEFAULT 0;
ALTER TABLE operators ADD COLUMN is_deleted INTEGER DEFAULT 0;
ALTER TABLE operation_codes ADD COLUMN is_deleted INTEGER DEFAULT 0;
