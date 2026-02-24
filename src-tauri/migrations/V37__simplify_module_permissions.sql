-- ============================================================================
-- V37: Simplify module permissions — remove sub-modules
-- ============================================================================
-- Revert to 6 simple modules: dashboard, reports, approvals, logistics,
-- incidents, admin. Sub-module rows (reports_create, reports_edit,
-- approvals_pending, approvals_history) are dropped.

-- 1. Backup
CREATE TABLE IF NOT EXISTS _user_module_permissions_backup AS
    SELECT * FROM user_module_permissions;

-- 2. Drop
DROP INDEX IF EXISTS idx_user_module_perms_user;
DROP INDEX IF EXISTS idx_user_module_perms_module;
DROP TABLE IF EXISTS user_module_permissions;

-- 3. Recreate with simplified CHECK
CREATE TABLE user_module_permissions (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    module TEXT NOT NULL CHECK(module IN (
        'dashboard', 'reports', 'approvals',
        'logistics', 'incidents', 'admin'
    )),
    granted INTEGER NOT NULL DEFAULT 1,
    assigned_by TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    UNIQUE(user_id, module)
);

CREATE INDEX idx_user_module_perms_user ON user_module_permissions(user_id);
CREATE INDEX idx_user_module_perms_module ON user_module_permissions(module);

-- 4. Restore only valid simple modules
INSERT OR IGNORE INTO user_module_permissions
    SELECT * FROM _user_module_permissions_backup
    WHERE module IN (
        'dashboard', 'reports', 'approvals',
        'logistics', 'incidents', 'admin'
    );

-- 5. Cleanup
DROP TABLE IF EXISTS _user_module_permissions_backup;
