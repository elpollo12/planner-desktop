-- ============================================================================
-- MÓDULO DE LOGÍSTICA (REDEFINIDO)
-- ============================================================================
PRAGMA foreign_keys = ON;

-- ============================================================================
-- LIMPIAR TABLAS ANTERIORES
-- ============================================================================
DROP TABLE IF EXISTS logistics_consumables_movements;
DROP TABLE IF EXISTS logistics_consumables;
DROP TABLE IF EXISTS logistics_requests;
DROP TABLE IF EXISTS logistics_water_tank_movements;
DROP TABLE IF EXISTS logistics_water_tank;
DROP TABLE IF EXISTS logistics_fuel_movements;
DROP TABLE IF EXISTS logistics_fuel;
DROP TABLE IF EXISTS logistics_water_bottles_movements;
DROP TABLE IF EXISTS logistics_water_bottles;

-- ============================================================================
-- Table 1: logistics_water_bottles_movements (Botellones de Agua)
-- Solo movimientos: fecha/hora + cantidad + tipo (entrada/salida)
-- ============================================================================
CREATE TABLE IF NOT EXISTS logistics_water_bottles_movements (
  id TEXT PRIMARY KEY,
  movement_type TEXT CHECK(movement_type IN ('entry', 'exit')) NOT NULL,
  quantity INTEGER NOT NULL CHECK(quantity > 0),
  notes TEXT,
  created_by TEXT REFERENCES users(id) ON DELETE SET NULL,
  created_at TEXT NOT NULL
);

CREATE INDEX idx_water_bottles_mov_date ON logistics_water_bottles_movements(created_at);
CREATE INDEX idx_water_bottles_mov_type ON logistics_water_bottles_movements(movement_type);

-- ============================================================================
-- Table 2: logistics_fuel_movements (Combustible)
-- Solo movimientos: fecha/hora + cantidad en litros + tipo (entrada/salida)
-- ============================================================================
CREATE TABLE IF NOT EXISTS logistics_fuel_movements (
  id TEXT PRIMARY KEY,
  movement_type TEXT CHECK(movement_type IN ('entry', 'exit')) NOT NULL,
  amount REAL NOT NULL CHECK(amount > 0),
  notes TEXT,
  created_by TEXT REFERENCES users(id) ON DELETE SET NULL,
  created_at TEXT NOT NULL
);

CREATE INDEX idx_fuel_mov_date ON logistics_fuel_movements(created_at);
CREATE INDEX idx_fuel_mov_type ON logistics_fuel_movements(movement_type);

-- ============================================================================
-- Table 3: logistics_vacuum_actions (Vacuum/Cisterna)
-- CRUD de acciones: nombre de la acción + fecha/hora
-- ============================================================================
CREATE TABLE IF NOT EXISTS logistics_vacuum_actions (
  id TEXT PRIMARY KEY,
  action_name TEXT NOT NULL,
  notes TEXT,
  created_by TEXT REFERENCES users(id) ON DELETE SET NULL,
  created_at TEXT NOT NULL
);

CREATE INDEX idx_vacuum_actions_date ON logistics_vacuum_actions(created_at);

-- ============================================================================
-- Table 4: logistics_materials (Catálogo de Materiales)
-- CRUD de materiales concretos
-- ============================================================================
CREATE TABLE IF NOT EXISTS logistics_materials (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  unit TEXT NOT NULL,        -- ej: 'kg', 'unidades', 'cajas', 'litros', 'metros'
  description TEXT,
  active INTEGER DEFAULT 1,
  created_by TEXT REFERENCES users(id) ON DELETE SET NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE INDEX idx_materials_name ON logistics_materials(name);
CREATE INDEX idx_materials_active ON logistics_materials(active);

-- ============================================================================
-- Table 5: logistics_materials_movements (Movimientos de Materiales)
-- Fecha/hora + cantidad + tipo (entrada/salida) + referencia al material
-- ============================================================================
CREATE TABLE IF NOT EXISTS logistics_materials_movements (
  id TEXT PRIMARY KEY,
  material_id TEXT NOT NULL REFERENCES logistics_materials(id) ON DELETE CASCADE,
  movement_type TEXT CHECK(movement_type IN ('entry', 'exit')) NOT NULL,
  quantity REAL NOT NULL CHECK(quantity > 0),
  notes TEXT,
  created_by TEXT REFERENCES users(id) ON DELETE SET NULL,
  created_at TEXT NOT NULL
);

CREATE INDEX idx_materials_mov_material ON logistics_materials_movements(material_id);
CREATE INDEX idx_materials_mov_date ON logistics_materials_movements(created_at);
CREATE INDEX idx_materials_mov_type ON logistics_materials_movements(movement_type);

-- ============================================================================
-- Table 6: logistics_requests (Solicitudes)
-- Fecha/hora + estado + tipo + cantidad/accion/material + usuario
-- ============================================================================
CREATE TABLE IF NOT EXISTS logistics_requests (
  id TEXT PRIMARY KEY,
  request_type TEXT CHECK(request_type IN ('water_bottles', 'fuel', 'material', 'vacuum')) NOT NULL,

  -- Según el tipo de petición se usa uno de estos campos:
  quantity REAL,                -- Para water_bottles (entero), fuel (litros), material (unidades)
  action_requested TEXT,        -- Para vacuum (nombre de la acción solicitada)
  material_id TEXT REFERENCES logistics_materials(id) ON DELETE SET NULL, -- Solo para tipo 'material'

  status TEXT CHECK(status IN ('requested', 'pending', 'approved', 'rejected')) DEFAULT 'requested' NOT NULL,
  notes TEXT,

  requested_by TEXT REFERENCES users(id) ON DELETE SET NULL,
  status_changed_by TEXT REFERENCES users(id) ON DELETE SET NULL,

  requested_at TEXT NOT NULL,
  status_changed_at TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE INDEX idx_requests_type ON logistics_requests(request_type);
CREATE INDEX idx_requests_status ON logistics_requests(status);
CREATE INDEX idx_requests_requested_by ON logistics_requests(requested_by);
CREATE INDEX idx_requests_date ON logistics_requests(requested_at);
