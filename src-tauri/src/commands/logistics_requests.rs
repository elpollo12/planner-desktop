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
pub async fn create_logistics_request(
    session_token: String, rig_id: String, input: CreateLogisticsRequest, state: State<'_, AppState>,
) -> Result<LogisticsRequest, String> {
    let session = get_session(&session_token, &state).map_err(|e| e.to_string())?;

    let conn = state.db.lock().map_err(|e| format!("Failed to lock database: {}", e))?;
    let has_access = User::has_rig_access(&conn, &session.user_id, &rig_id).map_err(|e| e.to_string())?;
    if !has_access {
        return Err("No tienes acceso a este taladro".to_string());
    }

    match input.request_type.as_str() {
        "water_bottles" | "fuel" | "material" | "vacuum" => {}
        _ => return Err(format!("Tipo de solicitud inválido: {}", input.request_type)),
    }

    match input.request_type.as_str() {
        "water_bottles" | "fuel" => {
            if input.quantity.is_none() || input.quantity.unwrap_or(0.0) <= 0.0 {
                return Err("La cantidad es requerida y debe ser mayor a 0".to_string());
            }
        }
        "material" => {
            if input.quantity.is_none() || input.quantity.unwrap_or(0.0) <= 0.0 {
                return Err("La cantidad es requerida y debe ser mayor a 0".to_string());
            }
            if input.material_id.is_none() { return Err("Debe seleccionar un material".to_string()); }
        }
        "vacuum" => {
            if input.action_requested.as_ref().map_or(true, |a| a.trim().is_empty()) {
                return Err("La acción solicitada es requerida".to_string());
            }
        }
        _ => {}
    }

    if let Some(ref mid) = input.material_id {
        let exists: bool = conn.query_row(
            "SELECT COUNT(*) > 0 FROM logistics_materials WHERE id = ?1", params![mid], |row| row.get(0),
        ).map_err(|e| e.to_string())?;
        if !exists { return Err("Material no encontrado".to_string()); }
    }

    let id = Uuid::new_v4().to_string();
    let now = chrono::Utc::now().to_rfc3339();

    conn.execute(
        "INSERT INTO logistics_requests
         (id, rig_id, request_type, quantity, action_requested, material_id, status, notes, requested_by, requested_at, created_at, updated_at)
         VALUES (?1, ?2, ?3, ?4, ?5, ?6, 'requested', ?7, ?8, ?9, ?10, ?11)",
        params![id, rig_id, input.request_type, input.quantity, input.action_requested, input.material_id, input.notes, session.user_id, now, now, now],
    ).map_err(|e| e.to_string())?;

    get_request_by_id(&conn, &id)
}

#[tauri::command]
pub async fn list_logistics_requests(
    session_token: String,
    rig_id: String,
    request_type: Option<String>,
    status: Option<String>,
    page: Option<i64>,
    page_size: Option<i64>,
    state: State<'_, AppState>,
) -> Result<PaginatedResponse<LogisticsRequest>, String> {
    let session = get_session(&session_token, &state).map_err(|e| e.to_string())?;

    let conn = state.db.lock().map_err(|e| format!("Failed to lock database: {}", e))?;
    let has_access = User::has_rig_access(&conn, &session.user_id, &rig_id).map_err(|e| e.to_string())?;
    if !has_access {
        return Err("No tienes acceso a este taladro".to_string());
    }

    let mut conditions = vec!["rig_id = ?1".to_string()];
    let mut param_values: Vec<Box<dyn rusqlite::types::ToSql>> = vec![Box::new(rig_id.clone())];
    let mut idx = 2;

    if let Some(ref rt) = request_type {
        conditions.push(format!("request_type = ?{}", idx));
        param_values.push(Box::new(rt.clone())); idx += 1;
    }
    if let Some(ref s) = status {
        conditions.push(format!("status = ?{}", idx));
        param_values.push(Box::new(s.clone()));
    }

    let where_clause = format!("WHERE {}", conditions.join(" AND "));

    let count_query = format!("SELECT COUNT(*) FROM logistics_requests {}", where_clause);
    let count_refs: Vec<&dyn rusqlite::types::ToSql> = param_values.iter().map(|p| p.as_ref()).collect();
    let total: i64 = conn.query_row(&count_query, count_refs.as_slice(), |row| row.get(0)).map_err(|e| e.to_string())?;

    let (pg, ps, offset) = paginate(page, page_size);

    let data_query = format!(
        "SELECT id, rig_id, request_type, quantity, action_requested, material_id, status, notes,
                requested_by, status_changed_by, requested_at, status_changed_at, created_at, updated_at
         FROM logistics_requests {} ORDER BY requested_at DESC LIMIT {} OFFSET {}",
        where_clause, ps, offset
    );

    let mut stmt = conn.prepare(&data_query).map_err(|e| e.to_string())?;
    let data_refs: Vec<&dyn rusqlite::types::ToSql> = param_values.iter().map(|p| p.as_ref()).collect();

    let rows = stmt.query_map(data_refs.as_slice(), |row| {
        Ok(LogisticsRequest {
            id: row.get(0)?, rig_id: row.get(1)?, request_type: row.get(2)?, quantity: row.get(3)?,
            action_requested: row.get(4)?, material_id: row.get(5)?, status: row.get(6)?,
            notes: row.get(7)?, requested_by: row.get(8)?, status_changed_by: row.get(9)?,
            requested_at: row.get(10)?, status_changed_at: row.get(11)?,
            created_at: row.get(12)?, updated_at: row.get(13)?,
        })
    }).map_err(|e| e.to_string())?;

    let mut data = Vec::new();
    for row in rows { data.push(row.map_err(|e| e.to_string())?); }

    Ok(PaginatedResponse { data, total, page: pg, page_size: ps, total_pages: total_pages(total, ps) })
}

#[tauri::command]
pub async fn update_logistics_request_status(
    session_token: String, request_id: String, input: UpdateRequestStatus, state: State<'_, AppState>,
) -> Result<LogisticsRequest, String> {
    let session = get_session(&session_token, &state).map_err(|e| e.to_string())?;
    match session.role.as_str() { "supervisor" | "admin" => {} _ => return Err("No tienes permisos para cambiar el estado de solicitudes".to_string()), }
    match input.status.as_str() { "requested" | "pending" | "approved" | "rejected" => {} _ => return Err(format!("Estado inválido: {}", input.status)), }

    let conn = state.db.lock().map_err(|e| format!("Failed to lock database: {}", e))?;

    // Verify rig access
    let (current_status, rig_id): (String, Option<String>) = conn.query_row(
        "SELECT status, rig_id FROM logistics_requests WHERE id = ?1",
        params![request_id], |row| Ok((row.get(0)?, row.get(1)?)),
    ).map_err(|_| "Solicitud no encontrada".to_string())?;

    if let Some(ref rid) = rig_id {
        let has_access = User::has_rig_access(&conn, &session.user_id, rid).map_err(|e| e.to_string())?;
        if !has_access {
            return Err("No tienes acceso a este taladro".to_string());
        }
    }

    let valid = match (current_status.as_str(), input.status.as_str()) {
        ("requested", "pending") | ("requested", "approved") | ("requested", "rejected") => true,
        ("pending", "approved") | ("pending", "rejected") => true,
        _ => false,
    };
    if !valid { return Err(format!("Transición de estado inválida: {} -> {}", current_status, input.status)); }

    let now = chrono::Utc::now().to_rfc3339();
    conn.execute(
        "UPDATE logistics_requests SET status = ?1, status_changed_by = ?2, status_changed_at = ?3, updated_at = ?4 WHERE id = ?5",
        params![input.status, session.user_id, now, now, request_id],
    ).map_err(|e| e.to_string())?;

    get_request_by_id(&conn, &request_id)
}

#[tauri::command]
pub async fn delete_logistics_request(
    session_token: String, request_id: String, state: State<'_, AppState>,
) -> Result<(), String> {
    let session = get_session(&session_token, &state).map_err(|e| e.to_string())?;
    let conn = state.db.lock().map_err(|e| format!("Failed to lock database: {}", e))?;

    let (requested_by, rig_id): (String, Option<String>) = conn.query_row(
        "SELECT requested_by, rig_id FROM logistics_requests WHERE id = ?1",
        params![request_id], |row| Ok((row.get(0)?, row.get(1)?)),
    ).map_err(|_| "Solicitud no encontrada".to_string())?;

    // Verify rig access
    if let Some(ref rid) = rig_id {
        let has_access = User::has_rig_access(&conn, &session.user_id, rid).map_err(|e| e.to_string())?;
        if !has_access {
            return Err("No tienes acceso a este taladro".to_string());
        }
    }

    match session.role.as_str() {
        "admin" | "supervisor" => {}
        _ => {
            if requested_by != session.user_id {
                return Err("Solo puedes eliminar solicitudes creadas por ti".to_string());
            }
        }
    }

    let affected = conn
        .execute("DELETE FROM logistics_requests WHERE id = ?1", params![request_id])
        .map_err(|e| e.to_string())?;

    if affected == 0 { return Err("Solicitud no encontrada".to_string()); }
    Ok(())
}

#[tauri::command]
pub async fn get_pending_requests_count(
    session_token: String, rig_id: String, state: State<'_, AppState>,
) -> Result<i32, String> {
    let session = get_session(&session_token, &state).map_err(|e| e.to_string())?;

    let conn = state.db.lock().map_err(|e| format!("Failed to lock database: {}", e))?;
    let has_access = User::has_rig_access(&conn, &session.user_id, &rig_id).map_err(|e| e.to_string())?;
    if !has_access {
        return Err("No tienes acceso a este taladro".to_string());
    }

    conn.query_row(
        "SELECT COUNT(*) FROM logistics_requests WHERE status IN ('requested', 'pending') AND rig_id = ?1",
        params![rig_id], |row| row.get(0),
    ).map_err(|e| e.to_string())
}

// ============================================================================
// REPORTES (con rig_id)
// ============================================================================

#[tauri::command]
pub async fn get_logistics_report(
    session_token: String, rig_id: String, period_start: String, period_end: String, state: State<'_, AppState>,
) -> Result<LogisticsReport, String> {
    let session = get_session(&session_token, &state).map_err(|e| e.to_string())?;
    match session.role.as_str() { "supervisor" | "admin" => {} _ => return Err("No tienes permisos para generar reportes".to_string()), }

    let conn = state.db.lock().map_err(|e| format!("Failed to lock database: {}", e))?;
    let has_access = User::has_rig_access(&conn, &session.user_id, &rig_id).map_err(|e| e.to_string())?;
    if !has_access {
        return Err("No tienes acceso a este taladro".to_string());
    }

    let start = if period_start.contains('T') { period_start.clone() } else { format!("{}T00:00:00", period_start) };
    let end = if period_end.contains('T') { period_end.clone() } else { format!("{}T23:59:59", period_end) };

    let water_bottles = build_water_bottles_summary(&conn, &rig_id, &start, &end)?;
    let fuel = build_fuel_summary(&conn, &rig_id, &start, &end)?;
    let vacuum = build_vacuum_summary(&conn, &rig_id, &start, &end)?;
    let materials = build_materials_summary(&conn, &rig_id, &start, &end)?;
    let requests = build_requests_summary(&conn, &rig_id, &start, &end)?;

    Ok(LogisticsReport { period_start, period_end, water_bottles_summary: water_bottles, fuel_summary: fuel, vacuum_summary: vacuum, materials_summary: materials, requests_summary: requests })
}

#[tauri::command]
pub async fn get_detailed_logistics_report(
    session_token: String,
    rig_id: String,
    section: String,
    period_start: String,
    period_end: String,
    material_id: Option<String>,
    state: State<'_, AppState>,
) -> Result<DetailedLogisticsReport, String> {
    let session = get_session(&session_token, &state).map_err(|e| e.to_string())?;
    match session.role.as_str() {
        "supervisor" | "admin" => {}
        _ => return Err("No tienes permisos para generar reportes detallados".to_string()),
    }

    let conn = state.db.lock().map_err(|e| format!("Failed to lock database: {}", e))?;
    let has_access = User::has_rig_access(&conn, &session.user_id, &rig_id).map_err(|e| e.to_string())?;
    if !has_access {
        return Err("No tienes acceso a este taladro".to_string());
    }

    let start = if period_start.contains('T') { period_start } else { format!("{}T00:00:00", period_start) };
    let end = if period_end.contains('T') { period_end } else { format!("{}T23:59:59", period_end) };

    match section.as_str() {
        "water_bottles" => Ok(DetailedLogisticsReport::WaterBottles { movements: build_detailed_water_bottles(&conn, &rig_id, &start, &end)? }),
        "fuel" => Ok(DetailedLogisticsReport::Fuel { movements: build_detailed_fuel(&conn, &rig_id, &start, &end)? }),
        "vacuum" => Ok(DetailedLogisticsReport::Vacuum { movements: build_detailed_vacuum(&conn, &rig_id, &start, &end)? }),
        "materials" => Ok(DetailedLogisticsReport::Materials { movements: build_detailed_materials(&conn, &rig_id, &start, &end, material_id)? }),
        "requests" => Ok(DetailedLogisticsReport::Requests { requests: build_detailed_requests(&conn, &rig_id, &start, &end)? }),
        _ => Err(format!("Sección inválida: {}", section)),
    }
}

// ============================================================================
// Helpers
// ============================================================================

fn get_request_by_id(conn: &rusqlite::Connection, id: &str) -> Result<LogisticsRequest, String> {
    conn.query_row(
        "SELECT id, rig_id, request_type, quantity, action_requested, material_id, status, notes,
                requested_by, status_changed_by, requested_at, status_changed_at, created_at, updated_at
         FROM logistics_requests WHERE id = ?1", params![id],
        |row| Ok(LogisticsRequest {
            id: row.get(0)?, rig_id: row.get(1)?, request_type: row.get(2)?, quantity: row.get(3)?,
            action_requested: row.get(4)?, material_id: row.get(5)?, status: row.get(6)?,
            notes: row.get(7)?, requested_by: row.get(8)?, status_changed_by: row.get(9)?,
            requested_at: row.get(10)?, status_changed_at: row.get(11)?,
            created_at: row.get(12)?, updated_at: row.get(13)?,
        }),
    ).map_err(|e| e.to_string())
}

fn build_water_bottles_summary(conn: &rusqlite::Connection, rig_id: &str, start: &str, end: &str) -> Result<WaterBottlesSummary, String> {
    let total_entries: i32 = conn.query_row(
        "SELECT COALESCE(SUM(quantity), 0) FROM logistics_water_bottles_movements WHERE movement_type = 'entry' AND rig_id = ?1 AND created_at BETWEEN ?2 AND ?3",
        params![rig_id, start, end], |row| row.get(0),
    ).map_err(|e| e.to_string())?;
    let total_exits: i32 = conn.query_row(
        "SELECT COALESCE(SUM(quantity), 0) FROM logistics_water_bottles_movements WHERE movement_type = 'exit' AND rig_id = ?1 AND created_at BETWEEN ?2 AND ?3",
        params![rig_id, start, end], |row| row.get(0),
    ).map_err(|e| e.to_string())?;
    Ok(WaterBottlesSummary { total_entries, total_exits, net: total_entries - total_exits })
}

fn build_fuel_summary(conn: &rusqlite::Connection, rig_id: &str, start: &str, end: &str) -> Result<FuelSummary, String> {
    let total_entries: f64 = conn.query_row(
        "SELECT COALESCE(SUM(amount), 0) FROM logistics_fuel_movements WHERE movement_type = 'entry' AND rig_id = ?1 AND created_at BETWEEN ?2 AND ?3",
        params![rig_id, start, end], |row| row.get(0),
    ).map_err(|e| e.to_string())?;
    let total_exits: f64 = conn.query_row(
        "SELECT COALESCE(SUM(amount), 0) FROM logistics_fuel_movements WHERE movement_type = 'exit' AND rig_id = ?1 AND created_at BETWEEN ?2 AND ?3",
        params![rig_id, start, end], |row| row.get(0),
    ).map_err(|e| e.to_string())?;
    Ok(FuelSummary { total_entries, total_exits, net: total_entries - total_exits })
}

fn build_vacuum_summary(conn: &rusqlite::Connection, rig_id: &str, start: &str, end: &str) -> Result<VacuumSummary, String> {
    let total_actions: i32 = conn.query_row(
        "SELECT COUNT(*) FROM logistics_vacuum_actions WHERE rig_id = ?1 AND created_at BETWEEN ?2 AND ?3",
        params![rig_id, start, end], |row| row.get(0),
    ).map_err(|e| e.to_string())?;
    Ok(VacuumSummary { total_actions })
}

fn build_materials_summary(conn: &rusqlite::Connection, rig_id: &str, start: &str, end: &str) -> Result<Vec<MaterialSummary>, String> {
    let mut stmt = conn.prepare(
        "SELECT id, name, unit FROM logistics_materials WHERE active = 1 ORDER BY name ASC"
    ).map_err(|e| e.to_string())?;

    let materials = stmt.query_map([], |row| {
        Ok((row.get::<_, String>(0)?, row.get::<_, String>(1)?, row.get::<_, String>(2)?))
    }).map_err(|e| e.to_string())?;

    let mut summaries = Vec::new();
    for material in materials {
        let (id, name, unit) = material.map_err(|e| e.to_string())?;
        let total_entries: f64 = conn.query_row(
            "SELECT COALESCE(SUM(quantity), 0) FROM logistics_materials_movements WHERE material_id = ?1 AND movement_type = 'entry' AND rig_id = ?2 AND created_at BETWEEN ?3 AND ?4",
            params![id, rig_id, start, end], |row| row.get(0),
        ).map_err(|e| e.to_string())?;
        let total_exits: f64 = conn.query_row(
            "SELECT COALESCE(SUM(quantity), 0) FROM logistics_materials_movements WHERE material_id = ?1 AND movement_type = 'exit' AND rig_id = ?2 AND created_at BETWEEN ?3 AND ?4",
            params![id, rig_id, start, end], |row| row.get(0),
        ).map_err(|e| e.to_string())?;
        summaries.push(MaterialSummary { material_id: id, material_name: name, unit, total_entries, total_exits, net: total_entries - total_exits });
    }
    Ok(summaries)
}

fn build_requests_summary(conn: &rusqlite::Connection, rig_id: &str, start: &str, end: &str) -> Result<RequestsSummary, String> {
    let total: i32 = conn.query_row("SELECT COUNT(*) FROM logistics_requests WHERE rig_id = ?1 AND requested_at BETWEEN ?2 AND ?3", params![rig_id, start, end], |row| row.get(0)).map_err(|e| e.to_string())?;
    let requested: i32 = conn.query_row("SELECT COUNT(*) FROM logistics_requests WHERE rig_id = ?1 AND status = 'requested' AND requested_at BETWEEN ?2 AND ?3", params![rig_id, start, end], |row| row.get(0)).map_err(|e| e.to_string())?;
    let pending: i32 = conn.query_row("SELECT COUNT(*) FROM logistics_requests WHERE rig_id = ?1 AND status = 'pending' AND requested_at BETWEEN ?2 AND ?3", params![rig_id, start, end], |row| row.get(0)).map_err(|e| e.to_string())?;
    let approved: i32 = conn.query_row("SELECT COUNT(*) FROM logistics_requests WHERE rig_id = ?1 AND status = 'approved' AND requested_at BETWEEN ?2 AND ?3", params![rig_id, start, end], |row| row.get(0)).map_err(|e| e.to_string())?;
    let rejected: i32 = conn.query_row("SELECT COUNT(*) FROM logistics_requests WHERE rig_id = ?1 AND status = 'rejected' AND requested_at BETWEEN ?2 AND ?3", params![rig_id, start, end], |row| row.get(0)).map_err(|e| e.to_string())?;
    Ok(RequestsSummary { total, requested, pending, approved, rejected })
}

fn build_detailed_water_bottles(conn: &rusqlite::Connection, rig_id: &str, start: &str, end: &str) -> Result<Vec<DetailedMovement>, String> {
    let mut stmt = conn.prepare(
        "SELECT m.id, m.movement_type, m.quantity, m.notes, COALESCE(u.full_name, 'Desconocido'), m.created_at
         FROM logistics_water_bottles_movements m
         LEFT JOIN users u ON m.created_by = u.id
         WHERE m.rig_id = ?1 AND m.created_at BETWEEN ?2 AND ?3
         ORDER BY m.created_at DESC"
    ).map_err(|e| e.to_string())?;

    let rows = stmt.query_map(params![rig_id, start, end], |row| {
        Ok(DetailedMovement {
            id: row.get(0)?, movement_type: Some(row.get::<_, String>(1)?),
            quantity: Some(row.get::<_, i32>(2)? as f64), action_name: None,
            material_name: None, material_unit: None, notes: row.get(3)?,
            created_by_name: row.get(4)?, created_at: row.get(5)?,
        })
    }).map_err(|e| e.to_string())?;

    let mut data = Vec::new();
    for row in rows { data.push(row.map_err(|e| e.to_string())?); }
    Ok(data)
}

fn build_detailed_fuel(conn: &rusqlite::Connection, rig_id: &str, start: &str, end: &str) -> Result<Vec<DetailedMovement>, String> {
    let mut stmt = conn.prepare(
        "SELECT m.id, m.movement_type, m.amount, m.notes, COALESCE(u.full_name, 'Desconocido'), m.created_at
         FROM logistics_fuel_movements m
         LEFT JOIN users u ON m.created_by = u.id
         WHERE m.rig_id = ?1 AND m.created_at BETWEEN ?2 AND ?3
         ORDER BY m.created_at DESC"
    ).map_err(|e| e.to_string())?;

    let rows = stmt.query_map(params![rig_id, start, end], |row| {
        Ok(DetailedMovement {
            id: row.get(0)?, movement_type: Some(row.get::<_, String>(1)?),
            quantity: Some(row.get::<_, f64>(2)?), action_name: None,
            material_name: None, material_unit: None, notes: row.get(3)?,
            created_by_name: row.get(4)?, created_at: row.get(5)?,
        })
    }).map_err(|e| e.to_string())?;

    let mut data = Vec::new();
    for row in rows { data.push(row.map_err(|e| e.to_string())?); }
    Ok(data)
}

fn build_detailed_vacuum(conn: &rusqlite::Connection, rig_id: &str, start: &str, end: &str) -> Result<Vec<DetailedMovement>, String> {
    let mut stmt = conn.prepare(
        "SELECT m.id, m.action_name, m.notes, COALESCE(u.full_name, 'Desconocido'), m.created_at
         FROM logistics_vacuum_actions m
         LEFT JOIN users u ON m.created_by = u.id
         WHERE m.rig_id = ?1 AND m.created_at BETWEEN ?2 AND ?3
         ORDER BY m.created_at DESC"
    ).map_err(|e| e.to_string())?;

    let rows = stmt.query_map(params![rig_id, start, end], |row| {
        Ok(DetailedMovement {
            id: row.get(0)?, movement_type: None, quantity: None,
            action_name: Some(row.get::<_, String>(1)?),
            material_name: None, material_unit: None, notes: row.get(2)?,
            created_by_name: row.get(3)?, created_at: row.get(4)?,
        })
    }).map_err(|e| e.to_string())?;

    let mut data = Vec::new();
    for row in rows { data.push(row.map_err(|e| e.to_string())?); }
    Ok(data)
}

fn build_detailed_materials(conn: &rusqlite::Connection, rig_id: &str, start: &str, end: &str, material_id: Option<String>) -> Result<Vec<DetailedMovement>, String> {
    let (query, use_material_filter) = match &material_id {
        Some(_) => (
            "SELECT m.id, m.movement_type, m.quantity, m.notes, COALESCE(u.full_name, 'Desconocido'), m.created_at, mat.name, mat.unit
             FROM logistics_materials_movements m
             LEFT JOIN users u ON m.created_by = u.id
             LEFT JOIN logistics_materials mat ON m.material_id = mat.id
             WHERE m.rig_id = ?1 AND m.created_at BETWEEN ?2 AND ?3 AND m.material_id = ?4
             ORDER BY m.created_at DESC", true
        ),
        None => (
            "SELECT m.id, m.movement_type, m.quantity, m.notes, COALESCE(u.full_name, 'Desconocido'), m.created_at, mat.name, mat.unit
             FROM logistics_materials_movements m
             LEFT JOIN users u ON m.created_by = u.id
             LEFT JOIN logistics_materials mat ON m.material_id = mat.id
             WHERE m.rig_id = ?1 AND m.created_at BETWEEN ?2 AND ?3
             ORDER BY m.created_at DESC", false
        ),
    };

    let mut stmt = conn.prepare(query).map_err(|e| e.to_string())?;

    let map_row = |row: &rusqlite::Row| -> rusqlite::Result<DetailedMovement> {
        Ok(DetailedMovement {
            id: row.get(0)?, movement_type: Some(row.get::<_, String>(1)?),
            quantity: Some(row.get::<_, f64>(2)?), action_name: None,
            material_name: row.get(6)?, material_unit: row.get(7)?,
            notes: row.get(3)?, created_by_name: row.get(4)?, created_at: row.get(5)?,
        })
    };

    let mut data = Vec::new();
    if use_material_filter {
        let mid = material_id.unwrap();
        let rows = stmt.query_map(params![rig_id, start, end, mid], map_row).map_err(|e| e.to_string())?;
        for row in rows { data.push(row.map_err(|e| e.to_string())?); }
    } else {
        let rows = stmt.query_map(params![rig_id, start, end], map_row).map_err(|e| e.to_string())?;
        for row in rows { data.push(row.map_err(|e| e.to_string())?); }
    }
    Ok(data)
}

fn build_detailed_requests(conn: &rusqlite::Connection, rig_id: &str, start: &str, end: &str) -> Result<Vec<DetailedRequest>, String> {
    let mut stmt = conn.prepare(
        "SELECT r.id, r.request_type, r.quantity, r.action_requested, r.status, r.notes,
                COALESCE(u1.full_name, 'Desconocido'), COALESCE(u2.full_name, NULL),
                r.requested_at, r.status_changed_at, mat.name
         FROM logistics_requests r
         LEFT JOIN users u1 ON r.requested_by = u1.id
         LEFT JOIN users u2 ON r.status_changed_by = u2.id
         LEFT JOIN logistics_materials mat ON r.material_id = mat.id
         WHERE r.rig_id = ?1 AND r.requested_at BETWEEN ?2 AND ?3
         ORDER BY r.requested_at DESC"
    ).map_err(|e| e.to_string())?;

    let rows = stmt.query_map(params![rig_id, start, end], |row| {
        Ok(DetailedRequest {
            id: row.get(0)?, request_type: row.get(1)?, quantity: row.get(2)?,
            action_requested: row.get(3)?, material_name: row.get(10)?,
            status: row.get(4)?, notes: row.get(5)?,
            requested_by_name: row.get(6)?, status_changed_by_name: row.get(7)?,
            requested_at: row.get(8)?, status_changed_at: row.get(9)?,
        })
    }).map_err(|e| e.to_string())?;

    let mut data = Vec::new();
    for row in rows { data.push(row.map_err(|e| e.to_string())?); }
    Ok(data)
}
