use crate::auth::{get_session, verify_password};
use crate::models::user::User;
use crate::state::{self, AppState, SessionInfo};
use serde::{Deserialize, Serialize};
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
    // Get database connection
    let conn = state
        .db
        .lock()
        .map_err(|e| format!("Failed to lock database: {}", e))?;

    // Get user by username
    let user = User::get_by_username(&conn, &username)
        .map_err(|e| format!("Authentication failed: {}", e))?;

    // Check if user is active
    if !user.active {
        return Err("Authentication failed: User account is disabled".to_string());
    }

    // Verify password
    let password_valid = verify_password(&password, &user.password_hash)
        .map_err(|e| format!("Authentication failed: {}", e))?;

    if !password_valid {
        return Err("Authentication failed: Invalid password".to_string());
    }

    // Update last login timestamp
    User::update_last_login(&conn, &user.id).map_err(|e| format!("Failed to update last login: {}", e))?;

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
    drop(conn);

    // Return response
    Ok(LoginResponse {
        session_token,
        user,
    })
}

#[tauri::command]
pub async fn logout(session_token: String, state: State<'_, AppState>) -> Result<(), String> {
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
