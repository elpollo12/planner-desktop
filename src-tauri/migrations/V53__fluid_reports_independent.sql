-- ============================================================================
-- V53: Hacer fluid_reports independiente del DDR
-- Los reportes de fluidos son entidades autónomas con su propio encabezado.
-- report_id se mantiene nullable por compatibilidad futura.
-- ============================================================================

-- Paso 1: Drop old indexes that reference the table
DROP INDEX IF EXISTS idx_fluid_reports_report_id;
DROP INDEX IF EXISTS idx_fluid_reports_is_deleted;
DROP INDEX IF EXISTS idx_fluid_reports_created_at;

-- Paso 2: Rename current table
ALTER TABLE fluid_reports RENAME TO _fluid_reports_v52;

-- Paso 3: Create new table with own header fields, no FK
CREATE TABLE fluid_reports (
    id                  TEXT PRIMARY KEY,
    report_id           TEXT,

    report_number       INTEGER,
    report_date         TEXT,
    well_number         TEXT,
    rig_number          TEXT,
    contract            TEXT,
    contractor          TEXT,
    operator            TEXT,
    field_district      TEXT,
    supervisor_24h      TEXT,

    fluid_type          TEXT,
    well_phase          TEXT,

    fluid_coordinator   TEXT,
    tech_rep_1          TEXT,
    tech_rep_2          TEXT,
    trainee             TEXT,
    ops_supervisor      TEXT,

    bottom_down_min     REAL,
    bottom_down_emb     INTEGER,
    bottom_up_min       REAL,
    bottom_up_emb       INTEGER,
    well_cycle_min      REAL,
    well_cycle_emb      INTEGER,
    total_cycle_min     REAL,
    total_cycle_emb     INTEGER,

    vol_inicial         REAL,
    vol_perdido_hoyo    REAL,
    vol_descartado      REAL,
    vol_preparado       REAL,
    vol_transferido     REAL,
    vol_recibido        REAL,
    vol_perdido_sup     REAL,
    vol_final           REAL,

    esd                 REAL,
    ecd                 REAL,
    emb_n_tuberia       REAL,
    emb_n_anular        REAL,
    emb_k_tuberia       REAL,
    emb_k_anular        REAL,

    fluid_comments      TEXT,
    product_comments    TEXT,
    vol_comments        TEXT,

    is_deleted          INTEGER NOT NULL DEFAULT 0,
    created_by          TEXT REFERENCES users(id) ON DELETE SET NULL,
    updated_by          TEXT REFERENCES users(id) ON DELETE SET NULL,
    created_at          TEXT NOT NULL,
    updated_at          TEXT NOT NULL,
    synced              INTEGER NOT NULL DEFAULT 0
);

-- Paso 4: Copy data, pulling header fields from parent report via LEFT JOIN
INSERT INTO fluid_reports (
    id, report_id,
    report_number, report_date, well_number, rig_number,
    contract, contractor, operator, field_district, supervisor_24h,
    fluid_type, well_phase,
    fluid_coordinator, tech_rep_1, tech_rep_2, trainee, ops_supervisor,
    bottom_down_min, bottom_down_emb, bottom_up_min, bottom_up_emb,
    well_cycle_min, well_cycle_emb, total_cycle_min, total_cycle_emb,
    vol_inicial, vol_perdido_hoyo, vol_descartado, vol_preparado,
    vol_transferido, vol_recibido, vol_perdido_sup, vol_final,
    esd, ecd, emb_n_tuberia, emb_n_anular, emb_k_tuberia, emb_k_anular,
    fluid_comments, product_comments, vol_comments,
    is_deleted, created_by, updated_by, created_at, updated_at, synced
)
SELECT
    o.id, o.report_id,
    r.report_number, r.report_date, r.well_number, r.rig_number,
    r.contract, r.contractor, r.operator, r.field_district, r.supervisor_24h,
    o.fluid_type, o.well_phase,
    o.fluid_coordinator, o.tech_rep_1, o.tech_rep_2, o.trainee, o.ops_supervisor,
    o.bottom_down_min, o.bottom_down_emb, o.bottom_up_min, o.bottom_up_emb,
    o.well_cycle_min, o.well_cycle_emb, o.total_cycle_min, o.total_cycle_emb,
    o.vol_inicial, o.vol_perdido_hoyo, o.vol_descartado, o.vol_preparado,
    o.vol_transferido, o.vol_recibido, o.vol_perdido_sup, o.vol_final,
    o.esd, o.ecd, o.emb_n_tuberia, o.emb_n_anular, o.emb_k_tuberia, o.emb_k_anular,
    o.fluid_comments, o.product_comments, o.vol_comments,
    o.is_deleted, o.created_by, o.updated_by, o.created_at, o.updated_at, o.synced
FROM _fluid_reports_v52 o
LEFT JOIN reports r ON o.report_id = r.id;

-- Paso 5: Drop old table
DROP TABLE _fluid_reports_v52;

-- Paso 6: Create new indexes
CREATE INDEX idx_fluid_reports_is_deleted   ON fluid_reports(is_deleted);
CREATE INDEX idx_fluid_reports_created_at   ON fluid_reports(created_at);
CREATE INDEX idx_fluid_reports_report_date  ON fluid_reports(report_date);
CREATE INDEX idx_fluid_reports_well_number  ON fluid_reports(well_number);
CREATE INDEX idx_fluid_reports_rig_number   ON fluid_reports(rig_number);
