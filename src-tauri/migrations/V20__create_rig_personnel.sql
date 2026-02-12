-- Tabla de personal de cuadrilla asociado a taladros
CREATE TABLE IF NOT EXISTS rig_personnel (
  id TEXT PRIMARY KEY,
  rig_id TEXT NOT NULL REFERENCES rigs(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  ci TEXT,
  default_position TEXT NOT NULL,
  active INTEGER DEFAULT 1,
  is_deleted INTEGER DEFAULT 0,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE INDEX idx_rig_personnel_rig_id ON rig_personnel(rig_id);

-- Agregar referencia a personnel en crew_members (nullable para compat con datos existentes)
ALTER TABLE crew_members ADD COLUMN personnel_id TEXT REFERENCES rig_personnel(id);
