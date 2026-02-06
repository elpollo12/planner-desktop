-- User-Rig assignments (junction table)
-- Stores which rigs each user has access to

CREATE TABLE IF NOT EXISTS user_rigs (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    rig_id TEXT NOT NULL REFERENCES rigs(id) ON DELETE CASCADE,
    assigned_by TEXT REFERENCES users(id),
    assigned_at TEXT NOT NULL,
    UNIQUE(user_id, rig_id)
);

CREATE INDEX idx_user_rigs_user_id ON user_rigs(user_id);
CREATE INDEX idx_user_rigs_rig_id ON user_rigs(rig_id);

-- Add has_all_rigs flag to users table
ALTER TABLE users ADD COLUMN has_all_rigs INTEGER DEFAULT 0;
