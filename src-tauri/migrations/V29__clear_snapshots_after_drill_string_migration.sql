-- ============================================================================
-- V29: Clear snapshot data after drill_string → drill_string_components migration
-- The old drill_string_data JSON format is incompatible with the new schema.
-- ============================================================================

DELETE FROM last_report_snapshot;
