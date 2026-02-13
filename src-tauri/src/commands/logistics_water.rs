use crate::auth::get_session;
use crate::models::logistics::*;
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
    movement: CreateWaterBottlesMovement,
    state: State<'_, AppState>,
) -> Result<WaterBottlesMovement, String> {
    let session = get_session(&session_token, &state).map_err(|e| e.to_string())?;

    match movement.movement_type.as_str() {
        "entry" | "exit" => {}
        _ => return Err(format!("Tipo de movimiento inválido: {}", movement.movement_type)),
    }
    if movement.quantity <= 0 {
        return Err("La cantidad debe ser mayor a 0".to_string());
    }

    let conn = state.db.lock().map_err(|e| format!("Failed to lock database: {}", e))?;

    let id = Uuid::new_v4().to_string();
    let now = chrono::Utc::now().to_rfc3339();

    // Validate stock for exit movements
    if movement.movement_type == "exit" {
        let total_entries: i64 = conn.query_row(
            "SELECT COALESCE(SUM(quantity), 0) FROM logistics_water_bottles_movements WHERE movement_type = 'entry'",
            [], |row| row.get(0),
        ).map_err(|e| e.to_string())?;
        let total_exits: i64 = conn.query_row(
            "SELECT COALESCE(SUM(quantity), 0) FROM logistics_water_bottles_movements WHERE movement_type = 'exit'",
            [], |row| row.get(0),
        ).map_err(|e| e.to_string())?;
        let current_stock = total_entries - total_exits;
        if (movement.quantity as i64) > current_stock {
            return Err(format!("Stock insuficiente. Stock actual: {} botellones, intentando retirar: {}", current_stock, movement.quantity));
        }
    }

    conn.execute(
        "INSERT INTO logistics_water_bottles_movements (id, movement_type, quantity, notes, created_by, created_at)
         VALUES (?1, ?2, ?3, ?4, ?5, ?6)",
        params![id, movement.movement_type, movement.quantity, movement.notes, session.user_id, now],
    ).map_err(|e| e.to_string())?;

    Ok(WaterBottlesMovement {
        id,
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
    page: Option<i64>,
    page_size: Option<i64>,
    state: State<'_, AppState>,
) -> Result<PaginatedResponse<WaterBottlesMovement>, String> {
    get_session(&session_token, &state).map_err(|e| e.to_string())?;

    let conn = state.db.lock().map_err(|e| format!("Failed to lock database: {}", e))?;

    let total: i64 = conn
        .query_row("SELECT COUNT(*) FROM logistics_water_bottles_movements", [], |row| row.get(0))
        .map_err(|e| e.to_string())?;

    let (pg, ps, offset) = paginate(page, page_size);

    let mut stmt = conn.prepare(
        "SELECT id, movement_type, quantity, notes, created_by, created_at
         FROM logistics_water_bottles_movements
         ORDER BY created_at DESC
         LIMIT ?1 OFFSET ?2"
    ).map_err(|e| e.to_string())?;

    let rows = stmt
        .query_map(params![ps, offset], |row| {
            Ok(WaterBottlesMovement {
                id: row.get(0)?,
                movement_type: row.get(1)?,
                quantity: row.get(2)?,
                notes: row.get(3)?,
                created_by: row.get(4)?,
                created_at: row.get(5)?,
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
    state: State<'_, AppState>,
) -> Result<i64, String> {
    get_session(&session_token, &state).map_err(|e| e.to_string())?;
    let conn = state.db.lock().map_err(|e| format!("Failed to lock database: {}", e))?;

    let total_entries: i64 = conn.query_row(
        "SELECT COALESCE(SUM(quantity), 0) FROM logistics_water_bottles_movements WHERE movement_type = 'entry'",
        [], |row| row.get(0),
    ).map_err(|e| e.to_string())?;
    let total_exits: i64 = conn.query_row(
        "SELECT COALESCE(SUM(quantity), 0) FROM logistics_water_bottles_movements WHERE movement_type = 'exit'",
        [], |row| row.get(0),
    ).map_err(|e| e.to_string())?;

    Ok(total_entries - total_exits)
}
