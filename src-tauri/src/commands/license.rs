use crate::license;
use tauri::Manager;

#[tauri::command]
pub fn activate_license(app: tauri::AppHandle, license_key: String) -> Result<license::LicenseInfo, String> {
    let resource_dir = app.path().resource_dir()
        .map_err(|e| format!("Error obteniendo resource_dir: {}", e))?;
    license::activate_license(&license_key, &resource_dir)
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
