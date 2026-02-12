-- ============================================================================
-- MÓDULO DE LOGÍSTICA
-- ============================================================================
-- Enable foreign key constraints
PRAGMA foreign_keys = ON;

-- ============================================================================
-- Table 1: logistics_water_bottles (Botellones de Agua)
-- ============================================================================
CREATE TABLE IF NOT EXISTS logistics_water_bottles (
  id TEXT PRIMARY KEY,
  -- Métricas de inventario
  full_bottles INTEGER DEFAULT 0 NOT NULL,
  empty_bottles INTEGER DEFAULT 0 NOT NULL,
  -- Metadatos
  last_updated_by TEXT REFERENCES users(id) ON DELETE SET NULL,
  notes TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

-- ============================================================================
-- Table 2: logistics_water_bottles_movements (Movimientos de Botellones)
-- ============================================================================
CREATE TABLE IF NOT EXISTS logistics_water_bottles_movements (
  id TEXT PRIMARY KEY,
  movement_type TEXT CHECK(movement_type IN ('register_full', 'register_empty', 'request')) NOT NULL,
  quantity INTEGER NOT NULL,
  notes TEXT,
  created_by TEXT REFERENCES users(id) ON DELETE SET NULL,
  created_at TEXT NOT NULL
);

CREATE INDEX idx_water_bottles_movements_date ON logistics_water_bottles_movements(created_at);
CREATE INDEX idx_water_bottles_movements_type ON logistics_water_bottles_movements(movement_type);

-- ============================================================================
-- Table 3: logistics_fuel (Combustible)
-- ============================================================================
CREATE TABLE IF NOT EXISTS logistics_fuel (
  id TEXT PRIMARY KEY,
  -- Métricas de inventario (en galones o litros según configuración)
  reserve_amount REAL DEFAULT 0 NOT NULL,
  in_use_amount REAL DEFAULT 0 NOT NULL,
  consumed_amount REAL DEFAULT 0 NOT NULL,
  -- Unit of measurement
  unit TEXT CHECK(unit IN ('gallons', 'liters')) DEFAULT 'gallons',
  -- Metadatos
  last_updated_by TEXT REFERENCES users(id) ON DELETE SET NULL,
  notes TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

-- ============================================================================
-- Table 4: logistics_fuel_movements (Movimientos de Combustible)
-- ============================================================================
CREATE TABLE IF NOT EXISTS logistics_fuel_movements (
  id TEXT PRIMARY KEY,
  movement_type TEXT CHECK(movement_type IN ('load', 'assign_to_use', 'register_consumption', 'request')) NOT NULL,
  amount REAL NOT NULL,
  unit TEXT CHECK(unit IN ('gallons', 'liters')) DEFAULT 'gallons',
  notes TEXT,
  created_by TEXT REFERENCES users(id) ON DELETE SET NULL,
  created_at TEXT NOT NULL
);

CREATE INDEX idx_fuel_movements_date ON logistics_fuel_movements(created_at);
CREATE INDEX idx_fuel_movements_type ON logistics_fuel_movements(movement_type);

-- ============================================================================
-- Table 5: logistics_water_tank (Vacuum)
-- ============================================================================
CREATE TABLE IF NOT EXISTS logistics_water_tank (
  id TEXT PRIMARY KEY,
  -- Métricas de inventario (en galones o litros)
  reserve_amount REAL DEFAULT 0 NOT NULL,
  in_use_amount REAL DEFAULT 0 NOT NULL,
  consumed_amount REAL DEFAULT 0 NOT NULL,
  -- Unit of measurement
  unit TEXT CHECK(unit IN ('gallons', 'liters')) DEFAULT 'gallons',
  -- Metadatos
  last_updated_by TEXT REFERENCES users(id) ON DELETE SET NULL,
  notes TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

-- ============================================================================
-- Table 6: logistics_water_tank_movements (Movimientos de Vacuum)
-- ============================================================================
CREATE TABLE IF NOT EXISTS logistics_water_tank_movements (
  id TEXT PRIMARY KEY,
  movement_type TEXT CHECK(movement_type IN ('refill', 'assign_to_use', 'register_consumption', 'request')) NOT NULL,
  amount REAL NOT NULL,
  unit TEXT CHECK(unit IN ('gallons', 'liters')) DEFAULT 'gallons',
  notes TEXT,
  created_by TEXT REFERENCES users(id) ON DELETE SET NULL,
  created_at TEXT NOT NULL
);

CREATE INDEX idx_water_tank_movements_date ON logistics_water_tank_movements(created_at);
CREATE INDEX idx_water_tank_movements_type ON logistics_water_tank_movements(movement_type);

-- ============================================================================
-- Table 7: logistics_consumables (Materiales/Consumibles)
-- ============================================================================
CREATE TABLE IF NOT EXISTS logistics_consumables (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  unit TEXT NOT NULL, -- ej: 'kg', 'unidades', 'cajas', 'litros'
  available_quantity REAL DEFAULT 0 NOT NULL,
  used_quantity REAL DEFAULT 0 NOT NULL,
  min_stock REAL DEFAULT 0, -- Nivel mínimo de alerta
  category TEXT, -- ej: 'herramientas', 'químicos', 'EPP', 'limpieza'
  active INTEGER DEFAULT 1,
  last_updated_by TEXT REFERENCES users(id) ON DELETE SET NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE INDEX idx_consumables_name ON logistics_consumables(name);
CREATE INDEX idx_consumables_category ON logistics_consumables(category);
CREATE INDEX idx_consumables_active ON logistics_consumables(active);

-- ============================================================================
-- Table 8: logistics_consumables_movements (Movimientos de Materiales)
-- ============================================================================
CREATE TABLE IF NOT EXISTS logistics_consumables_movements (
  id TEXT PRIMARY KEY,
  consumable_id TEXT REFERENCES logistics_consumables(id) ON DELETE CASCADE,
  movement_type TEXT CHECK(movement_type IN ('add_stock', 'register_use', 'request', 'adjustment')) NOT NULL,
  quantity REAL NOT NULL,
  notes TEXT,
  created_by TEXT REFERENCES users(id) ON DELETE SET NULL,
  created_at TEXT NOT NULL
);

CREATE INDEX idx_consumables_movements_consumable ON logistics_consumables_movements(consumable_id);
CREATE INDEX idx_consumables_movements_date ON logistics_consumables_movements(created_at);
CREATE INDEX idx_consumables_movements_type ON logistics_consumables_movements(movement_type);

-- ============================================================================
-- Table 9: logistics_requests (Solicitudes centralizadas)
-- ============================================================================
CREATE TABLE IF NOT EXISTS logistics_requests (
  id TEXT PRIMARY KEY,
  request_type TEXT CHECK(request_type IN ('water_bottles', 'fuel', 'water_tank', 'consumable')) NOT NULL,
  consumable_id TEXT REFERENCES logistics_consumables(id) ON DELETE SET NULL, -- Solo para tipo 'consumable'
  quantity REAL NOT NULL,
  unit TEXT, -- Para contexto de la cantidad
  description TEXT,
  priority TEXT CHECK(priority IN ('low', 'medium', 'high', 'urgent')) DEFAULT 'medium',
  status TEXT CHECK(status IN ('pending', 'approved', 'rejected', 'completed', 'cancelled')) DEFAULT 'pending',
  requested_by TEXT REFERENCES users(id) ON DELETE SET NULL,
  approved_by TEXT REFERENCES users(id) ON DELETE SET NULL,
  completed_by TEXT REFERENCES users(id) ON DELETE SET NULL,
  rejection_reason TEXT,
  requested_at TEXT NOT NULL,
  approved_at TEXT,
  completed_at TEXT,
  rejected_at TEXT,
  cancelled_at TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE INDEX idx_logistics_requests_type ON logistics_requests(request_type);
CREATE INDEX idx_logistics_requests_status ON logistics_requests(status);
CREATE INDEX idx_logistics_requests_requested_by ON logistics_requests(requested_by);
CREATE INDEX idx_logistics_requests_date ON logistics_requests(requested_at);

-- ============================================================================
-- Inicialización de registros base (uno por tipo de recurso)
-- ============================================================================
INSERT INTO logistics_water_bottles (id, full_bottles, empty_bottles, created_at, updated_at)
VALUES ('default', 0, 0, datetime('now'), datetime('now'));

INSERT INTO logistics_fuel (id, reserve_amount, in_use_amount, consumed_amount, unit, created_at, updated_at)
VALUES ('default', 0, 0, 0, 'gallons', datetime('now'), datetime('now'));

INSERT INTO logistics_water_tank (id, reserve_amount, in_use_amount, consumed_amount, unit, created_at, updated_at)
VALUES ('default', 0, 0, 0, 'gallons', datetime('now'), datetime('now'));
