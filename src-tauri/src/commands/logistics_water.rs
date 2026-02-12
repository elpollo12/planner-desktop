use crate::db::get_connection;
use crate::error::AppError;
use crate::models::logistics::*;
use crate::auth::verify_session;
use rusqlite::{params, Connection};
use uuid::Uuid;

// ============================================================================
// BOTELLONES DE AGUA - Commands
// ============================================================================

#[tauri::command]
pub async fn get_water_bottles_inventory(session_token: String) -> Result<WaterBottles, AppError> {
    verify_session(&session_token)?;
    
    let conn = get_connection()?;
    let mut stmt = conn.prepare(
        "SELECT id, full_bottles, empty_bottles, last_updated_by, notes, created_at, updated_at
         FROM logistics_water_bottles WHERE id = 'default'"
    )?;
    
    let inventory = stmt.query_row([], |row| {
        Ok(WaterBottles {
            id: row.get(0)?,
            full_bottles: row.get(1)?,
            empty_bottles: row.get(2)?,
            last_updated_by: row.get(3)?,
            notes: row.get(4)?,
            created_at: row.get(5)?,
            updated_at: row.get(6)?,
        })
    })?;
    
    Ok(inventory)
}

#[tauri::command]
pub async fn create_water_bottles_movement(
    session_token: String,
    movement: CreateWaterBottlesMovement,
) -> Result<WaterBottlesMovement, AppError> {
    let user = verify_session(&session_token)?;
    let conn = get_connection()?;
    
    let movement_id = Uuid::new_v4().to_string();
    let now = chrono::Utc::now().to_rfc3339();
    
    conn.execute("BEGIN TRANSACTION", [])?;
    
    match conn.execute(
        "INSERT INTO logistics_water_bottles_movements 
         (id, movement_type, quantity, notes, created_by, created_at)
         VALUES (?1, ?2, ?3, ?4, ?5, ?6)",
        params![
            movement_id,
            movement.movement_type,
            movement.quantity,
            movement.notes,
            user.id,
            now,
        ],
    ) {
        Ok(_) => {
            match movement.movement_type.as_str() {
                "register_full" => {
                    conn.execute(
                        "UPDATE logistics_water_bottles 
                         SET full_bottles = full_bottles + ?1, last_updated_by = ?2, updated_at = ?3
                         WHERE id = 'default'",
                        params![movement.quantity, user.id, now],
                    )?;
                }
                "register_empty" => {
                    conn.execute(
                        "UPDATE logistics_water_bottles 
                         SET empty_bottles = empty_bottles + ?1, last_updated_by = ?2, updated_at = ?3
                         WHERE id = 'default'",
                        params![movement.quantity, user.id, now],
                    )?;
                }
                _ => {}
            }
            
            conn.execute("COMMIT", [])?;
            
            Ok(WaterBottlesMovement {
                id: movement_id,
                movement_type: movement.movement_type,
                quantity: movement.quantity,
                notes: movement.notes,
                created_by: Some(user.id),
                created_at: now,
            })
        }
        Err(e) => {
            conn.execute("ROLLBACK", [])?;
            Err(AppError::Database(e.to_string()))
        }
    }
}

#[tauri::command]
pub async fn get_water_bottles_movements(
    session_token: String,
    limit: Option<i32>,
) -> Result<Vec<WaterBottlesMovement>, AppError> {
    verify_session(&session_token)?;
    
    let conn = get_connection()?;
    let query = format!(
        "SELECT id, movement_type, quantity, notes, created_by, created_at
         FROM logistics_water_bottles_movements
         ORDER BY created_at DESC
         LIMIT {}",
        limit.unwrap_or(100)
    );
    
    let mut stmt = conn.prepare(&query)?;
    let movements = stmt.query_map([], |row| {
        Ok(WaterBottlesMovement {
            id: row.get(0)?,
            movement_type: row.get(1)?,
            quantity: row.get(2)?,
            notes: row.get(3)?,
            created_by: row.get(4)?,
            created_at: row.get(5)?,
        })
    })?;
    
    let mut result = Vec::new();
    for movement in movements {
        result.push(movement?);
    }
    
    Ok(result)
}
