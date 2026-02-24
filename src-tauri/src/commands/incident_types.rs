use crate::auth::get_session;
use crate::models::incident_type::*;
use crate::state::AppState;
use rusqlite::params;
use tauri::State;
use uuid::Uuid;

#[tauri::command]
pub async fn list_incident_types(
    session_token: String,
    state: State<'_, AppState>,
) -> Result<Vec<IncidentType>, String> {
    get_session(&session_token, &state).map_err(|e| e.to_string())?;

    let conn = state.db.lock().map_err(|e| format!("Failed to lock database: {}", e))?;

    let mut stmt = conn.prepare(
        "SELECT id, name, color, sort_order, created_by, created_at, updated_at
         FROM incident_types WHERE is_deleted = 0
         ORDER BY sort_order, name"
    ).map_err(|e| e.to_string())?;

    let rows = stmt.query_map([], |row| {
        Ok(IncidentType {
            id: row.get(0)?,
            name: row.get(1)?,
            color: row.get(2)?,
            sort_order: row.get(3)?,
            created_by: row.get(4)?,
            created_at: row.get(5)?,
            updated_at: row.get(6)?,
        })
    }).map_err(|e| e.to_string())?;

    let mut data = Vec::new();
    for row in rows { data.push(row.map_err(|e| e.to_string())?); }
    Ok(data)
}

#[tauri::command]
pub async fn create_incident_type(
    session_token: String,
    input: CreateIncidentTypeInput,
    state: State<'_, AppState>,
) -> Result<IncidentType, String> {
    let session = get_session(&session_token, &state).map_err(|e| e.to_string())?;

    let name = input.name.trim().to_string();
    if name.is_empty() {
        return Err("El nombre del tipo es requerido".to_string());
    }

    let conn = state.db.lock().map_err(|e| format!("Failed to lock database: {}", e))?;

    let exists: bool = conn.query_row(
        "SELECT COUNT(*) > 0 FROM incident_types WHERE LOWER(name) = LOWER(?1) AND is_deleted = 0",
        params![name],
        |row| row.get(0),
    ).map_err(|e| e.to_string())?;

    if exists {
        return Err(format!("Ya existe un tipo con el nombre '{}'", name));
    }

    let id = Uuid::new_v4().to_string();
    let now = chrono::Utc::now().to_rfc3339();
    let color = input.color.unwrap_or_else(|| "gray".to_string());
    let sort_order = input.sort_order.unwrap_or(0);

    conn.execute(
        "INSERT INTO incident_types (id, name, color, sort_order, created_by, created_at, updated_at)
         VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7)",
        params![id, name, color, sort_order, session.user_id, now, now],
    ).map_err(|e| e.to_string())?;

    Ok(IncidentType {
        id,
        name,
        color,
        sort_order,
        created_by: Some(session.user_id),
        created_at: now.clone(),
        updated_at: now,
    })
}

#[tauri::command]
pub async fn delete_incident_type(
    session_token: String,
    type_id: String,
    state: State<'_, AppState>,
) -> Result<(), String> {
    get_session(&session_token, &state).map_err(|e| e.to_string())?;

    let conn = state.db.lock().map_err(|e| format!("Failed to lock database: {}", e))?;

    let now = chrono::Utc::now().to_rfc3339();
    let affected = conn.execute(
        "UPDATE incident_types SET is_deleted = 1, updated_at = ?1 WHERE id = ?2 AND is_deleted = 0",
        params![now, type_id],
    ).map_err(|e| e.to_string())?;

    if affected == 0 {
        return Err("Tipo de incidencia no encontrado".to_string());
    }

    Ok(())
}
