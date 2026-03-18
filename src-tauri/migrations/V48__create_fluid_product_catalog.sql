-- ============================================================================
-- V48: Catálogo maestro de productos de fluidos de perforación
-- ============================================================================
PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS fluid_product_catalog (
    id          TEXT PRIMARY KEY,
    code        TEXT UNIQUE NOT NULL,           -- FP.01, FP.02, ...
    name        TEXT NOT NULL,                  -- BENTONITA, XCD POLYMER, ...
    ge          REAL,                           -- Gravedad específica
    package     TEXT,                           -- SXS, TMB, QÑT, ...
    weight_lbs  REAL,                           -- Peso por envase (lbs)
    vol_gal     REAL,                           -- Volumen por envase (gal), NULL si N/A
    active      INTEGER NOT NULL DEFAULT 1,
    created_by  TEXT,
    updated_by  TEXT,
    created_at  TEXT NOT NULL,
    updated_at  TEXT NOT NULL
);

CREATE INDEX idx_fluid_product_catalog_code   ON fluid_product_catalog(code);
CREATE INDEX idx_fluid_product_catalog_active ON fluid_product_catalog(active);

-- ============================================================================
-- Seed: productos estándar extraídos del REP 17 CGC-1905
-- ============================================================================
INSERT INTO fluid_product_catalog
    (id, code, name, ge, package, weight_lbs, vol_gal, active, created_by, updated_by, created_at, updated_at)
VALUES
    ('fp-catalog-01', 'FP.01', 'BENTONITA',                    2.50, 'SXS', 100.00, NULL, 1, 'system', 'system', datetime('now'), datetime('now')),
    ('fp-catalog-02', 'FP.02', 'BARITA',                       4.20, 'SXS', 100.00, NULL, 1, 'system', 'system', datetime('now'), datetime('now')),
    ('fp-catalog-03', 'FP.03', 'CARBONATO SODICO',             2.50, 'SXS',  55.00, NULL, 1, 'system', 'system', datetime('now'), datetime('now')),
    ('fp-catalog-04', 'FP.04', 'CELULOSA POLIANIONICA LV',     1.50, 'SXS',  55.00, NULL, 1, 'system', 'system', datetime('now'), datetime('now')),
    ('fp-catalog-05', 'FP.05', 'XCD POLYMER',                  1.50, 'SXS',  55.00, NULL, 1, 'system', 'system', datetime('now'), datetime('now')),
    ('fp-catalog-06', 'FP.06', 'AMINA NH4 HPAN',               2.00, 'SXS',  55.00, NULL, 1, 'system', 'system', datetime('now'), datetime('now')),
    ('fp-catalog-07', 'FP.07', 'GOMA XANTICA',                 1.50, 'SXS',  55.00, NULL, 1, 'system', 'system', datetime('now'), datetime('now')),
    ('fp-catalog-08', 'FP.08', 'PAC LV',                       1.50, 'SXS',  55.00, NULL, 1, 'system', 'system', datetime('now'), datetime('now')),
    ('fp-catalog-09', 'FP.09', 'DRILLAMYL',                    1.45, 'SXS',  55.00, NULL, 1, 'system', 'system', datetime('now'), datetime('now')),
    ('fp-catalog-10', 'FP.10', 'CaCO3 30 TT',                  2.60, 'SXS',  44.00, NULL, 1, 'system', 'system', datetime('now'), datetime('now')),
    ('fp-catalog-11', 'FP.11', 'CARBONATO DE CALCIO 70/75',    2.60, 'SXS',  44.00, NULL, 1, 'system', 'system', datetime('now'), datetime('now')),
    ('fp-catalog-12', 'FP.12', 'LIGNITO NATURAL',              1.50, 'SXS',  50.00, NULL, 1, 'system', 'system', datetime('now'), datetime('now')),
    ('fp-catalog-13', 'FP.13', 'CARBONATO DE CALCIO 110-120',  2.60, 'SXS',  44.00, NULL, 1, 'system', 'system', datetime('now'), datetime('now')),
    ('fp-catalog-14', 'FP.14', 'CARBONATO DE CALCIO 40/45',    2.60, 'SXS',  44.00, NULL, 1, 'system', 'system', datetime('now'), datetime('now')),
    ('fp-catalog-15', 'FP.15', 'FIBRA CELULOSA (F/M/G)',       0.99, 'SXS',  25.00, NULL, 1, 'system', 'system', datetime('now'), datetime('now')),
    ('fp-catalog-16', 'FP.16', 'CASCARAS DE NUEZ',             1.00, 'SXS',  50.00, NULL, 1, 'system', 'system', datetime('now'), datetime('now')),
    ('fp-catalog-17', 'FP.17', 'LIBERADOR DE TUB. OB',         1.02, 'TMB',  NULL,  55.00, 1, 'system', 'system', datetime('now'), datetime('now')),
    ('fp-catalog-18', 'FP.18', 'ACIDO CITRICO',                1.60, 'SXS',  55.00, NULL, 1, 'system', 'system', datetime('now'), datetime('now')),
    ('fp-catalog-19', 'FP.19', 'BIOCIDA',                      1.05, 'QÑT',  43.73, NULL, 1, 'system', 'system', datetime('now'), datetime('now')),
    ('fp-catalog-20', 'FP.20', 'RAPID SEAL 350',               2.80, 'SXS',  44.00, NULL, 1, 'system', 'system', datetime('now'), datetime('now')),
    ('fp-catalog-21', 'FP.21', 'MUD GLIDE PLUS',               0.95, 'TMB',  NULL,  55.00, 1, 'system', 'system', datetime('now'), datetime('now')),
    ('fp-catalog-22', 'FP.22', 'SODA CAUSTICA',                2.13, 'SXS',  55.00, NULL, 1, 'system', 'system', datetime('now'), datetime('now')),
    ('fp-catalog-23', 'FP.23', 'DEEPCLEAN-DM',                 0.92, 'TMB',  NULL,  55.00, 1, 'system', 'system', datetime('now'), datetime('now')),
    ('fp-catalog-24', 'FP.24', 'CaCO3 75-81',                  2.60, 'SXS',  44.00, NULL, 1, 'system', 'system', datetime('now'), datetime('now')),
    ('fp-catalog-25', 'FP.25', 'CaCO3 47-53',                  2.60, 'SXS',  44.00, NULL, 1, 'system', 'system', datetime('now'), datetime('now')),
    ('fp-catalog-26', 'FP.26', 'CaCO3 60 TT',                  2.60, 'SXS',  44.00, NULL, 1, 'system', 'system', datetime('now'), datetime('now')),
    ('fp-catalog-27', 'FP.27', 'CaCO3 100 TT',                 2.60, 'SXS',  44.00, NULL, 1, 'system', 'system', datetime('now'), datetime('now')),
    ('fp-catalog-28', 'FP.28', 'CaCO3 70-75',                  2.86, 'SXS',  44.00, NULL, 1, 'system', 'system', datetime('now'), datetime('now'));
