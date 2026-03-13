use crate::auth::{check_permission, get_session, hash_password, verify_password};
use crate::models::user::{CreateUserRequest, UpdateUserRequest, User, UserRole, UserWithRigs};
use crate::state::AppState;
use tauri::State;

#[tauri::command]
pub async fn create_user(
    session_token: String,
    user_data: CreateUserRequest,
    state: State<'_, AppState>,
) -> Result<UserWithRigs, String> {
    // Only admin can create users
    let current_user = check_permission(&session_token, UserRole::Admin, &state)
        .map_err(|e| e.to_string())?;

    // Hash the password
    let password_hash = hash_password(&user_data.password).map_err(|e| e.to_string())?;

    // Get database connection
    let conn = state
        .db
        .lock()
        .map_err(|e| format!("Failed to lock database: {}", e))?;

    // Create user
    let user = User::create(&conn, &user_data, password_hash, Some(current_user.user_id.clone()))
        .map_err(|e| e.to_string())?;

    // Get user with rigs
    let user_with_rigs = User::get_with_rigs(&conn, &user.id).map_err(|e| e.to_string())?;

    Ok(user_with_rigs)
}

#[tauri::command]
pub async fn list_users(
    session_token: String,
    state: State<'_, AppState>,
) -> Result<Vec<UserWithRigs>, String> {
    // Only admin can list all users
    check_permission(&session_token, UserRole::Admin, &state).map_err(|e| e.to_string())?;

    let conn = state
        .db
        .lock()
        .map_err(|e| format!("Failed to lock database: {}", e))?;

    let users = User::list_with_rigs(&conn).map_err(|e| e.to_string())?;

    Ok(users)
}

#[tauri::command]
pub async fn get_user(
    session_token: String,
    user_id: String,
    state: State<'_, AppState>,
) -> Result<UserWithRigs, String> {
    // Any authenticated user can look up another user's basic info
    // (needed for displaying "created by" names in movement details)
    let _session = get_session(&session_token, &state).map_err(|e| e.to_string())?;

    let conn = state
        .db
        .lock()
        .map_err(|e| format!("Failed to lock database: {}", e))?;

    let user = User::get_with_rigs(&conn, &user_id).map_err(|e| e.to_string())?;

    Ok(user)
}

#[tauri::command]
pub async fn update_user(
    session_token: String,
    user_id: String,
    user_data: UpdateUserRequest,
    state: State<'_, AppState>,
) -> Result<UserWithRigs, String> {
    // Only admin can update users
    let current_user = check_permission(&session_token, UserRole::Admin, &state)
        .map_err(|e| e.to_string())?;

    let conn = state
        .db
        .lock()
        .map_err(|e| format!("Failed to lock database: {}", e))?;

    let _user = User::update(&conn, &user_id, &user_data, Some(current_user.user_id))
        .map_err(|e| e.to_string())?;

    // Get user with rigs
    let user_with_rigs = User::get_with_rigs(&conn, &user_id).map_err(|e| e.to_string())?;

    Ok(user_with_rigs)
}

#[tauri::command]
pub async fn delete_user(
    session_token: String,
    user_id: String,
    state: State<'_, AppState>,
) -> Result<(), String> {
    // Only admin can delete users
    check_permission(&session_token, UserRole::Admin, &state).map_err(|e| e.to_string())?;

    let conn = state
        .db
        .lock()
        .map_err(|e| format!("Failed to lock database: {}", e))?;

    User::delete(&conn, &user_id).map_err(|e| e.to_string())?;

    Ok(())
}

/// Admin resets a user's password (no current password required)
#[tauri::command]
pub async fn admin_change_password(
    session_token: String,
    user_id: String,
    new_password: String,
    state: State<'_, AppState>,
) -> Result<(), String> {
    check_permission(&session_token, UserRole::Admin, &state)
        .map_err(|e| e.to_string())?;

    if new_password.len() < 8 {
        return Err("La contraseña debe tener al menos 8 caracteres".to_string());
    }

    let password_hash = hash_password(&new_password).map_err(|e| e.to_string())?;

    let conn = state
        .db
        .lock()
        .map_err(|e| format!("Failed to lock database: {}", e))?;

    conn.execute(
        "UPDATE users SET password_hash = ?1, updated_at = ?2 WHERE id = ?3",
        rusqlite::params![&password_hash, chrono::Utc::now().to_rfc3339(), &user_id],
    )
    .map_err(|_| "Error actualizando contraseña".to_string())?;

    Ok(())
}

/// Verify user's current password without changing it
#[tauri::command]
pub async fn verify_own_password(
    session_token: String,
    current_password: String,
    state: State<'_, AppState>,
) -> Result<bool, String> {
    let session = get_session(&session_token, &state).map_err(|e| e.to_string())?;

    let conn = state
        .db
        .lock()
        .map_err(|e| format!("Failed to lock database: {}", e))?;

    let current_hash: String = conn
        .query_row(
            "SELECT password_hash FROM users WHERE id = ?1",
            rusqlite::params![&session.user_id],
            |row| row.get(0),
        )
        .map_err(|_| "Error de autenticación".to_string())?;

    let valid = verify_password(&current_password, &current_hash)
        .map_err(|_| "Error de autenticación".to_string())?;

    Ok(valid)
}

/// User changes their own password (requires current password)
#[tauri::command]
pub async fn change_own_password(
    session_token: String,
    current_password: String,
    new_password: String,
    state: State<'_, AppState>,
) -> Result<(), String> {
    let session = get_session(&session_token, &state).map_err(|e| e.to_string())?;

    if new_password.len() < 8 {
        return Err("La contraseña debe tener al menos 8 caracteres".to_string());
    }

    let conn = state
        .db
        .lock()
        .map_err(|e| format!("Failed to lock database: {}", e))?;

    // Get current password hash
    let current_hash: String = conn
        .query_row(
            "SELECT password_hash FROM users WHERE id = ?1",
            rusqlite::params![&session.user_id],
            |row| row.get(0),
        )
        .map_err(|_| "Error de autenticación".to_string())?;

    // Verify current password
    let valid = verify_password(&current_password, &current_hash)
        .map_err(|_| "Error de autenticación".to_string())?;
    if !valid {
        return Err("Contraseña actual incorrecta".to_string());
    }

    let new_hash = hash_password(&new_password).map_err(|e| e.to_string())?;

    conn.execute(
        "UPDATE users SET password_hash = ?1, updated_at = ?2 WHERE id = ?3",
        rusqlite::params![&new_hash, chrono::Utc::now().to_rfc3339(), &session.user_id],
    )
    .map_err(|_| "Error actualizando contraseña".to_string())?;

    Ok(())
}
