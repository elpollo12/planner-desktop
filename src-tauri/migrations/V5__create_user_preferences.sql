-- User appearance preferences (per-user)
CREATE TABLE IF NOT EXISTS user_preferences (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
    primary_color TEXT DEFAULT '#1e3a5f',
    secondary_color TEXT DEFAULT '#f97316',
    theme_mode TEXT CHECK(theme_mode IN ('light', 'dark')) DEFAULT 'light',
    logo_path TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
);

CREATE INDEX idx_user_preferences_user_id ON user_preferences(user_id);
