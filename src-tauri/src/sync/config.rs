use serde::{Deserialize, Serialize};
use std::env;
use std::path::PathBuf;

/// Environment variable names for Turso credentials
pub const ENV_TURSO_DATABASE_URL: &str = "TURSO_DATABASE_URL";
pub const ENV_TURSO_AUTH_TOKEN: &str = "TURSO_AUTH_TOKEN";

/// Sync configuration stored locally (no credentials)
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
}

fn default_sync_interval() -> u32 {
    5 // Default: 5 minutes
}

impl Default for SyncConfig {
    fn default() -> Self {
        Self {
            enabled: false,
            last_sync_at: None,
            last_push_at: None,
            last_pull_at: None,
            sync_interval_minutes: default_sync_interval(),
        }
    }
}

/// Turso credentials read from environment variables
#[derive(Debug, Clone)]
pub struct TursoCredentials {
    pub database_url: String,
    pub auth_token: String,
}

impl TursoCredentials {
    /// Load credentials from environment variables
    pub fn from_env() -> Result<Self, String> {
        let database_url = env::var(ENV_TURSO_DATABASE_URL)
            .map_err(|_| format!("Variable de entorno {} no configurada", ENV_TURSO_DATABASE_URL))?;

        let auth_token = env::var(ENV_TURSO_AUTH_TOKEN)
            .map_err(|_| format!("Variable de entorno {} no configurada", ENV_TURSO_AUTH_TOKEN))?;

        if database_url.is_empty() {
            return Err(format!("{} está vacía", ENV_TURSO_DATABASE_URL));
        }

        if auth_token.is_empty() {
            return Err(format!("{} está vacía", ENV_TURSO_AUTH_TOKEN));
        }

        Ok(Self {
            database_url,
            auth_token,
        })
    }

    /// Check if credentials are configured (without loading them)
    pub fn is_configured() -> bool {
        env::var(ENV_TURSO_DATABASE_URL).map(|v| !v.is_empty()).unwrap_or(false)
            && env::var(ENV_TURSO_AUTH_TOKEN).map(|v| !v.is_empty()).unwrap_or(false)
    }
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

pub fn load_config() -> Result<SyncConfig, String> {
    let path = get_config_path()?;

    if !path.exists() {
        return Ok(SyncConfig::default());
    }

    let content = std::fs::read_to_string(&path)
        .map_err(|e| format!("Failed to read sync config: {}", e))?;

    serde_json::from_str(&content)
        .map_err(|e| format!("Failed to parse sync config: {}", e))
}

pub fn save_config(config: &SyncConfig) -> Result<(), String> {
    let path = get_config_path()?;

    let content = serde_json::to_string_pretty(config)
        .map_err(|e| format!("Failed to serialize sync config: {}", e))?;

    std::fs::write(&path, content)
        .map_err(|e| format!("Failed to write sync config: {}", e))
}
