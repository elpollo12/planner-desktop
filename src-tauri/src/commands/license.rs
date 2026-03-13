use crate::license;
use crate::models::audit_log::{AuditEntry, NewAuditEntry, AUDIT_ACTIVATE_LICENSE};
use crate::state::AppState;
use crate::sync::config as sync_config;
use tauri::{Manager, State};

#[tauri::command]
pub fn activate_license(
    app: tauri::AppHandle,
    license_key: String,
    state: State<'_, AppState>,
) -> Result<license::LicenseInfo, String> {
    let resource_dir = app.path().resource_dir()
        .map_err(|e| format!("Error obteniendo resource_dir: {}", e))?;
    let result = license::activate_license(&license_key, &resource_dir)?;

    // Resetear handshake_done para que la nueva licencia dispare el handshake inicial
    if let Ok(mut cfg) = sync_config::load_config() {
        cfg.handshake_done = false;
        let _ = sync_config::save_config(&cfg);
    }

    // Audit: activación de licencia
    // Actor: "system" ya que puede ocurrir antes del primer login
    if let Ok(conn) = state.db.lock() {
        AuditEntry::record(&conn, NewAuditEntry {
            actor_id:    "system",
            actor_name:  "system",
            action:      AUDIT_ACTIVATE_LICENSE,
            target_type: Some("license"),
            target_id:   None,
            target_name: Some(&result.tenant),
            detail:      None,
        });
    }

    Ok(result)
}

#[tauri::command]
pub fn get_license_status(app: tauri::AppHandle) -> Result<Option<license::LicenseInfo>, String> {
    let resource_dir = app.path().resource_dir()
        .map_err(|e| format!("Error obteniendo resource_dir: {}", e))?;
    license::get_license_status(&resource_dir)
}

#[tauri::command]
pub fn deactivate_license() -> Result<(), String> {
    license::deactivate_license()
}
