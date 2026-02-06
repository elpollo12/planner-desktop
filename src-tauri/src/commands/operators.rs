use crate::auth::check_permission;
use crate::models::operator::{CreateOperatorInput, Operator, UpdateOperatorInput};
use crate::models::user::UserRole;
use crate::state::AppState;
use chrono::Utc;
use std::fmt::Write;
use std::path::Path;
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

    // Check if name already exists
    if let Some(_) = Operator::get_by_name(&conn, input.name.trim()).map_err(|e| e.to_string())? {
        return Err("Ya existe un operador con ese nombre".to_string());
    }

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

    // Delete logo file if exists
    if let Some(op) = Operator::get_by_id(&conn, &operator_id).map_err(|e| e.to_string())? {
        if let Some(ref logo_path) = op.logo_path {
            let _ = std::fs::remove_file(logo_path);
        }
    }

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

    // Validate extension
    let ext = file_name
        .rsplit('.')
        .next()
        .unwrap_or("")
        .to_lowercase();
    if !["png", "jpg", "jpeg", "svg", "webp"].contains(&ext.as_str()) {
        return Err("Tipo de archivo inválido. Use PNG, JPG, SVG o WEBP".to_string());
    }

    // Get app data directory
    let app_data_dir = dirs::data_dir()
        .ok_or_else(|| "Could not find app data directory".to_string())?;

    let logos_dir = app_data_dir
        .join("d-planner-temp")
        .join("operator-logos");
    std::fs::create_dir_all(&logos_dir)
        .map_err(|e| format!("Failed to create logos directory: {}", e))?;

    // Delete old logo if exists
    {
        let conn = state
            .db
            .lock()
            .map_err(|e| format!("Failed to lock database: {}", e))?;

        if let Some(op) = Operator::get_by_id(&conn, &operator_id).map_err(|e| e.to_string())? {
            if let Some(ref old_path) = op.logo_path {
                let _ = std::fs::remove_file(old_path);
            }
        } else {
            return Err("Operador no encontrado".to_string());
        }
    }

    // Save new file
    let timestamp = Utc::now().timestamp();
    let new_filename = format!("{}_{}.{}", operator_id, timestamp, ext);
    let file_path = logos_dir.join(&new_filename);
    let file_path_str = file_path.to_string_lossy().to_string();

    std::fs::write(&file_path, &file_data)
        .map_err(|e| format!("Failed to save logo file: {}", e))?;

    // Update operator with logo path
    let conn = state
        .db
        .lock()
        .map_err(|e| format!("Failed to lock database: {}", e))?;

    Operator::update_logo(&conn, &operator_id, Some(&file_path_str))
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

    // Get current logo path and delete file
    if let Some(op) = Operator::get_by_id(&conn, &operator_id).map_err(|e| e.to_string())? {
        if let Some(ref logo_path) = op.logo_path {
            let _ = std::fs::remove_file(logo_path);
        }
    } else {
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

fn base64_encode(data: &[u8]) -> String {
    const CHARS: &[u8] = b"ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
    let mut result = String::with_capacity((data.len() + 2) / 3 * 4);

    for chunk in data.chunks(3) {
        let b0 = chunk[0] as u32;
        let b1 = if chunk.len() > 1 { chunk[1] as u32 } else { 0 };
        let b2 = if chunk.len() > 2 { chunk[2] as u32 } else { 0 };

        let triple = (b0 << 16) | (b1 << 8) | b2;

        result.push(CHARS[((triple >> 18) & 0x3F) as usize] as char);
        result.push(CHARS[((triple >> 12) & 0x3F) as usize] as char);

        if chunk.len() > 1 {
            result.push(CHARS[((triple >> 6) & 0x3F) as usize] as char);
        } else {
            result.push('=');
        }

        if chunk.len() > 2 {
            result.push(CHARS[(triple & 0x3F) as usize] as char);
        } else {
            result.push('=');
        }
    }

    result
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
        Some(op) => match op.logo_path {
            Some(ref path_str) => {
                let path = Path::new(path_str);
                if !path.exists() {
                    return Ok(None);
                }
                let data = std::fs::read(path)
                    .map_err(|e| format!("Failed to read logo: {}", e))?;

                let ext = path
                    .extension()
                    .and_then(|e| e.to_str())
                    .unwrap_or("png")
                    .to_lowercase();
                let mime = get_mime_type(&ext);

                let mut b64 = String::from("data:");
                b64.push_str(mime);
                b64.push_str(";base64,");

                let encoded = base64_encode(&data);
                write!(&mut b64, "{}", encoded).unwrap();

                Ok(Some(b64))
            }
            None => Ok(None),
        },
        None => Err("Operador no encontrado".to_string()),
    }
}
