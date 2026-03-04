-- ============================================================================
-- V42: Migrate rigs.operator (text) to rigs.operator_id (FK) + rig_contractors
-- ============================================================================

-- Step 1: Add operator_id column to rigs
ALTER TABLE rigs ADD COLUMN operator_id TEXT REFERENCES companies(id);

-- Step 2: Map existing operator names to company IDs
-- Matches by name against companies with company_type = 'operator'
-- If no match found, operator_id stays NULL (will need manual re-assignment)
UPDATE rigs
SET operator_id = (
    SELECT id
    FROM companies
    WHERE companies.name = rigs.operator
      AND companies.company_type = 'operator'
      AND (companies.is_deleted IS NULL OR companies.is_deleted = 0)
    LIMIT 1
);

-- Step 3: Create rig_contractors junction table
-- A rig can have multiple contractors; each entry is unique per rig+company pair
CREATE TABLE IF NOT EXISTS rig_contractors (
    id          TEXT PRIMARY KEY,
    rig_id      TEXT NOT NULL REFERENCES rigs(id) ON DELETE CASCADE,
    company_id  TEXT NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    created_at  TEXT NOT NULL DEFAULT (datetime('now')),
    UNIQUE(rig_id, company_id)
);

CREATE INDEX IF NOT EXISTS idx_rig_contractors_rig_id     ON rig_contractors(rig_id);
CREATE INDEX IF NOT EXISTS idx_rig_contractors_company_id ON rig_contractors(company_id);
