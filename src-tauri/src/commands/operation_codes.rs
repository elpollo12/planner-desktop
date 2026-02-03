use crate::auth::check_permission;
use crate::models::operation_code::{CreateOperationCodeRequest, OperationCode, UpdateOperationCodeRequest};
use crate::models::user::UserRole;
use crate::state::AppState;
use tauri::State;

#[tauri::command]
pub async fn create_operation_code(
    session_token: String,
    data: CreateOperationCodeRequest,
    state: State<'_, AppState>,
) -> Result<OperationCode, String> {
    // Only admin can create operation codes
    let session = check_permission(&session_token, UserRole::Admin, &state)
        .map_err(|e| e.to_string())?;

    let conn = state
        .db
        .lock()
        .map_err(|e| format!("Failed to lock database: {}", e))?;

    let code = OperationCode::create(&conn, &data, Some(session.user_id))
        .map_err(|e| e.to_string())?;

    Ok(code)
}

#[tauri::command]
pub async fn list_operation_codes(
    session_token: String,
    active_only: bool,
    state: State<'_, AppState>,
) -> Result<Vec<OperationCode>, String> {
    // Any authenticated user can list operation codes
    crate::auth::get_session(&session_token, &state).map_err(|e| e.to_string())?;

    let conn = state
        .db
        .lock()
        .map_err(|e| format!("Failed to lock database: {}", e))?;

    let codes = OperationCode::list(&conn, active_only).map_err(|e| e.to_string())?;

    Ok(codes)
}

#[tauri::command]
pub async fn get_operation_code(
    session_token: String,
    code_id: String,
    state: State<'_, AppState>,
) -> Result<OperationCode, String> {
    // Any authenticated user can get operation codes
    crate::auth::get_session(&session_token, &state).map_err(|e| e.to_string())?;

    let conn = state
        .db
        .lock()
        .map_err(|e| format!("Failed to lock database: {}", e))?;

    let code = OperationCode::get_by_id(&conn, &code_id).map_err(|e| e.to_string())?;

    Ok(code)
}

#[tauri::command]
pub async fn update_operation_code(
    session_token: String,
    code_id: String,
    data: UpdateOperationCodeRequest,
    state: State<'_, AppState>,
) -> Result<OperationCode, String> {
    // Only admin can update operation codes
    let session = check_permission(&session_token, UserRole::Admin, &state)
        .map_err(|e| e.to_string())?;

    let conn = state
        .db
        .lock()
        .map_err(|e| format!("Failed to lock database: {}", e))?;

    let code = OperationCode::update(&conn, &code_id, &data, Some(session.user_id))
        .map_err(|e| e.to_string())?;

    Ok(code)
}

#[tauri::command]
pub async fn delete_operation_code(
    session_token: String,
    code_id: String,
    state: State<'_, AppState>,
) -> Result<(), String> {
    // Only admin can delete operation codes
    check_permission(&session_token, UserRole::Admin, &state)
        .map_err(|e| e.to_string())?;

    let conn = state
        .db
        .lock()
        .map_err(|e| format!("Failed to lock database: {}", e))?;

    OperationCode::delete(&conn, &code_id).map_err(|e| e.to_string())?;

    Ok(())
}
