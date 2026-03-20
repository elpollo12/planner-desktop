-- ============================================================================
-- V36: Rebuild user_module_permissions with expanded CHECK constraint
-- ============================================================================
-- SQLite does not support ALTER TABLE ... ALTER CONSTRAINT, so we must
-- recreate the table to update the CHECK constraint with new modules:
--   approvals_pending, approvals_history

-- 1. Copy existing data to temp table
CREATE TABLE IF NOT EXISTS _user_module_permissions_backup AS
    SELECT * FROM user_module_permissions;

-- 2. Drop old table + indexes
DROP INDEX IF EXISTS idx_user_module_perms_user;
DROP INDEX IF EXISTS idx_user_module_perms_module;
DROP TABLE IF EXISTS user_module_permissions;

-- 3. Recreate with expanded CHECK constraint
CREATE TABLE user_module_permissions (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    module TEXT NOT NULL CHECK(module IN (
        'dashboard',
        'reports', 'reports_create', 'reports_edit',
        'approvals', 'approvals_pending', 'approvals_history',
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

-- 4. Restore valid data from backup (skip rows with modules not in new CHECK)
INSERT OR IGNORE INTO user_module_permissions
    SELECT * FROM _user_module_permissions_backup
    WHERE module IN (
        'dashboard',
        'reports', 'reports_create', 'reports_edit',
        'approvals', 'approvals_pending', 'approvals_history',
        'logistics', 'incidents', 'admin'
    );

-- 5. Drop backup
DROP TABLE IF EXISTS _user_module_permissions_backup;
