-- ============================================================================
-- V33: Create notifications module
-- ============================================================================

CREATE TABLE IF NOT EXISTS notifications (
    id              TEXT PRIMARY KEY,
    -- Recipient (who should see this notification)
    recipient_id    TEXT NOT NULL,
    -- Actor (who triggered the action)
    actor_id        TEXT NOT NULL,
    actor_name      TEXT NOT NULL,
    -- Classification
    category        TEXT NOT NULL CHECK (category IN ('logistics', 'incident', 'report')),
    action_type     TEXT NOT NULL,
    -- Content
    title           TEXT NOT NULL,
    message         TEXT NOT NULL,
    -- References to the source resource
    reference_id    TEXT,
    reference_type  TEXT CHECK (reference_type IN ('logistics_request', 'incident', 'report') OR reference_type IS NULL),
    rig_id          TEXT,
    rig_name        TEXT,
    -- State
    is_read         INTEGER NOT NULL DEFAULT 0,
    read_at         TEXT,
    -- Timestamps & sync
    created_at      TEXT NOT NULL,
    updated_at      TEXT NOT NULL,
    is_deleted      INTEGER NOT NULL DEFAULT 0,

    FOREIGN KEY (recipient_id) REFERENCES users(id),
    FOREIGN KEY (actor_id) REFERENCES users(id)
);

-- Fast lookup: unread notifications for a user
CREATE INDEX IF NOT EXISTS idx_notifications_recipient ON notifications(recipient_id, is_read, is_deleted);
-- Ordering by creation date
CREATE INDEX IF NOT EXISTS idx_notifications_created ON notifications(created_at DESC);
-- Filter by category
CREATE INDEX IF NOT EXISTS idx_notifications_category ON notifications(category, recipient_id);
