-- ============================================================================
-- User Module Permissions (granular access overrides)
-- ============================================================================
-- Each row is an OVERRIDE of the role's default access for a specific module.
-- If no row exists for (user_id, module), the role's default applies.
-- Admin users always have full access regardless of this table.
--
-- Module hierarchy:
--   reports            = list + view reports
--     reports_create   = create new reports (implies reports list/view)
--     reports_edit     = edit existing reports (implies reports list/view)
--   approvals          = approvals section access
--     approvals_pending  = view/manage pending approvals
--     approvals_history  = view approval history
--
-- Note: Having any child permission implies access to ReportView.

CREATE TABLE IF NOT EXISTS user_module_permissions (
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
