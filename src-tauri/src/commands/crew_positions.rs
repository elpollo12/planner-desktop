use crate::auth::get_session;
use crate::models::crew_position::*;
use crate::state::AppState;
use rusqlite::params;
use tauri::State;
use uuid::Uuid;

#[tauri::command]
pub async fn list_crew_positions(
    session_token: String,
    state: State<'_, AppState>,
) -> Result<Vec<CrewPosition>, String> {
    get_session(&session_token, &state).map_err(|e| e.to_string())?;

    let conn = state.db.lock().map_err(|e| format!("Failed to lock database: {}", e))?;

    let mut stmt = conn.prepare(
        "SELECT id, name, sort_order, is_default, created_by, created_at, updated_at
         FROM crew_positions WHERE is_deleted = 0
         ORDER BY sort_order, name"
    ).map_err(|e| e.to_string())?;

    let rows = stmt.query_map([], |row| {
        Ok(CrewPosition {
            id:         row.get(0)?,
            name:       row.get(1)?,
            sort_order: row.get(2)?,
            is_default: row.get::<_, i32>(3)? != 0,
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
pub async fn create_crew_position(
    session_token: String,
    input: CreateCrewPositionInput,
    state: State<'_, AppState>,
) -> Result<CrewPosition, String> {
    let session = get_session(&session_token, &state).map_err(|e| e.to_string())?;

    let name = input.name.trim().to_string();
    if name.is_empty() {
        return Err("El nombre de la posición es requerido".to_string());
    }

    let conn = state.db.lock().map_err(|e| format!("Failed to lock database: {}", e))?;

    let exists: bool = conn.query_row(
        "SELECT COUNT(*) > 0 FROM crew_positions WHERE LOWER(name) = LOWER(?1) AND is_deleted = 0",
        params![name],
        |row| row.get(0),
    ).map_err(|e| e.to_string())?;

    if exists {
        return Err(format!("Ya existe una posición con el nombre '{}'", name));
    }

    let id = Uuid::new_v4().to_string();
    let now = chrono::Utc::now().to_rfc3339();
    let sort_order = input.sort_order.unwrap_or(0);

    conn.execute(
        "INSERT INTO crew_positions (id, name, sort_order, is_default, is_deleted, created_by, created_at, updated_at)
         VALUES (?1, ?2, ?3, 0, 0, ?4, ?5, ?6)",
        params![id, name, sort_order, session.user_id, now, now],
    ).map_err(|e| e.to_string())?;

    Ok(CrewPosition {
        id,
        name,
        sort_order,
        is_default: false,
        created_by: Some(session.user_id),
        created_at: now.clone(),
        updated_at: now,
    })
}

#[tauri::command]
pub async fn update_crew_position(
    session_token: String,
    position_id: String,
    input: UpdateCrewPositionInput,
    state: State<'_, AppState>,
) -> Result<CrewPosition, String> {
    get_session(&session_token, &state).map_err(|e| e.to_string())?;

    let conn = state.db.lock().map_err(|e| format!("Failed to lock database: {}", e))?;

    let mut updates: Vec<String> = Vec::new();
    let mut param_values: Vec<Box<dyn rusqlite::types::ToSql>> = Vec::new();
    let mut idx = 1usize;

    if let Some(ref name) = input.name {
        let name = name.trim().to_string();
        if name.is_empty() {
            return Err("El nombre no puede estar vacío".to_string());
        }
        let exists: bool = conn.query_row(
            "SELECT COUNT(*) > 0 FROM crew_positions WHERE LOWER(name) = LOWER(?1) AND id != ?2 AND is_deleted = 0",
            params![name, position_id],
            |row| row.get(0),
        ).map_err(|e| e.to_string())?;
        if exists {
            return Err(format!("Ya existe una posición con el nombre '{}'", name));
        }
        updates.push(format!("name = ?{}", idx));
        param_values.push(Box::new(name));
        idx += 1;
    }

    if let Some(sort_order) = input.sort_order {
        updates.push(format!("sort_order = ?{}", idx));
        param_values.push(Box::new(sort_order));
        idx += 1;
    }

    if updates.is_empty() {
        return Err("No hay campos para actualizar".to_string());
    }

    let now = chrono::Utc::now().to_rfc3339();
    updates.push(format!("updated_at = ?{}", idx));
    param_values.push(Box::new(now));
    idx += 1;
    param_values.push(Box::new(position_id.clone()));

    let query = format!(
        "UPDATE crew_positions SET {} WHERE id = ?{} AND is_deleted = 0",
        updates.join(", "), idx
    );
    let params_refs: Vec<&dyn rusqlite::types::ToSql> = param_values.iter().map(|p| p.as_ref()).collect();
    let affected = conn.execute(&query, params_refs.as_slice()).map_err(|e| e.to_string())?;
    if affected == 0 {
        return Err("Posición no encontrada".to_string());
    }

    conn.query_row(
        "SELECT id, name, sort_order, is_default, created_by, created_at, updated_at
         FROM crew_positions WHERE id = ?1",
        params![position_id],
        |row| Ok(CrewPosition {
            id:         row.get(0)?,
            name:       row.get(1)?,
            sort_order: row.get(2)?,
            is_default: row.get::<_, i32>(3)? != 0,
            created_by: row.get(4)?,
            created_at: row.get(5)?,
            updated_at: row.get(6)?,
        }),
    ).map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn delete_crew_position(
    session_token: String,
    position_id: String,
    state: State<'_, AppState>,
) -> Result<(), String> {
    get_session(&session_token, &state).map_err(|e| e.to_string())?;

    let conn = state.db.lock().map_err(|e| format!("Failed to lock database: {}", e))?;

    // Protect default (seeded) positions from deletion
    let is_default: bool = conn.query_row(
        "SELECT is_default FROM crew_positions WHERE id = ?1 AND is_deleted = 0",
        params![position_id],
        |row| row.get::<_, i32>(0).map(|v| v != 0),
    ).map_err(|_| "Posición no encontrada".to_string())?;

    if is_default {
        return Err("Las posiciones predeterminadas no pueden eliminarse".to_string());
    }

    let now = chrono::Utc::now().to_rfc3339();
    let affected = conn.execute(
        "UPDATE crew_positions SET is_deleted = 1, updated_at = ?1 WHERE id = ?2 AND is_deleted = 0",
        params![now, position_id],
    ).map_err(|e| e.to_string())?;

    if affected == 0 {
        return Err("Posición no encontrada".to_string());
    }

    Ok(())
}
