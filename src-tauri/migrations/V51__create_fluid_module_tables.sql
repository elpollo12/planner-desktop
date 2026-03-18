-- ============================================================================
-- V51: Inventario de productos, bitácora de actividades y tanques
-- ============================================================================
PRAGMA foreign_keys = ON;

-- ============================================================================
-- Table 1: fluid_inventory
-- Un row por producto × reporte. Referencia al catálogo maestro.
-- ============================================================================
CREATE TABLE IF NOT EXISTS fluid_inventory (
    id                  TEXT PRIMARY KEY,
    fluid_report_id     TEXT NOT NULL REFERENCES fluid_reports(id) ON DELETE CASCADE,
    product_id          TEXT NOT NULL REFERENCES fluid_product_catalog(id) ON DELETE RESTRICT,

    -- Cantidades del día (en unidades del envase: sacos, tambores, etc.)
    inv_inicial         REAL NOT NULL DEFAULT 0,
    received_today      REAL NOT NULL DEFAULT 0,
    transferred_today   REAL NOT NULL DEFAULT 0,
    consumed_today      REAL NOT NULL DEFAULT 0,
    inv_final           REAL NOT NULL DEFAULT 0,   -- calculado: inicial + recibido - transferido - consumido

    -- Totales acumulados (traídos del snapshot anterior o calculados)
    received_total      REAL NOT NULL DEFAULT 0,
    transferred_total   REAL NOT NULL DEFAULT 0,
    consumed_total      REAL NOT NULL DEFAULT 0,

    -- Costo diario (opcional, puede quedar NULL)
    daily_cost          REAL,

    -- Notas
    notes               TEXT,

    created_at          TEXT NOT NULL,
    updated_at          TEXT NOT NULL
);

CREATE INDEX idx_fluid_inventory_fluid_report_id ON fluid_inventory(fluid_report_id);
CREATE INDEX idx_fluid_inventory_product_id      ON fluid_inventory(product_id);

-- ============================================================================
-- Table 2: fluid_services
-- Servicios técnicos facturados por día
-- ============================================================================
CREATE TABLE IF NOT EXISTS fluid_services (
    id                  TEXT PRIMARY KEY,
    fluid_report_id     TEXT NOT NULL REFERENCES fluid_reports(id) ON DELETE CASCADE,

    service_name        TEXT NOT NULL,          -- "SERV. TEC. PARA FLUIDOS DE PERF."
    hours_per_day       REAL,                   -- 24.0
    quantity            REAL,                   -- 1.0 (número de servicios)
    days_today          REAL,
    days_total          REAL,
    cost_bsf            REAL,                   -- Costo en BsF
    cost_usd            REAL,                   -- Costo en USD
    daily_cost          REAL,
    accumulated_cost    REAL,

    created_at          TEXT NOT NULL,
    updated_at          TEXT NOT NULL
);

CREATE INDEX idx_fluid_services_fluid_report_id ON fluid_services(fluid_report_id);

-- ============================================================================
-- Table 3: fluid_activity
-- Bitácora de horas por categoría operacional (horas acumuladas en el reporte)
-- ============================================================================
CREATE TABLE IF NOT EXISTS fluid_activity (
    id                  TEXT PRIMARY KEY,
    fluid_report_id     TEXT NOT NULL REFERENCES fluid_reports(id) ON DELETE CASCADE,

    -- Categorías según el formato del REP 17
    -- Horas del día
    hours_moving        REAL NOT NULL DEFAULT 0,   -- Mudanza / Mantenimiento
    hours_circulating   REAL NOT NULL DEFAULT 0,   -- Circulando / Desplazando
    hours_drilling      REAL NOT NULL DEFAULT 0,   -- Perforando
    hours_tripping      REAL NOT NULL DEFAULT 0,   -- Armando BHA / Viaje de tubería
    hours_cleaning      REAL NOT NULL DEFAULT 0,   -- Limpiando Cemento
    hours_backreaming   REAL NOT NULL DEFAULT 0,   -- Backreaming
    hours_cementing     REAL NOT NULL DEFAULT 0,   -- Cementando
    hours_running_csg   REAL NOT NULL DEFAULT 0,   -- Bajando Csg.
    hours_other         REAL NOT NULL DEFAULT 0,   -- Otros
    hours_total         REAL NOT NULL DEFAULT 0,   -- Total (suma de las anteriores)

    created_at          TEXT NOT NULL,
    updated_at          TEXT NOT NULL
);

CREATE UNIQUE INDEX idx_fluid_activity_fluid_report_id ON fluid_activity(fluid_report_id);

-- ============================================================================
-- Table 4: fluid_tanks
-- Inventario de tanques activos y reserva del día
-- ============================================================================
CREATE TABLE IF NOT EXISTS fluid_tanks (
    id                  TEXT PRIMARY KEY,
    fluid_report_id     TEXT NOT NULL REFERENCES fluid_reports(id) ON DELETE CASCADE,

    name                TEXT NOT NULL,          -- VIAJE, TRAMPA, ASENTAMIENTO 1, ...
    system_status       TEXT NOT NULL           -- "active" | "reserve"
                            CHECK(system_status IN ('active', 'reserve')),
    volume_bls          REAL,                   -- Volumen (Bls)
    lpg                 REAL,                   -- Densidad LPG (Lbs/gal)
    fluid_type          TEXT,                   -- Tipo de fluido: Viscoelastico, etc.
    sort_order          INTEGER NOT NULL DEFAULT 0,

    created_at          TEXT NOT NULL,
    updated_at          TEXT NOT NULL
);

CREATE INDEX idx_fluid_tanks_fluid_report_id ON fluid_tanks(fluid_report_id);

-- ============================================================================
-- Table 5: fluid_vol_stats
-- Volumetría estadística del pozo (una fila por reporte)
-- ============================================================================
CREATE TABLE IF NOT EXISTS fluid_vol_stats (
    id                          TEXT PRIMARY KEY,
    fluid_report_id             TEXT NOT NULL REFERENCES fluid_reports(id) ON DELETE CASCADE,

    -- Volúmenes del pozo
    vol_cap_sarta               REAL,           -- Vol. Cap. Sarta (Bls)
    vol_desp_sarta              REAL,           -- Vol. Desp. Sarta (Bls)
    vol_revestidor              REAL,           -- Vol. Revestidor (Bls)
    vol_hoyo_desnudo            REAL,           -- Vol. Hoyo Desnudo (Bls)
    vol_pozo_sin_tuberia        REAL,           -- Vol. Pozo S/Tuberia (Bls)
    vol_pozo_con_tuberia        REAL,           -- Vol. del Pozo C/Tuberia (Bls) — (A)
    vol_sistema_activo          REAL,           -- Volumen del Sistema Activo (Bls) — (B)
    vol_sistema_reserva         REAL,           -- Volumen del Sistema Reserva (Bls) — (C)
    vol_sistema_contingencia    REAL,           -- Volumen Sistema Contingencia (Bls) — (D)
    vol_hoyo_abandonado         REAL,           -- Vol. de Hoyo Abandonado (Bls)

    -- Volumetría estadística (hoy / acumulado)
    vol_agua_agregado_hoy       REAL,
    vol_agua_agregado_acum      REAL,
    vol_productos_hoy           REAL,           -- Volumen generado por productos
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

    -- Pérdidas
    vol_perdido_ecs             REAL,           -- Por equipos de control de sólidos
    vol_perdido_ecs_acum        REAL,
    vol_perdido_humectacion     REAL,
    vol_perdido_humectacion_acum REAL,
    vol_perdido_formacion_hoy   REAL,           -- Pérdida a la Formación
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

    -- Balance final
    vol_inicial_diario          REAL,
    vol_final_diario            REAL,

    created_at                  TEXT NOT NULL,
    updated_at                  TEXT NOT NULL
);

CREATE UNIQUE INDEX idx_fluid_vol_stats_fluid_report_id ON fluid_vol_stats(fluid_report_id);
