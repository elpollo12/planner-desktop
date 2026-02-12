use crate::auth::{check_permission, get_session};
use crate::models::user::UserRole;
use crate::state::AppState;
use crate::sync::config::{self, TursoCredentials};
use crate::sync::engine::{self, SyncResult};
use crate::sync::turso_client::TursoClient;
use serde::{Deserialize, Serialize};
use tauri::State;

#[derive(Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SyncStatus {
    /// Whether Turso credentials are configured via environment variables
    pub configured: bool,
    /// Whether sync is enabled by admin
    pub enabled: bool,
    /// Last full sync timestamp
    pub last_sync_at: Option<String>,
    /// Last push timestamp
    pub last_push_at: Option<String>,
    /// Last pull timestamp
    pub last_pull_at: Option<String>,
    /// Auto-sync interval in minutes
    pub sync_interval_minutes: u32,
    /// Error message if credentials are not configured
    pub config_error: Option<String>,
}

fn build_status(cfg: &config::SyncConfig) -> SyncStatus {
    let credentials_configured = TursoCredentials::is_configured();
    let config_error = if !credentials_configured {
        Some("Variables de entorno TURSO_DATABASE_URL y TURSO_AUTH_TOKEN no configuradas. Contacte al administrador del sistema.".to_string())
    } else {
        None
    };

    SyncStatus {
        configured: credentials_configured,
        enabled: cfg.enabled && credentials_configured,
        last_sync_at: cfg.last_sync_at.clone(),
        last_push_at: cfg.last_push_at.clone(),
        last_pull_at: cfg.last_pull_at.clone(),
        sync_interval_minutes: cfg.sync_interval_minutes,
        config_error,
    }
}

/// Get current sync configuration status (any authenticated user)
#[tauri::command]
pub async fn get_sync_status(
    session_token: String,
    state: State<'_, AppState>,
) -> Result<SyncStatus, String> {
    get_session(&session_token, &state)
        .map_err(|e| e.to_string())?;

    let cfg = config::load_config()?;
    Ok(build_status(&cfg))
}

/// Enable sync (admin only)
#[tauri::command]
pub async fn enable_sync(
    session_token: String,
    state: State<'_, AppState>,
) -> Result<SyncStatus, String> {
    check_permission(&session_token, UserRole::Admin, &state)
        .map_err(|e| e.to_string())?;

    // Check that credentials are configured
    if !TursoCredentials::is_configured() {
        return Err("No se puede habilitar: Variables de entorno TURSO_DATABASE_URL y TURSO_AUTH_TOKEN no configuradas.".to_string());
    }

    let mut cfg = config::load_config()?;
    cfg.enabled = true;
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

/// Test connection to Turso using environment variables (admin only)
#[tauri::command]
pub async fn test_turso_connection(
    session_token: String,
    state: State<'_, AppState>,
) -> Result<String, String> {
    check_permission(&session_token, UserRole::Admin, &state)
        .map_err(|e| e.to_string())?;

    let credentials = TursoCredentials::from_env()?;
    let client = TursoClient::new(&credentials.database_url, &credentials.auth_token);
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

    let credentials = TursoCredentials::from_env()?;
    let client = TursoClient::new(&credentials.database_url, &credentials.auth_token);
    engine::initialize_remote_db(&client).await
}

/// Push local data to Turso (any authenticated user)
/// Pattern: lock DB → read sync data → drop lock → async push → lock DB → mark synced → drop lock
#[tauri::command]
pub async fn sync_push(
    session_token: String,
    state: State<'_, AppState>,
) -> Result<SyncResult, String> {
    get_session(&session_token, &state)
        .map_err(|e| e.to_string())?;

    let cfg = config::load_config()?;
    let credentials = TursoCredentials::from_env()?;

    // Step 1: Read all local data synchronously (lock held briefly)
    let table_data = {
        let conn = state
            .db
            .lock()
            .map_err(|e| format!("Failed to lock database: {}", e))?;
        engine::read_all_local_data(&conn, cfg.last_push_at.as_deref())?
    }; // Lock released here

    // Step 2: Push to Turso asynchronously (no lock held)
    let client = TursoClient::new(&credentials.database_url, &credentials.auth_token);

    // Ensure remote schema/migrations are up to date
    let _ = engine::initialize_remote_db(&client).await;

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

/// Pull remote data from Turso (any authenticated user)
/// Pattern: async pull from Turso → lock DB → write to local → drop lock
#[tauri::command]
pub async fn sync_pull(
    session_token: String,
    state: State<'_, AppState>,
) -> Result<SyncResult, String> {
    get_session(&session_token, &state)
        .map_err(|e| e.to_string())?;

    let cfg = config::load_config()?;
    let credentials = TursoCredentials::from_env()?;

    // Step 1: Pull from Turso asynchronously (no lock needed)
    let client = TursoClient::new(&credentials.database_url, &credentials.auth_token);

    // Ensure remote schema/migrations are up to date
    let _ = engine::initialize_remote_db(&client).await;

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

    let credentials = TursoCredentials::from_env()?;
    let client = TursoClient::new(&credentials.database_url, &credentials.auth_token);
    let now = chrono::Utc::now().to_rfc3339();

    // Ensure remote schema/migrations are up to date
    let _ = engine::initialize_remote_db(&client).await;

    // === PUSH ===
    // Step 1: Read ALL local data (full sync pushes everything, not incremental)
    // This ensures cleanup_turso_child_rows covers ALL reports, removing duplicates
    let table_data = {
        let conn = state
            .db
            .lock()
            .map_err(|e| format!("Failed to lock database: {}", e))?;
        engine::read_all_local_data(&conn, None)?
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
    // For full sync, use None to pull ALL data, not just incremental updates
    let (pulled_data, pull_result) =
        engine::pull_data_from_turso(&client, None).await?;

    // Step 5: Write to local + reconcile stale records (sync, lock held briefly)
    let mut pull_errors: Vec<String> = Vec::new();
    if !pulled_data.is_empty() {
        let conn = state
            .db
            .lock()
            .map_err(|e| format!("Failed to lock database: {}", e))?;
        if let Err(e) = engine::write_pulled_data(&conn, &pulled_data) {
            pull_errors.push(format!("Error writing to local DB: {}", e));
        }

        // Step 6: Remove local records that don't exist in Turso
        // Only safe after push succeeded (all local data is already in Turso)
        if push_result.success {
            if let Err(e) = engine::reconcile_local_with_remote(&conn, &pulled_data) {
                pull_errors.push(format!("Reconciliation warning: {}", e));
            }
        }
    }

    // === PURGE soft-deleted records older than 7 days ===
    let mut purge_errors: Vec<String> = Vec::new();

    // Purge from Turso first (async, no lock needed)
    if let Err(e) = engine::purge_turso_soft_deleted(&client, 7).await {
        purge_errors.push(format!("Turso purge warning: {}", e));
    }

    // Purge from local DB (sync, lock held briefly)
    {
        let conn = state
            .db
            .lock()
            .map_err(|e| format!("Failed to lock database: {}", e))?;
        if let Err(e) = engine::purge_local_soft_deleted(&conn, 7) {
            purge_errors.push(format!("Local purge warning: {}", e));
        }
    }

    // Combine results
    let mut all_errors = push_result.errors;
    all_errors.extend(pull_result.errors);
    all_errors.extend(pull_errors);
    all_errors.extend(purge_errors);

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

/// Incremental sync: push changes + pull changes (any authenticated user)
/// Only sends/receives records modified since last sync timestamps
#[tauri::command]
pub async fn sync_incremental(
    session_token: String,
    state: State<'_, AppState>,
) -> Result<SyncResult, String> {
    get_session(&session_token, &state)
        .map_err(|e| e.to_string())?;

    let cfg = config::load_config()?;
    let credentials = TursoCredentials::from_env()?;
    let client = TursoClient::new(&credentials.database_url, &credentials.auth_token);
    let now = chrono::Utc::now().to_rfc3339();

    // Ensure remote schema/migrations are up to date
    let _ = engine::initialize_remote_db(&client).await;

    // === INCREMENTAL PUSH (only changes since last_push_at) ===
    let table_data = {
        let conn = state
            .db
            .lock()
            .map_err(|e| format!("Failed to lock database: {}", e))?;
        engine::read_all_local_data(&conn, cfg.last_push_at.as_deref())?
    };

    let push_result = engine::push_data_to_turso(&client, table_data).await?;

    if push_result.success {
        let conn = state
            .db
            .lock()
            .map_err(|e| format!("Failed to lock database: {}", e))?;
        engine::mark_reports_synced(&conn);
    }

    // === INCREMENTAL PULL (only changes since last_pull_at) ===
    let (pulled_data, pull_result) =
        engine::pull_data_from_turso(&client, cfg.last_pull_at.as_deref()).await?;

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

    // Update config timestamps
    let mut cfg = config::load_config()?;
    cfg.last_sync_at = Some(now.clone());
    cfg.last_push_at = Some(now.clone());
    cfg.last_pull_at = Some(now);
    config::save_config(&cfg)?;

    Ok(result)
}

/// Disable sync (admin only) - resets timestamps and enabled flag
#[tauri::command]
pub async fn disable_sync(
    session_token: String,
    state: State<'_, AppState>,
) -> Result<(), String> {
    check_permission(&session_token, UserRole::Admin, &state)
        .map_err(|e| e.to_string())?;

    let mut cfg = config::load_config()?;
    cfg.enabled = false;
    cfg.last_sync_at = None;
    cfg.last_push_at = None;
    cfg.last_pull_at = None;

    config::save_config(&cfg)?;

    Ok(())
}
