-- ============================================================================
-- ADD rig_id TO LOGISTICS TABLES
-- ============================================================================
-- Links every logistics movement, action and request to a specific rig.
-- The materials CATALOG (logistics_materials) stays global — only movements
-- carry the rig context.
--
-- Existing rows keep rig_id = NULL (legacy data created before this migration).
-- The application will enforce NOT NULL at the command layer for all new records.
-- ============================================================================

-- 1. Water Bottles Movements
ALTER TABLE logistics_water_bottles_movements ADD COLUMN rig_id TEXT REFERENCES rigs(id) ON DELETE SET NULL;
CREATE INDEX idx_water_bottles_mov_rig ON logistics_water_bottles_movements(rig_id);

-- 2. Fuel Movements
ALTER TABLE logistics_fuel_movements ADD COLUMN rig_id TEXT REFERENCES rigs(id) ON DELETE SET NULL;
CREATE INDEX idx_fuel_mov_rig ON logistics_fuel_movements(rig_id);

-- 3. Vacuum Actions
ALTER TABLE logistics_vacuum_actions ADD COLUMN rig_id TEXT REFERENCES rigs(id) ON DELETE SET NULL;
CREATE INDEX idx_vacuum_actions_rig ON logistics_vacuum_actions(rig_id);

-- 4. Materials Movements (catalog stays global, only movements get rig_id)
ALTER TABLE logistics_materials_movements ADD COLUMN rig_id TEXT REFERENCES rigs(id) ON DELETE SET NULL;
CREATE INDEX idx_materials_mov_rig ON logistics_materials_movements(rig_id);

-- 5. Logistics Requests
ALTER TABLE logistics_requests ADD COLUMN rig_id TEXT REFERENCES rigs(id) ON DELETE SET NULL;
CREATE INDEX idx_requests_rig ON logistics_requests(rig_id);
