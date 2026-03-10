use crate::license;
use crate::state::AppState;
use crate::sync::config as sync_config;
use crate::sync::engine;
use crate::sync::sync_client::SyncClient;
use serde::{Deserialize, Serialize};
use tauri::{Manager, State};

#[derive(Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct HandshakeResult {
    pub success: bool,
    pub records_synced: u32,
    pub error: Option<String>,
}

#[tauri::command]
pub fn activate_license(app: tauri::AppHandle, license_key: String) -> Result<license::LicenseInfo, String> {
    let resource_dir = app.path().resource_dir()
        .map_err(|e| format!("Error obteniendo resource_dir: {}", e))?;
    let info = license::activate_license(&license_key, &resource_dir)?;

    // Guardar el apiEndpoint de la licencia como server_url en sync_config.
    // Esto permite que cualquier usuario se conecte sin configuración manual.
    let mut cfg = sync_config::load_config().unwrap_or_default();
    cfg.server_url = Some(info.api_endpoint.clone());
    if let Err(e) = sync_config::save_config(&cfg) {
        // No es fatal — el usuario puede configurarlo manualmente después
        eprintln!("[License] Advertencia: no se pudo guardar server_url en sync_config: {}", e);
    }

    Ok(info)
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

/// Bootstrap handshake: descarga tablas mínimas del servidor para que el
/// login funcione en una instalación nueva sin intervención del administrador.
///
/// Best-effort — los errores de red/servidor no bloquean la activación.
/// Siempre retorna HandshakeResult, nunca Err.
#[tauri::command]
pub async fn sync_handshake(state: State<'_, AppState>) -> Result<HandshakeResult, String> {
    // 1. Cargar licencia activa
    let license = match license::load_license() {
        Ok(Some(l)) => l,
        Ok(None) => {
            return Ok(HandshakeResult {
                success: false,
                records_synced: 0,
                error: Some("No hay licencia activa".to_string()),
            });
        }
        Err(e) => {
            return Ok(HandshakeResult {
                success: false,
                records_synced: 0,
                error: Some(format!("Error leyendo licencia: {}", e)),
            });
        }
    };

    let tenant = license.payload.tenant.clone();
    let api_endpoint = license.payload.api_endpoint.clone();

    if tenant.is_empty() || api_endpoint.is_empty() {
        return Ok(HandshakeResult {
            success: false,
            records_synced: 0,
            error: Some("La licencia no contiene tenant o api_endpoint".to_string()),
        });
    }

    // 2. POST handshake → recibe tablas bootstrap en formato PullResponse
    let client = SyncClient::new(&api_endpoint);
    let pull_resp = match client.handshake(&tenant).await {
        Ok(r) => r,
        Err(e) => {
            eprintln!("[Handshake] Falló: {}", e);
            return Ok(HandshakeResult {
                success: false,
                records_synced: 0,
                error: Some(e),
            });
        }
    };

    if pull_resp.tables.is_empty() {
        return Ok(HandshakeResult {
            success: true,
            records_synced: 0,
            error: None,
        });
    }

    // 3. Convertir PullResponse → formato interno del engine
    let pulled_data = engine::pull_response_to_indexed(&pull_resp.tables);

    // 4. Escribir en DB local
    let records_synced = match state.db.lock() {
        Ok(conn) => {
            match engine::write_pulled_data(&conn, &pulled_data) {
                Ok(n) => n,
                Err(e) => {
                    eprintln!("[Handshake] Error escribiendo en DB local: {}", e);
                    return Ok(HandshakeResult {
                        success: false,
                        records_synced: 0,
                        error: Some(format!("Error guardando datos locales: {}", e)),
                    });
                }
            }
        }
        Err(e) => {
            return Ok(HandshakeResult {
                success: false,
                records_synced: 0,
                error: Some(format!("Error accediendo a la base de datos: {}", e)),
            });
        }
    };

    println!("[Handshake] OK — {} registros sincronizados (tenant={})", records_synced, tenant);
    Ok(HandshakeResult {
        success: true,
        records_synced,
        error: None,
    })
}
