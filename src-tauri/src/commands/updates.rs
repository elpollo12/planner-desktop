//! Tauri commands for update preferences management.

use crate::auth::get_session;
use crate::error::{AppError, Result};
use crate::models::update_preferences::{
    CheckUpdateResponse, PostponeUpdateInput, SaveUpdatePreferencesInput, 
    UpdateCheckStatus, UpdatePreferences,
};
use crate::state::AppState;
use chrono::Utc;
use rusqlite::params;
use tauri::State;
use uuid::Uuid;

const MAX_POSTPONES: i32 = 3;

/// Get update preferences for the current user.
#[tauri::command]
pub async fn get_update_preferences(
    session_token: String,
    state: State<'_, AppState>,
) -> Result<Option<UpdatePreferences>> {
    let session = get_session(&session_token, &state)?;
    let conn = state.db.lock().unwrap();

    let result = conn.query_row(
        "SELECT id, user_id, auto_update, channel, check_interval_hours, 
                last_check_at, postponed_version, postpone_count, created_at, updated_at
         FROM update_preferences WHERE user_id = ?1",
        params![&session.user_id],
        |row| {
            Ok(UpdatePreferences {
                id: row.get(0)?,
                user_id: row.get(1)?,
                auto_update: row.get::<_, i32>(2)? != 0,
                channel: row.get(3)?,
                check_interval_hours: row.get(4)?,
                last_check_at: row.get(5)?,
                postponed_version: row.get(6)?,
                postpone_count: row.get(7)?,
                created_at: row.get(8)?,
                updated_at: row.get(9)?,
            })
        },
    );

    match result {
        Ok(prefs) => Ok(Some(prefs)),
        Err(rusqlite::Error::QueryReturnedNoRows) => Ok(None),
        Err(e) => Err(e.into()),
    }
}

/// Save update preferences for the current user.
#[tauri::command]
pub async fn save_update_preferences(
    session_token: String,
    input: SaveUpdatePreferencesInput,
    state: State<'_, AppState>,
) -> Result<UpdatePreferences> {
    let session = get_session(&session_token, &state)?;

    // Validate channel
    if let Some(ref channel) = input.channel {
        if !["stable", "beta", "nightly"].contains(&channel.as_str()) {
            return Err(AppError::ValidationError(
                "Canal inválido. Use 'stable', 'beta' o 'nightly'".to_string(),
            ));
        }
    }

    // Validate interval
    if let Some(interval) = input.check_interval_hours {
        if interval < 1 || interval > 168 {
            return Err(AppError::ValidationError(
                "Intervalo debe estar entre 1 y 168 horas".to_string(),
            ));
        }
    }

    let conn = state.db.lock().unwrap();
    let now = Utc::now().to_rfc3339();

    // Get existing preferences or use defaults
    let existing = conn.query_row(
        "SELECT auto_update, channel, check_interval_hours FROM update_preferences WHERE user_id = ?1",
        params![&session.user_id],
        |row| Ok((row.get::<_, i32>(0)?, row.get::<_, String>(1)?, row.get::<_, i32>(2)?)),
    );

    let (auto_update, channel, interval) = match existing {
        Ok((au, ch, iv)) => (
            input.auto_update.map(|b| if b { 1 } else { 0 }).unwrap_or(au),
            input.channel.unwrap_or(ch),
            input.check_interval_hours.unwrap_or(iv),
        ),
        Err(_) => (
            input.auto_update.map(|b| if b { 1 } else { 0 }).unwrap_or(0),
            input.channel.unwrap_or_else(|| "stable".to_string()),
            input.check_interval_hours.unwrap_or(24),
        ),
    };

    let id = Uuid::new_v4().to_string();

    conn.execute(
        "INSERT INTO update_preferences (id, user_id, auto_update, channel, check_interval_hours, created_at, updated_at)
         VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7)
         ON CONFLICT(user_id) DO UPDATE SET
           auto_update = excluded.auto_update,
           channel = excluded.channel,
           check_interval_hours = excluded.check_interval_hours,
           updated_at = excluded.updated_at",
        params![&id, &session.user_id, auto_update, &channel, interval, &now, &now],
    )?;

    // Fetch and return updated preferences
    let prefs = conn.query_row(
        "SELECT id, user_id, auto_update, channel, check_interval_hours, 
                last_check_at, postponed_version, postpone_count, created_at, updated_at
         FROM update_preferences WHERE user_id = ?1",
        params![&session.user_id],
        |row| {
            Ok(UpdatePreferences {
                id: row.get(0)?,
                user_id: row.get(1)?,
                auto_update: row.get::<_, i32>(2)? != 0,
                channel: row.get(3)?,
                check_interval_hours: row.get(4)?,
                last_check_at: row.get(5)?,
                postponed_version: row.get(6)?,
                postpone_count: row.get(7)?,
                created_at: row.get(8)?,
                updated_at: row.get(9)?,
            })
        },
    )?;

    Ok(prefs)
}

/// Record that an update check was performed.
#[tauri::command]
pub async fn record_update_check(
    session_token: String,
    state: State<'_, AppState>,
) -> Result<()> {
    let session = get_session(&session_token, &state)?;
    let conn = state.db.lock().unwrap();
    let now = Utc::now().to_rfc3339();

    conn.execute(
        "UPDATE update_preferences SET last_check_at = ?1, updated_at = ?1 WHERE user_id = ?2",
        params![&now, &session.user_id],
    )?;

    Ok(())
}

/// Postpone an update (increment postpone count).
#[tauri::command]
pub async fn postpone_update(
    session_token: String,
    input: PostponeUpdateInput,
    state: State<'_, AppState>,
) -> Result<UpdatePreferences> {
    let session = get_session(&session_token, &state)?;
    let conn = state.db.lock().unwrap();
    let now = Utc::now().to_rfc3339();

    // Check current postpone count
    let current: Option<(String, i32)> = conn.query_row(
        "SELECT postponed_version, postpone_count FROM update_preferences WHERE user_id = ?1",
        params![&session.user_id],
        |row| Ok((row.get::<_, Option<String>>(0)?.unwrap_or_default(), row.get(1)?)),
    ).ok();

    let (current_version, current_count) = current.unwrap_or_default();

    // Reset count if different version
    let new_count = if current_version == input.version {
        current_count + 1
    } else {
        1
    };

    if new_count > MAX_POSTPONES {
        return Err(AppError::ValidationError(format!(
            "Máximo de {} postergaciones alcanzado para esta versión",
            MAX_POSTPONES
        )));
    }

    // Ensure preferences exist
    let id = Uuid::new_v4().to_string();
    conn.execute(
        "INSERT INTO update_preferences (id, user_id, postponed_version, postpone_count, created_at, updated_at)
         VALUES (?1, ?2, ?3, ?4, ?5, ?6)
         ON CONFLICT(user_id) DO UPDATE SET
           postponed_version = excluded.postponed_version,
           postpone_count = excluded.postpone_count,
           updated_at = excluded.updated_at",
        params![&id, &session.user_id, &input.version, new_count, &now, &now],
    )?;

    // Fetch and return updated preferences
    let prefs = conn.query_row(
        "SELECT id, user_id, auto_update, channel, check_interval_hours, 
                last_check_at, postponed_version, postpone_count, created_at, updated_at
         FROM update_preferences WHERE user_id = ?1",
        params![&session.user_id],
        |row| {
            Ok(UpdatePreferences {
                id: row.get(0)?,
                user_id: row.get(1)?,
                auto_update: row.get::<_, i32>(2)? != 0,
                channel: row.get(3)?,
                check_interval_hours: row.get(4)?,
                last_check_at: row.get(5)?,
                postponed_version: row.get(6)?,
                postpone_count: row.get(7)?,
                created_at: row.get(8)?,
                updated_at: row.get(9)?,
            })
        },
    )?;

    Ok(prefs)
}

/// Clear postpone state (after successful update or new version).
#[tauri::command]
pub async fn clear_postpone(
    session_token: String,
    state: State<'_, AppState>,
) -> Result<()> {
    let session = get_session(&session_token, &state)?;
    let conn = state.db.lock().unwrap();
    let now = Utc::now().to_rfc3339();

    conn.execute(
        "UPDATE update_preferences SET postponed_version = NULL, postpone_count = 0, updated_at = ?1 WHERE user_id = ?2",
        params![&now, &session.user_id],
    )?;

    Ok(())
}

/// Get update check status (preferences + app version + can postpone).
#[tauri::command]
pub async fn get_update_status(
    session_token: String,
    state: State<'_, AppState>,
) -> Result<UpdateCheckStatus> {
    let session = get_session(&session_token, &state)?;
    let conn = state.db.lock().unwrap();

    let prefs = conn.query_row(
        "SELECT id, user_id, auto_update, channel, check_interval_hours, 
                last_check_at, postponed_version, postpone_count, created_at, updated_at
         FROM update_preferences WHERE user_id = ?1",
        params![&session.user_id],
        |row| {
            Ok(UpdatePreferences {
                id: row.get(0)?,
                user_id: row.get(1)?,
                auto_update: row.get::<_, i32>(2)? != 0,
                channel: row.get(3)?,
                check_interval_hours: row.get(4)?,
                last_check_at: row.get(5)?,
                postponed_version: row.get(6)?,
                postpone_count: row.get(7)?,
                created_at: row.get(8)?,
                updated_at: row.get(9)?,
            })
        },
    ).ok();

    let can_postpone = prefs.as_ref()
        .map(|p| p.postpone_count < MAX_POSTPONES)
        .unwrap_or(true);

    let last_check = prefs.as_ref().and_then(|p| p.last_check_at.clone());

    Ok(UpdateCheckStatus {
        preferences: prefs,
        current_version: env!("CARGO_PKG_VERSION").to_string(),
        last_check_at: last_check,
        can_postpone,
        max_postpones: MAX_POSTPONES,
    })
}

/// Check for updates from the API.
/// This calls the planner-sync API to check for available updates.
/// `api_url` is optional — if None or empty, the URL is resolved automatically
/// from sync_config.json (set when the admin links the sync server).
#[tauri::command]
pub async fn check_for_update_from_api(
    api_url: Option<String>,
    channel: Option<String>,
) -> Result<CheckUpdateResponse> {
    let current_version = env!("CARGO_PKG_VERSION");
    let channel = channel.unwrap_or_else(|| "stable".to_string());

    // Resolve URL: use explicit arg first, then sync_config, then fail gracefully
    let resolved_url = api_url
        .filter(|u| !u.trim().is_empty())
        .or_else(|| crate::sync::config::SyncCredentials::get_configured_url())
        .ok_or_else(|| AppError::NetworkError(
            "No hay servidor de actualización configurado".to_string()
        ))?;

    let url = format!(
        "{}/api/v1/updates/check?currentVersion={}&channel={}",
        resolved_url.trim_end_matches('/'),
        current_version,
        channel
    );

    let client = reqwest::Client::new();
    let response = client
        .get(&url)
        .timeout(std::time::Duration::from_secs(10))
        .send()
        .await
        .map_err(|e| AppError::NetworkError(format!("Error de conexión: {}", e)))?;

    if !response.status().is_success() {
        return Err(AppError::NetworkError(format!(
            "Error del servidor: {}",
            response.status()
        )));
    }

    let data: CheckUpdateResponse = response
        .json()
        .await
        .map_err(|e| AppError::NetworkError(format!("Error al parsear respuesta: {}", e)))?;

    Ok(data)
}

/// Record a download to the API for statistics.
/// `api_url` is optional — falls back to sync_config URL if not provided.
#[tauri::command]
pub async fn record_download_to_api(
    api_url: Option<String>,
    version: String,
    from_version: Option<String>,
) -> Result<()> {
    let resolved_url = api_url
        .filter(|u| !u.trim().is_empty())
        .or_else(|| crate::sync::config::SyncCredentials::get_configured_url());

    let Some(base_url) = resolved_url else {
        // No server configured — skip stats silently
        return Ok(());
    };

    let url = format!(
        "{}/api/v1/updates/downloads",
        base_url.trim_end_matches('/')
    );

    let client = reqwest::Client::new();
    let body = serde_json::json!({
        "version": version,
        "fromVersion": from_version
    });

    let response = client
        .post(&url)
        .json(&body)
        .timeout(std::time::Duration::from_secs(10))
        .send()
        .await
        .map_err(|e| AppError::NetworkError(format!("Error de conexión: {}", e)))?;

    if !response.status().is_success() {
        // Don't fail if stats recording fails - it's not critical
        eprintln!("[Updates] Failed to record download stats: {}", response.status());
    }

    Ok(())
}
