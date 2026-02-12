use crate::auth::get_session;
use crate::models::logistics::*;
use crate::state::AppState;
use rusqlite::params;
use tauri::State;
use uuid::Uuid;

// ============================================================================
// BOTELLONES DE AGUA - Commands
// ============================================================================

#[tauri::command]
pub async fn get_water_bottles_inventory(
    session_token: String,
    state: State<'_, AppState>,
) -> Result<WaterBottles, String> {
    get_session(&session_token, &state).map_err(|e| e.to_string())?;

    let conn = state.db.lock().map_err(|e| format!("Failed to lock database: {}", e))?;

    let mut stmt = conn
        .prepare(
            "SELECT id, full_bottles, empty_bottles, last_updated_by, notes, created_at, updated_at
             FROM logistics_water_bottles WHERE id = 'default'",
        )
        .map_err(|e| e.to_string())?;

    let inventory = stmt
        .query_row([], |row| {
            Ok(WaterBottles {
                id: row.get(0)?,
                full_bottles: row.get(1)?,
                empty_bottles: row.get(2)?,
                last_updated_by: row.get(3)?,
                notes: row.get(4)?,
                created_at: row.get(5)?,
                updated_at: row.get(6)?,
            })
        })
        .map_err(|e| e.to_string())?;

    Ok(inventory)
}

#[tauri::command]
pub async fn create_water_bottles_movement(
    session_token: String,
    movement: CreateWaterBottlesMovement,
    state: State<'_, AppState>,
) -> Result<WaterBottlesMovement, String> {
    let session = get_session(&session_token, &state).map_err(|e| e.to_string())?;

    let conn = state.db.lock().map_err(|e| format!("Failed to lock database: {}", e))?;

    let movement_id = Uuid::new_v4().to_string();
    let now = chrono::Utc::now().to_rfc3339();

    // Validate movement type
    match movement.movement_type.as_str() {
        "register_full" | "register_empty" | "request" => {}
        _ => return Err(format!("Invalid movement type: {}", movement.movement_type)),
    }

    if movement.quantity <= 0 {
        return Err("Quantity must be greater than 0".to_string());
    }

    conn.execute("BEGIN TRANSACTION", []).map_err(|e| e.to_string())?;

    match conn.execute(
        "INSERT INTO logistics_water_bottles_movements
         (id, movement_type, quantity, notes, created_by, created_at)
         VALUES (?1, ?2, ?3, ?4, ?5, ?6)",
        params![
            movement_id,
            movement.movement_type,
            movement.quantity,
            movement.notes,
            session.user_id,
            now,
        ],
    ) {
        Ok(_) => {
            // Update inventory based on movement type
            match movement.movement_type.as_str() {
                "register_full" => {
                    conn.execute(
                        "UPDATE logistics_water_bottles
                         SET full_bottles = full_bottles + ?1, last_updated_by = ?2, updated_at = ?3
                         WHERE id = 'default'",
                        params![movement.quantity, session.user_id, now],
                    )
                    .map_err(|e| e.to_string())?;
                }
                "register_empty" => {
                    conn.execute(
                        "UPDATE logistics_water_bottles
                         SET empty_bottles = empty_bottles + ?1, last_updated_by = ?2, updated_at = ?3
                         WHERE id = 'default'",
                        params![movement.quantity, session.user_id, now],
                    )
                    .map_err(|e| e.to_string())?;
                }
                _ => {}
            }

            conn.execute("COMMIT", []).map_err(|e| e.to_string())?;

            Ok(WaterBottlesMovement {
                id: movement_id,
                movement_type: movement.movement_type,
                quantity: movement.quantity,
                notes: movement.notes,
                created_by: Some(session.user_id),
                created_at: now,
            })
        }
        Err(e) => {
            let _ = conn.execute("ROLLBACK", []);
            Err(e.to_string())
        }
    }
}

#[tauri::command]
pub async fn get_water_bottles_movements(
    session_token: String,
    limit: Option<i32>,
    state: State<'_, AppState>,
) -> Result<Vec<WaterBottlesMovement>, String> {
    get_session(&session_token, &state).map_err(|e| e.to_string())?;

    let conn = state.db.lock().map_err(|e| format!("Failed to lock database: {}", e))?;

    let query = format!(
        "SELECT id, movement_type, quantity, notes, created_by, created_at
         FROM logistics_water_bottles_movements
         ORDER BY created_at DESC
         LIMIT {}",
        limit.unwrap_or(100)
    );

    let mut stmt = conn.prepare(&query).map_err(|e| e.to_string())?;

    let movements = stmt
        .query_map([], |row| {
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

    let mut result = Vec::new();
    for movement in movements {
        result.push(movement.map_err(|e| e.to_string())?);
    }

    Ok(result)
}
