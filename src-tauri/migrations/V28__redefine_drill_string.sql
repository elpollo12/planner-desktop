-- Drop old single-record drill_string table
DROP TABLE IF EXISTS drill_string;

-- Create new list-based drill_string_components table
CREATE TABLE IF NOT EXISTS drill_string_components (
  id TEXT PRIMARY KEY,
  report_id TEXT REFERENCES reports(id) ON DELETE CASCADE,
  entry_number INTEGER NOT NULL,
  piece_name TEXT NOT NULL,
  length REAL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE INDEX idx_drill_string_components_report_id ON drill_string_components(report_id);
CREATE INDEX idx_drill_string_components_entry ON drill_string_components(report_id, entry_number);
