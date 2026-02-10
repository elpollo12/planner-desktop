-- Simplify user_preferences to only store individual theme mode
-- Colors and logo are now in app_settings (company-wide)

-- SQLite doesn't support DROP COLUMN directly, so we need to:
-- 1. Disable foreign keys temporarily
-- 2. Create new table with only theme_mode
-- 3. Copy data
-- 4. Drop old table
-- 5. Rename new table
-- 6. Re-enable foreign keys

PRAGMA foreign_keys=OFF;

CREATE TABLE user_preferences_new (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL UNIQUE,
    theme_mode TEXT NOT NULL DEFAULT 'light' CHECK(theme_mode IN ('light', 'dark')),
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Copy existing theme preferences (if table exists and has data)
INSERT INTO user_preferences_new (id, user_id, theme_mode, created_at, updated_at)
SELECT id, user_id, COALESCE(theme_mode, 'light'), created_at, updated_at
FROM user_preferences
WHERE user_id IS NOT NULL;

-- Drop old table
DROP TABLE user_preferences;

-- Rename new table
ALTER TABLE user_preferences_new RENAME TO user_preferences;

-- Recreate index
CREATE INDEX idx_user_preferences_user_id ON user_preferences(user_id);

PRAGMA foreign_keys=ON;
