-- ============================================================================
-- TABLA DE TIPOS DE INCIDENCIA (administrable)
-- ============================================================================
PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS incident_types (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  color TEXT NOT NULL DEFAULT 'gray',
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_by TEXT REFERENCES users(id) ON DELETE SET NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  is_deleted INTEGER NOT NULL DEFAULT 0
);

CREATE INDEX idx_incident_types_deleted ON incident_types(is_deleted);

-- Seed con los tipos iniciales
INSERT INTO incident_types (id, name, color, sort_order, created_at, updated_at) VALUES
  ('type_safety',        'Seguridad',    'red',    1, datetime('now'), datetime('now')),
  ('type_mechanical',    'Mecánica',     'orange', 2, datetime('now'), datetime('now')),
  ('type_operational',   'Operacional',  'blue',   3, datetime('now'), datetime('now')),
  ('type_environmental', 'Ambiental',    'green',  4, datetime('now'), datetime('now')),
  ('type_hse',           'HSE',          'purple', 5, datetime('now'), datetime('now')),
  ('type_other',         'Otro',         'gray',   6, datetime('now'), datetime('now'));

-- Recrear la tabla incidents SIN el CHECK constraint en incident_type
-- para permitir tipos dinámicos de la tabla incident_types.
-- SQLite no soporta ALTER COLUMN, así que hacemos la reconstrucción completa.

CREATE TABLE IF NOT EXISTS incidents_new (
  id TEXT PRIMARY KEY,
  rig_id TEXT NOT NULL REFERENCES rigs(id) ON DELETE CASCADE,
  incident_type TEXT NOT NULL,
  description TEXT NOT NULL,
  created_by TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  is_deleted INTEGER DEFAULT 0
);

INSERT INTO incidents_new SELECT * FROM incidents;

DROP TABLE incidents;

ALTER TABLE incidents_new RENAME TO incidents;

CREATE INDEX idx_incidents_rig ON incidents(rig_id);
CREATE INDEX idx_incidents_type ON incidents(incident_type);
CREATE INDEX idx_incidents_created_by ON incidents(created_by);
CREATE INDEX idx_incidents_created_at ON incidents(created_at);
CREATE INDEX idx_incidents_deleted ON incidents(is_deleted);
