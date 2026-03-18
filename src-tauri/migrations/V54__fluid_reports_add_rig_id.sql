-- V54: Add rig_id FK to fluid_reports for rig association
-- The rig_number text field stays for display, but rig_id is the authoritative link.

ALTER TABLE fluid_reports ADD COLUMN rig_id TEXT REFERENCES rigs(id);
CREATE INDEX IF NOT EXISTS idx_fluid_reports_rig_id ON fluid_reports(rig_id);
