-- ============================================================================
-- Table: areas
-- ============================================================================
CREATE TABLE IF NOT EXISTS areas (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  country TEXT NOT NULL,
  state TEXT NOT NULL,
  active INTEGER DEFAULT 1,
  created_by TEXT,
  updated_by TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE INDEX idx_areas_name ON areas(name);
CREATE INDEX idx_areas_country ON areas(country);
CREATE INDEX idx_areas_active ON areas(active);

-- ============================================================================
-- Table: rigs (Taladros)
-- ============================================================================
CREATE TABLE IF NOT EXISTS rigs (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  operator TEXT NOT NULL,
  power TEXT NOT NULL,              -- Potencia
  area_id TEXT REFERENCES areas(id) ON DELETE SET NULL,
  active INTEGER DEFAULT 1,
  created_by TEXT,
  updated_by TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE INDEX idx_rigs_name ON rigs(name);
CREATE INDEX idx_rigs_operator ON rigs(operator);
CREATE INDEX idx_rigs_area_id ON rigs(area_id);
CREATE INDEX idx_rigs_active ON rigs(active);
