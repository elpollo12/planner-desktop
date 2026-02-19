-- ============================================================================
-- Table: last_report_snapshot
-- Stores a JSON snapshot of the last saved/submitted report per rig.
-- Used to pre-fill new reports instantly (1 query instead of 10+).
-- ============================================================================

CREATE TABLE IF NOT EXISTS last_report_snapshot (
  id TEXT PRIMARY KEY,
  rig_id TEXT NOT NULL REFERENCES rigs(id) ON DELETE CASCADE,

  -- Header fields (copied from the source report)
  report_number INTEGER NOT NULL,
  well_number TEXT,
  api_number TEXT,
  contract TEXT,
  contractor TEXT,
  operator TEXT,
  field_district TEXT,
  municipality TEXT,
  rig_number TEXT,
  company TEXT,
  supervisor_24h TEXT,

  -- Sections serialized as JSON
  crew_data TEXT,
  time_distribution_data TEXT,
  bit_records_data TEXT,
  mud_records_data TEXT,
  mud_additives_data TEXT,
  drilling_params_data TEXT,
  deviation_data TEXT,
  operations_log_data TEXT,
  drill_string_data TEXT,

  -- Metadata
  source_report_id TEXT REFERENCES reports(id) ON DELETE SET NULL,
  updated_by TEXT REFERENCES users(id) ON DELETE SET NULL,
  updated_at TEXT NOT NULL,

  UNIQUE(rig_id)
);

CREATE INDEX idx_last_report_snapshot_rig_id ON last_report_snapshot(rig_id);
