use crate::auth::get_session;
use crate::models::logistics::*;
use crate::state::AppState;
use rusqlite::params;
use tauri::State;
use uuid::Uuid;

// ============================================================================
// MATERIALES / CONSUMIBLES - Commands
// ============================================================================

#[tauri::command]
pub async fn list_consumables(
    session_token: String,
    active_only: Option<bool>,
    category: Option<String>,
    state: State<'_, AppState>,
) -> Result<Vec<Consumable>, String> {
    get_session(&session_token, &state).map_err(|e| e.to_string())?;

    let conn = state.db.lock().map_err(|e| format!("Failed to lock database: {}", e))?;

    let mut conditions = Vec::new();
    let mut param_values: Vec<Box<dyn rusqlite::types::ToSql>> = Vec::new();

    if active_only.unwrap_or(true) {
        conditions.push("active = 1");
    }

    if let Some(ref cat) = category {
        param_values.push(Box::new(cat.clone()));
        conditions.push("category = ?");
    }

    let where_clause = if conditions.is_empty() {
        String::new()
    } else {
        format!("WHERE {}", conditions.join(" AND "))
    };

    let query = format!(
        "SELECT id, name, description, unit, available_quantity, used_quantity,
                min_stock, category, active, last_updated_by, created_at, updated_at
         FROM logistics_consumables
         {}
         ORDER BY name ASC",
        where_clause
    );

    let mut stmt = conn.prepare(&query).map_err(|e| e.to_string())?;

    let params_refs: Vec<&dyn rusqlite::types::ToSql> =
        param_values.iter().map(|p| p.as_ref()).collect();

    let consumables = stmt
        .query_map(params_refs.as_slice(), |row| {
            Ok(Consumable {
                id: row.get(0)?,
                name: row.get(1)?,
                description: row.get(2)?,
                unit: row.get(3)?,
                available_quantity: row.get(4)?,
                used_quantity: row.get(5)?,
                min_stock: row.get(6)?,
                category: row.get(7)?,
                active: row.get(8)?,
                last_updated_by: row.get(9)?,
                created_at: row.get(10)?,
                updated_at: row.get(11)?,
            })
        })
        .map_err(|e| e.to_string())?;

    let mut result = Vec::new();
    for consumable in consumables {
        result.push(consumable.map_err(|e| e.to_string())?);
    }

    Ok(result)
}

#[tauri::command]
pub async fn get_consumable(
    session_token: String,
    consumable_id: String,
    state: State<'_, AppState>,
) -> Result<Consumable, String> {
    get_session(&session_token, &state).map_err(|e| e.to_string())?;

    let conn = state.db.lock().map_err(|e| format!("Failed to lock database: {}", e))?;

    let mut stmt = conn
        .prepare(
            "SELECT id, name, description, unit, available_quantity, used_quantity,
                    min_stock, category, active, last_updated_by, created_at, updated_at
             FROM logistics_consumables WHERE id = ?1",
        )
        .map_err(|e| e.to_string())?;

    let consumable = stmt
        .query_row(params![consumable_id], |row| {
            Ok(Consumable {
                id: row.get(0)?,
                name: row.get(1)?,
                description: row.get(2)?,
                unit: row.get(3)?,
                available_quantity: row.get(4)?,
                used_quantity: row.get(5)?,
                min_stock: row.get(6)?,
                category: row.get(7)?,
                active: row.get(8)?,
                last_updated_by: row.get(9)?,
                created_at: row.get(10)?,
                updated_at: row.get(11)?,
            })
        })
        .map_err(|e| e.to_string())?;

    Ok(consumable)
}

#[tauri::command]
pub async fn create_consumable(
    session_token: String,
    input: CreateConsumable,
    state: State<'_, AppState>,
) -> Result<Consumable, String> {
    let session = get_session(&session_token, &state).map_err(|e| e.to_string())?;

    let conn = state.db.lock().map_err(|e| format!("Failed to lock database: {}", e))?;

    if input.name.trim().is_empty() {
        return Err("Name is required".to_string());
    }

    if input.unit.trim().is_empty() {
        return Err("Unit is required".to_string());
    }

    let id = Uuid::new_v4().to_string();
    let now = chrono::Utc::now().to_rfc3339();

    conn.execute(
        "INSERT INTO logistics_consumables
         (id, name, description, unit, available_quantity, used_quantity, min_stock, category, active, last_updated_by, created_at, updated_at)
         VALUES (?1, ?2, ?3, ?4, ?5, 0, ?6, ?7, 1, ?8, ?9, ?10)",
        params![
            id,
            input.name.trim(),
            input.description,
            input.unit.trim(),
            input.available_quantity,
            input.min_stock,
            input.category,
            session.user_id,
            now,
            now,
        ],
    )
    .map_err(|e| e.to_string())?;

    // Return the created consumable
    let mut stmt = conn
        .prepare(
            "SELECT id, name, description, unit, available_quantity, used_quantity,
                    min_stock, category, active, last_updated_by, created_at, updated_at
             FROM logistics_consumables WHERE id = ?1",
        )
        .map_err(|e| e.to_string())?;

    let consumable = stmt
        .query_row(params![id], |row| {
            Ok(Consumable {
                id: row.get(0)?,
                name: row.get(1)?,
                description: row.get(2)?,
                unit: row.get(3)?,
                available_quantity: row.get(4)?,
                used_quantity: row.get(5)?,
                min_stock: row.get(6)?,
                category: row.get(7)?,
                active: row.get(8)?,
                last_updated_by: row.get(9)?,
                created_at: row.get(10)?,
                updated_at: row.get(11)?,
            })
        })
        .map_err(|e| e.to_string())?;

    Ok(consumable)
}

#[tauri::command]
pub async fn update_consumable(
    session_token: String,
    consumable_id: String,
    input: UpdateConsumable,
    state: State<'_, AppState>,
) -> Result<Consumable, String> {
    let session = get_session(&session_token, &state).map_err(|e| e.to_string())?;

    let conn = state.db.lock().map_err(|e| format!("Failed to lock database: {}", e))?;

    let now = chrono::Utc::now().to_rfc3339();

    // Build dynamic update query
    let mut updates = Vec::new();
    let mut param_values: Vec<Box<dyn rusqlite::types::ToSql>> = Vec::new();
    let mut idx = 1;

    if let Some(ref name) = input.name {
        if name.trim().is_empty() {
            return Err("Name cannot be empty".to_string());
        }
        updates.push(format!("name = ?{}", idx));
        param_values.push(Box::new(name.trim().to_string()));
        idx += 1;
    }
    if let Some(ref description) = input.description {
        updates.push(format!("description = ?{}", idx));
        param_values.push(Box::new(description.clone()));
        idx += 1;
    }
    if let Some(ref unit) = input.unit {
        updates.push(format!("unit = ?{}", idx));
        param_values.push(Box::new(unit.clone()));
        idx += 1;
    }
    if let Some(min_stock) = input.min_stock {
        updates.push(format!("min_stock = ?{}", idx));
        param_values.push(Box::new(min_stock));
        idx += 1;
    }
    if let Some(ref category) = input.category {
        updates.push(format!("category = ?{}", idx));
        param_values.push(Box::new(category.clone()));
        idx += 1;
    }
    if let Some(active) = input.active {
        updates.push(format!("active = ?{}", idx));
        param_values.push(Box::new(active));
        idx += 1;
    }

    if updates.is_empty() {
        return Err("No fields to update".to_string());
    }

    // Add last_updated_by and updated_at
    updates.push(format!("last_updated_by = ?{}", idx));
    param_values.push(Box::new(session.user_id));
    idx += 1;

    updates.push(format!("updated_at = ?{}", idx));
    param_values.push(Box::new(now));
    idx += 1;

    // Add WHERE clause param
    param_values.push(Box::new(consumable_id.clone()));

    let query = format!(
        "UPDATE logistics_consumables SET {} WHERE id = ?{}",
        updates.join(", "),
        idx
    );

    let params_refs: Vec<&dyn rusqlite::types::ToSql> =
        param_values.iter().map(|p| p.as_ref()).collect();

    let rows_affected = conn
        .execute(&query, params_refs.as_slice())
        .map_err(|e| e.to_string())?;

    if rows_affected == 0 {
        return Err("Consumable not found".to_string());
    }

    // Return updated consumable
    let mut stmt = conn
        .prepare(
            "SELECT id, name, description, unit, available_quantity, used_quantity,
                    min_stock, category, active, last_updated_by, created_at, updated_at
             FROM logistics_consumables WHERE id = ?1",
        )
        .map_err(|e| e.to_string())?;

    let consumable = stmt
        .query_row(params![consumable_id], |row| {
            Ok(Consumable {
                id: row.get(0)?,
                name: row.get(1)?,
                description: row.get(2)?,
                unit: row.get(3)?,
                available_quantity: row.get(4)?,
                used_quantity: row.get(5)?,
                min_stock: row.get(6)?,
                category: row.get(7)?,
                active: row.get(8)?,
                last_updated_by: row.get(9)?,
                created_at: row.get(10)?,
                updated_at: row.get(11)?,
            })
        })
        .map_err(|e| e.to_string())?;

    Ok(consumable)
}

#[tauri::command]
pub async fn create_consumable_movement(
    session_token: String,
    movement: CreateConsumableMovement,
    state: State<'_, AppState>,
) -> Result<ConsumableMovement, String> {
    let session = get_session(&session_token, &state).map_err(|e| e.to_string())?;

    let conn = state.db.lock().map_err(|e| format!("Failed to lock database: {}", e))?;

    // Validate movement type
    match movement.movement_type.as_str() {
        "add_stock" | "register_use" | "request" | "adjustment" => {}
        _ => return Err(format!("Invalid movement type: {}", movement.movement_type)),
    }

    if movement.quantity <= 0.0 {
        return Err("Quantity must be greater than 0".to_string());
    }

    // Verify consumable exists
    let exists: bool = conn
        .query_row(
            "SELECT COUNT(*) > 0 FROM logistics_consumables WHERE id = ?1",
            params![movement.consumable_id],
            |row| row.get(0),
        )
        .map_err(|e| e.to_string())?;

    if !exists {
        return Err("Consumable not found".to_string());
    }

    let movement_id = Uuid::new_v4().to_string();
    let now = chrono::Utc::now().to_rfc3339();

    conn.execute("BEGIN TRANSACTION", []).map_err(|e| e.to_string())?;

    match conn.execute(
        "INSERT INTO logistics_consumables_movements
         (id, consumable_id, movement_type, quantity, notes, created_by, created_at)
         VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7)",
        params![
            movement_id,
            movement.consumable_id,
            movement.movement_type,
            movement.quantity,
            movement.notes,
            session.user_id,
            now,
        ],
    ) {
        Ok(_) => {
            match movement.movement_type.as_str() {
                "add_stock" => {
                    conn.execute(
                        "UPDATE logistics_consumables
                         SET available_quantity = available_quantity + ?1,
                             last_updated_by = ?2, updated_at = ?3
                         WHERE id = ?4",
                        params![movement.quantity, session.user_id, now, movement.consumable_id],
                    )
                    .map_err(|e| e.to_string())?;
                }
                "register_use" => {
                    let available: f64 = conn
                        .query_row(
                            "SELECT available_quantity FROM logistics_consumables WHERE id = ?1",
                            params![movement.consumable_id],
                            |row| row.get(0),
                        )
                        .map_err(|e| e.to_string())?;

                    if available < movement.quantity {
                        let _ = conn.execute("ROLLBACK", []);
                        return Err(format!(
                            "Insufficient stock: available {:.2}, requested {:.2}",
                            available, movement.quantity
                        ));
                    }

                    conn.execute(
                        "UPDATE logistics_consumables
                         SET available_quantity = available_quantity - ?1,
                             used_quantity = used_quantity + ?1,
                             last_updated_by = ?2, updated_at = ?3
                         WHERE id = ?4",
                        params![movement.quantity, session.user_id, now, movement.consumable_id],
                    )
                    .map_err(|e| e.to_string())?;
                }
                "adjustment" => {
                    // Adjustment sets the available_quantity directly
                    conn.execute(
                        "UPDATE logistics_consumables
                         SET available_quantity = ?1,
                             last_updated_by = ?2, updated_at = ?3
                         WHERE id = ?4",
                        params![movement.quantity, session.user_id, now, movement.consumable_id],
                    )
                    .map_err(|e| e.to_string())?;
                }
                _ => {} // "request" doesn't modify inventory
            }

            conn.execute("COMMIT", []).map_err(|e| e.to_string())?;

            Ok(ConsumableMovement {
                id: movement_id,
                consumable_id: movement.consumable_id,
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
pub async fn get_consumable_movements(
    session_token: String,
    consumable_id: Option<String>,
    limit: Option<i32>,
    state: State<'_, AppState>,
) -> Result<Vec<ConsumableMovement>, String> {
    get_session(&session_token, &state).map_err(|e| e.to_string())?;

    let conn = state.db.lock().map_err(|e| format!("Failed to lock database: {}", e))?;

    let (query, params_vec): (String, Vec<Box<dyn rusqlite::types::ToSql>>) =
        if let Some(ref cid) = consumable_id {
            (
                format!(
                    "SELECT id, consumable_id, movement_type, quantity, notes, created_by, created_at
                     FROM logistics_consumables_movements
                     WHERE consumable_id = ?1
                     ORDER BY created_at DESC
                     LIMIT {}",
                    limit.unwrap_or(100)
                ),
                vec![Box::new(cid.clone())],
            )
        } else {
            (
                format!(
                    "SELECT id, consumable_id, movement_type, quantity, notes, created_by, created_at
                     FROM logistics_consumables_movements
                     ORDER BY created_at DESC
                     LIMIT {}",
                    limit.unwrap_or(100)
                ),
                vec![],
            )
        };

    let mut stmt = conn.prepare(&query).map_err(|e| e.to_string())?;

    let params_refs: Vec<&dyn rusqlite::types::ToSql> =
        params_vec.iter().map(|p| p.as_ref()).collect();

    let movements = stmt
        .query_map(params_refs.as_slice(), |row| {
            Ok(ConsumableMovement {
                id: row.get(0)?,
                consumable_id: row.get(1)?,
                movement_type: row.get(2)?,
                quantity: row.get(3)?,
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
