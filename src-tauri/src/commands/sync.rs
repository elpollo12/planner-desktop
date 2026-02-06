use crate::auth::check_permission;
use crate::models::user::UserRole;
use crate::state::AppState;
use crate::sync::config;
use crate::sync::engine::{self, SyncResult};
use crate::sync::turso_client::TursoClient;
use serde::{Deserialize, Serialize};
use tauri::State;

#[derive(Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SyncConfigInput {
    pub turso_url: String,
    pub auth_token: String,
    #[serde(default)]
    pub sync_interval_minutes: Option<u32>,
}

#[derive(Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SyncStatus {
    pub configured: bool,
    pub enabled: bool,
    pub turso_url: Option<String>,
    pub last_sync_at: Option<String>,
    pub last_push_at: Option<String>,
    pub last_pull_at: Option<String>,
    pub sync_interval_minutes: u32,
}

fn build_status(cfg: &config::SyncConfig) -> SyncStatus {
    SyncStatus {
        configured: !cfg.turso_url.is_empty() && !cfg.auth_token.is_empty(),
        enabled: cfg.enabled,
        turso_url: if cfg.turso_url.is_empty() {
            None
        } else {
            Some(cfg.turso_url.clone())
        },
        last_sync_at: cfg.last_sync_at.clone(),
        last_push_at: cfg.last_push_at.clone(),
        last_pull_at: cfg.last_pull_at.clone(),
        sync_interval_minutes: cfg.sync_interval_minutes,
    }
}

/// Get current sync configuration status (admin only)
#[tauri::command]
pub async fn get_sync_status(
    session_token: String,
    state: State<'_, AppState>,
) -> Result<SyncStatus, String> {
    check_permission(&session_token, UserRole::Admin, &state)
        .map_err(|e| e.to_string())?;

    let cfg = config::load_config()?;
    Ok(build_status(&cfg))
}

/// Save Turso sync configuration (admin only)
#[tauri::command]
pub async fn save_sync_config(
    session_token: String,
    input: SyncConfigInput,
    state: State<'_, AppState>,
) -> Result<SyncStatus, String> {
    check_permission(&session_token, UserRole::Admin, &state)
        .map_err(|e| e.to_string())?;

    if input.turso_url.trim().is_empty() {
        return Err("Turso URL is required".to_string());
    }
    if input.auth_token.trim().is_empty() {
        return Err("Auth token is required".to_string());
    }

    let mut cfg = config::load_config()?;
    cfg.turso_url = input.turso_url.trim().to_string();
    cfg.auth_token = input.auth_token.trim().to_string();
    cfg.enabled = true;
    if let Some(interval) = input.sync_interval_minutes {
        cfg.sync_interval_minutes = interval;
    }

    config::save_config(&cfg)?;
    Ok(build_status(&cfg))
}

/// Update sync interval (admin only)
#[tauri::command]
pub async fn set_sync_interval(
    session_token: String,
    interval_minutes: u32,
    state: State<'_, AppState>,
) -> Result<SyncStatus, String> {
    check_permission(&session_token, UserRole::Admin, &state)
        .map_err(|e| e.to_string())?;

    let mut cfg = config::load_config()?;
    cfg.sync_interval_minutes = interval_minutes;
    config::save_config(&cfg)?;

    Ok(build_status(&cfg))
}

/// Test connection to Turso (admin only)
#[tauri::command]
pub async fn test_turso_connection(
    session_token: String,
    turso_url: String,
    auth_token: String,
    state: State<'_, AppState>,
) -> Result<String, String> {
    check_permission(&session_token, UserRole::Admin, &state)
        .map_err(|e| e.to_string())?;

    let client = TursoClient::new(&turso_url, &auth_token);
    client.test_connection().await?;

    Ok("Conexión exitosa con Turso".to_string())
}

/// Initialize remote database schema (admin only)
#[tauri::command]
pub async fn initialize_remote_database(
    session_token: String,
    state: State<'_, AppState>,
) -> Result<String, String> {
    check_permission(&session_token, UserRole::Admin, &state)
        .map_err(|e| e.to_string())?;

    let cfg = config::load_config()?;
    if cfg.turso_url.is_empty() || cfg.auth_token.is_empty() {
        return Err("Sync no configurado. Guarda las credenciales primero.".to_string());
    }

    let client = TursoClient::new(&cfg.turso_url, &cfg.auth_token);
    engine::initialize_remote_db(&client).await
}

/// Push local data to Turso (admin only)
/// Pattern: lock DB → read sync data → drop lock → async push → lock DB → mark synced → drop lock
#[tauri::command]
pub async fn sync_push(
    session_token: String,
    state: State<'_, AppState>,
) -> Result<SyncResult, String> {
    check_permission(&session_token, UserRole::Admin, &state)
        .map_err(|e| e.to_string())?;

    let cfg = config::load_config()?;
    if cfg.turso_url.is_empty() || cfg.auth_token.is_empty() {
        return Err("Sync no configurado".to_string());
    }

    // Step 1: Read all local data synchronously (lock held briefly)
    let table_data = {
        let conn = state
            .db
            .lock()
            .map_err(|e| format!("Failed to lock database: {}", e))?;
        engine::read_all_local_data(&conn, cfg.last_push_at.as_deref())?
    }; // Lock released here

    // Step 2: Push to Turso asynchronously (no lock held)
    let client = TursoClient::new(&cfg.turso_url, &cfg.auth_token);
    let result = engine::push_data_to_turso(&client, table_data).await?;

    // Step 3: Mark reports as synced (lock held briefly)
    if result.success {
        let conn = state
            .db
            .lock()
            .map_err(|e| format!("Failed to lock database: {}", e))?;
        engine::mark_reports_synced(&conn);
    }

    // Step 4: Update config
    let mut cfg = config::load_config()?;
    cfg.last_push_at = Some(result.timestamp.clone());
    cfg.last_sync_at = Some(result.timestamp.clone());
    config::save_config(&cfg)?;

    Ok(result)
}

/// Pull remote data from Turso (admin only)
/// Pattern: async pull from Turso → lock DB → write to local → drop lock
#[tauri::command]
pub async fn sync_pull(
    session_token: String,
    state: State<'_, AppState>,
) -> Result<SyncResult, String> {
    check_permission(&session_token, UserRole::Admin, &state)
        .map_err(|e| e.to_string())?;

    let cfg = config::load_config()?;
    if cfg.turso_url.is_empty() || cfg.auth_token.is_empty() {
        return Err("Sync no configurado".to_string());
    }

    // Step 1: Pull from Turso asynchronously (no lock needed)
    let client = TursoClient::new(&cfg.turso_url, &cfg.auth_token);
    let (pulled_data, mut result) =
        engine::pull_data_from_turso(&client, cfg.last_pull_at.as_deref()).await?;

    // Step 2: Write to local SQLite synchronously (lock held briefly)
    if !pulled_data.is_empty() {
        let conn = state
            .db
            .lock()
            .map_err(|e| format!("Failed to lock database: {}", e))?;
        match engine::write_pulled_data(&conn, &pulled_data) {
            Ok(_) => {}
            Err(e) => {
                result.success = false;
                result.errors.push(format!("Error writing to local DB: {}", e));
            }
        }
    }

    // Step 3: Update config
    let mut cfg = config::load_config()?;
    cfg.last_pull_at = Some(result.timestamp.clone());
    cfg.last_sync_at = Some(result.timestamp.clone());
    config::save_config(&cfg)?;

    Ok(result)
}

/// Full sync: push then pull (admin only)
#[tauri::command]
pub async fn sync_full(
    session_token: String,
    state: State<'_, AppState>,
) -> Result<SyncResult, String> {
    check_permission(&session_token, UserRole::Admin, &state)
        .map_err(|e| e.to_string())?;

    let cfg = config::load_config()?;
    if cfg.turso_url.is_empty() || cfg.auth_token.is_empty() {
        return Err("Sync no configurado".to_string());
    }

    let client = TursoClient::new(&cfg.turso_url, &cfg.auth_token);
    let now = chrono::Utc::now().to_rfc3339();

    // === PUSH ===
    // Step 1: Read local data (sync, lock held briefly)
    let table_data = {
        let conn = state
            .db
            .lock()
            .map_err(|e| format!("Failed to lock database: {}", e))?;
        engine::read_all_local_data(&conn, cfg.last_push_at.as_deref())?
    };

    // Step 2: Push to Turso (async, no lock)
    let push_result = engine::push_data_to_turso(&client, table_data).await?;

    // Step 3: Mark synced (sync, lock held briefly)
    if push_result.success {
        let conn = state
            .db
            .lock()
            .map_err(|e| format!("Failed to lock database: {}", e))?;
        engine::mark_reports_synced(&conn);
    }

    // === PULL ===
    // Step 4: Pull from Turso (async, no lock)
    let (pulled_data, pull_result) =
        engine::pull_data_from_turso(&client, cfg.last_pull_at.as_deref()).await?;

    // Step 5: Write to local (sync, lock held briefly)
    let mut pull_errors: Vec<String> = Vec::new();
    if !pulled_data.is_empty() {
        let conn = state
            .db
            .lock()
            .map_err(|e| format!("Failed to lock database: {}", e))?;
        if let Err(e) = engine::write_pulled_data(&conn, &pulled_data) {
            pull_errors.push(format!("Error writing to local DB: {}", e));
        }
    }

    // Combine results
    let mut all_errors = push_result.errors;
    all_errors.extend(pull_result.errors);
    all_errors.extend(pull_errors);

    let result = SyncResult {
        success: all_errors.is_empty(),
        tables_synced: push_result.tables_synced + pull_result.tables_synced,
        records_pushed: push_result.records_pushed,
        records_pulled: pull_result.records_pulled,
        errors: all_errors,
        timestamp: now.clone(),
    };

    // Update config
    let mut cfg = config::load_config()?;
    cfg.last_sync_at = Some(now.clone());
    cfg.last_push_at = Some(now.clone());
    cfg.last_pull_at = Some(now);
    config::save_config(&cfg)?;

    Ok(result)
}

/// Disable sync (admin only)
#[tauri::command]
pub async fn disable_sync(
    session_token: String,
    state: State<'_, AppState>,
) -> Result<(), String> {
    check_permission(&session_token, UserRole::Admin, &state)
        .map_err(|e| e.to_string())?;

    let mut cfg = config::load_config()?;
    cfg.enabled = false;
    cfg.turso_url = String::new();
    cfg.auth_token = String::new();
    cfg.last_sync_at = None;
    cfg.last_push_at = None;
    cfg.last_pull_at = None;

    config::save_config(&cfg)?;

    Ok(())
}
