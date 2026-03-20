-- ============================================================================
-- V50: Propiedades del fluido por turno (fluid_props)
--      y control de sólidos por equipo (fluid_solids_control)
-- ============================================================================
PRAGMA foreign_keys = ON;

-- ============================================================================
-- Table 1: fluid_props
-- Una fila por turno/lectura. Cada reporte tiene hasta 3 filas
-- (hora 4:00 / 12:00 / 20:00), aunque el sistema no lo limita.
-- ============================================================================
CREATE TABLE IF NOT EXISTS fluid_props (
    id                  TEXT PRIMARY KEY,
    fluid_report_id     TEXT NOT NULL REFERENCES fluid_reports(id) ON DELETE CASCADE,

    -- Identificación del turno
    sample_hour         TEXT,                   -- "4:00", "12:00", "20:00"
    sample_source       TEXT,                   -- Ent / Sal

    -- Condiciones base
    temperature_f       REAL,                   -- Temperatura (ºF)
    depth_md            REAL,                   -- Profundidad MD (pies)
    depth_tvd           REAL,                   -- Profundidad TVD (pies)

    -- Propiedades reológicas
    density             REAL,                   -- Densidad (Lbs/gal)
    marsh_viscosity     REAL,                   -- Viscosidad Marsh (Seg)
    rpm_600             REAL,                   -- Lectura 600 rpm
    rpm_300             REAL,                   -- Lectura 300 rpm
    rpm_200             REAL,                   -- Lectura 200 rpm
    rpm_100             REAL,                   -- Lectura 100 rpm
    rpm_6               REAL,                   -- Lectura 6 rpm
    rpm_3               REAL,                   -- Lectura 3 rpm
    pv                  REAL,                   -- Viscosidad Plástica (cps)
    yp                  REAL,                   -- Punto Cedente (lbs/100ft²)
    gel_10s             REAL,                   -- Gel Inicial 10 (Seg)
    gel_10m             REAL,                   -- Gel 10 (min)
    gel_30m             REAL,                   -- Gel 30 (min)

    -- Filtración
    api_filtrate        REAL,                   -- Filtrado API (cc/30 min)
    filter_cake         REAL,                   -- Torta del Filtrado (x32)

    -- Contenidos (retorta)
    sand_content        REAL,                   -- Contenido de Arena %
    solids_retort       REAL,                   -- Sólidos según retorta %
    oil_retort          REAL,                   -- Aceite según retorta %
    water_retort        REAL,                   -- Agua según retorta %

    -- Química
    ph                  REAL,
    alkalinity_pm       REAL,                   -- Alcalinidad PM (ml)
    alkalinity_pf       REAL,                   -- Alcalinidad Pf (ml)
    alkalinity_mf       REAL,                   -- Alcalinidad Mf (ml)
    calcium_ppm         REAL,                   -- Calcio (PPM)
    chlorides_ppm       REAL,                   -- Cloruros (PPM)
    mbt                 REAL,                   -- MBT (lbs/bbl equiv.)
    brookfield_visc     REAL,                   -- Visc. Brookfield (cps)
    lubricity_coef      REAL,                   -- Coeficiente de Lubricidad

    -- Metadatos
    created_at          TEXT NOT NULL,
    updated_at          TEXT NOT NULL
);

CREATE INDEX idx_fluid_props_fluid_report_id ON fluid_props(fluid_report_id);

-- ============================================================================
-- Table 2: fluid_solids_control
-- Control de equipos de sólidos (shakers, desarcilladores, etc.)
-- ============================================================================
CREATE TABLE IF NOT EXISTS fluid_solids_control (
    id                  TEXT PRIMARY KEY,
    fluid_report_id     TEXT NOT NULL REFERENCES fluid_reports(id) ON DELETE CASCADE,

    equipment           TEXT NOT NULL,          -- "Shaker 1", "Shaker 2", "3 en 1", "Desa./Desi.", "Centrifuga"
    design_mesh         TEXT,                   -- Diseño (ej: "140/120/100")
    hours_today         REAL,
    hours_accumulated   REAL,

    created_at          TEXT NOT NULL,
    updated_at          TEXT NOT NULL
);

CREATE INDEX idx_fluid_solids_control_fluid_report_id ON fluid_solids_control(fluid_report_id);
