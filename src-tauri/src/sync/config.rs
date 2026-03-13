use serde::{Deserialize, Serialize};
use std::env;
use std::path::PathBuf;

/// Environment variable for sync server URL (fallback only)
pub const ENV_SYNC_SERVER_URL: &str = "SYNC_SERVER_URL";

/// Fallback URL when primary server is unreachable
pub const FALLBACK_SYNC_SERVER_URL: &str = "http://localhost:3001";

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
    /// Load from sync_config.json (user-configured), then env var, then error
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
        Err("URL del servidor de sincronización no configurada".to_string())
    }

    /// Try primary URL, fall back to localhost:3001 if unreachable.
    /// Returns the credentials that actually worked, or error.
    pub async fn resolve_with_fallback() -> Result<Self, String> {
        use crate::sync::sync_client::SyncClient;

        // Get primary URL
        let primary = Self::from_env();

        match primary {
            Ok(creds) => {
                // Test primary
                let client = SyncClient::new(&creds.server_url);
                if client.test_connection().await.is_ok() {
                    return Ok(creds);
                }
                // Primary failed — try fallback
                let fallback_url = FALLBACK_SYNC_SERVER_URL.to_string();
                let fallback_client = SyncClient::new(&fallback_url);
                if fallback_client.test_connection().await.is_ok() {
                    tracing_or_println("[Sync] Servidor principal inaccesible, usando fallback localhost:3001");
                    return Ok(Self { server_url: fallback_url, is_fallback: true });
                }
                Err(format!("Servidor principal y fallback (localhost:3001) inaccesibles"))
            }
            Err(_) => {
                // No primary configured — try fallback directly
                let fallback_url = FALLBACK_SYNC_SERVER_URL.to_string();
                let fallback_client = SyncClient::new(&fallback_url);
                if fallback_client.test_connection().await.is_ok() {
                    return Ok(Self { server_url: fallback_url, is_fallback: true });
                }
                Err("URL del servidor no configurada y fallback localhost:3001 inaccesible".to_string())
            }
        }
    }

    /// Check if any URL is configured
    pub fn is_configured() -> bool {
        if let Ok(cfg) = load_config() {
            if let Some(url) = &cfg.server_url {
                if !url.is_empty() {
                    return true;
                }
            }
        }
        env::var(ENV_SYNC_SERVER_URL).map(|v| !v.is_empty()).unwrap_or(false)
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
        env::var(ENV_SYNC_SERVER_URL).ok().filter(|v| !v.is_empty())
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
        // Archivo borrado — intentar recuperar URL desde app_settings
        let mut cfg = SyncConfig::default();
        if let Some(url) = read_url_from_db() {
            println!("[SyncConfig] sync_config.json ausente — URL recuperada de app_settings: {}", url);
            cfg.server_url = Some(url);
        }
        return Ok(cfg);
    }

    let content = std::fs::read_to_string(&path)
        .map_err(|e| format!("Failed to read sync config: {}", e))?;

    let mut cfg: SyncConfig = match serde_json::from_str(&content) {
        Ok(c) => c,
        Err(e) => {
            // JSON corrupto (escritura interrumpida, disco lleno, etc.)
            // Tratar igual que archivo ausente: defaults + recuperar URL del DB.
            eprintln!("[SyncConfig] JSON corrupto, usando defaults ({}) ", e);
            SyncConfig::default()
        }
    };

    // Si el JSON existe pero no tiene URL (migración desde versión antigua),
    // intentar recuperarla de app_settings.
    if cfg.server_url.is_none() {
        if let Some(url) = read_url_from_db() {
            println!("[SyncConfig] server_url ausente en JSON — recuperada de app_settings: {}", url);
            cfg.server_url = Some(url);
            // Persistir para no depender del fallback en el próximo arranque
            let _ = save_config(&cfg);
        }
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
