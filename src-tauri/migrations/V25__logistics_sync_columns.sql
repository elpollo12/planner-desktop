-- ============================================================================
-- V25: ADD SYNC COLUMNS TO LOGISTICS TABLES
-- ============================================================================
-- Adds `updated_at` (where missing) and `is_deleted` to all logistics tables
-- so they can participate in the bidirectional Turso sync engine.
--
-- `logistics_stock` is a derived cache and is NOT synced — it will be
-- recalculated after each pull.
-- ============================================================================

-- ============================================================================
-- 1. logistics_water_bottles_movements  (needs updated_at + is_deleted)
-- ============================================================================
ALTER TABLE logistics_water_bottles_movements ADD COLUMN updated_at TEXT;
ALTER TABLE logistics_water_bottles_movements ADD COLUMN is_deleted INTEGER DEFAULT 0;

-- Seed updated_at from created_at for existing rows
UPDATE logistics_water_bottles_movements SET updated_at = created_at WHERE updated_at IS NULL;

-- ============================================================================
-- 2. logistics_fuel_movements  (needs updated_at + is_deleted)
-- ============================================================================
ALTER TABLE logistics_fuel_movements ADD COLUMN updated_at TEXT;
ALTER TABLE logistics_fuel_movements ADD COLUMN is_deleted INTEGER DEFAULT 0;

UPDATE logistics_fuel_movements SET updated_at = created_at WHERE updated_at IS NULL;

-- ============================================================================
-- 3. logistics_vacuum_actions  (needs updated_at + is_deleted)
-- ============================================================================
ALTER TABLE logistics_vacuum_actions ADD COLUMN updated_at TEXT;
ALTER TABLE logistics_vacuum_actions ADD COLUMN is_deleted INTEGER DEFAULT 0;

UPDATE logistics_vacuum_actions SET updated_at = created_at WHERE updated_at IS NULL;

-- ============================================================================
-- 4. logistics_materials  (already has updated_at, needs is_deleted)
-- ============================================================================
ALTER TABLE logistics_materials ADD COLUMN is_deleted INTEGER DEFAULT 0;

-- ============================================================================
-- 5. logistics_materials_movements  (needs updated_at + is_deleted)
-- ============================================================================
ALTER TABLE logistics_materials_movements ADD COLUMN updated_at TEXT;
ALTER TABLE logistics_materials_movements ADD COLUMN is_deleted INTEGER DEFAULT 0;

UPDATE logistics_materials_movements SET updated_at = created_at WHERE updated_at IS NULL;

-- ============================================================================
-- 6. logistics_requests  (already has updated_at, needs is_deleted)
-- ============================================================================
ALTER TABLE logistics_requests ADD COLUMN is_deleted INTEGER DEFAULT 0;
