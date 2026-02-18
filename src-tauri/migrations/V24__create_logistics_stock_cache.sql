-- ============================================================================
-- LOGISTICS STOCK CACHE (materialized balance)
-- ============================================================================

CREATE TABLE IF NOT EXISTS logistics_stock (
  rig_id      TEXT NOT NULL,
  category    TEXT NOT NULL,
  quantity    REAL NOT NULL DEFAULT 0,
  updated_at  TEXT NOT NULL,
  PRIMARY KEY (rig_id, category)
);

-- ============================================================================
-- SEED: Compute initial balances from existing movement data
-- ============================================================================

-- Water bottles (quantity is INTEGER in movements, stored as REAL in cache)
INSERT INTO logistics_stock (rig_id, category, quantity, updated_at)
SELECT
  rig_id,
  'water_bottles',
  SUM(CASE WHEN movement_type = 'entry' THEN quantity ELSE -quantity END),
  datetime('now')
FROM logistics_water_bottles_movements
WHERE rig_id IS NOT NULL
GROUP BY rig_id;

-- Fuel
INSERT INTO logistics_stock (rig_id, category, quantity, updated_at)
SELECT
  rig_id,
  'fuel',
  SUM(CASE WHEN movement_type = 'entry' THEN amount ELSE -amount END),
  datetime('now')
FROM logistics_fuel_movements
WHERE rig_id IS NOT NULL
GROUP BY rig_id;

-- Materials (one row per rig + material combination)
INSERT INTO logistics_stock (rig_id, category, quantity, updated_at)
SELECT
  rig_id,
  'material:' || material_id,
  SUM(CASE WHEN movement_type = 'entry' THEN quantity ELSE -quantity END),
  datetime('now')
FROM logistics_materials_movements
WHERE rig_id IS NOT NULL
GROUP BY rig_id, material_id;

-- ============================================================================
-- MANUAL RECALCULATION (run if cache ever drifts — not part of migration)
-- ============================================================================
-- DELETE FROM logistics_stock;
-- <then re-run the three INSERT statements above>
-- ============================================================================
