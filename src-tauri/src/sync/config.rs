use serde::{Deserialize, Serialize};
use std::path::PathBuf;

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SyncConfig {
    pub turso_url: String,
    pub auth_token: String,
    pub enabled: bool,
    pub last_sync_at: Option<String>,
    pub last_push_at: Option<String>,
    pub last_pull_at: Option<String>,
}

impl Default for SyncConfig {
    fn default() -> Self {
        Self {
            turso_url: String::new(),
            auth_token: String::new(),
            enabled: false,
            last_sync_at: None,
            last_push_at: None,
            last_pull_at: None,
        }
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
