use ed25519_dalek::{Signature, Verifier, VerifyingKey};
use serde::{Deserialize, Serialize};
use std::path::{Path, PathBuf};

/// Ed25519 public key embedded at compile time — used as fallback only
const LICENSE_PUBLIC_KEY_FALLBACK: &[u8; 32] = include_bytes!("../license_pub.key");

/// Load the Ed25519 public key.
/// Priority:
///   1. <resource_dir>/license_pub.key  (producción: Tauri resource dir)
///   2. <exe_dir>/../../keys/license_pub.key  (desarrollo: planner-desktop/keys/)
///   3. Clave embebida en el binario (fallback)
fn load_public_key(resource_dir: &Path) -> [u8; 32] {
    let candidates: Vec<PathBuf> = vec![
        // Producción: Tauri resource dir
        resource_dir.join("license_pub.key"),
        // Desarrollo: planner-desktop/keys/license_pub.key
        std::env::current_exe()
            .ok()
            .and_then(|p| {
                // target/debug/ → ../.. → src-tauri → .. → planner-desktop
                p.parent()?.parent()?.parent()
                    .map(|d| d.join("keys").join("license_pub.key"))
            })
            .unwrap_or_default(),
    ];

    for path in &candidates {
        if path.exists() {
            if let Ok(bytes) = std::fs::read(path) {
                if bytes.len() == 32 {
                    let mut arr = [0u8; 32];
                    arr.copy_from_slice(&bytes);
                    return arr;
                }
            }
        }
    }

    // Fallback: clave embebida
    *LICENSE_PUBLIC_KEY_FALLBACK
}

/// License payload — the data that gets signed
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct LicensePayload {
    pub id: String,
    pub customer: String,
    pub issued_at: String,
    pub expiry: Option<String>, // None = lifetime license
    pub max_users: u32,
}

/// Full license with payload + signature
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct License {
    pub payload: LicensePayload,
    pub signature: String, // base64-encoded Ed25519 signature
}

/// License info returned to the frontend
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct LicenseInfo {
    pub id: String,
    pub customer: String,
    pub issued_at: String,
    pub expiry: Option<String>,
    pub max_users: u32,
    pub is_valid: bool,
    pub is_lifetime: bool,
}

impl From<&LicensePayload> for LicenseInfo {
    fn from(p: &LicensePayload) -> Self {
        let is_lifetime = p.expiry.is_none();
        let is_valid = if is_lifetime {
            true
        } else {
            check_expiry(p.expiry.as_deref())
        };

        Self {
            id: p.id.clone(),
            customer: p.customer.clone(),
            issued_at: p.issued_at.clone(),
            expiry: p.expiry.clone(),
            max_users: p.max_users,
            is_valid,
            is_lifetime,
        }
    }
}

/// Check if the license has not expired
fn check_expiry(expiry: Option<&str>) -> bool {
    match expiry {
        None => true, // lifetime
        Some(date_str) => {
            let today = chrono::Local::now().format("%Y-%m-%d").to_string();
            date_str >= today.as_str()
        }
    }
}

/// Verify the Ed25519 signature of a license payload
fn verify_signature(payload: &LicensePayload, signature_b64: &str, resource_dir: &Path) -> Result<(), String> {
    use base64::{engine::general_purpose, Engine as _};

    let sig_bytes = general_purpose::STANDARD
        .decode(signature_b64)
        .map_err(|e| format!("Firma inválida (base64): {}", e))?;

    let signature = Signature::from_slice(&sig_bytes)
        .map_err(|e| format!("Firma inválida (Ed25519): {}", e))?;

    let pub_key_bytes = load_public_key(resource_dir);
    let verifying_key = VerifyingKey::from_bytes(&pub_key_bytes)
        .map_err(|e| format!("Error cargando clave pública: {}", e))?;

    let payload_json = serde_json::to_string(payload)
        .map_err(|e| format!("Error serializando payload: {}", e))?;

    verifying_key
        .verify(payload_json.as_bytes(), &signature)
        .map_err(|_| "Licencia inválida: firma no válida".to_string())
}

/// Get the path to the license file in app data dir
fn get_license_path() -> Result<PathBuf, String> {
    let app_data_dir = dirs::data_dir()
        .ok_or_else(|| "No se pudo encontrar el directorio de datos".to_string())?;

    let mut license_dir = app_data_dir;
    license_dir.push("d-planner-temp");

    if !license_dir.exists() {
        std::fs::create_dir_all(&license_dir)
            .map_err(|e| format!("Error creando directorio: {}", e))?;
    }

    license_dir.push("license.json");
    Ok(license_dir)
}

/// Decode a license key (base64-encoded JSON) and verify it
pub fn verify_license_key(license_key: &str, resource_dir: &Path) -> Result<License, String> {
    use base64::{engine::general_purpose, Engine as _};

    let json_bytes = general_purpose::STANDARD
        .decode(license_key.trim())
        .map_err(|e| format!("Clave de licencia inválida (formato): {}", e))?;

    let json_str = String::from_utf8(json_bytes)
        .map_err(|e| format!("Clave de licencia inválida (UTF-8): {}", e))?;

    let license: License = serde_json::from_str(&json_str)
        .map_err(|e| format!("Clave de licencia inválida (JSON): {}", e))?;

    verify_signature(&license.payload, &license.signature, resource_dir)?;

    if !check_expiry(license.payload.expiry.as_deref()) {
        return Err("Licencia expirada".to_string());
    }

    Ok(license)
}

/// Load saved license from disk
pub fn load_license() -> Result<Option<License>, String> {
    let path = get_license_path()?;

    if !path.exists() {
        return Ok(None);
    }

    let content = std::fs::read_to_string(&path)
        .map_err(|e| format!("Error leyendo licencia: {}", e))?;

    let license: License = serde_json::from_str(&content)
        .map_err(|e| format!("Error parseando licencia: {}", e))?;

    Ok(Some(license))
}

/// Save a verified license to disk
fn save_license_to_disk(license: &License) -> Result<(), String> {
    let path = get_license_path()?;

    let content = serde_json::to_string_pretty(license)
        .map_err(|e| format!("Error serializando licencia: {}", e))?;

    std::fs::write(&path, content)
        .map_err(|e| format!("Error guardando licencia: {}", e))
}

/// Delete license from disk
fn delete_license_from_disk() -> Result<(), String> {
    let path = get_license_path()?;

    if path.exists() {
        std::fs::remove_file(&path)
            .map_err(|e| format!("Error eliminando licencia: {}", e))?;
    }

    Ok(())
}

/// Activate a license: verify + save + return info
pub fn activate_license(license_key: &str, resource_dir: &Path) -> Result<LicenseInfo, String> {
    let license = verify_license_key(license_key, resource_dir)?;
    save_license_to_disk(&license)?;
    Ok(LicenseInfo::from(&license.payload))
}

/// Get current license status
pub fn get_license_status(resource_dir: &Path) -> Result<Option<LicenseInfo>, String> {
    match load_license()? {
        None => Ok(None),
        Some(license) => {
            verify_signature(&license.payload, &license.signature, resource_dir)?;
            let info = LicenseInfo::from(&license.payload);
            Ok(Some(info))
        }
    }
}

/// Deactivate (remove) license
pub fn deactivate_license() -> Result<(), String> {
    delete_license_from_disk()
}
