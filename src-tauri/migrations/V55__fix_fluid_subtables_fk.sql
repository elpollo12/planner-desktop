-- ============================================================================
-- V55: Fix FK references in fluid sub-tables
-- After V53 renamed fluid_reports, the child tables still reference
-- "_fluid_reports_v52" which no longer exists. Also update fluid_tanks
-- to support 'contingency' status.
-- ============================================================================

-- ── fluid_props ─────────────────────────────────────────────────────────────
DROP INDEX IF EXISTS idx_fluid_props_report_id;
ALTER TABLE fluid_props RENAME TO _fluid_props_old;

CREATE TABLE fluid_props (
    id                  TEXT PRIMARY KEY,
    fluid_report_id     TEXT NOT NULL REFERENCES fluid_reports(id) ON DELETE CASCADE,
    sample_hour         TEXT,
    sample_source       TEXT,
    temperature_f       REAL,
    depth_md            REAL,
    depth_tvd           REAL,
    density             REAL,
    marsh_viscosity     REAL,
    rpm_600             REAL,
    rpm_300             REAL,
    rpm_200             REAL,
    rpm_100             REAL,
    rpm_6               REAL,
    rpm_3               REAL,
    pv                  REAL,
    yp                  REAL,
    gel_10s             REAL,
    gel_10m             REAL,
    gel_30m             REAL,
    api_filtrate        REAL,
    filter_cake         REAL,
    sand_content        REAL,
    solids_retort       REAL,
    oil_retort          REAL,
    water_retort        REAL,
    ph                  REAL,
    alkalinity_pm       REAL,
    alkalinity_pf       REAL,
    alkalinity_mf       REAL,
    calcium_ppm         REAL,
    chlorides_ppm       REAL,
    mbt                 REAL,
    brookfield_visc     REAL,
    lubricity_coef      REAL,
    created_at          TEXT NOT NULL,
    updated_at          TEXT NOT NULL
);

INSERT INTO fluid_props SELECT * FROM _fluid_props_old;
DROP TABLE _fluid_props_old;
CREATE INDEX idx_fluid_props_report_id ON fluid_props(fluid_report_id);

-- ── fluid_solids_control ────────────────────────────────────────────────────
DROP INDEX IF EXISTS idx_fluid_solids_control_report_id;
ALTER TABLE fluid_solids_control RENAME TO _fluid_solids_control_old;

CREATE TABLE fluid_solids_control (
    id                  TEXT PRIMARY KEY,
    fluid_report_id     TEXT NOT NULL REFERENCES fluid_reports(id) ON DELETE CASCADE,
    equipment           TEXT NOT NULL,
    design_mesh         TEXT,
    hours_today         REAL,
    hours_accumulated   REAL,
    created_at          TEXT NOT NULL,
    updated_at          TEXT NOT NULL
);

INSERT INTO fluid_solids_control SELECT * FROM _fluid_solids_control_old;
DROP TABLE _fluid_solids_control_old;
CREATE INDEX idx_fluid_solids_control_report_id ON fluid_solids_control(fluid_report_id);

-- ── fluid_inventory ─────────────────────────────────────────────────────────
DROP INDEX IF EXISTS idx_fluid_inventory_report_id;
ALTER TABLE fluid_inventory RENAME TO _fluid_inventory_old;

CREATE TABLE fluid_inventory (
    id                  TEXT PRIMARY KEY,
    fluid_report_id     TEXT NOT NULL REFERENCES fluid_reports(id) ON DELETE CASCADE,
    product_id          TEXT NOT NULL REFERENCES fluid_product_catalog(id) ON DELETE RESTRICT,
    inv_inicial         REAL NOT NULL DEFAULT 0,
    received_today      REAL NOT NULL DEFAULT 0,
    transferred_today   REAL NOT NULL DEFAULT 0,
    consumed_today      REAL NOT NULL DEFAULT 0,
    inv_final           REAL NOT NULL DEFAULT 0,
    received_total      REAL NOT NULL DEFAULT 0,
    transferred_total   REAL NOT NULL DEFAULT 0,
    consumed_total      REAL NOT NULL DEFAULT 0,
    daily_cost          REAL,
    notes               TEXT,
    created_at          TEXT NOT NULL,
    updated_at          TEXT NOT NULL
);

INSERT INTO fluid_inventory SELECT * FROM _fluid_inventory_old;
DROP TABLE _fluid_inventory_old;
CREATE INDEX idx_fluid_inventory_report_id ON fluid_inventory(fluid_report_id);

-- ── fluid_services ──────────────────────────────────────────────────────────
DROP INDEX IF EXISTS idx_fluid_services_report_id;
ALTER TABLE fluid_services RENAME TO _fluid_services_old;

CREATE TABLE fluid_services (
    id                  TEXT PRIMARY KEY,
    fluid_report_id     TEXT NOT NULL REFERENCES fluid_reports(id) ON DELETE CASCADE,
    service_name        TEXT NOT NULL,
    hours_per_day       REAL,
    quantity            REAL,
    days_today          REAL,
    days_total          REAL,
    cost_bsf            REAL,
    cost_usd            REAL,
    daily_cost          REAL,
    accumulated_cost    REAL,
    created_at          TEXT NOT NULL,
    updated_at          TEXT NOT NULL
);

INSERT INTO fluid_services SELECT * FROM _fluid_services_old;
DROP TABLE _fluid_services_old;
CREATE INDEX idx_fluid_services_report_id ON fluid_services(fluid_report_id);

-- ── fluid_activity ──────────────────────────────────────────────────────────
DROP INDEX IF EXISTS idx_fluid_activity_report_id;
ALTER TABLE fluid_activity RENAME TO _fluid_activity_old;

CREATE TABLE fluid_activity (
    id                  TEXT PRIMARY KEY,
    fluid_report_id     TEXT NOT NULL REFERENCES fluid_reports(id) ON DELETE CASCADE,
    hours_moving        REAL NOT NULL DEFAULT 0,
    hours_circulating   REAL NOT NULL DEFAULT 0,
    hours_drilling      REAL NOT NULL DEFAULT 0,
    hours_tripping      REAL NOT NULL DEFAULT 0,
    hours_cleaning      REAL NOT NULL DEFAULT 0,
    hours_backreaming   REAL NOT NULL DEFAULT 0,
    hours_cementing     REAL NOT NULL DEFAULT 0,
    hours_running_csg   REAL NOT NULL DEFAULT 0,
    hours_other         REAL NOT NULL DEFAULT 0,
    hours_total         REAL NOT NULL DEFAULT 0,
    created_at          TEXT NOT NULL,
    updated_at          TEXT NOT NULL
);

INSERT INTO fluid_activity SELECT * FROM _fluid_activity_old;
DROP TABLE _fluid_activity_old;
CREATE UNIQUE INDEX idx_fluid_activity_report_id ON fluid_activity(fluid_report_id);

-- ── fluid_tanks ─────────────────────────────────────────────────────────────
DROP INDEX IF EXISTS idx_fluid_tanks_report_id;
ALTER TABLE fluid_tanks RENAME TO _fluid_tanks_old;

CREATE TABLE fluid_tanks (
    id                  TEXT PRIMARY KEY,
    fluid_report_id     TEXT NOT NULL REFERENCES fluid_reports(id) ON DELETE CASCADE,
    name                TEXT NOT NULL,
    system_status       TEXT NOT NULL CHECK(system_status IN ('active', 'reserve', 'contingency')),
    volume_bls          REAL,
    lpg                 REAL,
    fluid_type          TEXT,
    sort_order          INTEGER NOT NULL DEFAULT 0,
    created_at          TEXT NOT NULL,
    updated_at          TEXT NOT NULL
);

INSERT INTO fluid_tanks SELECT * FROM _fluid_tanks_old;
DROP TABLE _fluid_tanks_old;
CREATE INDEX idx_fluid_tanks_report_id ON fluid_tanks(fluid_report_id);

-- ── fluid_vol_stats ─────────────────────────────────────────────────────────
DROP INDEX IF EXISTS idx_fluid_vol_stats_report_id;
ALTER TABLE fluid_vol_stats RENAME TO _fluid_vol_stats_old;

CREATE TABLE fluid_vol_stats (
    id                          TEXT PRIMARY KEY,
    fluid_report_id             TEXT NOT NULL REFERENCES fluid_reports(id) ON DELETE CASCADE,
    vol_cap_sarta               REAL,
    vol_desp_sarta              REAL,
    vol_revestidor              REAL,
    vol_hoyo_desnudo            REAL,
    vol_pozo_sin_tuberia        REAL,
    vol_pozo_con_tuberia        REAL,
    vol_sistema_activo          REAL,
    vol_sistema_reserva         REAL,
    vol_sistema_contingencia    REAL,
    vol_hoyo_abandonado         REAL,
    vol_agua_agregado_hoy       REAL,
    vol_agua_agregado_acum      REAL,
    vol_productos_hoy           REAL,
    vol_productos_acum          REAL,
    vol_aceite_acum             REAL,
    vol_recibido_hoy            REAL,
    vol_recibido_acum           REAL,
    vol_procesado_hoy           REAL,
    vol_procesado_acum          REAL,
    vol_manejado_hoy            REAL,
    vol_total_agregado_hoy      REAL,
    vol_total_agregado_acum     REAL,
    vol_transferido_fuera       REAL,
    vol_perdido_ecs             REAL,
    vol_perdido_ecs_acum        REAL,
    vol_perdido_humectacion     REAL,
    vol_perdido_humectacion_acum REAL,
    vol_perdido_formacion_hoy   REAL,
    vol_perdido_formacion_acum  REAL,
    vol_perdido_permeabilidad   REAL,
    vol_perdido_permeabilidad_acum REAL,
    vol_descartado              REAL,
    vol_entrampado              REAL,
    vol_perdido_superficie      REAL,
    vol_perdido_superficie_acum REAL,
    vol_otras_perdidas          REAL,
    vol_total_perdido_hoy       REAL,
    vol_total_perdido_acum      REAL,
    vol_inicial_diario          REAL,
    vol_final_diario            REAL,
    created_at                  TEXT NOT NULL,
    updated_at                  TEXT NOT NULL
);

INSERT INTO fluid_vol_stats SELECT * FROM _fluid_vol_stats_old;
DROP TABLE _fluid_vol_stats_old;
CREATE UNIQUE INDEX idx_fluid_vol_stats_report_id ON fluid_vol_stats(fluid_report_id);
