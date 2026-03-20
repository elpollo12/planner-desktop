-- Rename operators table to companies and add company_type field
-- "operators" was a temporary name. A Company can be either an Operator or a Contractor.
-- An Operator cannot be a Contractor and vice versa.

-- Step 1: Create new companies table with the correct schema
CREATE TABLE IF NOT EXISTS companies (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    logo TEXT,
    company_type TEXT NOT NULL DEFAULT 'operator' CHECK (company_type IN ('operator', 'contractor')),
    active INTEGER NOT NULL DEFAULT 1,
    is_deleted INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Step 2: Copy all existing data from operators into companies
-- logo_path -> logo (rename), company_type defaults to 'operator' for all existing records
INSERT INTO companies (id, name, logo, company_type, active, is_deleted, created_at, updated_at)
SELECT
    id,
    name,
    logo_path,
    'operator',
    active,
    COALESCE(is_deleted, 0),
    created_at,
    updated_at
FROM operators;

-- Step 3: Drop old operators table
DROP TABLE operators;

-- Step 4: Recreate indexes
CREATE INDEX IF NOT EXISTS idx_companies_name ON companies(name);
CREATE INDEX IF NOT EXISTS idx_companies_active ON companies(active);
CREATE INDEX IF NOT EXISTS idx_companies_type ON companies(company_type);
