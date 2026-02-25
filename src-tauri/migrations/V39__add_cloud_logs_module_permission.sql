-- ============================================================================
-- V39: Add 'cloud-logs' to module permissions CHECK constraint
-- ============================================================================

-- 1. Backup existing data
CREATE TABLE IF NOT EXISTS _user_module_permissions_v39_backup AS
    SELECT * FROM user_module_permissions;

-- 2. Drop indexes and table
DROP INDEX IF EXISTS idx_user_module_perms_user;
DROP INDEX IF EXISTS idx_user_module_perms_module;
DROP TABLE IF EXISTS user_module_permissions;

-- 3. Recreate with 'cloud-logs' added to CHECK
CREATE TABLE user_module_permissions (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    module TEXT NOT NULL CHECK(module IN (
        'dashboard', 'reports', 'approvals',
        'logistics', 'incidents', 'admin',
        'cloud-logs'
    )),
    granted INTEGER NOT NULL DEFAULT 1,
    assigned_by TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    UNIQUE(user_id, module)
);

CREATE INDEX idx_user_module_perms_user ON user_module_permissions(user_id);
CREATE INDEX idx_user_module_perms_module ON user_module_permissions(module);

-- 4. Restore existing data
INSERT OR IGNORE INTO user_module_permissions
    SELECT * FROM _user_module_permissions_v39_backup;

-- 5. Cleanup
DROP TABLE IF EXISTS _user_module_permissions_v39_backup;
