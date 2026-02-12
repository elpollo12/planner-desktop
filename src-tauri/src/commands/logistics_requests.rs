use crate::auth::get_session;
use crate::models::logistics::*;
use crate::state::AppState;
use rusqlite::params;
use tauri::State;
use uuid::Uuid;

// ============================================================================
// SOLICITUDES DE LOGÍSTICA - Commands
// ============================================================================

#[tauri::command]
pub async fn create_logistics_request(
    session_token: String,
    input: CreateLogisticsRequest,
    state: State<'_, AppState>,
) -> Result<LogisticsRequest, String> {
    let session = get_session(&session_token, &state).map_err(|e| e.to_string())?;

    let conn = state.db.lock().map_err(|e| format!("Failed to lock database: {}", e))?;

    // Validate request type
    match input.request_type.as_str() {
        "water_bottles" | "fuel" | "water_tank" | "consumable" => {}
        _ => return Err(format!("Invalid request type: {}", input.request_type)),
    }

    // Validate priority
    match input.priority.as_str() {
        "low" | "medium" | "high" | "urgent" => {}
        _ => return Err(format!("Invalid priority: {}", input.priority)),
    }

    if input.quantity <= 0.0 {
        return Err("Quantity must be greater than 0".to_string());
    }

    // If type is consumable, validate consumable_id exists
    if input.request_type == "consumable" {
        match &input.consumable_id {
            Some(cid) => {
                let exists: bool = conn
                    .query_row(
                        "SELECT COUNT(*) > 0 FROM logistics_consumables WHERE id = ?1",
                        params![cid],
                        |row| row.get(0),
                    )
                    .map_err(|e| e.to_string())?;

                if !exists {
                    return Err("Consumable not found".to_string());
                }
            }
            None => return Err("consumable_id is required for consumable requests".to_string()),
        }
    }

    let id = Uuid::new_v4().to_string();
    let now = chrono::Utc::now().to_rfc3339();

    conn.execute(
        "INSERT INTO logistics_requests
         (id, request_type, consumable_id, quantity, unit, description, priority, status,
          requested_by, requested_at, created_at, updated_at)
         VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, 'pending', ?8, ?9, ?10, ?11)",
        params![
            id,
            input.request_type,
            input.consumable_id,
            input.quantity,
            input.unit,
            input.description,
            input.priority,
            session.user_id,
            now,
            now,
            now,
        ],
    )
    .map_err(|e| e.to_string())?;

    // Return the created request
    get_request_by_id(&conn, &id)
}

#[tauri::command]
pub async fn list_logistics_requests(
    session_token: String,
    request_type: Option<String>,
    status: Option<String>,
    limit: Option<i32>,
    state: State<'_, AppState>,
) -> Result<Vec<LogisticsRequest>, String> {
    get_session(&session_token, &state).map_err(|e| e.to_string())?;

    let conn = state.db.lock().map_err(|e| format!("Failed to lock database: {}", e))?;

    let mut conditions = Vec::new();
    let mut param_values: Vec<Box<dyn rusqlite::types::ToSql>> = Vec::new();
    let mut idx = 1;

    if let Some(ref rt) = request_type {
        conditions.push(format!("request_type = ?{}", idx));
        param_values.push(Box::new(rt.clone()));
        idx += 1;
    }

    if let Some(ref s) = status {
        conditions.push(format!("status = ?{}", idx));
        param_values.push(Box::new(s.clone()));
        // idx += 1; // Not needed since it's the last param before LIMIT
    }

    let where_clause = if conditions.is_empty() {
        String::new()
    } else {
        format!("WHERE {}", conditions.join(" AND "))
    };

    let query = format!(
        "SELECT id, request_type, consumable_id, quantity, unit, description, priority, status,
                requested_by, approved_by, completed_by, rejection_reason,
                requested_at, approved_at, completed_at, rejected_at, cancelled_at,
                created_at, updated_at
         FROM logistics_requests
         {}
         ORDER BY
           CASE priority
             WHEN 'urgent' THEN 1
             WHEN 'high' THEN 2
             WHEN 'medium' THEN 3
             WHEN 'low' THEN 4
           END,
           requested_at DESC
         LIMIT {}",
        where_clause,
        limit.unwrap_or(100)
    );

    let mut stmt = conn.prepare(&query).map_err(|e| e.to_string())?;

    let params_refs: Vec<&dyn rusqlite::types::ToSql> =
        param_values.iter().map(|p| p.as_ref()).collect();

    let requests = stmt
        .query_map(params_refs.as_slice(), |row| {
            Ok(LogisticsRequest {
                id: row.get(0)?,
                request_type: row.get(1)?,
                consumable_id: row.get(2)?,
                quantity: row.get(3)?,
                unit: row.get(4)?,
                description: row.get(5)?,
                priority: row.get(6)?,
                status: row.get(7)?,
                requested_by: row.get(8)?,
                approved_by: row.get(9)?,
                completed_by: row.get(10)?,
                rejection_reason: row.get(11)?,
                requested_at: row.get(12)?,
                approved_at: row.get(13)?,
                completed_at: row.get(14)?,
                rejected_at: row.get(15)?,
                cancelled_at: row.get(16)?,
                created_at: row.get(17)?,
                updated_at: row.get(18)?,
            })
        })
        .map_err(|e| e.to_string())?;

    let mut result = Vec::new();
    for request in requests {
        result.push(request.map_err(|e| e.to_string())?);
    }

    Ok(result)
}

#[tauri::command]
pub async fn update_logistics_request_status(
    session_token: String,
    request_id: String,
    input: UpdateLogisticsRequestStatus,
    state: State<'_, AppState>,
) -> Result<LogisticsRequest, String> {
    let session = get_session(&session_token, &state).map_err(|e| e.to_string())?;

    let conn = state.db.lock().map_err(|e| format!("Failed to lock database: {}", e))?;

    // Validate new status
    match input.status.as_str() {
        "approved" | "rejected" | "completed" | "cancelled" => {}
        _ => return Err(format!("Invalid status: {}", input.status)),
    }

    // Get current request to validate transition
    let current_status: String = conn
        .query_row(
            "SELECT status FROM logistics_requests WHERE id = ?1",
            params![request_id],
            |row| row.get(0),
        )
        .map_err(|e| e.to_string())?;

    // Validate status transitions
    let valid_transition = match (current_status.as_str(), input.status.as_str()) {
        ("pending", "approved") => true,
        ("pending", "rejected") => true,
        ("pending", "cancelled") => true,
        ("approved", "completed") => true,
        ("approved", "cancelled") => true,
        _ => false,
    };

    if !valid_transition {
        return Err(format!(
            "Invalid status transition: {} -> {}",
            current_status, input.status
        ));
    }

    let now = chrono::Utc::now().to_rfc3339();

    match input.status.as_str() {
        "approved" => {
            conn.execute(
                "UPDATE logistics_requests
                 SET status = 'approved', approved_by = ?1, approved_at = ?2, updated_at = ?3
                 WHERE id = ?4",
                params![session.user_id, now, now, request_id],
            )
            .map_err(|e| e.to_string())?;
        }
        "rejected" => {
            let reason = input
                .rejection_reason
                .as_deref()
                .unwrap_or("No reason provided");

            conn.execute(
                "UPDATE logistics_requests
                 SET status = 'rejected', rejection_reason = ?1, rejected_at = ?2, updated_at = ?3
                 WHERE id = ?4",
                params![reason, now, now, request_id],
            )
            .map_err(|e| e.to_string())?;
        }
        "completed" => {
            conn.execute(
                "UPDATE logistics_requests
                 SET status = 'completed', completed_by = ?1, completed_at = ?2, updated_at = ?3
                 WHERE id = ?4",
                params![session.user_id, now, now, request_id],
            )
            .map_err(|e| e.to_string())?;
        }
        "cancelled" => {
            conn.execute(
                "UPDATE logistics_requests
                 SET status = 'cancelled', cancelled_at = ?1, updated_at = ?2
                 WHERE id = ?3",
                params![now, now, request_id],
            )
            .map_err(|e| e.to_string())?;
        }
        _ => {}
    }

    get_request_by_id(&conn, &request_id)
}

#[tauri::command]
pub async fn get_pending_requests_count(
    session_token: String,
    state: State<'_, AppState>,
) -> Result<i32, String> {
    get_session(&session_token, &state).map_err(|e| e.to_string())?;

    let conn = state.db.lock().map_err(|e| format!("Failed to lock database: {}", e))?;

    let count: i32 = conn
        .query_row(
            "SELECT COUNT(*) FROM logistics_requests WHERE status = 'pending'",
            [],
            |row| row.get(0),
        )
        .map_err(|e| e.to_string())?;

    Ok(count)
}

// ============================================================================
// REPORTES DE LOGÍSTICA - Commands
// ============================================================================

#[tauri::command]
pub async fn get_logistics_report(
    session_token: String,
    period_start: String,
    period_end: String,
    state: State<'_, AppState>,
) -> Result<LogisticsReport, String> {
    get_session(&session_token, &state).map_err(|e| e.to_string())?;

    let conn = state.db.lock().map_err(|e| format!("Failed to lock database: {}", e))?;

    // Water bottles summary
    let water_bottles = get_water_bottles_summary(&conn, &period_start, &period_end)?;

    // Fuel summary
    let fuel = get_fuel_summary(&conn, &period_start, &period_end)?;

    // Water tank summary
    let water_tank = get_water_tank_summary(&conn, &period_start, &period_end)?;

    // Consumables summary
    let consumables = get_consumables_summary(&conn, &period_start, &period_end)?;

    Ok(LogisticsReport {
        period_start,
        period_end,
        water_bottles_summary: water_bottles,
        fuel_summary: fuel,
        water_tank_summary: water_tank,
        consumables_summary: consumables,
    })
}

// ============================================================================
// Helper functions
// ============================================================================

fn get_request_by_id(
    conn: &rusqlite::Connection,
    id: &str,
) -> Result<LogisticsRequest, String> {
    let mut stmt = conn
        .prepare(
            "SELECT id, request_type, consumable_id, quantity, unit, description, priority, status,
                    requested_by, approved_by, completed_by, rejection_reason,
                    requested_at, approved_at, completed_at, rejected_at, cancelled_at,
                    created_at, updated_at
             FROM logistics_requests WHERE id = ?1",
        )
        .map_err(|e| e.to_string())?;

    stmt.query_row(params![id], |row| {
        Ok(LogisticsRequest {
            id: row.get(0)?,
            request_type: row.get(1)?,
            consumable_id: row.get(2)?,
            quantity: row.get(3)?,
            unit: row.get(4)?,
            description: row.get(5)?,
            priority: row.get(6)?,
            status: row.get(7)?,
            requested_by: row.get(8)?,
            approved_by: row.get(9)?,
            completed_by: row.get(10)?,
            rejection_reason: row.get(11)?,
            requested_at: row.get(12)?,
            approved_at: row.get(13)?,
            completed_at: row.get(14)?,
            rejected_at: row.get(15)?,
            cancelled_at: row.get(16)?,
            created_at: row.get(17)?,
            updated_at: row.get(18)?,
        })
    })
    .map_err(|e| e.to_string())
}

fn get_water_bottles_summary(
    conn: &rusqlite::Connection,
    start: &str,
    end: &str,
) -> Result<WaterBottlesSummary, String> {
    // Current state
    let (current_full, current_empty): (i32, i32) = conn
        .query_row(
            "SELECT full_bottles, empty_bottles FROM logistics_water_bottles WHERE id = 'default'",
            [],
            |row| Ok((row.get(0)?, row.get(1)?)),
        )
        .map_err(|e| e.to_string())?;

    // Period totals
    let total_full: i32 = conn
        .query_row(
            "SELECT COALESCE(SUM(quantity), 0) FROM logistics_water_bottles_movements
             WHERE movement_type = 'register_full' AND created_at BETWEEN ?1 AND ?2",
            params![start, end],
            |row| row.get(0),
        )
        .map_err(|e| e.to_string())?;

    let total_empty: i32 = conn
        .query_row(
            "SELECT COALESCE(SUM(quantity), 0) FROM logistics_water_bottles_movements
             WHERE movement_type = 'register_empty' AND created_at BETWEEN ?1 AND ?2",
            params![start, end],
            |row| row.get(0),
        )
        .map_err(|e| e.to_string())?;

    let total_requests: i32 = conn
        .query_row(
            "SELECT COUNT(*) FROM logistics_requests
             WHERE request_type = 'water_bottles' AND requested_at BETWEEN ?1 AND ?2",
            params![start, end],
            |row| row.get(0),
        )
        .map_err(|e| e.to_string())?;

    Ok(WaterBottlesSummary {
        current_full,
        current_empty,
        total_registered_full: total_full,
        total_registered_empty: total_empty,
        total_requests,
    })
}

fn get_fuel_summary(
    conn: &rusqlite::Connection,
    start: &str,
    end: &str,
) -> Result<FuelSummary, String> {
    let (current_reserve, current_in_use, total_consumed, unit): (f64, f64, f64, String) = conn
        .query_row(
            "SELECT reserve_amount, in_use_amount, consumed_amount, unit
             FROM logistics_fuel WHERE id = 'default'",
            [],
            |row| Ok((row.get(0)?, row.get(1)?, row.get(2)?, row.get(3)?)),
        )
        .map_err(|e| e.to_string())?;

    let total_loaded: f64 = conn
        .query_row(
            "SELECT COALESCE(SUM(amount), 0) FROM logistics_fuel_movements
             WHERE movement_type = 'load' AND created_at BETWEEN ?1 AND ?2",
            params![start, end],
            |row| row.get(0),
        )
        .map_err(|e| e.to_string())?;

    let total_requests: i32 = conn
        .query_row(
            "SELECT COUNT(*) FROM logistics_requests
             WHERE request_type = 'fuel' AND requested_at BETWEEN ?1 AND ?2",
            params![start, end],
            |row| row.get(0),
        )
        .map_err(|e| e.to_string())?;

    Ok(FuelSummary {
        current_reserve,
        current_in_use,
        total_consumed,
        total_loaded,
        total_requests,
        unit,
    })
}

fn get_water_tank_summary(
    conn: &rusqlite::Connection,
    start: &str,
    end: &str,
) -> Result<WaterTankSummary, String> {
    let (current_reserve, current_in_use, total_consumed, unit): (f64, f64, f64, String) = conn
        .query_row(
            "SELECT reserve_amount, in_use_amount, consumed_amount, unit
             FROM logistics_water_tank WHERE id = 'default'",
            [],
            |row| Ok((row.get(0)?, row.get(1)?, row.get(2)?, row.get(3)?)),
        )
        .map_err(|e| e.to_string())?;

    let total_refilled: f64 = conn
        .query_row(
            "SELECT COALESCE(SUM(amount), 0) FROM logistics_water_tank_movements
             WHERE movement_type = 'refill' AND created_at BETWEEN ?1 AND ?2",
            params![start, end],
            |row| row.get(0),
        )
        .map_err(|e| e.to_string())?;

    let total_requests: i32 = conn
        .query_row(
            "SELECT COUNT(*) FROM logistics_requests
             WHERE request_type = 'water_tank' AND requested_at BETWEEN ?1 AND ?2",
            params![start, end],
            |row| row.get(0),
        )
        .map_err(|e| e.to_string())?;

    Ok(WaterTankSummary {
        current_reserve,
        current_in_use,
        total_consumed,
        total_refilled,
        total_requests,
        unit,
    })
}

fn get_consumables_summary(
    conn: &rusqlite::Connection,
    start: &str,
    end: &str,
) -> Result<Vec<ConsumableSummary>, String> {
    let mut stmt = conn
        .prepare(
            "SELECT id, name, available_quantity, used_quantity, unit
             FROM logistics_consumables
             WHERE active = 1
             ORDER BY name ASC",
        )
        .map_err(|e| e.to_string())?;

    let consumables = stmt
        .query_map([], |row| {
            Ok((
                row.get::<_, String>(0)?,
                row.get::<_, String>(1)?,
                row.get::<_, f64>(2)?,
                row.get::<_, f64>(3)?,
                row.get::<_, String>(4)?,
            ))
        })
        .map_err(|e| e.to_string())?;

    let mut summaries = Vec::new();

    for consumable in consumables {
        let (id, name, current_available, total_used_all, unit) =
            consumable.map_err(|e| e.to_string())?;

        let total_added: f64 = conn
            .query_row(
                "SELECT COALESCE(SUM(quantity), 0) FROM logistics_consumables_movements
                 WHERE consumable_id = ?1 AND movement_type = 'add_stock'
                 AND created_at BETWEEN ?2 AND ?3",
                params![id, start, end],
                |row| row.get(0),
            )
            .map_err(|e| e.to_string())?;

        let period_used: f64 = conn
            .query_row(
                "SELECT COALESCE(SUM(quantity), 0) FROM logistics_consumables_movements
                 WHERE consumable_id = ?1 AND movement_type = 'register_use'
                 AND created_at BETWEEN ?2 AND ?3",
                params![id, start, end],
                |row| row.get(0),
            )
            .map_err(|e| e.to_string())?;

        let total_requests: i32 = conn
            .query_row(
                "SELECT COUNT(*) FROM logistics_requests
                 WHERE request_type = 'consumable' AND consumable_id = ?1
                 AND requested_at BETWEEN ?2 AND ?3",
                params![id, start, end],
                |row| row.get(0),
            )
            .map_err(|e| e.to_string())?;

        summaries.push(ConsumableSummary {
            consumable_id: id,
            name,
            current_available,
            total_used: period_used,
            total_added,
            total_requests,
            unit,
        });
    }

    Ok(summaries)
}
