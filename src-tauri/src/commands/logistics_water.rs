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
pub async fn create_water_bottles_movement(
    session_token: String,
    rig_id: String,
    movement: CreateWaterBottlesMovement,
    state: State<'_, AppState>,
) -> Result<WaterBottlesMovement, String> {
    let session = get_session(&session_token, &state).map_err(|e| e.to_string())?;

    // Validate rig access
    let conn = state.db.lock().map_err(|e| format!("Failed to lock database: {}", e))?;
    let has_access = User::has_rig_access(&conn, &session.user_id, &rig_id).map_err(|e| e.to_string())?;
    if !has_access {
        return Err("No tienes acceso a este taladro".to_string());
    }

    match movement.movement_type.as_str() {
        "entry" | "exit" => {}
        _ => return Err(format!("Tipo de movimiento inválido: {}", movement.movement_type)),
    }
    if movement.quantity <= 0 {
        return Err("La cantidad debe ser mayor a 0".to_string());
    }

    let id = Uuid::new_v4().to_string();
    let now = chrono::Utc::now().to_rfc3339();

    // Validate stock for exit movements (scoped to rig)
    if movement.movement_type == "exit" {
        let total_entries: i64 = conn.query_row(
            "SELECT COALESCE(SUM(quantity), 0) FROM logistics_water_bottles_movements WHERE movement_type = 'entry' AND rig_id = ?1",
            params![rig_id], |row| row.get(0),
        ).map_err(|e| e.to_string())?;
        let total_exits: i64 = conn.query_row(
            "SELECT COALESCE(SUM(quantity), 0) FROM logistics_water_bottles_movements WHERE movement_type = 'exit' AND rig_id = ?1",
            params![rig_id], |row| row.get(0),
        ).map_err(|e| e.to_string())?;
        let current_stock = total_entries - total_exits;
        if (movement.quantity as i64) > current_stock {
            return Err(format!("Stock insuficiente. Stock actual: {} botellones, intentando retirar: {}", current_stock, movement.quantity));
        }
    }

    conn.execute(
        "INSERT INTO logistics_water_bottles_movements (id, rig_id, movement_type, quantity, notes, created_by, created_at)
         VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7)",
        params![id, rig_id, movement.movement_type, movement.quantity, movement.notes, session.user_id, now],
    ).map_err(|e| e.to_string())?;

    Ok(WaterBottlesMovement {
        id,
        rig_id: Some(rig_id),
        movement_type: movement.movement_type,
        quantity: movement.quantity,
        notes: movement.notes,
        created_by: Some(session.user_id),
        created_at: now,
    })
}

#[tauri::command]
pub async fn get_water_bottles_movements(
    session_token: String,
    rig_id: String,
    page: Option<i64>,
    page_size: Option<i64>,
    state: State<'_, AppState>,
) -> Result<PaginatedResponse<WaterBottlesMovement>, String> {
    let session = get_session(&session_token, &state).map_err(|e| e.to_string())?;

    let conn = state.db.lock().map_err(|e| format!("Failed to lock database: {}", e))?;
    let has_access = User::has_rig_access(&conn, &session.user_id, &rig_id).map_err(|e| e.to_string())?;
    if !has_access {
        return Err("No tienes acceso a este taladro".to_string());
    }

    let total: i64 = conn
        .query_row(
            "SELECT COUNT(*) FROM logistics_water_bottles_movements WHERE rig_id = ?1",
            params![rig_id], |row| row.get(0),
        )
        .map_err(|e| e.to_string())?;

    let (pg, ps, offset) = paginate(page, page_size);

    let mut stmt = conn.prepare(
        "SELECT id, rig_id, movement_type, quantity, notes, created_by, created_at
         FROM logistics_water_bottles_movements
         WHERE rig_id = ?1
         ORDER BY created_at DESC
         LIMIT ?2 OFFSET ?3"
    ).map_err(|e| e.to_string())?;

    let rows = stmt
        .query_map(params![rig_id, ps, offset], |row| {
            Ok(WaterBottlesMovement {
                id: row.get(0)?,
                rig_id: row.get(1)?,
                movement_type: row.get(2)?,
                quantity: row.get(3)?,
                notes: row.get(4)?,
                created_by: row.get(5)?,
                created_at: row.get(6)?,
            })
        })
        .map_err(|e| e.to_string())?;

    let mut data = Vec::new();
    for row in rows {
        data.push(row.map_err(|e| e.to_string())?);
    }

    Ok(PaginatedResponse {
        data,
        total,
        page: pg,
        page_size: ps,
        total_pages: total_pages(total, ps),
    })
}

#[tauri::command]
pub async fn delete_water_bottles_movement(
    session_token: String,
    movement_id: String,
    state: State<'_, AppState>,
) -> Result<(), String> {
    let session = get_session(&session_token, &state).map_err(|e| e.to_string())?;

    match session.role.as_str() {
        "supervisor" | "admin" => {}
        _ => return Err("No tienes permisos para eliminar movimientos".to_string()),
    }

    let conn = state.db.lock().map_err(|e| format!("Failed to lock database: {}", e))?;

    // Verify the movement belongs to a rig the user has access to
    let rig_id: Option<String> = conn.query_row(
        "SELECT rig_id FROM logistics_water_bottles_movements WHERE id = ?1",
        params![movement_id],
        |row| row.get(0),
    ).map_err(|_| "Movimiento no encontrado".to_string())?;

    if let Some(ref rid) = rig_id {
        let has_access = User::has_rig_access(&conn, &session.user_id, rid).map_err(|e| e.to_string())?;
        if !has_access {
            return Err("No tienes acceso a este taladro".to_string());
        }
    }

    let affected = conn
        .execute("DELETE FROM logistics_water_bottles_movements WHERE id = ?1", params![movement_id])
        .map_err(|e| e.to_string())?;

    if affected == 0 {
        return Err("Movimiento no encontrado".to_string());
    }

    Ok(())
}

#[tauri::command]
pub async fn get_water_bottles_stock(
    session_token: String,
    rig_id: String,
    state: State<'_, AppState>,
) -> Result<i64, String> {
    let session = get_session(&session_token, &state).map_err(|e| e.to_string())?;

    let conn = state.db.lock().map_err(|e| format!("Failed to lock database: {}", e))?;
    let has_access = User::has_rig_access(&conn, &session.user_id, &rig_id).map_err(|e| e.to_string())?;
    if !has_access {
        return Err("No tienes acceso a este taladro".to_string());
    }

    let total_entries: i64 = conn.query_row(
        "SELECT COALESCE(SUM(quantity), 0) FROM logistics_water_bottles_movements WHERE movement_type = 'entry' AND rig_id = ?1",
        params![rig_id], |row| row.get(0),
    ).map_err(|e| e.to_string())?;
    let total_exits: i64 = conn.query_row(
        "SELECT COALESCE(SUM(quantity), 0) FROM logistics_water_bottles_movements WHERE movement_type = 'exit' AND rig_id = ?1",
        params![rig_id], |row| row.get(0),
    ).map_err(|e| e.to_string())?;

    Ok(total_entries - total_exits)
}
