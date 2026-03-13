-- Persiste la URL del servidor de sync en app_settings (SQLite local).
-- Esto permite recuperar la URL si sync_config.json se pierde o corrompe,
-- ya que load_config() la usa como fallback antes de devolver SyncConfig::default().
ALTER TABLE app_settings ADD COLUMN sync_server_url TEXT;
