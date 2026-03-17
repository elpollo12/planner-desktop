use serde::{Deserialize, Serialize};
use std::env;
use std::path::PathBuf;

/// Environment variable for sync server URL (fallback only)
pub const ENV_SYNC_SERVER_URL: &str = "SYNC_SERVER_URL";

// TODO: Reemplazar por dominio/URL definitiva antes del release final
/// URL del servidor de sincronización por defecto (entregable de prueba)
pub const DEFAULT_SYNC_SERVER_URL: &str = "http://187.77.221.60:3005";

/// Sync configuration stored locally
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SyncConfig {
    pub enabled: bool,
    pub last_sync_at: Option<String>,
    pub last_push_at: Option<String>,
    pub last_pull_at: Option<String>,
    /// Auto-sync interval in minutes (0 = disabled)
    #[serde(default = "default_sync_interval")]
    pub sync_interval_minutes: u32,
    /// JWT token from planner-sync login
    #[serde(default)]
    pub sync_token: Option<String>,
    /// User-configured sync server URL
    #[serde(default)]
    pub server_url: Option<String>,
    /// true una vez que el handshake inicial post-licencia se completó con éxito.
    /// Se resetea a false únicamente al activar una nueva licencia.
    #[serde(default)]
    pub handshake_done: bool,
}

fn default_sync_interval() -> u32 {
    5
}

impl Default for SyncConfig {
    fn default() -> Self {
        Self {
            enabled: false,
            last_sync_at: None,
            last_push_at: None,
            last_pull_at: None,
            sync_interval_minutes: default_sync_interval(),
            sync_token: None,
            server_url: None,
            handshake_done: false,
        }
    }
}

/// Sync server credentials
#[derive(Debug, Clone)]
pub struct SyncCredentials {
    pub server_url: String,
    #[allow(dead_code)]
    pub is_fallback: bool,
}

impl SyncCredentials {
    /// Load from sync_config.json (user-configured), then env var, then DEFAULT_SYNC_SERVER_URL
    pub fn from_env() -> Result<Self, String> {
        // 1. Try user-configured URL from sync_config
        if let Ok(cfg) = load_config() {
            if let Some(url) = &cfg.server_url {
                if !url.is_empty() {
                    return Ok(Self { server_url: url.clone(), is_fallback: false });
                }
            }
        }
        // 2. Try environment variable
        if let Ok(url) = env::var(ENV_SYNC_SERVER_URL) {
            if !url.is_empty() {
                return Ok(Self { server_url: url, is_fallback: false });
            }
        }
        // 3. Default hardcoded server
        Ok(Self { server_url: DEFAULT_SYNC_SERVER_URL.to_string(), is_fallback: false })
    }

    /// Try primary URL, fall back to DEFAULT_SYNC_SERVER_URL if unreachable.
    /// Returns the credentials that actually worked, or error.
    pub async fn resolve_with_fallback() -> Result<Self, String> {
        use crate::sync::sync_client::SyncClient;

        let primary = Self::from_env();

        match primary {
            Ok(creds) => {
                let client = SyncClient::new(&creds.server_url);
                if client.test_connection().await.is_ok() {
                    return Ok(creds);
                }
                // Primary failed — try default server if it's different
                if creds.server_url != DEFAULT_SYNC_SERVER_URL {
                    let fallback_client = SyncClient::new(DEFAULT_SYNC_SERVER_URL);
                    if fallback_client.test_connection().await.is_ok() {
                        println!("[Sync] Servidor principal inaccesible, usando servidor por defecto");
                        return Ok(Self { server_url: DEFAULT_SYNC_SERVER_URL.to_string(), is_fallback: true });
                    }
                }
                Err(format!("Servidor de sincronización inaccesible: {}", creds.server_url))
            }
            Err(e) => Err(e),
        }
    }

    /// Check if any URL is configured
    pub fn is_configured() -> bool {
        // Siempre hay una URL disponible (DEFAULT_SYNC_SERVER_URL)
        true
    }

    /// Get the currently configured URL (for display)
    pub fn get_configured_url() -> Option<String> {
        if let Ok(cfg) = load_config() {
            if let Some(url) = cfg.server_url {
                if !url.is_empty() {
                    return Some(url);
                }
            }
        }
        if let Ok(url) = env::var(ENV_SYNC_SERVER_URL) {
            if !url.is_empty() {
                return Some(url);
            }
        }
        Some(DEFAULT_SYNC_SERVER_URL.to_string())
    }
}

fn tracing_or_println(msg: &str) {
    println!("{}", msg);
}

fn get_config_path() -> Result<PathBuf, String> {
    let app_data_dir = dirs::data_dir()
        .ok_or_else(|| "Could not find app data directory".to_string())?;

    let mut config_dir = app_data_dir;
    config_dir.push("d-planner-temp");

    if !config_dir.exists() {
        std::fs::create_dir_all(&config_dir)
            .map_err(|e| format!("Failed to create config directory: {}", e))?;
    }

    config_dir.push("sync_config.json");
    Ok(config_dir)
}

/// Lee sync_server_url de app_settings como fallback.
/// Solo se usa cuando el sync_config.json no tiene URL (fue borrado o es nuevo).
fn read_url_from_db() -> Option<String> {
    let app_data_dir = dirs::data_dir()?;
    let db_path = app_data_dir.join("d-planner-temp").join("planner.db");
    if !db_path.exists() {
        return None;
    }
    let conn = rusqlite::Connection::open(&db_path).ok()?;
    conn.query_row(
        "SELECT sync_server_url FROM app_settings WHERE id = 1",
        [],
        |row| row.get::<_, Option<String>>(0),
    ).ok().flatten().filter(|u| !u.is_empty())
}

pub fn load_config() -> Result<SyncConfig, String> {
    let path = get_config_path()?;

    if !path.exists() {
        // Archivo borrado o primera ejecución — intentar recuperar URL desde app_settings,
        // si no hay nada usar DEFAULT_SYNC_SERVER_URL directamente.
        let mut cfg = SyncConfig::default();
        if let Some(url) = read_url_from_db() {
            println!("[SyncConfig] sync_config.json ausente — URL recuperada de app_settings: {}", url);
            cfg.server_url = Some(url);
        } else {
            println!("[SyncConfig] sync_config.json ausente — usando servidor por defecto: {}", DEFAULT_SYNC_SERVER_URL);
            cfg.server_url = Some(DEFAULT_SYNC_SERVER_URL.to_string());
            cfg.enabled = true;
        }
        return Ok(cfg);
    }

    let content = std::fs::read_to_string(&path)
        .map_err(|e| format!("Failed to read sync config: {}", e))?;

    let mut cfg: SyncConfig = match serde_json::from_str(&content) {
        Ok(c) => c,
        Err(e) => {
            eprintln!("[SyncConfig] JSON corrupto, usando defaults ({}) ", e);
            SyncConfig::default()
        }
    };

    // Si el JSON existe pero no tiene URL, intentar app_settings y luego el default.
    if cfg.server_url.is_none() {
        if let Some(url) = read_url_from_db() {
            println!("[SyncConfig] server_url ausente en JSON — recuperada de app_settings: {}", url);
            cfg.server_url = Some(url);
        } else {
            println!("[SyncConfig] server_url ausente en JSON — usando servidor por defecto: {}", DEFAULT_SYNC_SERVER_URL);
            cfg.server_url = Some(DEFAULT_SYNC_SERVER_URL.to_string());
            cfg.enabled = true;
        }
        let _ = save_config(&cfg);
    }

    Ok(cfg)
}

pub fn save_config(config: &SyncConfig) -> Result<(), String> {
    let path = get_config_path()?;

    let content = serde_json::to_string_pretty(config)
        .map_err(|e| format!("Failed to serialize sync config: {}", e))?;

    std::fs::write(&path, content)
        .map_err(|e| format!("Failed to write sync config: {}", e))
}
