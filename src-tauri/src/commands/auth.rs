use crate::auth::{get_session, verify_password};
use crate::models::audit_log::{AuditEntry, NewAuditEntry, AUDIT_LOGIN_SUCCESS, AUDIT_LOGOUT};
use crate::models::user::User;
use crate::notification_helper;
use crate::state::{self, AppState, SessionInfo};
use serde::{Deserialize, Serialize};
use std::time::{Duration, Instant};
use tauri::State;

#[derive(Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct LoginResponse {
    pub session_token: String,
    pub user: User,
}

#[tauri::command]
pub async fn login(
    username: String,
    password: String,
    state: State<'_, AppState>,
) -> Result<LoginResponse, String> {
    // Rate limiting: 5 attempts per minute per username
    {
        const MAX_ATTEMPTS: usize = 5;
        const WINDOW: Duration = Duration::from_secs(60);

        let mut attempts = state
            .login_attempts
            .lock()
            .map_err(|e| format!("Internal error: {}", e))?;

        let now = Instant::now();
        let entry = attempts.entry(username.to_lowercase()).or_default();

        // Remove attempts older than the window
        entry.retain(|t| now.duration_since(*t) < WINDOW);

        if entry.len() >= MAX_ATTEMPTS {
            return Err("Rate limit exceeded: Too many login attempts".to_string());
        }

        // Record this attempt before password check
        entry.push(now);
    }

    // Get database connection
    let conn = state
        .db
        .lock()
        .map_err(|e| format!("Failed to lock database: {}", e))?;

    // Get user by username — error genérico para no revelar si el usuario existe
    let user = User::get_by_username(&conn, &username)
        .map_err(|_| "Authentication failed: credenciales inválidas".to_string())?;

    // Check if user is active
    if !user.active {
        return Err("Authentication failed: User account is disabled".to_string());
    }

    // Verify password — mismo mensaje genérico que usuario no encontrado
    let password_valid = verify_password(&password, &user.password_hash)
        .map_err(|_| "Authentication failed: credenciales inválidas".to_string())?;

    if !password_valid {
        return Err("Authentication failed: credenciales inválidas".to_string());
    }

    // Update last login timestamp
    User::update_last_login(&conn, &user.id)
        .map_err(|_| "Error interno al iniciar sesión".to_string())?;

    // Generate session token
    let session_token = uuid::Uuid::new_v4().to_string();

    // Create session info (expires in 30 days)
    let now = chrono::Utc::now();
    let expires_at = now + chrono::Duration::days(30);
    let session_info = SessionInfo {
        user_id: user.id.clone(),
        username: user.username.clone(),
        role: user.role.clone(),
        login_time: now.to_rfc3339(),
        expires_at: expires_at.to_rfc3339(),
    };

    // Store session in memory
    let mut sessions = state
        .sessions
        .lock()
        .map_err(|e| format!("Failed to lock sessions: {}", e))?;
    sessions.insert(session_token.clone(), session_info.clone());
    drop(sessions);

    // Persist session to SQLite
    state::save_session_to_db(&conn, &session_token, &session_info);

    // Cleanup old read notifications (> 30 days) — silent, non-blocking
    notification_helper::cleanup_old_notifications(&conn);

    // Audit: login exitoso
    AuditEntry::record(&conn, NewAuditEntry {
        actor_id:    &user.id,
        actor_name:  &user.username,
        action:      AUDIT_LOGIN_SUCCESS,
        target_type: None,
        target_id:   None,
        target_name: None,
        detail:      None,
    });

    drop(conn);

    // Renovar sync_token en planner-sync con las mismas credenciales del login.
    // Fire-and-forget: si sync no está configurado o el servidor no responde, no bloquea el login.
    // Esto garantiza que el sync_token siempre sea fresco mientras el usuario use la app,
    // sin necesidad de que el admin haga sync_login manualmente.
    {
        let username_clone = username.clone();
        let password_clone = password.clone();
        tokio::spawn(async move {
            use crate::sync::config::{self, SyncCredentials};
            use crate::sync::sync_client::SyncClient;

            // Si sync no está configurado, no hay nada que hacer
            let server_url = match SyncCredentials::get_configured_url() {
                Some(url) => url,
                None => return,
            };

            let mut client = SyncClient::new(&server_url);
            match client.login(&username_clone, &password_clone).await {
                Ok(login_resp) => {
                    if let Ok(mut cfg) = config::load_config() {
                        cfg.sync_token = Some(login_resp.token);
                        let _ = config::save_config(&cfg);
                        println!("[Auth] sync_token renovado para '{}'", username_clone);
                    }
                }
                Err(e) => {
                    // No es un error fatal — sync seguirá funcionando con el token anterior
                    // si todavía es válido, o mostrará el badge ámbar si ya expiró.
                    println!("[Auth] Advertencia: no se pudo renovar sync_token: {}", e);
                }
            }
        });
    }

    // Return response
    Ok(LoginResponse {
        session_token,
        user,
    })
}

#[tauri::command]
pub async fn logout(session_token: String, state: State<'_, AppState>) -> Result<(), String> {
    // Capturar info de sesión antes de eliminarla (para el audit)
    let session_info = {
        let sessions = state.sessions.lock().map_err(|e| format!("Failed to lock sessions: {}", e))?;
        sessions.get(&session_token).cloned()
    };

    // Remove from memory
    let mut sessions = state
        .sessions
        .lock()
        .map_err(|e| format!("Failed to lock sessions: {}", e))?;
    sessions.remove(&session_token);
    drop(sessions);

    // Remove from SQLite
    let conn = state
        .db
        .lock()
        .map_err(|e| format!("Failed to lock database: {}", e))?;
    state::remove_session_from_db(&conn, &session_token);

    // Audit: logout
    if let Some(s) = session_info {
        AuditEntry::record(&conn, NewAuditEntry {
            actor_id:    &s.user_id,
            actor_name:  &s.username,
            action:      AUDIT_LOGOUT,
            target_type: None,
            target_id:   None,
            target_name: None,
            detail:      None,
        });
    }

    Ok(())
}

#[tauri::command]
pub async fn get_current_user(
    session_token: String,
    state: State<'_, AppState>,
) -> Result<User, String> {
    // Get session info
    let session = get_session(&session_token, &state).map_err(|e| e.to_string())?;

    // Get user from database
    let conn = state
        .db
        .lock()
        .map_err(|e| format!("Failed to lock database: {}", e))?;

    let user = User::get_by_id(&conn, &session.user_id).map_err(|e| e.to_string())?;

    Ok(user)
}

#[tauri::command]
pub async fn refresh_session(
    session_token: String,
    state: State<'_, AppState>,
) -> Result<(), String> {
    // Verify the session is valid (includes expiry check)
    let _session = get_session(&session_token, &state).map_err(|e| e.to_string())?;

    // Extend expiry by 30 days from now
    let new_expires_at = (chrono::Utc::now() + chrono::Duration::days(30)).to_rfc3339();

    // Update in-memory session
    {
        let mut sessions = state
            .sessions
            .lock()
            .map_err(|e| format!("Failed to lock sessions: {}", e))?;

        if let Some(session_info) = sessions.get_mut(&session_token) {
            session_info.expires_at = new_expires_at.clone();
        }
    }

    // Update in SQLite
    let conn = state
        .db
        .lock()
        .map_err(|e| format!("Failed to lock database: {}", e))?;

    conn.execute(
        "UPDATE sessions SET expires_at = ?1 WHERE token = ?2",
        rusqlite::params![&new_expires_at, &session_token],
    )
    .map_err(|e| format!("Failed to update session expiry: {}", e))?;

    Ok(())
}
