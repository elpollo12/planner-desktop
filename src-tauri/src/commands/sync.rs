use crate::auth::{check_permission, get_session};
use crate::models::audit_log::{AuditEntry, NewAuditEntry, AUDIT_CONNECT_SYNC, AUDIT_DISCONNECT_SYNC};
use crate::models::user::UserRole;
use crate::state::AppState;
use crate::sync::config::{self, SyncCredentials};
use crate::sync::sync_client::{SyncClient, SYNC_AUTH_ERROR_PREFIX, build_http_client};
use crate::sync::engine::{self, SyncResult};
use crate::sync::turso_client::TursoValue;
use serde::{Deserialize, Serialize};
use tauri::State;

/// Si el error es un 401 de planner-sync, borra el token guardado en disco
/// para que el estado sea consistente (token nulo = desconectado).
/// Retorna el error original sin modificar para que suba al frontend.
fn handle_sync_error(error: String) -> String {
    if error.starts_with(SYNC_AUTH_ERROR_PREFIX) {
        // Limpiar token del disco — ya no es válido
        if let Ok(mut cfg) = config::load_config() {
            cfg.sync_token = None;
            let _ = config::save_config(&cfg);
        }
        println!("[Sync] Token expirado detectado — limpiando sync_token del disco");
    }
    error
}

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

/// Build a SyncClient with token from config, with fallback to localhost:3001.
async fn build_sync_client() -> Result<SyncClient, String> {
    let creds = SyncCredentials::resolve_with_fallback().await?;
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

    // Usar resolve_with_fallback para coincidir con la lógica real del sync
    let creds = match SyncCredentials::resolve_with_fallback().await {
        Ok(c) => c,
        Err(_) => return Ok(false),
    };
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
    let client = build_sync_client().await?;

    let table_data = {
        let conn = state.db.lock().map_err(|e| format!("Failed to lock database: {}", e))?;
        engine::read_all_local_data(&conn, cfg.last_push_at.as_deref(), &[])?
    };

    let result = engine::push_data_to_server(&client, table_data).await
        .map_err(handle_sync_error)?;

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
    let client = build_sync_client().await?;

    let (pulled_data, mut result) =
        engine::pull_data_from_server(&client, cfg.last_pull_at.as_deref()).await
        .map_err(handle_sync_error)?;

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
    let client = build_sync_client().await?;
    let now = chrono::Utc::now().to_rfc3339();

    // PUSH all — exclude app_settings: it's a server-owned singleton.
    // Pushing local defaults on a fresh DB would overwrite the admin's branding on the server.
    // app_settings is always received via PULL and updated via incremental push when changed.
    let table_data = {
        let conn = state.db.lock().map_err(|e| format!("Failed to lock database: {}", e))?;
        engine::read_all_local_data(&conn, None, &["app_settings"])?
    };
    let push_result = engine::push_data_to_server(&client, table_data).await
        .map_err(handle_sync_error)?;

    if push_result.success {
        let conn = state.db.lock().map_err(|e| format!("Failed to lock database: {}", e))?;
        engine::mark_reports_synced(&conn);
    }

    // PULL all
    let (pulled_data, pull_result) = engine::pull_data_from_server(&client, None).await
        .map_err(handle_sync_error)?;

    let mut pull_errors: Vec<String> = Vec::new();
    if !pulled_data.is_empty() {
        let conn = state.db.lock().map_err(|e| format!("Failed to lock database: {}", e))?;
        let write_ok = match engine::write_pulled_data(&conn, &pulled_data) {
            Ok(_) => true,
            Err(e) => {
                pull_errors.push(format!("Error writing to local DB: {}", e));
                false
            }
        };
        // Only reconcile if write succeeded — otherwise pulled_data is not in local DB
        // and reconcile would delete valid local records not present in the partial batch.
        if write_ok && push_result.success {
            if let Err(e) = engine::reconcile_local_with_remote(&conn, &pulled_data) {
                pull_errors.push(format!("Reconciliation warning: {}", e));
            }
        }
        if write_ok {
            if let Err(e) = engine::recalculate_logistics_stock(&conn) {
                pull_errors.push(format!("Stock recalculation warning: {}", e));
            }
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
    all_errors.extend(pull_errors.clone());

    let result = SyncResult {
        success: all_errors.is_empty(),
        tables_synced: push_result.tables_synced + pull_result.tables_synced,
        records_pushed: push_result.records_pushed,
        records_pulled: pull_result.records_pulled,
        errors: all_errors,
        timestamp: now.clone(),
    };

    let mut cfg = config::load_config()?;
    if push_result.success {
        cfg.last_push_at = Some(now.clone());
    }
    if pull_errors.is_empty() && !pulled_data.is_empty() || pulled_data.is_empty() {
        cfg.last_pull_at = Some(now.clone());
    }
    if push_result.success && pull_errors.is_empty() {
        cfg.last_sync_at = Some(now);
    }
    config::save_config(&cfg)?;

    Ok(result)
}

/// Incremental sync: pull primero, push después (solo si el usuario tiene historial de push).
///
/// Usuarios no-admin sin `last_push_at` (primer login o DB fresca) solo hacen pull.
/// Esto evita empujar datos locales vacíos/default al servidor antes de recibir
/// la verdad del servidor. A partir del segundo ciclo hacen push+pull normalmente.
#[tauri::command]
pub async fn sync_incremental(
    session_token: String,
    state: State<'_, AppState>,
) -> Result<SyncResult, String> {
    let session = get_session(&session_token, &state).map_err(|e| e.to_string())?;
    let cfg = config::load_config()?;
    let client = build_sync_client().await?;
    let now = chrono::Utc::now().to_rfc3339();

    // Un usuario no-admin salta el push SOLO en el primer ciclo de vida de la sesión
    // (cuando last_push_at es null y aún no ha hecho su primer push esta sesión).
    // Garantiza que recibe la verdad del servidor antes de empujar cualquier dato local.
    // El flag `initial_push_done` vive en memoria y se resetea al reiniciar la app.
    let is_admin = session.role == "admin";
    let has_push_history = cfg.last_push_at.is_some();

    let skip_push = if is_admin || has_push_history {
        // Admin siempre empuja. Usuario con historial también.
        false
    } else {
        // No-admin sin historial: saltar solo si NO ha completado su primer push esta sesión.
        let mut done_set = state.initial_push_done.lock()
            .map_err(|e| format!("Internal error: {}", e))?;
        if done_set.contains(&session.user_id) {
            // Ya hizo su primer push en este arranque de la app → empujar normalmente
            false
        } else {
            // Primer ciclo sin historial → saltar push, marcar como "primer ciclo cumplido"
            done_set.insert(session.user_id.clone());
            true
        }
    };

    // ── PULL primero ──────────────────────────────────────────────────────────
    let (pulled_data, pull_result) =
        engine::pull_data_from_server(&client, cfg.last_pull_at.as_deref()).await
        .map_err(handle_sync_error)?;

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

    // ── PUSH después (omitir si es primer ciclo de no-admin) ──────────────────
    let push_result = if skip_push {
        println!("[Sync] Primer ciclo no-admin — omitiendo push, solo pull");
        SyncResult {
            success: true,
            tables_synced: 0,
            records_pushed: 0,
            records_pulled: 0,
            errors: vec![],
            timestamp: now.clone(),
        }
    } else {
        let table_data = {
            let conn = state.db.lock().map_err(|e| format!("Failed to lock database: {}", e))?;
            engine::read_all_local_data(&conn, cfg.last_push_at.as_deref(), &[])?
        };
        engine::push_data_to_server(&client, table_data).await
            .map_err(handle_sync_error)?
    };

    let push_succeeded = push_result.success;
    if push_succeeded && !skip_push {
        let conn = state.db.lock().map_err(|e| format!("Failed to lock database: {}", e))?;
        engine::mark_reports_synced(&conn);
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

    // Solo avanzar timestamps de operaciones exitosas.
    // last_push_at solo avanza si realmente se hizo push (no en ciclo skip_push).
    let mut cfg = config::load_config()?;
    if push_succeeded && !skip_push {
        cfg.last_push_at = Some(now.clone());
    }
    if pull_write_succeeded {
        cfg.last_pull_at = Some(now.clone());
    }
    if (push_succeeded || skip_push) && pull_write_succeeded {
        cfg.last_sync_at = Some(now);
    }
    config::save_config(&cfg)?;

    Ok(result)
}

/// Connect to sync server: save URL + login + enable — all in one step.
/// This is the main entry point for setting up sync.
#[tauri::command]
pub async fn connect_sync_server(
    session_token: String,
    url: String,
    username: String,
    password: String,
    state: State<'_, AppState>,
) -> Result<SyncStatus, String> {
    check_permission(&session_token, UserRole::Admin, &state).map_err(|e| e.to_string())?;

    let trimmed_url = url.trim().trim_end_matches('/').to_string();
    if trimmed_url.is_empty() {
        return Err("La URL del servidor no puede estar vacía".to_string());
    }

    // Step 1: Test connection
    let client = SyncClient::new(&trimmed_url);
    client.test_connection().await
        .map_err(|e| format!("No se pudo conectar al servidor: {}", e))?;

    // Step 2: Login and get token
    let mut client = SyncClient::new(&trimmed_url);
    let login = client.login(&username, &password).await
        .map_err(|e| {
            let e_str = e.to_string();
            if e_str.contains("404") || e_str.contains("Not Found") || e_str.contains("Cannot POST") {
                "URL incorrecta: el servidor no reconoce la ruta de autenticación. Verifica que sea un servidor planner-sync válido.".to_string()
            } else if e_str.contains("401") || e_str.contains("Unauthorized") || e_str.contains("Invalid") {
                "Usuario o contraseña incorrectos.".to_string()
            } else {
                format!("Error al autenticar: {}", e_str)
            }
        })?;

    // Step 3: Save everything and enable
    let mut cfg = config::load_config()?;
    cfg.server_url = Some(trimmed_url.clone());
    cfg.sync_token = Some(login.token);
    cfg.enabled = true;
    // Reset timestamps for fresh sync
    cfg.last_sync_at = None;
    cfg.last_push_at = None;
    cfg.last_pull_at = None;
    config::save_config(&cfg)?;

    // Persistir URL en app_settings como respaldo ante pérdida de sync_config.json
    {
        let conn = state.db.lock().map_err(|e| format!("Failed to lock database: {}", e))?;
        let _ = conn.execute(
            "UPDATE app_settings SET sync_server_url = ?1 WHERE id = 1",
            rusqlite::params![&trimmed_url],
        );
    }

    // Audit: conexión a sync establecida
    {
        let session = get_session(&session_token, &state).map_err(|e| e.to_string())?;
        let conn = state.db.lock().map_err(|e| format!("Failed to lock database: {}", e))?;
        AuditEntry::record(&conn, NewAuditEntry {
            actor_id:    &session.user_id,
            actor_name:  &session.username,
            action:      AUDIT_CONNECT_SYNC,
            target_type: Some("sync_server"),
            target_id:   None,
            target_name: Some(&trimmed_url),
            detail:      None,
        });
    }

    println!("[Sync] Conectado como {} ({})", login.user.full_name, login.user.role);
    Ok(build_status(&cfg))
}

/// Set the sync server URL (admin only). Clears token since URL changed.
#[tauri::command]
pub async fn set_sync_server_url(
    session_token: String,
    url: String,
    state: State<'_, AppState>,
) -> Result<SyncStatus, String> {
    check_permission(&session_token, UserRole::Admin, &state).map_err(|e| e.to_string())?;
    let mut cfg = config::load_config()?;
    let trimmed = url.trim().trim_end_matches('/').to_string();
    cfg.server_url = if trimmed.is_empty() { None } else { Some(trimmed) };
    // Reset token since server changed
    cfg.sync_token = None;
    cfg.enabled = false;
    config::save_config(&cfg)?;
    Ok(build_status(&cfg))
}

/// Get the currently configured sync server URL.
#[tauri::command]
pub async fn get_sync_server_url(
    session_token: String,
    state: State<'_, AppState>,
) -> Result<Option<String>, String> {
    get_session(&session_token, &state).map_err(|e| e.to_string())?;
    Ok(config::SyncCredentials::get_configured_url())
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
    cfg.server_url = None;
    config::save_config(&cfg)?;

    // Limpiar URL de app_settings + audit desconexión
    {
        let session = get_session(&session_token, &state).map_err(|e| e.to_string())?;
        let conn = state.db.lock().map_err(|e| format!("Failed to lock database: {}", e))?;
        let _ = conn.execute(
            "UPDATE app_settings SET sync_server_url = NULL WHERE id = 1",
            [],
        );
        AuditEntry::record(&conn, NewAuditEntry {
            actor_id:    &session.user_id,
            actor_name:  &session.username,
            action:      AUDIT_DISCONNECT_SYNC,
            target_type: None,
            target_id:   None,
            target_name: None,
            detail:      None,
        });
    }

    Ok(())
}

// ─── Handshake ────────────────────────────────────────────────────────────────

/// Respuesta del servidor para una tabla en el handshake
#[derive(Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
struct HandshakeTablePayload {
    pub name: String,
    pub columns: Vec<String>,
    pub rows: Vec<Vec<serde_json::Value>>,
}

/// Respuesta completa del endpoint /api/v1/sync/handshake
#[derive(Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
struct HandshakeResponse {
    pub tables: Vec<HandshakeTablePayload>,
}

/// Resultado del handshake retornado al frontend
#[derive(Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct HandshakeResult {
    pub success: bool,
    pub tables_written: u32,
    pub error: Option<String>,
}

/// Handshake post-activación de licencia: descarga tablas bootstrap del servidor
/// (users, rigs, app_settings, etc.) usando el tenant como credencial.
/// Best-effort: si falla, la licencia queda activa igual. Sin JWT.
#[tauri::command]
pub async fn sync_handshake(
    state: State<'_, AppState>,
) -> Result<HandshakeResult, String> {
    // Si el handshake ya se completó para esta licencia, no repetirlo.
    // Solo se resetea al activar una nueva licencia (activate_license).
    if let Ok(cfg) = config::load_config() {
        if cfg.handshake_done {
            println!("[Handshake] Ya completado, omitiendo.");
            return Ok(HandshakeResult {
                success: true,
                tables_written: 0,
                error: None,
            });
        }
    }

    // Leer tenant y api_endpoint de la licencia activada
    let license = match crate::license::load_license() {
        Ok(Some(lic)) => lic,
        Ok(None) => {
            return Ok(HandshakeResult {
                success: false,
                tables_written: 0,
                error: Some("No hay licencia activa".to_string()),
            });
        }
        Err(e) => {
            return Ok(HandshakeResult {
                success: false,
                tables_written: 0,
                error: Some(format!("Error leyendo licencia: {}", e)),
            });
        }
    };

    let api_endpoint = license.payload.api_endpoint.trim_end_matches('/').to_string();
    let tenant = &license.payload.tenant;
    let url = format!("{}/api/v1/sync/handshake", api_endpoint);

    // Cliente HTTP — acepta certs inválidos si el host es una IP
    let client = build_http_client(&api_endpoint);

    let resp = match client
        .post(&url)
        .json(&serde_json::json!({ "tenant": tenant }))
        .send()
        .await
    {
        Ok(r) => r,
        Err(e) => {
            return Ok(HandshakeResult {
                success: false,
                tables_written: 0,
                error: Some(format!("Error conectando al servidor: {}", e)),
            });
        }
    };

    if !resp.status().is_success() {
        let status = resp.status().as_u16();
        let body = resp.text().await.unwrap_or_default();
        return Ok(HandshakeResult {
            success: false,
            tables_written: 0,
            error: Some(format!("Servidor rechazó handshake ({}): {}", status, body)),
        });
    }

    let handshake: HandshakeResponse = match resp.json().await {
        Ok(h) => h,
        Err(e) => {
            return Ok(HandshakeResult {
                success: false,
                tables_written: 0,
                error: Some(format!("Error parseando respuesta del servidor: {}", e)),
            });
        }
    };

    // Convertir a formato que espera engine::write_pulled_data
    // Necesitamos mapear por índice en SYNC_TABLES
    let sync_tables_names: Vec<&str> = [
        "app_settings", "users", "operation_codes", "areas", "companies",
        "rigs", "rig_contractors", "rig_personnel", "user_rigs",
        "user_module_permissions", "reports", "drill_string_components",
        "crew_shifts", "crew_members", "time_distribution", "bit_records",
        "mud_records", "mud_additives", "drilling_parameters", "deviation_history",
        "operations_log", "report_reviews", "update_preferences",
        "logistics_materials", "logistics_water_bottles_movements",
        "logistics_fuel_movements", "logistics_vacuum_actions",
        "logistics_materials_movements", "logistics_requests", "crew_positions",
        "incident_types", "incidents", "incident_personnel",
        "last_report_snapshot", "notifications",
    ].iter().copied().collect();

    let mut table_results: Vec<(usize, Vec<Vec<TursoValue>>)> = Vec::new();

    for table_payload in &handshake.tables {
        // Encontrar índice en SYNC_TABLES
        let idx = match sync_tables_names.iter().position(|&n| n == table_payload.name) {
            Some(i) => i,
            None => {
                println!("[Handshake] Tabla desconocida ignorada: {}", table_payload.name);
                continue;
            }
        };

        // Convertir filas de serde_json::Value a TursoValue
        let rows: Vec<Vec<TursoValue>> = table_payload.rows.iter().map(|row| {
            row.iter().map(|cell| match cell {
                serde_json::Value::String(s) => TursoValue::Text(s.clone()),
                serde_json::Value::Number(n) => {
                    if let Some(i) = n.as_i64() {
                        TursoValue::Integer(i.to_string())
                    } else if let Some(f) = n.as_f64() {
                        TursoValue::Float(f)
                    } else {
                        TursoValue::Null
                    }
                }
                serde_json::Value::Null => TursoValue::Null,
                serde_json::Value::Bool(b) => TursoValue::Integer(if *b { "1" } else { "0" }.to_string()),
                _ => TursoValue::Null,
            }).collect()
        }).collect();

        if !rows.is_empty() {
            println!("[Handshake] Tabla '{}': {} registros recibidos", table_payload.name, rows.len());
            table_results.push((idx, rows));
        }
    }

    if table_results.is_empty() {
        return Ok(HandshakeResult {
            success: true,
            tables_written: 0,
            error: None,
        });
    }

    // Escribir en DB local — soltar el lock antes de cualquier .await
    let write_result = {
        let conn = state.db.lock().map_err(|e| format!("Failed to lock database: {}", e))?;
        engine::write_pulled_data(&conn, &table_results)
    };

    match write_result {
        Ok(count) => {
            println!("[Handshake] {} registros escritos exitosamente", count);

            // Registrar endpoint y habilitar sync. NO hacer auto-login:
            // el sync_token lo genera el primer login del usuario con sus propias
            // credenciales (commands/auth.rs — fire-and-forget post-login).
            // Marcar handshake_done=true SOLO aquí, donde las tablas se escribieron OK.
            let mut cfg = config::load_config().unwrap_or_default();
            cfg.server_url = Some(api_endpoint.clone());
            cfg.sync_token = None;      // El login del usuario lo llenará
            cfg.enabled = true;         // Sync habilitado — token llegará con el primer login
            cfg.handshake_done = true;
            cfg.last_sync_at = None;
            cfg.last_push_at = None;
            cfg.last_pull_at = None;
            let _ = config::save_config(&cfg);
            println!("[Handshake] Endpoint registrado — sync habilitado, token pendiente de login");

            Ok(HandshakeResult {
                success: true,
                tables_written: count,
                error: None,
            })
        }
        Err(e) => Ok(HandshakeResult {
            success: false,
            tables_written: 0,
            error: Some(format!("Error escribiendo datos: {}", e)),
        }),
    }
}

/// Devuelve true si el handshake inicial ya fue completado para la licencia activa.
/// El frontend lo usa al arrancar para disparar el handshake en background si es false.
#[tauri::command]
pub fn get_handshake_done() -> bool {
    config::load_config()
        .map(|c| c.handshake_done)
        .unwrap_or(false)
}
