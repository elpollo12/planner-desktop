use crate::auth::{check_permission, get_session};
use crate::models::user::UserRole;
use crate::state::AppState;
use crate::sync::config::{self, SyncCredentials};
use crate::sync::sync_client::SyncClient;
use crate::sync::engine::{self, SyncResult};
use serde::{Deserialize, Serialize};
use tauri::State;

#[derive(Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SyncStatus {
    pub configured: bool,
    pub enabled: bool,
    pub last_sync_at: Option<String>,
    pub last_push_at: Option<String>,
    pub last_pull_at: Option<String>,
    pub sync_interval_minutes: u32,
    pub config_error: Option<String>,
}

fn build_status(cfg: &config::SyncConfig) -> SyncStatus {
    let configured = SyncCredentials::is_configured();
    let config_error = if !configured {
        Some("Variable de entorno SYNC_SERVER_URL no configurada. Contacte al administrador del sistema.".to_string())
    } else {
        None
    };
    SyncStatus {
        configured,
        enabled: cfg.enabled && configured,
        last_sync_at: cfg.last_sync_at.clone(),
        last_push_at: cfg.last_push_at.clone(),
        last_pull_at: cfg.last_pull_at.clone(),
        sync_interval_minutes: cfg.sync_interval_minutes,
        config_error,
    }
}

/// Build a SyncClient with token from config.
fn build_sync_client() -> Result<SyncClient, String> {
    let creds = SyncCredentials::from_env()?;
    let cfg = config::load_config()?;
    let mut client = SyncClient::new(&creds.server_url);
    if let Some(token) = &cfg.sync_token {
        client.set_token(token.clone());
    }
    Ok(client)
}

#[tauri::command]
pub async fn get_sync_status(
    session_token: String,
    state: State<'_, AppState>,
) -> Result<SyncStatus, String> {
    get_session(&session_token, &state).map_err(|e| e.to_string())?;
    let cfg = config::load_config()?;
    Ok(build_status(&cfg))
}

#[tauri::command]
pub async fn enable_sync(
    session_token: String,
    state: State<'_, AppState>,
) -> Result<SyncStatus, String> {
    check_permission(&session_token, UserRole::Admin, &state).map_err(|e| e.to_string())?;
    if !SyncCredentials::is_configured() {
        return Err("No se puede habilitar: Variable de entorno SYNC_SERVER_URL no configurada.".to_string());
    }
    let mut cfg = config::load_config()?;
    cfg.enabled = true;
    config::save_config(&cfg)?;
    Ok(build_status(&cfg))
}

#[tauri::command]
pub async fn set_sync_interval(
    session_token: String,
    interval_minutes: u32,
    state: State<'_, AppState>,
) -> Result<SyncStatus, String> {
    check_permission(&session_token, UserRole::Admin, &state).map_err(|e| e.to_string())?;
    let mut cfg = config::load_config()?;
    cfg.sync_interval_minutes = interval_minutes;
    config::save_config(&cfg)?;
    Ok(build_status(&cfg))
}

/// Test connection to planner-sync server (admin only, shows detailed info).
#[tauri::command]
pub async fn test_sync_connection(
    session_token: String,
    state: State<'_, AppState>,
) -> Result<String, String> {
    check_permission(&session_token, UserRole::Admin, &state).map_err(|e| e.to_string())?;
    let creds = SyncCredentials::from_env()?;
    let client = SyncClient::new(&creds.server_url);
    client.test_connection().await
}

/// Lightweight ping to check if sync server is reachable (any authenticated user).
/// Returns true if server responds, false otherwise.
#[tauri::command]
pub async fn ping_sync_server(
    session_token: String,
    state: State<'_, AppState>,
) -> Result<bool, String> {
    // Just verify session is valid, no admin check
    get_session(&session_token, &state).map_err(|e| e.to_string())?;
    
    // Check if sync is configured
    if !SyncCredentials::is_configured() {
        return Ok(false);
    }
    
    let creds = SyncCredentials::from_env()?;
    let client = SyncClient::new(&creds.server_url);
    
    match client.test_connection().await {
        Ok(_) => Ok(true),
        Err(_) => Ok(false),
    }
}

/// Login to planner-sync and persist JWT token.
#[tauri::command]
pub async fn sync_login(
    session_token: String,
    username: String,
    password: String,
    state: State<'_, AppState>,
) -> Result<String, String> {
    check_permission(&session_token, UserRole::Admin, &state).map_err(|e| e.to_string())?;
    let creds = SyncCredentials::from_env()?;
    let mut client = SyncClient::new(&creds.server_url);
    let login = client.login(&username, &password).await?;

    // Persist token
    let mut cfg = config::load_config()?;
    cfg.sync_token = Some(login.token);
    config::save_config(&cfg)?;

    Ok(format!("Login exitoso como {} ({})", login.user.full_name, login.user.role))
}

/// Push local data to planner-sync.
#[tauri::command]
pub async fn sync_push(
    session_token: String,
    state: State<'_, AppState>,
) -> Result<SyncResult, String> {
    get_session(&session_token, &state).map_err(|e| e.to_string())?;
    let cfg = config::load_config()?;
    let client = build_sync_client()?;

    let table_data = {
        let conn = state.db.lock().map_err(|e| format!("Failed to lock database: {}", e))?;
        engine::read_all_local_data(&conn, cfg.last_push_at.as_deref())?
    };

    let result = engine::push_data_to_server(&client, table_data).await?;

    if result.success {
        let conn = state.db.lock().map_err(|e| format!("Failed to lock database: {}", e))?;
        engine::mark_reports_synced(&conn);

        // Solo avanzar timestamps si el push fue completamente exitoso
        let mut cfg = config::load_config()?;
        cfg.last_push_at = Some(result.timestamp.clone());
        cfg.last_sync_at = Some(result.timestamp.clone());
        config::save_config(&cfg)?;
    }

    Ok(result)
}

/// Pull remote data from planner-sync.
#[tauri::command]
pub async fn sync_pull(
    session_token: String,
    state: State<'_, AppState>,
) -> Result<SyncResult, String> {
    get_session(&session_token, &state).map_err(|e| e.to_string())?;
    let cfg = config::load_config()?;
    let client = build_sync_client()?;

    let (pulled_data, mut result) =
        engine::pull_data_from_server(&client, cfg.last_pull_at.as_deref()).await?;

    let mut write_succeeded = true;
    if !pulled_data.is_empty() {
        let conn = state.db.lock().map_err(|e| format!("Failed to lock database: {}", e))?;
        match engine::write_pulled_data(&conn, &pulled_data) {
            Ok(_) => {
                if let Err(e) = engine::recalculate_logistics_stock(&conn) {
                    result.errors.push(format!("Stock recalculation warning: {}", e));
                }
            }
            Err(e) => {
                write_succeeded = false;
                result.success = false;
                result.errors.push(format!("Error writing to local DB: {}", e));
            }
        }
    }

    // Solo avanzar timestamps si la escritura fue exitosa
    if write_succeeded {
        let mut cfg = config::load_config()?;
        cfg.last_pull_at = Some(result.timestamp.clone());
        cfg.last_sync_at = Some(result.timestamp.clone());
        config::save_config(&cfg)?;
    }

    Ok(result)
}

/// Full sync: push all then pull all + reconcile + purge local.
#[tauri::command]
pub async fn sync_full(
    session_token: String,
    state: State<'_, AppState>,
) -> Result<SyncResult, String> {
    check_permission(&session_token, UserRole::Admin, &state).map_err(|e| e.to_string())?;
    let client = build_sync_client()?;
    let now = chrono::Utc::now().to_rfc3339();

    // PUSH all
    let table_data = {
        let conn = state.db.lock().map_err(|e| format!("Failed to lock database: {}", e))?;
        engine::read_all_local_data(&conn, None)?
    };
    let push_result = engine::push_data_to_server(&client, table_data).await?;

    if push_result.success {
        let conn = state.db.lock().map_err(|e| format!("Failed to lock database: {}", e))?;
        engine::mark_reports_synced(&conn);
    }

    // PULL all
    let (pulled_data, pull_result) = engine::pull_data_from_server(&client, None).await?;

    let mut pull_errors: Vec<String> = Vec::new();
    if !pulled_data.is_empty() {
        let conn = state.db.lock().map_err(|e| format!("Failed to lock database: {}", e))?;
        if let Err(e) = engine::write_pulled_data(&conn, &pulled_data) {
            pull_errors.push(format!("Error writing to local DB: {}", e));
        }
        if push_result.success {
            if let Err(e) = engine::reconcile_local_with_remote(&conn, &pulled_data) {
                pull_errors.push(format!("Reconciliation warning: {}", e));
            }
        }
        if let Err(e) = engine::recalculate_logistics_stock(&conn) {
            pull_errors.push(format!("Stock recalculation warning: {}", e));
        }
    }

    // LOCAL PURGE (server has its own cron)
    {
        let conn = state.db.lock().map_err(|e| format!("Failed to lock database: {}", e))?;
        if let Err(e) = engine::purge_local_soft_deleted(&conn, 7) {
            pull_errors.push(format!("Local purge warning: {}", e));
        }
    }

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

    let mut cfg = config::load_config()?;
    cfg.last_sync_at = Some(now.clone());
    cfg.last_push_at = Some(now.clone());
    cfg.last_pull_at = Some(now);
    config::save_config(&cfg)?;

    Ok(result)
}

/// Incremental sync: push changes + pull changes.
#[tauri::command]
pub async fn sync_incremental(
    session_token: String,
    state: State<'_, AppState>,
) -> Result<SyncResult, String> {
    get_session(&session_token, &state).map_err(|e| e.to_string())?;
    let cfg = config::load_config()?;
    let client = build_sync_client()?;
    let now = chrono::Utc::now().to_rfc3339();

    // Incremental push
    let table_data = {
        let conn = state.db.lock().map_err(|e| format!("Failed to lock database: {}", e))?;
        engine::read_all_local_data(&conn, cfg.last_push_at.as_deref())?
    };
    let push_result = engine::push_data_to_server(&client, table_data).await?;

    let push_succeeded = push_result.success;
    if push_succeeded {
        let conn = state.db.lock().map_err(|e| format!("Failed to lock database: {}", e))?;
        engine::mark_reports_synced(&conn);
    }

    // Incremental pull
    let (pulled_data, pull_result) =
        engine::pull_data_from_server(&client, cfg.last_pull_at.as_deref()).await?;

    let mut pull_errors: Vec<String> = Vec::new();
    let mut pull_write_succeeded = true;
    if !pulled_data.is_empty() {
        let conn = state.db.lock().map_err(|e| format!("Failed to lock database: {}", e))?;
        if let Err(e) = engine::write_pulled_data(&conn, &pulled_data) {
            pull_write_succeeded = false;
            pull_errors.push(format!("Error writing to local DB: {}", e));
        }
        if let Err(e) = engine::recalculate_logistics_stock(&conn) {
            pull_errors.push(format!("Stock recalculation warning: {}", e));
        }
    }

    let mut all_errors = push_result.errors;
    all_errors.extend(pull_result.errors);
    all_errors.extend(pull_errors);

    let result = SyncResult {
        success: push_succeeded && pull_write_succeeded && all_errors.is_empty(),
        tables_synced: push_result.tables_synced + pull_result.tables_synced,
        records_pushed: push_result.records_pushed,
        records_pulled: pull_result.records_pulled,
        errors: all_errors,
        timestamp: now.clone(),
    };

    // Solo avanzar timestamps de operaciones exitosas
    let mut cfg = config::load_config()?;
    if push_succeeded {
        cfg.last_push_at = Some(now.clone());
    }
    if pull_write_succeeded {
        cfg.last_pull_at = Some(now.clone());
    }
    if push_succeeded && pull_write_succeeded {
        cfg.last_sync_at = Some(now);
    }
    config::save_config(&cfg)?;

    Ok(result)
}

/// Disable sync: reset timestamps and enabled flag.
#[tauri::command]
pub async fn disable_sync(
    session_token: String,
    state: State<'_, AppState>,
) -> Result<(), String> {
    check_permission(&session_token, UserRole::Admin, &state).map_err(|e| e.to_string())?;
    let mut cfg = config::load_config()?;
    cfg.enabled = false;
    cfg.last_sync_at = None;
    cfg.last_push_at = None;
    cfg.last_pull_at = None;
    cfg.sync_token = None;
    config::save_config(&cfg)?;
    Ok(())
}
