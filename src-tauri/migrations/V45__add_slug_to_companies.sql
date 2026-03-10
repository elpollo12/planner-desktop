-- Agrega slug único a companies para identificar al tenant en el handshake con planner-sync.
-- NULL permitido para empresas existentes antes de esta migración.
ALTER TABLE companies ADD COLUMN slug TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS idx_companies_slug ON companies(slug)
    WHERE slug IS NOT NULL;
