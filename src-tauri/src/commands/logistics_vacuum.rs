use crate::auth::get_session;
use crate::models::logistics::*;
use crate::models::user::User;
use crate::state::AppState;
use rusqlite::params;
use tauri::State;
use uuid::Uuid;

fn paginate(page: Option<i64>, page_size: Option<i64>) -> (i64, i64, i64) {
    let page = page.unwrap_or(1).max(1);
    let page_size = page_size.unwrap_or(20).clamp(1, 100);
    let offset = (page - 1) * page_size;
    (page, page_size, offset)
}

fn total_pages(total: i64, page_size: i64) -> i64 {
    if total == 0 { 0 } else { (total as f64 / page_size as f64).ceil() as i64 }
}

#[tauri::command]
pub async fn create_vacuum_action(
    session_token: String,
    rig_id: String,
    input: CreateVacuumAction,
    state: State<'_, AppState>,
) -> Result<VacuumAction, String> {
    let session = get_session(&session_token, &state).map_err(|e| e.to_string())?;

    let conn = state.db.lock().map_err(|e| format!("Failed to lock database: {}", e))?;
    let has_access = User::has_rig_access(&conn, &session.user_id, &rig_id).map_err(|e| e.to_string())?;
    if !has_access {
        return Err("No tienes acceso a este taladro".to_string());
    }

    if input.action_name.trim().is_empty() {
        return Err("El nombre de la acción es requerido".to_string());
    }

    let id = Uuid::new_v4().to_string();
    let now = chrono::Utc::now().to_rfc3339();

    conn.execute(
        "INSERT INTO logistics_vacuum_actions (id, rig_id, action_name, notes, created_by, created_at, updated_at)
         VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7)",
        params![id, rig_id, input.action_name.trim(), input.notes, session.user_id, now, now],
    ).map_err(|e| e.to_string())?;

    Ok(VacuumAction {
        id,
        rig_id: Some(rig_id),
        action_name: input.action_name.trim().to_string(),
        notes: input.notes,
        created_by: Some(session.user_id),
        created_at: now,
    })
}

#[tauri::command]
pub async fn get_vacuum_actions(
    session_token: String,
    rig_id: String,
    page: Option<i64>,
    page_size: Option<i64>,
    state: State<'_, AppState>,
) -> Result<PaginatedResponse<VacuumAction>, String> {
    let session = get_session(&session_token, &state).map_err(|e| e.to_string())?;

    let conn = state.db.lock().map_err(|e| format!("Failed to lock database: {}", e))?;
    let has_access = User::has_rig_access(&conn, &session.user_id, &rig_id).map_err(|e| e.to_string())?;
    if !has_access {
        return Err("No tienes acceso a este taladro".to_string());
    }

    let total: i64 = conn
        .query_row(
            "SELECT COUNT(*) FROM logistics_vacuum_actions WHERE rig_id = ?1 AND is_deleted = 0",
            params![rig_id], |row| row.get(0),
        )
        .map_err(|e| e.to_string())?;

    let (pg, ps, offset) = paginate(page, page_size);

    let mut stmt = conn.prepare(
        "SELECT id, rig_id, action_name, notes, created_by, created_at
         FROM logistics_vacuum_actions
         WHERE rig_id = ?1 AND is_deleted = 0
         ORDER BY created_at DESC
         LIMIT ?2 OFFSET ?3"
    ).map_err(|e| e.to_string())?;

    let rows = stmt
        .query_map(params![rig_id, ps, offset], |row| {
            Ok(VacuumAction {
                id: row.get(0)?,
                rig_id: row.get(1)?,
                action_name: row.get(2)?,
                notes: row.get(3)?,
                created_by: row.get(4)?,
                created_at: row.get(5)?,
            })
        })
        .map_err(|e| e.to_string())?;

    let mut data = Vec::new();
    for row in rows { data.push(row.map_err(|e| e.to_string())?); }

    Ok(PaginatedResponse { data, total, page: pg, page_size: ps, total_pages: total_pages(total, ps) })
}

#[tauri::command]
pub async fn update_vacuum_action(
    session_token: String,
    action_id: String,
    input: UpdateVacuumAction,
    state: State<'_, AppState>,
) -> Result<VacuumAction, String> {
    let session = get_session(&session_token, &state).map_err(|e| e.to_string())?;

    match session.role.as_str() {
        "supervisor" | "admin" => {}
        _ => return Err("No tienes permisos para editar acciones".to_string()),
    }

    let conn = state.db.lock().map_err(|e| format!("Failed to lock database: {}", e))?;

    // Verify rig access
    let rig_id: Option<String> = conn.query_row(
        "SELECT rig_id FROM logistics_vacuum_actions WHERE id = ?1 AND is_deleted = 0",
        params![action_id], |row| row.get(0),
    ).map_err(|_| "Acción no encontrada".to_string())?;

    if let Some(ref rid) = rig_id {
        let has_access = User::has_rig_access(&conn, &session.user_id, rid).map_err(|e| e.to_string())?;
        if !has_access {
            return Err("No tienes acceso a este taladro".to_string());
        }
    }

    let mut updates = Vec::new();
    let mut param_values: Vec<Box<dyn rusqlite::types::ToSql>> = Vec::new();
    let mut idx = 1;

    if let Some(ref name) = input.action_name {
        if name.trim().is_empty() {
            return Err("El nombre de la acción no puede estar vacío".to_string());
        }
        updates.push(format!("action_name = ?{}", idx));
        param_values.push(Box::new(name.trim().to_string()));
        idx += 1;
    }
    if let Some(ref notes) = input.notes {
        updates.push(format!("notes = ?{}", idx));
        param_values.push(Box::new(notes.clone()));
        idx += 1;
    }

    if updates.is_empty() {
        return Err("No hay campos para actualizar".to_string());
    }

    // Always set updated_at on update
    let now = chrono::Utc::now().to_rfc3339();
    updates.push(format!("updated_at = ?{}", idx));
    param_values.push(Box::new(now));
    idx += 1;

    param_values.push(Box::new(action_id.clone()));

    let query = format!(
        "UPDATE logistics_vacuum_actions SET {} WHERE id = ?{} AND is_deleted = 0",
        updates.join(", "), idx
    );

    let params_refs: Vec<&dyn rusqlite::types::ToSql> = param_values.iter().map(|p| p.as_ref()).collect();
    let affected = conn.execute(&query, params_refs.as_slice()).map_err(|e| e.to_string())?;

    if affected == 0 {
        return Err("Acción no encontrada".to_string());
    }

    conn.query_row(
        "SELECT id, rig_id, action_name, notes, created_by, created_at FROM logistics_vacuum_actions WHERE id = ?1",
        params![action_id],
        |row| Ok(VacuumAction {
            id: row.get(0)?, rig_id: row.get(1)?, action_name: row.get(2)?, notes: row.get(3)?,
            created_by: row.get(4)?, created_at: row.get(5)?,
        }),
    ).map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn delete_vacuum_action(
    session_token: String,
    action_id: String,
    state: State<'_, AppState>,
) -> Result<(), String> {
    let session = get_session(&session_token, &state).map_err(|e| e.to_string())?;

    match session.role.as_str() {
        "supervisor" | "admin" => {}
        _ => return Err("No tienes permisos para eliminar acciones".to_string()),
    }

    let conn = state.db.lock().map_err(|e| format!("Failed to lock database: {}", e))?;

    let rig_id: Option<String> = conn.query_row(
        "SELECT rig_id FROM logistics_vacuum_actions WHERE id = ?1 AND is_deleted = 0",
        params![action_id], |row| row.get(0),
    ).map_err(|_| "Acción no encontrada".to_string())?;

    if let Some(ref rid) = rig_id {
        let has_access = User::has_rig_access(&conn, &session.user_id, rid).map_err(|e| e.to_string())?;
        if !has_access {
            return Err("No tienes acceso a este taladro".to_string());
        }
    }

    let now = chrono::Utc::now().to_rfc3339();
    let affected = conn
        .execute(
            "UPDATE logistics_vacuum_actions SET is_deleted = 1, updated_at = ?1 WHERE id = ?2 AND is_deleted = 0",
            params![now, action_id],
        )
        .map_err(|e| e.to_string())?;

    if affected == 0 { return Err("Acción no encontrada".to_string()); }
    Ok(())
}
