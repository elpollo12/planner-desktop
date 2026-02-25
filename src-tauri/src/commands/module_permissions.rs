use crate::auth::{check_permission, get_session};
use crate::models::module_permission::ModulePermission;
use crate::models::user::{User, UserRole};
use crate::state::AppState;
use rusqlite::params;
use serde::Serialize;
use std::collections::HashMap;
use tauri::State;

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct PermissionModifier {
    pub modified_by: String,
    pub modified_at: String,
}

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

    // dashboard is always granted — prevent accidental lockouts
    let mut permissions = permissions;
    permissions.insert("dashboard".to_string(), true);

    ModulePermission::save_bulk(
        &conn,
        &user_id,
        &target_user.role,
        &permissions,
        Some(&session.user_id),
    )
    .map_err(|e| e.to_string())?;

    // Notify the target user that their permissions were updated
    let actor_name: String = conn
        .query_row(
            "SELECT COALESCE(full_name, username) FROM users WHERE id = ?1",
            params![session.user_id],
            |row| row.get(0),
        )
        .unwrap_or_else(|_| session.username.clone());

    crate::notification_helper::notify_user(
        &conn,
        &session,
        &user_id,
        "permissions",
        "permissions_changed",
        "Permisos actualizados",
        &format!("Sus permisos han sido actualizados"),
        None,
        None,
        None,
    );

    Ok(())
}

/// Get who last modified the current user's module permissions.
/// Returns None if no overrides have ever been set (permissions are all role defaults).
#[tauri::command]
pub async fn get_my_permission_modifier(
    session_token: String,
    state: State<'_, AppState>,
) -> Result<Option<PermissionModifier>, String> {
    let session = get_session(&session_token, &state).map_err(|e| e.to_string())?;

    // Admin permissions are never customized, no modifier to show
    if session.role == "admin" {
        return Ok(None);
    }

    let conn = state
        .db
        .lock()
        .map_err(|e| format!("Failed to lock database: {}", e))?;

    let result = conn.query_row(
        "SELECT COALESCE(u.full_name, u.username, 'Administrador'), ump.updated_at
         FROM user_module_permissions ump
         LEFT JOIN users u ON u.id = ump.assigned_by
         WHERE ump.user_id = ?1
         ORDER BY ump.updated_at DESC
         LIMIT 1",
        params![session.user_id],
        |row| {
            Ok(PermissionModifier {
                modified_by: row.get(0)?,
                modified_at: row.get(1)?,
            })
        },
    );

    match result {
        Ok(modifier) => Ok(Some(modifier)),
        Err(rusqlite::Error::QueryReturnedNoRows) => Ok(None),
        Err(e) => Err(e.to_string()),
    }
}
