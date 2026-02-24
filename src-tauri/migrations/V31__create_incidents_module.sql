-- ============================================================================
-- MÓDULO DE INCIDENCIAS
-- ============================================================================
PRAGMA foreign_keys = ON;

-- ============================================================================
-- Table 1: incidents (Incidencias)
-- ============================================================================
CREATE TABLE IF NOT EXISTS incidents (
  id TEXT PRIMARY KEY,
  rig_id TEXT NOT NULL REFERENCES rigs(id) ON DELETE CASCADE,
  incident_type TEXT NOT NULL CHECK(incident_type IN (
    'safety', 'mechanical', 'operational', 'environmental', 'hse', 'other'
  )),
  description TEXT NOT NULL,
  created_by TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  is_deleted INTEGER DEFAULT 0
);

CREATE INDEX idx_incidents_rig ON incidents(rig_id);
CREATE INDEX idx_incidents_type ON incidents(incident_type);
CREATE INDEX idx_incidents_created_by ON incidents(created_by);
CREATE INDEX idx_incidents_created_at ON incidents(created_at);
CREATE INDEX idx_incidents_deleted ON incidents(is_deleted);

-- ============================================================================
-- Table 2: incident_personnel (Personal involucrado en la incidencia)
-- ============================================================================
CREATE TABLE IF NOT EXISTS incident_personnel (
  id TEXT PRIMARY KEY,
  incident_id TEXT NOT NULL REFERENCES incidents(id) ON DELETE CASCADE,
  personnel_id TEXT NOT NULL REFERENCES rig_personnel(id) ON DELETE CASCADE,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE INDEX idx_incident_personnel_incident ON incident_personnel(incident_id);
CREATE INDEX idx_incident_personnel_person ON incident_personnel(personnel_id);
