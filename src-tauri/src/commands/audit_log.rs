use crate::auth::check_permission;
use crate::models::audit_log::AuditEntry;
use crate::models::user::UserRole;
use crate::state::AppState;
use serde::Serialize;
use tauri::State;

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct AuditLogPage {
    pub entries: Vec<crate::models::audit_log::AuditEntry>,
    pub total:   u32,
    pub page:    u32,
    pub pages:   u32,
}

/// Lista entradas del audit_log con paginación y filtro opcional por acción.
/// Solo accesible para administradores.
#[tauri::command]
pub async fn list_audit_log(
    session_token: String,
    page: Option<u32>,
    page_size: Option<u32>,
    action_filter: Option<String>,
    state: State<'_, AppState>,
) -> Result<AuditLogPage, String> {
    check_permission(&session_token, UserRole::Admin, &state)
        .map_err(|e| e.to_string())?;

    let page      = page.unwrap_or(0);
    let page_size = page_size.unwrap_or(50).min(200); // máximo 200 por página

    let conn = state
        .db
        .lock()
        .map_err(|e| format!("Failed to lock database: {}", e))?;

    let filter_ref = action_filter.as_deref();

    let entries = AuditEntry::list(&conn, page, page_size, filter_ref)
        .map_err(|e| e.to_string())?;

    let total = AuditEntry::count(&conn, filter_ref)
        .map_err(|e| e.to_string())?;

    let pages = if page_size > 0 { (total + page_size - 1) / page_size } else { 0 };

    Ok(AuditLogPage { entries, total, page, pages })
}
