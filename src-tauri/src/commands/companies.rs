use crate::auth::check_permission;
use crate::models::company::{Company, CreateCompanyInput, UpdateCompanyInput};
use crate::models::user::UserRole;
use crate::state::AppState;
use base64::{engine::general_purpose, Engine as _};
use tauri::State;

#[tauri::command]
pub async fn list_companies(
    session_token: String,
    only_active: Option<bool>,
    company_type: Option<String>,
    state: State<'_, AppState>,
) -> Result<Vec<Company>, String> {
    crate::auth::get_session(&session_token, &state).map_err(|e| e.to_string())?;

    let conn = state
        .db
        .lock()
        .map_err(|e| format!("Error al acceder a la base de datos: {}", e))?;

    Company::list(
        &conn,
        only_active.unwrap_or(true),
        company_type.as_deref(),
    )
    .map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn get_company(
    session_token: String,
    company_id: String,
    state: State<'_, AppState>,
) -> Result<Option<Company>, String> {
    crate::auth::get_session(&session_token, &state).map_err(|e| e.to_string())?;

    let conn = state
        .db
        .lock()
        .map_err(|e| format!("Error al acceder a la base de datos: {}", e))?;

    Company::get_by_id(&conn, &company_id).map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn create_company(
    session_token: String,
    input: CreateCompanyInput,
    state: State<'_, AppState>,
) -> Result<Company, String> {
    check_permission(&session_token, UserRole::Admin, &state).map_err(|e| e.to_string())?;

    if input.name.trim().is_empty() {
        return Err("El nombre de la empresa es requerido".to_string());
    }

    Company::validate_type(&input.company_type)?;

    let conn = state
        .db
        .lock()
        .map_err(|e| format!("Error al acceder a la base de datos: {}", e))?;

    // Check for duplicate name within the same type
    if let Some(existing) =
        Company::get_by_name(&conn, input.name.trim(), Some(&input.company_type))
            .map_err(|e| e.to_string())?
    {
        // If already exists with same id (synced from another client), return it
        return Ok(existing);
    }

    Company::create(&conn, &input).map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn update_company(
    session_token: String,
    company_id: String,
    input: UpdateCompanyInput,
    state: State<'_, AppState>,
) -> Result<Company, String> {
    check_permission(&session_token, UserRole::Admin, &state).map_err(|e| e.to_string())?;

    // Validate type if being changed
    if let Some(ref t) = input.company_type {
        Company::validate_type(t)?;
    }

    let conn = state
        .db
        .lock()
        .map_err(|e| format!("Error al acceder a la base de datos: {}", e))?;

    // Check for duplicate name within the same type
    if let Some(ref new_name) = input.name {
        let target_type = input.company_type.as_deref();
        if let Some(existing) =
            Company::get_by_name(&conn, new_name.trim(), target_type)
                .map_err(|e| e.to_string())?
        {
            if existing.id != company_id {
                return Err("Ya existe una empresa con ese nombre y tipo".to_string());
            }
        }
    }

    Company::update(&conn, &company_id, &input)
        .map_err(|e| e.to_string())?
        .ok_or_else(|| "Empresa no encontrada".to_string())
}

#[tauri::command]
pub async fn delete_company(
    session_token: String,
    company_id: String,
    state: State<'_, AppState>,
) -> Result<bool, String> {
    check_permission(&session_token, UserRole::Admin, &state).map_err(|e| e.to_string())?;

    let conn = state
        .db
        .lock()
        .map_err(|e| format!("Error al acceder a la base de datos: {}", e))?;

    Company::delete(&conn, &company_id).map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn upload_company_brand_logo(
    // Alias: logo de empresa individual (operadora/contratista)
    // No confundir con upload_company_logo en app_settings (branding global)
    session_token: String,
    company_id: String,
    file_data: Vec<u8>,
    file_name: String,
    state: State<'_, AppState>,
) -> Result<Company, String> {
    check_permission(&session_token, UserRole::Admin, &state).map_err(|e| e.to_string())?;

    if file_data.len() > 2 * 1024 * 1024 {
        return Err("El archivo excede el límite de 2MB".to_string());
    }

    let ext = file_name
        .rsplit('.')
        .next()
        .unwrap_or("")
        .to_lowercase();

    if !["png", "jpg", "jpeg", "svg", "webp"].contains(&ext.as_str()) {
        return Err("Tipo de archivo inválido. Use PNG, JPG, SVG o WEBP".to_string());
    }

    let mime_type = get_mime_type(&ext);
    let base64_data = general_purpose::STANDARD.encode(&file_data);
    let data_url = format!("data:{};base64,{}", mime_type, base64_data);

    let conn = state
        .db
        .lock()
        .map_err(|e| format!("Error al acceder a la base de datos: {}", e))?;

    if Company::get_by_id(&conn, &company_id)
        .map_err(|e| e.to_string())?
        .is_none()
    {
        return Err("Empresa no encontrada".to_string());
    }

    Company::update_logo(&conn, &company_id, Some(&data_url))
        .map_err(|e| e.to_string())?
        .ok_or_else(|| "Empresa no encontrada".to_string())
}

#[tauri::command]
pub async fn remove_company_brand_logo(
    session_token: String,
    company_id: String,
    state: State<'_, AppState>,
) -> Result<Company, String> {
    check_permission(&session_token, UserRole::Admin, &state).map_err(|e| e.to_string())?;

    let conn = state
        .db
        .lock()
        .map_err(|e| format!("Error al acceder a la base de datos: {}", e))?;

    if Company::get_by_id(&conn, &company_id)
        .map_err(|e| e.to_string())?
        .is_none()
    {
        return Err("Empresa no encontrada".to_string());
    }

    Company::update_logo(&conn, &company_id, None)
        .map_err(|e| e.to_string())?
        .ok_or_else(|| "Empresa no encontrada".to_string())
}

#[tauri::command]
pub async fn get_company_brand_logo(
    session_token: String,
    company_id: String,
    state: State<'_, AppState>,
) -> Result<Option<String>, String> {
    crate::auth::get_session(&session_token, &state).map_err(|e| e.to_string())?;

    let conn = state
        .db
        .lock()
        .map_err(|e| format!("Error al acceder a la base de datos: {}", e))?;

    match Company::get_by_id(&conn, &company_id).map_err(|e| e.to_string())? {
        Some(c) => Ok(c.logo),
        None => Err("Empresa no encontrada".to_string()),
    }
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
