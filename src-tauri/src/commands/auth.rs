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
    // ── Rate limiting ─────────────────────────────────────────────────────────
    {
        const MAX_ATTEMPTS: usize = 5;
        const WINDOW: Duration = Duration::from_secs(60);
        let mut attempts = state
            .login_attempts
            .lock()
            .map_err(|e| format!("Internal error: {}", e))?;
        let now = Instant::now();
        let entry = attempts.entry(username.to_lowercase()).or_default();
        entry.retain(|t| now.duration_since(*t) < WINDOW);
        if entry.len() >= MAX_ATTEMPTS {
            return Err("Rate limit exceeded: Too many login attempts".to_string());
        }
        entry.push(now);
    }

    // ── Auth + session (todo síncrono, conn se suelta al salir del bloque) ────
    let (session_token, user) = {
        let conn = state
            .db
            .lock()
            .map_err(|e| format!("Failed to lock database: {}", e))?;

        let user = User::get_by_username(&conn, &username)
            .map_err(|_| "Authentication failed: credenciales inválidas".to_string())?;

        if !user.active {
            return Err("Authentication failed: User account is disabled".to_string());
        }

        let password_valid = verify_password(&password, &user.password_hash)
            .map_err(|_| "Authentication failed: credenciales inválidas".to_string())?;
        if !password_valid {
            return Err("Authentication failed: credenciales inválidas".to_string());
        }

        User::update_last_login(&conn, &user.id)
            .map_err(|_| "Error interno al iniciar sesión".to_string())?;

        let session_token = uuid::Uuid::new_v4().to_string();
        let now_ts = chrono::Utc::now();
        let expires_at = now_ts + chrono::Duration::days(30);
        let session_info = SessionInfo {
            user_id: user.id.clone(),
            username: user.username.clone(),
            role: user.role.clone(),
            login_time: now_ts.to_rfc3339(),
            expires_at: expires_at.to_rfc3339(),
        };

        {
            let mut sessions = state
                .sessions
                .lock()
                .map_err(|e| format!("Failed to lock sessions: {}", e))?;
            sessions.insert(session_token.clone(), session_info.clone());
        }

        state::save_session_to_db(&conn, &session_token, &session_info);
        notification_helper::cleanup_old_notifications(&conn);

        AuditEntry::record(&conn, NewAuditEntry {
            actor_id:    &user.id,
            actor_name:  &user.username,
            action:      AUDIT_LOGIN_SUCCESS,
            target_type: None,
            target_id:   None,
            target_name: None,
            detail:      None,
        });

        // conn se suelta aquí al salir del bloque — seguro hacer .await después
        (session_token, user)
    };

    // ── Sync: renovar token + pull (awaits, conn ya liberada) ─────────────────
    {
        use crate::sync::config::{self, SyncCredentials};
        use crate::sync::sync_client::SyncClient;
        use crate::sync::engine;

        if let Some(server_url) = SyncCredentials::get_configured_url() {
            let mut client = SyncClient::new(&server_url);

            match client.login(&username, &password).await {
                Ok(login_resp) => {
                    if let Ok(mut cfg) = config::load_config() {
                        cfg.sync_token = Some(login_resp.token.clone());
                        let _ = config::save_config(&cfg);
                        println!("[Auth] sync_token renovado para '{}'", username);

                        client.set_token(login_resp.token);
                        let last_pull_at = cfg.last_pull_at.clone();

                        match engine::pull_data_from_server(&client, last_pull_at.as_deref()).await {
                            Ok((pulled_data, result)) => {
                                if !pulled_data.is_empty() {
                                    let conn = state.db.lock()
                                        .map_err(|e| format!("Failed to lock database: {}", e))?;
                                    match engine::write_pulled_data(&conn, &pulled_data) {
                                        Ok(count) => {
                                            let _ = engine::recalculate_logistics_stock(&conn);
                                            drop(conn);
                                            if let Ok(mut cfg2) = config::load_config() {
                                                cfg2.last_pull_at = Some(result.timestamp.clone());
                                                cfg2.last_sync_at = Some(result.timestamp);
                                                let _ = config::save_config(&cfg2);
                                            }
                                            println!("[Auth] Pull post-login: {} registros escritos", count);
                                        }
                                        Err(e) => println!("[Auth] Pull write error: {}", e),
                                    }
                                } else {
                                    println!("[Auth] Pull post-login: sin datos nuevos");
                                }
                            }
                            Err(e) => println!("[Auth] Pull fetch error: {}", e),
                        }
                    }
                }
                Err(e) => println!("[Auth] sync_token no renovado: {}", e),
            }
        }
    }

    Ok(LoginResponse { session_token, user })
}

#[tauri::command]
pub async fn logout(session_token: String, state: State<'_, AppState>) -> Result<(), String> {
    let session_info = {
        let sessions = state.sessions.lock().map_err(|e| format!("Failed to lock sessions: {}", e))?;
        sessions.get(&session_token).cloned()
    };

    {
        let mut sessions = state.sessions.lock().map_err(|e| format!("Failed to lock sessions: {}", e))?;
        sessions.remove(&session_token);
    }

    let conn = state.db.lock().map_err(|e| format!("Failed to lock database: {}", e))?;
    state::remove_session_from_db(&conn, &session_token);

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
    let session = get_session(&session_token, &state).map_err(|e| e.to_string())?;

    let conn = state.db.lock().map_err(|e| format!("Failed to lock database: {}", e))?;

    match User::get_by_id(&conn, &session.user_id) {
        Ok(user) => Ok(user),
        Err(_) => {
            println!(
                "[Auth] user_id {} no encontrado, recuperando por username '{}'",
                session.user_id, session.username
            );

            let user = User::get_by_username(&conn, &session.username)
                .map_err(|_| format!("Usuario '{}' no encontrado en la base de datos", session.username))?;

            {
                let mut sessions = state.sessions.lock()
                    .map_err(|e| format!("Failed to lock sessions: {}", e))?;
                if let Some(s) = sessions.get_mut(&session_token) {
                    s.user_id = user.id.clone();
                    s.role = user.role.clone();
                }
            }

            let _ = conn.execute(
                "UPDATE sessions SET user_id = ?1, role = ?2 WHERE token = ?3",
                rusqlite::params![&user.id, &user.role, &session_token],
            );

            println!("[Auth] Sesión actualizada al nuevo user_id: {}", user.id);
            Ok(user)
        }
    }
}

#[tauri::command]
pub async fn refresh_session(
    session_token: String,
    state: State<'_, AppState>,
) -> Result<(), String> {
    let _session = get_session(&session_token, &state).map_err(|e| e.to_string())?;

    let new_expires_at = (chrono::Utc::now() + chrono::Duration::days(30)).to_rfc3339();

    {
        let mut sessions = state.sessions.lock()
            .map_err(|e| format!("Failed to lock sessions: {}", e))?;
        if let Some(session_info) = sessions.get_mut(&session_token) {
            session_info.expires_at = new_expires_at.clone();
        }
    }

    let conn = state.db.lock().map_err(|e| format!("Failed to lock database: {}", e))?;
    conn.execute(
        "UPDATE sessions SET expires_at = ?1 WHERE token = ?2",
        rusqlite::params![&new_expires_at, &session_token],
    ).map_err(|e| format!("Failed to update session expiry: {}", e))?;

    Ok(())
}
