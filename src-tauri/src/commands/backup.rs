//! Backup de la base de datos local antes de instalar actualizaciones.

use crate::auth::get_session;
use crate::db::connection::get_db_path;
use crate::error::Result;
use crate::state::AppState;
use chrono::Local;
use serde::{Deserialize, Serialize};
use std::path::PathBuf;
use tauri::State;

#[derive(Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct BackupResult {
    pub success: bool,
    pub backup_path: String,
    pub size_bytes: u64,
    pub created_at: String,
}

/// Devuelve el directorio donde se guardan los backups.
/// Windows: %APPDATA%\d-planner-temp\backups\
fn get_backup_dir() -> Result<PathBuf> {
    let db_path = get_db_path()?;
    // db_path = .../d-planner-temp/planner.db  →  parent = .../d-planner-temp/
    let parent = db_path.parent().ok_or_else(|| {
        crate::error::AppError::Internal("No se pudo determinar el directorio de datos".into())
    })?;
    let backup_dir = parent.join("backups");
    if !backup_dir.exists() {
        std::fs::create_dir_all(&backup_dir).map_err(|e| {
            crate::error::AppError::Internal(format!("No se pudo crear directorio de backup: {}", e))
        })?;
    }
    Ok(backup_dir)
}

/// Elimina backups antiguos, conservando solo los N más recientes.
fn prune_old_backups(backup_dir: &PathBuf, keep: usize) {
    let Ok(entries) = std::fs::read_dir(backup_dir) else { return };

    let mut files: Vec<PathBuf> = entries
        .flatten()
        .filter(|e| {
            e.path()
                .extension()
                .map(|x| x == "db")
                .unwrap_or(false)
        })
        .map(|e| e.path())
        .collect();

    // Ordenar por nombre (contiene timestamp ISO) — más antiguo primero.
    files.sort();

    if files.len() > keep {
        for old in files.iter().take(files.len() - keep) {
            let _ = std::fs::remove_file(old);
            println!("[Backup] Eliminado backup antiguo: {:?}", old);
        }
    }
}

/// Crea una copia de seguridad de planner.db con timestamp en el nombre.
/// Accesible para cualquier usuario autenticado (operador, supervisor, admin).
/// Se llama automáticamente antes de instalar una actualización.
#[tauri::command]
pub async fn backup_database(
    session_token: String,
    state: State<'_, AppState>,
) -> Result<BackupResult> {
    // Solo verificar que la sesión sea válida — no se requiere rol admin.
    get_session(&session_token, &state)?;

    let db_path = get_db_path()?;
    let backup_dir = get_backup_dir()?;

    // Nombre: planner_backup_2026-03-09T14-35-22.db
    let timestamp = Local::now().format("%Y-%m-%dT%H-%M-%S").to_string();
    let backup_name = format!("planner_backup_{}.db", timestamp);
    let backup_path = backup_dir.join(&backup_name);

    std::fs::copy(&db_path, &backup_path).map_err(|e| {
        crate::error::AppError::Internal(format!("Error copiando base de datos: {}", e))
    })?;

    let size_bytes = std::fs::metadata(&backup_path)
        .map(|m| m.len())
        .unwrap_or(0);

    // Conservar solo los últimos 5 backups para no acumular espacio.
    prune_old_backups(&backup_dir, 5);

    let backup_path_str = backup_path.to_string_lossy().to_string();
    println!("[Backup] Backup creado: {} ({} bytes)", backup_path_str, size_bytes);

    Ok(BackupResult {
        success: true,
        backup_path: backup_path_str,
        size_bytes,
        created_at: Local::now().to_rfc3339(),
    })
}
