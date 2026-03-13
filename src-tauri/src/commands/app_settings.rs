use crate::auth::get_session;
use crate::error::{AppError, Result};
use crate::models::app_settings::{AppSettings, SaveAppSettingsInput};
use crate::models::user::UserRole;
use crate::state::AppState;
use base64::{engine::general_purpose, Engine as _};
use tauri::State;

/// Get app settings (public - all users can see company branding)
#[tauri::command]
pub async fn get_app_settings(state: State<'_, AppState>) -> Result<AppSettings> {
    let conn = state.db.lock().unwrap();
    let settings = AppSettings::get(&conn)?;
    Ok(settings)
}

/// Save app settings (admin only)
#[tauri::command]
pub async fn save_app_settings(
    session_token: String,
    state: State<'_, AppState>,
    input: SaveAppSettingsInput,
) -> Result<AppSettings> {
    // Verify admin
    let session = get_session(&session_token, &state)?;
    let user_role = UserRole::from_str(&session.role)?;

    if user_role != UserRole::Admin {
        return Err(AppError::PermissionDenied(
            "Solo los administradores pueden modificar la configuración de la empresa".to_string()
        ));
    }

    let conn = state.db.lock().unwrap();
    let settings = AppSettings::update(&conn, &input)?;
    Ok(settings)
}

/// Upload company logo (admin only)
#[tauri::command]
pub async fn upload_company_logo(
    session_token: String,
    state: State<'_, AppState>,
    file_data: Vec<u8>,
    file_name: String,
) -> Result<String> {
    // Verify admin
    let session = get_session(&session_token, &state)?;
    let user_role = UserRole::from_str(&session.role)?;

    if user_role != UserRole::Admin {
        return Err(AppError::PermissionDenied(
            "Solo los administradores pueden modificar el logo de la empresa".to_string()
        ));
    }

    // Validate file size (max 2MB)
    if file_data.len() > 2 * 1024 * 1024 {
        return Err(AppError::ValidationError("El logo no puede exceder 2MB".to_string()));
    }

    // Validate MIME type por magic bytes (no confiar solo en la extensión del archivo)
    // Referencias: https://en.wikipedia.org/wiki/List_of_file_signatures
    let mime_type_by_magic = if file_data.starts_with(&[0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A]) {
        Some("image/png")
    } else if file_data.starts_with(&[0xFF, 0xD8, 0xFF]) {
        Some("image/jpeg")
    } else if file_data.starts_with(b"RIFF") && file_data.get(8..12) == Some(b"WEBP") {
        Some("image/webp")
    } else if file_data.starts_with(b"<svg") || file_data.starts_with(b"<?xml") {
        // SVG es texto — no tiene magic bytes binarios, pero debe empezar con etiqueta XML/SVG
        // Validación mínima: rechazar si la extensión no coincide
        Some("image/svg+xml")
    } else {
        None
    };

    // Validar extensión del archivo
    let mime_type_by_ext = match file_name.split('.').last().map(|s| s.to_lowercase()).as_deref() {
        Some("png")  => Some("image/png"),
        Some("jpg") | Some("jpeg") => Some("image/jpeg"),
        Some("svg")  => Some("image/svg+xml"),
        Some("webp") => Some("image/webp"),
        _            => None,
    };

    // Ambos deben coincidir (excepto SVG que se valída solo por extensión)
    let mime_type = match (mime_type_by_magic, mime_type_by_ext) {
        (Some(magic), Some(ext)) if magic == ext => magic,
        (None, Some("image/svg+xml"))             => "image/svg+xml", // SVG validado por extensión
        (Some(_), None) | (None, None)            => return Err(AppError::ValidationError(
            "Formato de imagen no soportado. Use PNG, JPG, SVG o WEBP".to_string()
        )),
        (Some(_), Some(_))                        => return Err(AppError::ValidationError(
            "El tipo de archivo no coincide con su extensión".to_string()
        )),
        _                                         => return Err(AppError::ValidationError(
            "Formato de imagen no soportado. Use PNG, JPG, SVG o WEBP".to_string()
        )),
    };

    // Encode as base64 data URL
    let base64_data = general_purpose::STANDARD.encode(&file_data);
    let data_url = format!("data:{};base64,{}", mime_type, base64_data);

    let conn = state.db.lock().unwrap();
    AppSettings::update_logo(&conn, Some(&data_url))?;

    Ok(data_url)
}

/// Remove company logo (admin only)
#[tauri::command]
pub async fn remove_company_logo(
    session_token: String,
    state: State<'_, AppState>,
) -> Result<()> {
    // Verify admin
    let session = get_session(&session_token, &state)?;
    let user_role = UserRole::from_str(&session.role)?;

    if user_role != UserRole::Admin {
        return Err(AppError::PermissionDenied(
            "Solo los administradores pueden modificar el logo de la empresa".to_string()
        ));
    }

    let conn = state.db.lock().unwrap();
    AppSettings::update_logo(&conn, None)?;
    Ok(())
}

/// Get company logo data URL (public)
#[tauri::command]
pub async fn get_company_logo_data(state: State<'_, AppState>) -> Result<Option<String>> {
    let conn = state.db.lock().unwrap();
    let settings = AppSettings::get(&conn)?;
    Ok(settings.logo_path)
}
