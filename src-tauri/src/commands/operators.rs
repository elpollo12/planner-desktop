use crate::auth::check_permission;
use crate::models::operator::{CreateOperatorInput, Operator, UpdateOperatorInput};
use crate::models::user::UserRole;
use crate::state::AppState;
use base64::{engine::general_purpose, Engine as _};
use tauri::State;

#[tauri::command]
pub async fn list_operators(
    session_token: String,
    only_active: Option<bool>,
    state: State<'_, AppState>,
) -> Result<Vec<Operator>, String> {
    // Any authenticated user can list operators
    crate::auth::get_session(&session_token, &state).map_err(|e| e.to_string())?;

    let conn = state
        .db
        .lock()
        .map_err(|e| format!("Failed to lock database: {}", e))?;

    Operator::list(&conn, only_active.unwrap_or(true)).map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn get_operator(
    session_token: String,
    operator_id: String,
    state: State<'_, AppState>,
) -> Result<Option<Operator>, String> {
    crate::auth::get_session(&session_token, &state).map_err(|e| e.to_string())?;

    let conn = state
        .db
        .lock()
        .map_err(|e| format!("Failed to lock database: {}", e))?;

    Operator::get_by_id(&conn, &operator_id).map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn create_operator(
    session_token: String,
    input: CreateOperatorInput,
    state: State<'_, AppState>,
) -> Result<Operator, String> {
    // Only admin can create operators
    check_permission(&session_token, UserRole::Admin, &state).map_err(|e| e.to_string())?;

    if input.name.trim().is_empty() {
        return Err("El nombre del operador es requerido".to_string());
    }

    let conn = state
        .db
        .lock()
        .map_err(|e| format!("Failed to lock database: {}", e))?;

    // With deterministic UUIDs (v5), duplicate names will have the same ID
    // The create function will return the existing operator if it already exists
    Operator::create(&conn, &input).map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn update_operator(
    session_token: String,
    operator_id: String,
    input: UpdateOperatorInput,
    state: State<'_, AppState>,
) -> Result<Operator, String> {
    check_permission(&session_token, UserRole::Admin, &state).map_err(|e| e.to_string())?;

    let conn = state
        .db
        .lock()
        .map_err(|e| format!("Failed to lock database: {}", e))?;

    // If updating name, check for duplicates
    if let Some(ref new_name) = input.name {
        if let Some(existing) =
            Operator::get_by_name(&conn, new_name.trim()).map_err(|e| e.to_string())?
        {
            if existing.id != operator_id {
                return Err("Ya existe un operador con ese nombre".to_string());
            }
        }
    }

    Operator::update(&conn, &operator_id, &input)
        .map_err(|e| e.to_string())?
        .ok_or_else(|| "Operador no encontrado".to_string())
}

#[tauri::command]
pub async fn delete_operator(
    session_token: String,
    operator_id: String,
    state: State<'_, AppState>,
) -> Result<bool, String> {
    check_permission(&session_token, UserRole::Admin, &state).map_err(|e| e.to_string())?;

    let conn = state
        .db
        .lock()
        .map_err(|e| format!("Failed to lock database: {}", e))?;

    Operator::delete(&conn, &operator_id).map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn upload_operator_logo(
    session_token: String,
    operator_id: String,
    file_data: Vec<u8>,
    file_name: String,
    state: State<'_, AppState>,
) -> Result<Operator, String> {
    check_permission(&session_token, UserRole::Admin, &state).map_err(|e| e.to_string())?;

    // Validate file size (max 2MB)
    if file_data.len() > 2 * 1024 * 1024 {
        return Err("El archivo excede el límite de 2MB".to_string());
    }

    // Validate extension and get MIME type
    let ext = file_name
        .rsplit('.')
        .next()
        .unwrap_or("")
        .to_lowercase();
    if !["png", "jpg", "jpeg", "svg", "webp"].contains(&ext.as_str()) {
        return Err("Tipo de archivo inválido. Use PNG, JPG, SVG o WEBP".to_string());
    }

    let mime_type = get_mime_type(&ext);

    // Encode image as base64 with data URL prefix
    let base64_data = general_purpose::STANDARD.encode(&file_data);
    let data_url = format!("data:{};base64,{}", mime_type, base64_data);

    // Update operator with base64 data (stored in logo_path column for backwards compatibility)
    let conn = state
        .db
        .lock()
        .map_err(|e| format!("Failed to lock database: {}", e))?;

    // Check if operator exists
    if Operator::get_by_id(&conn, &operator_id).map_err(|e| e.to_string())?.is_none() {
        return Err("Operador no encontrado".to_string());
    }

    Operator::update_logo(&conn, &operator_id, Some(&data_url))
        .map_err(|e| e.to_string())?
        .ok_or_else(|| "Operador no encontrado".to_string())
}

#[tauri::command]
pub async fn remove_operator_logo(
    session_token: String,
    operator_id: String,
    state: State<'_, AppState>,
) -> Result<Operator, String> {
    check_permission(&session_token, UserRole::Admin, &state).map_err(|e| e.to_string())?;

    let conn = state
        .db
        .lock()
        .map_err(|e| format!("Failed to lock database: {}", e))?;

    // Check if operator exists
    if Operator::get_by_id(&conn, &operator_id).map_err(|e| e.to_string())?.is_none() {
        return Err("Operador no encontrado".to_string());
    }

    Operator::update_logo(&conn, &operator_id, None)
        .map_err(|e| e.to_string())?
        .ok_or_else(|| "Operador no encontrado".to_string())
}

fn get_mime_type(ext: &str) -> &str {
    match ext {
        "png" => "image/png",
        "jpg" | "jpeg" => "image/jpeg",
        "svg" => "image/svg+xml",
        "webp" => "image/webp",
        _ => "application/octet-stream",
    }
}

#[tauri::command]
pub async fn get_operator_logo_data(
    session_token: String,
    operator_id: String,
    state: State<'_, AppState>,
) -> Result<Option<String>, String> {
    crate::auth::get_session(&session_token, &state).map_err(|e| e.to_string())?;

    let conn = state
        .db
        .lock()
        .map_err(|e| format!("Failed to lock database: {}", e))?;

    let operator = Operator::get_by_id(&conn, &operator_id).map_err(|e| e.to_string())?;

    match operator {
        Some(op) => Ok(op.logo_path),
        None => Err("Operador no encontrado".to_string()),
    }
}
