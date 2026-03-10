-- V45: Agrega company_id a users para vincular usuarios con su empresa en planner-sync.
-- Usado por el handshake de licencia para filtrar usuarios por tenant.
-- Nullable: el admin hardcodeado y usuarios de sistema pueden no tener empresa asignada.
ALTER TABLE users ADD COLUMN company_id TEXT;
