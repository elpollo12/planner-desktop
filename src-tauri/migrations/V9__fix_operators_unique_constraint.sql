-- Remove UNIQUE constraint from operators.name
-- This allows multiple operators with the same name but different IDs

-- SQLite doesn't support ALTER TABLE DROP CONSTRAINT directly,
-- so we need to recreate the table

-- Step 1: Create new table without UNIQUE constraint on name
CREATE TABLE IF NOT EXISTS operators_new (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,  -- UNIQUE constraint removed
    logo_path TEXT,
    active INTEGER NOT NULL DEFAULT 1,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Step 2: Copy data from old table
INSERT INTO operators_new (id, name, logo_path, active, created_at, updated_at)
SELECT id, name, logo_path, active, created_at, updated_at
FROM operators;

-- Step 3: Drop old table
DROP TABLE operators;

-- Step 4: Rename new table to operators
ALTER TABLE operators_new RENAME TO operators;

-- Step 5: Recreate indexes
CREATE INDEX IF NOT EXISTS idx_operators_name ON operators(name);
CREATE INDEX IF NOT EXISTS idx_operators_active ON operators(active);
