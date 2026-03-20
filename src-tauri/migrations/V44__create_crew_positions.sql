-- Create crew_positions catalog table
-- Mirrors the incident_types pattern: global, soft-delete, seeded with current hardcoded values

CREATE TABLE crew_positions (
    id         TEXT    PRIMARY KEY,
    name       TEXT    NOT NULL,
    sort_order INTEGER NOT NULL DEFAULT 0,
    is_default INTEGER NOT NULL DEFAULT 0,
    is_deleted INTEGER NOT NULL DEFAULT 0,
    created_by TEXT    REFERENCES users(id),
    created_at TEXT    NOT NULL,
    updated_at TEXT    NOT NULL
);

CREATE UNIQUE INDEX idx_crew_positions_name
    ON crew_positions (LOWER(name))
    WHERE is_deleted = 0;

-- Seed with existing hardcoded positions so no data is lost
INSERT INTO crew_positions (id, name, sort_order, is_default, is_deleted, created_at, updated_at) VALUES
    (lower(hex(randomblob(16))), 'Perforador',           0, 1, 0, datetime('now'), datetime('now')),
    (lower(hex(randomblob(16))), 'Encuellador',          1, 1, 0, datetime('now'), datetime('now')),
    (lower(hex(randomblob(16))), 'Cuñero',               2, 1, 0, datetime('now'), datetime('now')),
    (lower(hex(randomblob(16))), 'Arenillero',           3, 1, 0, datetime('now'), datetime('now')),
    (lower(hex(randomblob(16))), 'Mecánico',             4, 1, 0, datetime('now'), datetime('now')),
    (lower(hex(randomblob(16))), 'Soldador',             5, 1, 0, datetime('now'), datetime('now')),
    (lower(hex(randomblob(16))), 'Operador Montacargas', 6, 1, 0, datetime('now'), datetime('now')),
    (lower(hex(randomblob(16))), 'Obrero',               7, 1, 0, datetime('now'), datetime('now')),
    (lower(hex(randomblob(16))), 'Supervisor',           8, 1, 0, datetime('now'), datetime('now')),
    (lower(hex(randomblob(16))), 'Otro',                 9, 1, 0, datetime('now'), datetime('now'));
