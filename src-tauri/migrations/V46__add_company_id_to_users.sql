-- Agrega company_id a users para asociar usuarios no-admin a una empresa cliente.
-- NULL = usuario técnico/administrador global (no pertenece a ninguna empresa).
ALTER TABLE users ADD COLUMN company_id TEXT;
