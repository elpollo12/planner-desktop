use crate::license;

#[tauri::command]
pub fn activate_license(license_key: String) -> Result<license::LicenseInfo, String> {
    license::activate_license(&license_key)
}

#[tauri::command]
pub fn get_license_status() -> Result<Option<license::LicenseInfo>, String> {
    license::get_license_status()
}

#[tauri::command]
pub fn deactivate_license() -> Result<(), String> {
    license::deactivate_license()
}
