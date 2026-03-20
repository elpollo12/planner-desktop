-- ============================================================================
-- V49: Tabla principal de reportes de fluidos
-- Vinculada a reports(id). Solo se permite crear si el reporte padre
-- tiene status IN ('submitted', 'approved', 'rejected').
-- El CHECK se aplica en lógica de aplicación (Tauri command), no aquí,
-- para evitar dependencias de datos en la migration.
-- ============================================================================
PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS fluid_reports (
    id                  TEXT PRIMARY KEY,
    report_id           TEXT NOT NULL REFERENCES reports(id) ON DELETE CASCADE,

    -- Datos del fluido (propios del módulo, no duplicados del reporte padre)
    fluid_type          TEXT,                   -- MUD VIS PLUS, SYNTHETHIC, etc.
    well_phase          TEXT,                   -- Fase: PRODUCCION, INTERMEDIA, etc.

    -- Personal de guardia específico de fluidos
    fluid_coordinator   TEXT,                   -- Coord. de Fluidos
    tech_rep_1          TEXT,                   -- Rpte. Serv. Tec. 1
    tech_rep_2          TEXT,                   -- Rpte. Serv. Tec. 2
    trainee             TEXT,                   -- En Entrenamiento
    ops_supervisor      TEXT,                   -- Sup. Operaciones

    -- Parámetros de circulación
    bottom_down_min     REAL,                   -- Fondo Abajo (min)
    bottom_down_emb     INTEGER,                -- Fondo Abajo (emb)
    bottom_up_min       REAL,                   -- Fondo Arriba (min)
    bottom_up_emb       INTEGER,                -- Fondo Arriba (emb)
    well_cycle_min      REAL,                   -- Ciclo del pozo (min)
    well_cycle_emb      INTEGER,
    total_cycle_min     REAL,                   -- Ciclo Total (min)
    total_cycle_emb     INTEGER,

    -- Volumetría DIMS
    vol_inicial         REAL,
    vol_perdido_hoyo    REAL,
    vol_descartado      REAL,
    vol_preparado       REAL,
    vol_transferido     REAL,
    vol_recibido        REAL,
    vol_perdido_sup     REAL,
    vol_final           REAL,

    -- Hidráulica
    esd                 REAL,
    ecd                 REAL,
    emb_n_tuberia       REAL,
    emb_n_anular        REAL,
    emb_k_tuberia       REAL,
    emb_k_anular        REAL,

    -- Comentarios
    fluid_comments      TEXT,                   -- Actividades con el fluido
    product_comments    TEXT,                   -- Comentarios de movimientos de productos
    vol_comments        TEXT,                   -- Comentarios volumétricos

    -- Metadatos
    is_deleted          INTEGER NOT NULL DEFAULT 0,
    created_by          TEXT REFERENCES users(id) ON DELETE SET NULL,
    updated_by          TEXT REFERENCES users(id) ON DELETE SET NULL,
    created_at          TEXT NOT NULL,
    updated_at          TEXT NOT NULL,
    synced              INTEGER NOT NULL DEFAULT 0
);

CREATE UNIQUE INDEX idx_fluid_reports_report_id ON fluid_reports(report_id);
CREATE INDEX idx_fluid_reports_is_deleted       ON fluid_reports(is_deleted);
CREATE INDEX idx_fluid_reports_created_at       ON fluid_reports(created_at);
