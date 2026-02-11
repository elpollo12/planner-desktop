use crate::error::Result;
use crate::state::AppState;
use crate::sync::config::TursoCredentials;
use crate::sync::turso_client::{TursoClient, TursoValue};
use serde::Serialize;
use tauri::State;

#[derive(Serialize)]
pub struct RigDebugInfo {
    pub id: String,
    pub name: String,
    pub operator: String,
    pub active: bool,
    pub area_id: Option<String>,
}

#[tauri::command]
pub async fn debug_list_all_rigs(state: State<'_, AppState>) -> Result<Vec<RigDebugInfo>> {
    let conn = state.db.lock().unwrap();

    let mut stmt = conn.prepare(
        "SELECT id, name, operator, active, area_id FROM rigs ORDER BY name ASC"
    )?;

    let rigs = stmt
        .query_map([], |row| {
            Ok(RigDebugInfo {
                id: row.get(0)?,
                name: row.get(1)?,
                operator: row.get(2)?,
                active: row.get::<_, i32>(3)? == 1,
                area_id: row.get(4)?,
            })
        })?
        .collect::<std::result::Result<Vec<_>, _>>()?;

    Ok(rigs)
}

#[derive(Serialize)]
pub struct SyncDebugInfo {
    pub total_rigs: i32,
    pub active_rigs: i32,
    pub inactive_rigs: i32,
    pub total_reports: i32,
    pub sync_enabled: bool,
}

#[tauri::command]
pub async fn debug_get_sync_info(state: State<'_, AppState>) -> Result<SyncDebugInfo> {
    let conn = state.db.lock().unwrap();

    let total_rigs: i32 = conn.query_row(
        "SELECT COUNT(*) FROM rigs",
        [],
        |row| row.get(0)
    )?;

    let active_rigs: i32 = conn.query_row(
        "SELECT COUNT(*) FROM rigs WHERE active = 1",
        [],
        |row| row.get(0)
    )?;

    let inactive_rigs: i32 = conn.query_row(
        "SELECT COUNT(*) FROM rigs WHERE active = 0",
        [],
        |row| row.get(0)
    )?;

    let total_reports: i32 = conn.query_row(
        "SELECT COUNT(*) FROM reports",
        [],
        |row| row.get(0)
    )?;

    Ok(SyncDebugInfo {
        total_rigs,
        active_rigs,
        inactive_rigs,
        total_reports,
        sync_enabled: false, // TODO: check sync config
    })
}

#[derive(Serialize)]
pub struct TursoRigInfo {
    pub id: String,
    pub name: String,
    pub operator: String,
    pub power: String,
    pub active: bool,
}

#[derive(Serialize)]
pub struct SyncStateDebug {
    pub last_pull_at: Option<String>,
    pub last_push_at: Option<String>,
    pub local_rigs_with_timestamps: Vec<RigWithTimestamp>,
    pub turso_rigs_with_timestamps: Vec<RigWithTimestamp>,
}

#[derive(Serialize)]
pub struct RigWithTimestamp {
    pub id: String,
    pub name: String,
    pub updated_at: String,
}

#[tauri::command]
pub async fn debug_query_turso_rigs() -> Result<Vec<TursoRigInfo>> {
    use crate::error::AppError;

    // Check if Turso is configured
    if !TursoCredentials::is_configured() {
        return Err(AppError::Internal("Turso not configured".to_string()));
    }

    let credentials = TursoCredentials::from_env()
        .map_err(|e| AppError::Internal(format!("Error loading Turso credentials: {}", e)))?;

    let client = TursoClient::new(&credentials.database_url, &credentials.auth_token);

    // Query rigs from Turso
    let query = "SELECT id, name, operator, power, active FROM rigs";

    match client.execute(query, vec![]).await {
        Ok(result) => {
            let mut rigs = Vec::new();

            // Iterate over the rows in the result
            for row in result.rows {
                if row.len() >= 5 {
                    let id = match &row[0] {
                        TursoValue::Text(s) => s.clone(),
                        _ => continue,
                    };
                    let name = match &row[1] {
                        TursoValue::Text(s) => s.clone(),
                        _ => continue,
                    };
                    let operator = match &row[2] {
                        TursoValue::Text(s) => s.clone(),
                        _ => continue,
                    };
                    let power = match &row[3] {
                        TursoValue::Text(s) => s.clone(),
                        _ => continue,
                    };
                    let active = match &row[4] {
                        TursoValue::Integer(s) => s.parse::<i64>().unwrap_or(0) != 0,
                        _ => false,
                    };

                    rigs.push(TursoRigInfo {
                        id,
                        name,
                        operator,
                        power,
                        active,
                    });
                }
            }

            Ok(rigs)
        }
        Err(e) => Err(AppError::Internal(format!("Error querying Turso: {}", e))),
    }
}

#[tauri::command]
pub async fn debug_sync_state(state: State<'_, AppState>) -> Result<SyncStateDebug> {
    use crate::error::AppError;

    // Collect all local data in a scope, ensuring everything is dropped before async operations
    let (last_pull_at, last_push_at, local_rigs) = {
        let conn = state.db.lock().unwrap();

        // Get sync state timestamps
        let last_pull_at: Option<String> = conn
            .query_row(
                "SELECT last_pull_at FROM sync_state WHERE id = 1",
                [],
                |row| row.get(0)
            )
            .ok();

        let last_push_at: Option<String> = conn
            .query_row(
                "SELECT last_push_at FROM sync_state WHERE id = 1",
                [],
                |row| row.get(0)
            )
            .ok();

        // Get local rigs with timestamps
        let mut stmt = conn.prepare(
            "SELECT id, name, updated_at FROM rigs ORDER BY name ASC"
        )?;

        let local_rigs = stmt
            .query_map([], |row| {
                Ok(RigWithTimestamp {
                    id: row.get(0)?,
                    name: row.get(1)?,
                    updated_at: row.get(2)?,
                })
            })?
            .collect::<std::result::Result<Vec<_>, _>>()?;

        // Return tuple of all data
        (last_pull_at, last_push_at, local_rigs)
    }; // Connection and statement are dropped here, before async work

    // Now do async operations - all DB resources are released
    let mut turso_rigs = Vec::new();

    if TursoCredentials::is_configured() {
        let credentials = TursoCredentials::from_env()
            .map_err(|e| AppError::Internal(format!("Error loading Turso credentials: {}", e)))?;

        let client = TursoClient::new(&credentials.database_url, &credentials.auth_token);
        let query = "SELECT id, name, updated_at FROM rigs ORDER BY name ASC";

        match client.execute(query, vec![]).await {
            Ok(result) => {
                for row in result.rows {
                    if row.len() >= 3 {
                        let id = match &row[0] {
                            TursoValue::Text(s) => s.clone(),
                            _ => continue,
                        };
                        let name = match &row[1] {
                            TursoValue::Text(s) => s.clone(),
                            _ => continue,
                        };
                        let updated_at = match &row[2] {
                            TursoValue::Text(s) => s.clone(),
                            _ => continue,
                        };

                        turso_rigs.push(RigWithTimestamp {
                            id,
                            name,
                            updated_at,
                        });
                    }
                }
            }
            Err(e) => {
                eprintln!("Error querying Turso rigs: {}", e);
            }
        }
    }

    Ok(SyncStateDebug {
        last_pull_at,
        last_push_at,
        local_rigs_with_timestamps: local_rigs,
        turso_rigs_with_timestamps: turso_rigs,
    })
}

#[derive(Serialize)]
pub struct SyncPullTestResult {
    pub query_executed: String,
    pub rows_returned: usize,
    pub sample_data: Vec<String>,
    pub error: Option<String>,
}

#[tauri::command]
pub async fn debug_test_sync_pull() -> Result<SyncPullTestResult> {
    use crate::error::AppError;

    if !TursoCredentials::is_configured() {
        return Err(AppError::Internal("Turso not configured".to_string()));
    }

    let credentials = TursoCredentials::from_env()
        .map_err(|e| AppError::Internal(format!("Error loading Turso credentials: {}", e)))?;

    let client = TursoClient::new(&credentials.database_url, &credentials.auth_token);

    // Test the exact query that sync uses for rigs (without any timestamp filter)
    let query = "SELECT id, name, operator, power, area_id, active, created_by, updated_by, created_at, updated_at FROM rigs";

    match client.execute(query, vec![]).await {
        Ok(result) => {
            let row_count = result.rows.len();
            let sample_data: Vec<String> = result.rows
                .iter()
                .take(5)
                .map(|row| {
                    if row.len() >= 2 {
                        match (&row[0], &row[1]) {
                            (TursoValue::Text(id), TursoValue::Text(name)) => {
                                format!("{}: {}", &id[..8.min(id.len())], name)
                            }
                            _ => "Invalid row format".to_string(),
                        }
                    } else {
                        "Row too short".to_string()
                    }
                })
                .collect();

            Ok(SyncPullTestResult {
                query_executed: query.to_string(),
                rows_returned: row_count,
                sample_data,
                error: None,
            })
        }
        Err(e) => {
            Ok(SyncPullTestResult {
                query_executed: query.to_string(),
                rows_returned: 0,
                sample_data: vec![],
                error: Some(format!("Query failed: {}", e)),
            })
        }
    }
}

#[derive(Serialize)]
pub struct FullSyncSimulationResult {
    pub step1_query_success: bool,
    pub step1_rows_from_turso: usize,
    pub step2_conversion_success: bool,
    pub step2_converted_rows: usize,
    pub step3_write_success: bool,
    pub step3_rows_written: usize,
    pub errors: Vec<String>,
    pub detailed_log: Vec<String>,
}

#[tauri::command]
pub async fn debug_simulate_full_sync(state: State<'_, AppState>) -> Result<FullSyncSimulationResult> {
    use crate::error::AppError;
    use crate::sync::engine;

    let mut log = Vec::new();
    let mut errors = Vec::new();

    log.push("🚀 Iniciando simulación de sincronización completa...".to_string());

    // Step 1: Query Turso
    log.push("📡 Paso 1: Consultando Turso Cloud...".to_string());

    if !TursoCredentials::is_configured() {
        errors.push("Turso no está configurado".to_string());
        return Ok(FullSyncSimulationResult {
            step1_query_success: false,
            step1_rows_from_turso: 0,
            step2_conversion_success: false,
            step2_converted_rows: 0,
            step3_write_success: false,
            step3_rows_written: 0,
            errors,
            detailed_log: log,
        });
    }

    let credentials = TursoCredentials::from_env()
        .map_err(|e| AppError::Internal(format!("Error loading credentials: {}", e)))?;

    let client = TursoClient::new(&credentials.database_url, &credentials.auth_token);

    // Pull data from Turso (without timestamp filter - full pull)
    let (pulled_data, pull_result) = match engine::pull_data_from_turso(&client, None).await {
        Ok((data, result)) => {
            log.push(format!("✅ Consulta exitosa: {} registros en {} tablas", result.records_pulled, result.tables_synced));
            (data, result)
        }
        Err(e) => {
            errors.push(format!("Error consultando Turso: {}", e));
            return Ok(FullSyncSimulationResult {
                step1_query_success: false,
                step1_rows_from_turso: 0,
                step2_conversion_success: false,
                step2_converted_rows: 0,
                step3_write_success: false,
                step3_rows_written: 0,
                errors,
                detailed_log: log,
            });
        }
    };

    let total_rows_from_turso = pulled_data.iter().map(|(_, rows)| rows.len()).sum();
    log.push(format!("📊 Total de filas devueltas por Turso: {}", total_rows_from_turso));

    // Log details about rigs specifically
    for (idx, rows) in &pulled_data {
        if *idx == 4 { // rigs table index
            log.push(format!("🔧 Tabla 'rigs': {} registros", rows.len()));
            for (i, row) in rows.iter().enumerate().take(3) {
                log.push(format!("   Registro {}: {} columnas", i + 1, row.len()));
            }
        }
    }

    // Step 2: Write to local database
    log.push("💾 Paso 2: Escribiendo a base de datos local...".to_string());

    let rows_written = if !pulled_data.is_empty() {
        let conn = state.db.lock().unwrap();

        match engine::write_pulled_data(&conn, &pulled_data) {
            Ok(count) => {
                log.push(format!("✅ Escritura exitosa: {} registros insertados/actualizados", count));
                count
            }
            Err(e) => {
                errors.push(format!("Error escribiendo a local DB: {}", e));
                log.push(format!("❌ Error en escritura: {}", e));
                0
            }
        }
    } else {
        log.push("⚠️ No hay datos para escribir (pulled_data está vacío)".to_string());
        0
    };

    // Step 3: Verify
    log.push("🔍 Paso 3: Verificando datos escritos...".to_string());
    let conn = state.db.lock().unwrap();
    let rigs_count: i32 = conn.query_row("SELECT COUNT(*) FROM rigs", [], |row| row.get(0))
        .unwrap_or(0);
    log.push(format!("📊 Total de taladros en DB local después de sync: {}", rigs_count));

    Ok(FullSyncSimulationResult {
        step1_query_success: true,
        step1_rows_from_turso: total_rows_from_turso,
        step2_conversion_success: true,
        step2_converted_rows: total_rows_from_turso,
        step3_write_success: errors.is_empty(),
        step3_rows_written: rows_written as usize,
        errors,
        detailed_log: log,
    })
}

#[derive(Serialize)]
pub struct UserDebugInfo {
    pub id: String,
    pub username: String,
    pub full_name: String,
    pub role: String,
    pub active: bool,
    pub has_all_rigs: bool,
}

#[tauri::command]
pub async fn debug_list_all_users(state: State<'_, AppState>) -> Result<Vec<UserDebugInfo>> {
    let conn = state.db.lock().unwrap();

    let mut stmt = conn.prepare(
        "SELECT id, username, full_name, role, active, has_all_rigs FROM users ORDER BY username ASC"
    )?;

    let users = stmt
        .query_map([], |row| {
            Ok(UserDebugInfo {
                id: row.get(0)?,
                username: row.get(1)?,
                full_name: row.get(2)?,
                role: row.get(3)?,
                active: row.get::<_, i32>(4)? == 1,
                has_all_rigs: row.get::<_, i32>(5)? == 1,
            })
        })?
        .collect::<std::result::Result<Vec<_>, _>>()?;

    Ok(users)
}

#[tauri::command]
pub async fn debug_delete_user_by_username(
    username: String,
    state: State<'_, AppState>,
) -> Result<String> {
    let conn = state.db.lock().unwrap();

    let deleted = conn.execute("DELETE FROM users WHERE username = ?1", [&username])?;

    if deleted > 0 {
        Ok(format!("Usuario '{}' eliminado exitosamente", username))
    } else {
        Ok(format!("No se encontró usuario con username '{}'", username))
    }
}
