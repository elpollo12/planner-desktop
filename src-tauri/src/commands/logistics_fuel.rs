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

fn read_cached_stock(conn: &rusqlite::Connection, rig_id: &str, category: &str) -> Result<f64, String> {
    conn.query_row(
        "SELECT quantity FROM logistics_stock WHERE rig_id = ?1 AND category = ?2",
        params![rig_id, category],
        |row| row.get(0),
    ).or_else(|e| {
        if e == rusqlite::Error::QueryReturnedNoRows { Ok(0.0) } else { Err(e.to_string()) }
    })
}

fn adjust_cached_stock(conn: &rusqlite::Connection, rig_id: &str, category: &str, delta: f64) -> Result<(), String> {
    let now = chrono::Utc::now().to_rfc3339();
    conn.execute(
        "INSERT INTO logistics_stock (rig_id, category, quantity, updated_at)
         VALUES (?1, ?2, ?3, ?4)
         ON CONFLICT(rig_id, category) DO UPDATE SET
           quantity = quantity + ?3,
           updated_at = ?4",
        params![rig_id, category, delta, now],
    ).map_err(|e| e.to_string())?;
    Ok(())
}

const CATEGORY: &str = "fuel";

#[tauri::command]
pub async fn create_fuel_movement(
    session_token: String,
    rig_id: String,
    movement: CreateFuelMovement,
    state: State<'_, AppState>,
) -> Result<FuelMovement, String> {
    let session = get_session(&session_token, &state).map_err(|e| e.to_string())?;

    let mut conn = state.db.lock().map_err(|e| format!("Failed to lock database: {}", e))?;
    let has_access = User::has_rig_access(&conn, &session.user_id, &rig_id).map_err(|e| e.to_string())?;
    if !has_access {
        return Err("No tienes acceso a este taladro".to_string());
    }

    match movement.movement_type.as_str() {
        "entry" | "exit" => {}
        _ => return Err(format!("Tipo de movimiento inválido: {}", movement.movement_type)),
    }
    if movement.amount <= 0.0 {
        return Err("La cantidad debe ser mayor a 0".to_string());
    }

    let id = Uuid::new_v4().to_string();
    let now = chrono::Utc::now().to_rfc3339();
    let delta = if movement.movement_type == "entry" { movement.amount } else { -movement.amount };

    let tx = conn.transaction().map_err(|e| e.to_string())?;

    if movement.movement_type == "exit" {
        let current_stock = read_cached_stock(&tx, &rig_id, CATEGORY)?;
        if movement.amount > current_stock {
            return Err(format!(
                "Stock insuficiente. Stock actual: {:.2} litros, intentando retirar: {:.2}",
                current_stock, movement.amount
            ));
        }
    }

    tx.execute(
        "INSERT INTO logistics_fuel_movements (id, rig_id, movement_type, amount, notes, created_by, created_at, updated_at)
         VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8)",
        params![id, rig_id, movement.movement_type, movement.amount, movement.notes, session.user_id, now, now],
    ).map_err(|e| e.to_string())?;

    adjust_cached_stock(&tx, &rig_id, CATEGORY, delta)?;
    tx.commit().map_err(|e| e.to_string())?;

    Ok(FuelMovement {
        id,
        rig_id: Some(rig_id),
        movement_type: movement.movement_type,
        amount: movement.amount,
        notes: movement.notes,
        created_by: Some(session.user_id),
        created_at: now,
    })
}

#[tauri::command]
pub async fn get_fuel_movements(
    session_token: String,
    rig_id: String,
    page: Option<i64>,
    page_size: Option<i64>,
    state: State<'_, AppState>,
) -> Result<PaginatedResponse<FuelMovement>, String> {
    let session = get_session(&session_token, &state).map_err(|e| e.to_string())?;

    let conn = state.db.lock().map_err(|e| format!("Failed to lock database: {}", e))?;
    let has_access = User::has_rig_access(&conn, &session.user_id, &rig_id).map_err(|e| e.to_string())?;
    if !has_access {
        return Err("No tienes acceso a este taladro".to_string());
    }

    let total: i64 = conn
        .query_row(
            "SELECT COUNT(*) FROM logistics_fuel_movements WHERE rig_id = ?1 AND is_deleted = 0",
            params![rig_id], |row| row.get(0),
        )
        .map_err(|e| e.to_string())?;

    let (pg, ps, offset) = paginate(page, page_size);

    let mut stmt = conn.prepare(
        "SELECT id, rig_id, movement_type, amount, notes, created_by, created_at
         FROM logistics_fuel_movements
         WHERE rig_id = ?1 AND is_deleted = 0
         ORDER BY created_at DESC
         LIMIT ?2 OFFSET ?3"
    ).map_err(|e| e.to_string())?;

    let rows = stmt
        .query_map(params![rig_id, ps, offset], |row| {
            Ok(FuelMovement {
                id: row.get(0)?,
                rig_id: row.get(1)?,
                movement_type: row.get(2)?,
                amount: row.get(3)?,
                notes: row.get(4)?,
                created_by: row.get(5)?,
                created_at: row.get(6)?,
            })
        })
        .map_err(|e| e.to_string())?;

    let mut data = Vec::new();
    for row in rows { data.push(row.map_err(|e| e.to_string())?); }

    Ok(PaginatedResponse { data, total, page: pg, page_size: ps, total_pages: total_pages(total, ps) })
}

#[tauri::command]
pub async fn delete_fuel_movement(
    session_token: String,
    movement_id: String,
    state: State<'_, AppState>,
) -> Result<(), String> {
    let session = get_session(&session_token, &state).map_err(|e| e.to_string())?;

    match session.role.as_str() {
        "supervisor" | "admin" => {}
        _ => return Err("No tienes permisos para eliminar movimientos".to_string()),
    }

    let mut conn = state.db.lock().map_err(|e| format!("Failed to lock database: {}", e))?;

    let (rig_id, movement_type, amount): (Option<String>, String, f64) = conn.query_row(
        "SELECT rig_id, movement_type, amount FROM logistics_fuel_movements WHERE id = ?1 AND is_deleted = 0",
        params![movement_id],
        |row| Ok((row.get(0)?, row.get(1)?, row.get(2)?)),
    ).map_err(|_| "Movimiento no encontrado".to_string())?;

    if let Some(ref rid) = rig_id {
        let has_access = User::has_rig_access(&conn, &session.user_id, rid).map_err(|e| e.to_string())?;
        if !has_access {
            return Err("No tienes acceso a este taladro".to_string());
        }
    }

    let tx = conn.transaction().map_err(|e| e.to_string())?;

    let now_del = chrono::Utc::now().to_rfc3339();
    let affected = tx
        .execute(
            "UPDATE logistics_fuel_movements SET is_deleted = 1, updated_at = ?1 WHERE id = ?2 AND is_deleted = 0",
            params![now_del, movement_id],
        )
        .map_err(|e| e.to_string())?;
    if affected == 0 { return Err("Movimiento no encontrado".to_string()); }

    if let Some(ref rid) = rig_id {
        let reverse_delta = if movement_type == "entry" { -amount } else { amount };
        adjust_cached_stock(&tx, rid, CATEGORY, reverse_delta)?;
    }

    tx.commit().map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
pub async fn get_fuel_stock(
    session_token: String,
    rig_id: String,
    state: State<'_, AppState>,
) -> Result<f64, String> {
    let session = get_session(&session_token, &state).map_err(|e| e.to_string())?;

    let conn = state.db.lock().map_err(|e| format!("Failed to lock database: {}", e))?;
    let has_access = User::has_rig_access(&conn, &session.user_id, &rig_id).map_err(|e| e.to_string())?;
    if !has_access {
        return Err("No tienes acceso a este taladro".to_string());
    }

    let stock = read_cached_stock(&conn, &rig_id, CATEGORY)?;
    Ok(stock)
}
