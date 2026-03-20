-- Prevent duplicate report_number per rig (multi-device safety).
-- Soft-deleted reports are excluded so numbers can be reused after purge.
CREATE UNIQUE INDEX IF NOT EXISTS idx_fluid_reports_rig_number
  ON fluid_reports(rig_id, report_number)
  WHERE is_deleted = 0;
