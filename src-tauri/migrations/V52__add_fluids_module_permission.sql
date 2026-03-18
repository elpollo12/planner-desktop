-- ============================================================================
-- V52: Añadir módulo 'fluids' al CHECK constraint de user_module_permissions
-- Mismo patrón que V39 (cloud-logs) y V37 (simplify).
-- ============================================================================

-- 1. Backup
CREATE TABLE IF NOT EXISTS _user_module_permissions_v52_backup AS
    SELECT * FROM user_module_permissions;

-- 2. Drop índices y tabla
DROP INDEX IF EXISTS idx_user_module_perms_user;
DROP INDEX IF EXISTS idx_user_module_perms_module;
DROP TABLE IF EXISTS user_module_permissions;

-- 3. Recrear con 'fluids' añadido al CHECK
CREATE TABLE user_module_permissions (
    id          TEXT PRIMARY KEY,
    user_id     TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    module      TEXT NOT NULL CHECK(module IN (
                    'dashboard', 'reports', 'approvals',
                    'logistics', 'incidents', 'admin',
                    'cloud-logs', 'fluids'
                )),
    granted     INTEGER NOT NULL DEFAULT 1,
    assigned_by TEXT,
    created_at  TEXT NOT NULL,
    updated_at  TEXT NOT NULL,
    UNIQUE(user_id, module)
);

CREATE INDEX idx_user_module_perms_user   ON user_module_permissions(user_id);
CREATE INDEX idx_user_module_perms_module ON user_module_permissions(module);

-- 4. Restaurar datos existentes
INSERT OR IGNORE INTO user_module_permissions
    SELECT * FROM _user_module_permissions_v52_backup;

-- 5. Cleanup
DROP TABLE IF EXISTS _user_module_permissions_v52_backup;
