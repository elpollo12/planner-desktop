-- V57: Add updated_at to fluid_report_changelog for future sync compatibility.
-- Changelog is append-only, but the sync engine needs updated_at or created_at
-- for incremental push. Adding updated_at = created_at keeps the pattern consistent.

ALTER TABLE fluid_report_changelog ADD COLUMN updated_at TEXT;
UPDATE fluid_report_changelog SET updated_at = created_at WHERE updated_at IS NULL;
