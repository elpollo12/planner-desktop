use crate::auth::{check_permission, hash_password};
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
    // Only admin can get any user
    check_permission(&session_token, UserRole::Admin, &state).map_err(|e| e.to_string())?;

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
