use crate::auth::get_session;
use crate::models::logistics::*;
use crate::state::AppState;
use rusqlite::params;
use tauri::State;
use uuid::Uuid;

// ============================================================================
// COMBUSTIBLE - Commands
// ============================================================================

#[tauri::command]
pub async fn get_fuel_inventory(
    session_token: String,
    state: State<'_, AppState>,
) -> Result<Fuel, String> {
    get_session(&session_token, &state).map_err(|e| e.to_string())?;

    let conn = state.db.lock().map_err(|e| format!("Failed to lock database: {}", e))?;

    let mut stmt = conn
        .prepare(
            "SELECT id, reserve_amount, in_use_amount, consumed_amount, unit,
                    last_updated_by, notes, created_at, updated_at
             FROM logistics_fuel WHERE id = 'default'",
        )
        .map_err(|e| e.to_string())?;

    let inventory = stmt
        .query_row([], |row| {
            Ok(Fuel {
                id: row.get(0)?,
                reserve_amount: row.get(1)?,
                in_use_amount: row.get(2)?,
                consumed_amount: row.get(3)?,
                unit: row.get(4)?,
                last_updated_by: row.get(5)?,
                notes: row.get(6)?,
                created_at: row.get(7)?,
                updated_at: row.get(8)?,
            })
        })
        .map_err(|e| e.to_string())?;

    Ok(inventory)
}

#[tauri::command]
pub async fn create_fuel_movement(
    session_token: String,
    movement: CreateFuelMovement,
    state: State<'_, AppState>,
) -> Result<FuelMovement, String> {
    let session = get_session(&session_token, &state).map_err(|e| e.to_string())?;

    let conn = state.db.lock().map_err(|e| format!("Failed to lock database: {}", e))?;

    // Validate movement type
    match movement.movement_type.as_str() {
        "load" | "assign_to_use" | "register_consumption" | "request" => {}
        _ => return Err(format!("Invalid movement type: {}", movement.movement_type)),
    }

    if movement.amount <= 0.0 {
        return Err("Amount must be greater than 0".to_string());
    }

    // Validate unit
    match movement.unit.as_str() {
        "gallons" | "liters" => {}
        _ => return Err(format!("Invalid unit: {}", movement.unit)),
    }

    let movement_id = Uuid::new_v4().to_string();
    let now = chrono::Utc::now().to_rfc3339();

    conn.execute("BEGIN TRANSACTION", []).map_err(|e| e.to_string())?;

    match conn.execute(
        "INSERT INTO logistics_fuel_movements
         (id, movement_type, amount, unit, notes, created_by, created_at)
         VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7)",
        params![
            movement_id,
            movement.movement_type,
            movement.amount,
            movement.unit,
            movement.notes,
            session.user_id,
            now,
        ],
    ) {
        Ok(_) => {
            // Update inventory based on movement type
            match movement.movement_type.as_str() {
                "load" => {
                    conn.execute(
                        "UPDATE logistics_fuel
                         SET reserve_amount = reserve_amount + ?1, last_updated_by = ?2, updated_at = ?3
                         WHERE id = 'default'",
                        params![movement.amount, session.user_id, now],
                    )
                    .map_err(|e| e.to_string())?;
                }
                "assign_to_use" => {
                    // Validate enough reserve
                    let reserve: f64 = conn
                        .query_row(
                            "SELECT reserve_amount FROM logistics_fuel WHERE id = 'default'",
                            [],
                            |row| row.get(0),
                        )
                        .map_err(|e| e.to_string())?;

                    if reserve < movement.amount {
                        let _ = conn.execute("ROLLBACK", []);
                        return Err(format!(
                            "Insufficient reserve: available {:.2}, requested {:.2}",
                            reserve, movement.amount
                        ));
                    }

                    conn.execute(
                        "UPDATE logistics_fuel
                         SET reserve_amount = reserve_amount - ?1,
                             in_use_amount = in_use_amount + ?1,
                             last_updated_by = ?2, updated_at = ?3
                         WHERE id = 'default'",
                        params![movement.amount, session.user_id, now],
                    )
                    .map_err(|e| e.to_string())?;
                }
                "register_consumption" => {
                    // Validate enough in use
                    let in_use: f64 = conn
                        .query_row(
                            "SELECT in_use_amount FROM logistics_fuel WHERE id = 'default'",
                            [],
                            |row| row.get(0),
                        )
                        .map_err(|e| e.to_string())?;

                    if in_use < movement.amount {
                        let _ = conn.execute("ROLLBACK", []);
                        return Err(format!(
                            "Insufficient in-use amount: available {:.2}, requested {:.2}",
                            in_use, movement.amount
                        ));
                    }

                    conn.execute(
                        "UPDATE logistics_fuel
                         SET in_use_amount = in_use_amount - ?1,
                             consumed_amount = consumed_amount + ?1,
                             last_updated_by = ?2, updated_at = ?3
                         WHERE id = 'default'",
                        params![movement.amount, session.user_id, now],
                    )
                    .map_err(|e| e.to_string())?;
                }
                _ => {} // "request" doesn't modify inventory
            }

            conn.execute("COMMIT", []).map_err(|e| e.to_string())?;

            Ok(FuelMovement {
                id: movement_id,
                movement_type: movement.movement_type,
                amount: movement.amount,
                unit: movement.unit,
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
pub async fn get_fuel_movements(
    session_token: String,
    limit: Option<i32>,
    state: State<'_, AppState>,
) -> Result<Vec<FuelMovement>, String> {
    get_session(&session_token, &state).map_err(|e| e.to_string())?;

    let conn = state.db.lock().map_err(|e| format!("Failed to lock database: {}", e))?;

    let query = format!(
        "SELECT id, movement_type, amount, unit, notes, created_by, created_at
         FROM logistics_fuel_movements
         ORDER BY created_at DESC
         LIMIT {}",
        limit.unwrap_or(100)
    );

    let mut stmt = conn.prepare(&query).map_err(|e| e.to_string())?;

    let movements = stmt
        .query_map([], |row| {
            Ok(FuelMovement {
                id: row.get(0)?,
                movement_type: row.get(1)?,
                amount: row.get(2)?,
                unit: row.get(3)?,
                notes: row.get(4)?,
                created_by: row.get(5)?,
                created_at: row.get(6)?,
            })
        })
        .map_err(|e| e.to_string())?;

    let mut result = Vec::new();
    for movement in movements {
        result.push(movement.map_err(|e| e.to_string())?);
    }

    Ok(result)
}
