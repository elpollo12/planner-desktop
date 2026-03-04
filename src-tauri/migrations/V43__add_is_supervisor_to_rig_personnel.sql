-- Add is_supervisor flag to rig_personnel
-- Supervisors are personnel members that can be selected as the 24h supervisor in DDR reports.
-- A supervisor does not need system access, they are tracked only for reporting purposes.

ALTER TABLE rig_personnel ADD COLUMN is_supervisor INTEGER NOT NULL DEFAULT 0;

CREATE INDEX IF NOT EXISTS idx_rig_personnel_supervisor ON rig_personnel(rig_id, is_supervisor);
