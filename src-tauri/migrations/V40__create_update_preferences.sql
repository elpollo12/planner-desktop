-- Update preferences table for auto-updates
-- Stores per-user update settings

CREATE TABLE IF NOT EXISTS update_preferences (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL UNIQUE,
    auto_update INTEGER NOT NULL DEFAULT 0,
    channel TEXT NOT NULL DEFAULT 'stable',
    check_interval_hours INTEGER NOT NULL DEFAULT 24,
    last_check_at TEXT,
    postponed_version TEXT,
    postpone_count INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_update_prefs_user ON update_preferences(user_id);
