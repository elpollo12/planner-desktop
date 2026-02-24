use crate::auth::{check_permission, get_session};
use crate::models::module_permission::ModulePermission;
use crate::models::user::{User, UserRole};
use crate::state::AppState;
use std::collections::HashMap;
use tauri::State;

// ============================================================================
// Module Permissions Commands
// ============================================================================

/// Get the resolved module permissions for the currently logged-in user.
/// Called by the frontend at login / session revalidation.
/// Admin users always get all-true.
#[tauri::command]
pub async fn get_my_module_permissions(
    session_token: String,
    state: State<'_, AppState>,
) -> Result<HashMap<String, bool>, String> {
    let session = get_session(&session_token, &state).map_err(|e| e.to_string())?;

    // Admin shortcut — no DB query needed
    if session.role == "admin" {
        return Ok(ModulePermission::role_defaults("admin"));
    }

    let conn = state
        .db
        .lock()
        .map_err(|e| format!("Failed to lock database: {}", e))?;

    ModulePermission::get_resolved(&conn, &session.user_id, &session.role)
        .map_err(|e| e.to_string())
}

/// Get the resolved module permissions for a specific user.
/// Only callable by admins (used in the user management UI).
#[tauri::command]
pub async fn get_user_module_permissions(
    session_token: String,
    user_id: String,
    state: State<'_, AppState>,
) -> Result<HashMap<String, bool>, String> {
    // Only admins can inspect other users' permissions
    check_permission(&session_token, UserRole::Admin, &state)
        .map_err(|e| e.to_string())?;

    let conn = state
        .db
        .lock()
        .map_err(|e| format!("Failed to lock database: {}", e))?;

    // Get the target user's role to resolve defaults
    let target_user = User::get_by_id(&conn, &user_id).map_err(|e| e.to_string())?;

    ModulePermission::get_resolved(&conn, &user_id, &target_user.role)
        .map_err(|e| e.to_string())
}

/// Save module permission overrides for a user.
/// Only callable by admins. Cannot modify permissions for admin users.
/// Values that match the role default are removed (table stays clean).
#[tauri::command]
pub async fn save_user_module_permissions(
    session_token: String,
    user_id: String,
    permissions: HashMap<String, bool>,
    state: State<'_, AppState>,
) -> Result<(), String> {
    let session = check_permission(&session_token, UserRole::Admin, &state)
        .map_err(|e| e.to_string())?;

    let conn = state
        .db
        .lock()
        .map_err(|e| format!("Failed to lock database: {}", e))?;

    // Get target user and validate they're not an admin
    let target_user = User::get_by_id(&conn, &user_id).map_err(|e| e.to_string())?;

    if target_user.role == "admin" {
        return Err("Cannot modify module permissions for admin users".to_string());
    }

    ModulePermission::save_bulk(
        &conn,
        &user_id,
        &target_user.role,
        &permissions,
        Some(&session.user_id),
    )
    .map_err(|e| e.to_string())
}
