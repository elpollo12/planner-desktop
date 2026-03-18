-- ============================================================================
-- V56: Changelog / edit history for fluid reports (API Reports)
-- Tracks each save operation with a diff of what changed + optional user note.
-- ============================================================================

CREATE TABLE fluid_report_changelog (
    id                  TEXT PRIMARY KEY,
    fluid_report_id     TEXT NOT NULL REFERENCES fluid_reports(id) ON DELETE CASCADE,
    tab                 TEXT NOT NULL CHECK(tab IN ('tab1', 'tab2', 'tab3', 'create')),
    changed_by          TEXT NOT NULL REFERENCES users(id),
    changed_at          TEXT NOT NULL,
    note                TEXT,
    changes_json        TEXT NOT NULL,
    created_at          TEXT NOT NULL
);

CREATE INDEX idx_fluid_changelog_report ON fluid_report_changelog(fluid_report_id);
CREATE INDEX idx_fluid_changelog_date   ON fluid_report_changelog(changed_at);
