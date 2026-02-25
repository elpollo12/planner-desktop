-- ============================================================================
-- V38: Add 'permissions' to notifications category CHECK constraint
-- SQLite does not support ALTER COLUMN, so we recreate the table.
-- ============================================================================

-- Step 1: Create new table with updated constraint
CREATE TABLE notifications_new (
    id              TEXT PRIMARY KEY,
    recipient_id    TEXT NOT NULL,
    actor_id        TEXT NOT NULL,
    actor_name      TEXT NOT NULL,
    category        TEXT NOT NULL CHECK (category IN ('logistics', 'incident', 'report', 'permissions')),
    action_type     TEXT NOT NULL,
    title           TEXT NOT NULL,
    message         TEXT NOT NULL,
    reference_id    TEXT,
    reference_type  TEXT CHECK (reference_type IN ('logistics_request', 'incident', 'report') OR reference_type IS NULL),
    rig_id          TEXT,
    rig_name        TEXT,
    is_read         INTEGER NOT NULL DEFAULT 0,
    read_at         TEXT,
    created_at      TEXT NOT NULL,
    updated_at      TEXT NOT NULL,
    is_deleted      INTEGER NOT NULL DEFAULT 0,

    FOREIGN KEY (recipient_id) REFERENCES users(id),
    FOREIGN KEY (actor_id) REFERENCES users(id)
);

-- Step 2: Copy existing data
INSERT INTO notifications_new SELECT * FROM notifications;

-- Step 3: Swap tables
DROP TABLE notifications;
ALTER TABLE notifications_new RENAME TO notifications;

-- Step 4: Recreate indexes
CREATE INDEX IF NOT EXISTS idx_notifications_recipient ON notifications(recipient_id, is_read, is_deleted);
CREATE INDEX IF NOT EXISTS idx_notifications_created ON notifications(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_category ON notifications(category, recipient_id);
