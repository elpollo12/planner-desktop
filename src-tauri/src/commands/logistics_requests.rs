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
pub async fn create_logistics_request(
    session_token: String, input: CreateLogisticsRequest, state: State<'_, AppState>,
) -> Result<LogisticsRequest, String> {
    let session = get_session(&session_token, &state).map_err(|e| e.to_string())?;

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

    let conn = state.db.lock().map_err(|e| format!("Failed to lock database: {}", e))?;

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
         (id, request_type, quantity, action_requested, material_id, status, notes, requested_by, requested_at, created_at, updated_at)
         VALUES (?1, ?2, ?3, ?4, ?5, 'requested', ?6, ?7, ?8, ?9, ?10)",
        params![id, input.request_type, input.quantity, input.action_requested, input.material_id, input.notes, session.user_id, now, now, now],
    ).map_err(|e| e.to_string())?;

    get_request_by_id(&conn, &id)
}

#[tauri::command]
pub async fn list_logistics_requests(
    session_token: String,
    request_type: Option<String>,
    status: Option<String>,
    page: Option<i64>,
    page_size: Option<i64>,
    state: State<'_, AppState>,
) -> Result<PaginatedResponse<LogisticsRequest>, String> {
    get_session(&session_token, &state).map_err(|e| e.to_string())?;
    let conn = state.db.lock().map_err(|e| format!("Failed to lock database: {}", e))?;

    let mut conditions = Vec::new();
    let mut param_values: Vec<Box<dyn rusqlite::types::ToSql>> = Vec::new();
    let mut idx = 1;

    if let Some(ref rt) = request_type {
        conditions.push(format!("request_type = ?{}", idx));
        param_values.push(Box::new(rt.clone())); idx += 1;
    }
    if let Some(ref s) = status {
        conditions.push(format!("status = ?{}", idx));
        param_values.push(Box::new(s.clone()));
    }

    let where_clause = if conditions.is_empty() { String::new() } else { format!("WHERE {}", conditions.join(" AND ")) };

    let count_query = format!("SELECT COUNT(*) FROM logistics_requests {}", where_clause);
    let count_refs: Vec<&dyn rusqlite::types::ToSql> = param_values.iter().map(|p| p.as_ref()).collect();
    let total: i64 = conn.query_row(&count_query, count_refs.as_slice(), |row| row.get(0)).map_err(|e| e.to_string())?;

    let (pg, ps, offset) = paginate(page, page_size);

    let data_query = format!(
        "SELECT id, request_type, quantity, action_requested, material_id, status, notes,
                requested_by, status_changed_by, requested_at, status_changed_at, created_at, updated_at
         FROM logistics_requests {} ORDER BY requested_at DESC LIMIT {} OFFSET {}",
        where_clause, ps, offset
    );

    let mut stmt = conn.prepare(&data_query).map_err(|e| e.to_string())?;
    let data_refs: Vec<&dyn rusqlite::types::ToSql> = param_values.iter().map(|p| p.as_ref()).collect();

    let rows = stmt.query_map(data_refs.as_slice(), |row| {
        Ok(LogisticsRequest {
            id: row.get(0)?, request_type: row.get(1)?, quantity: row.get(2)?,
            action_requested: row.get(3)?, material_id: row.get(4)?, status: row.get(5)?,
            notes: row.get(6)?, requested_by: row.get(7)?, status_changed_by: row.get(8)?,
            requested_at: row.get(9)?, status_changed_at: row.get(10)?,
            created_at: row.get(11)?, updated_at: row.get(12)?,
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

    let current_status: String = conn.query_row(
        "SELECT status FROM logistics_requests WHERE id = ?1", params![request_id], |row| row.get(0),
    ).map_err(|_| "Solicitud no encontrada".to_string())?;

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
pub async fn get_pending_requests_count(
    session_token: String, state: State<'_, AppState>,
) -> Result<i32, String> {
    get_session(&session_token, &state).map_err(|e| e.to_string())?;
    let conn = state.db.lock().map_err(|e| format!("Failed to lock database: {}", e))?;
    conn.query_row(
        "SELECT COUNT(*) FROM logistics_requests WHERE status IN ('requested', 'pending')", [], |row| row.get(0),
    ).map_err(|e| e.to_string())
}

// ============================================================================
// REPORTES
// ============================================================================

#[tauri::command]
pub async fn get_logistics_report(
    session_token: String, period_start: String, period_end: String, state: State<'_, AppState>,
) -> Result<LogisticsReport, String> {
    let session = get_session(&session_token, &state).map_err(|e| e.to_string())?;
    match session.role.as_str() { "supervisor" | "admin" => {} _ => return Err("No tienes permisos para generar reportes".to_string()), }

    let conn = state.db.lock().map_err(|e| format!("Failed to lock database: {}", e))?;

    let water_bottles = build_water_bottles_summary(&conn, &period_start, &period_end)?;
    let fuel = build_fuel_summary(&conn, &period_start, &period_end)?;
    let vacuum = build_vacuum_summary(&conn, &period_start, &period_end)?;
    let materials = build_materials_summary(&conn, &period_start, &period_end)?;
    let requests = build_requests_summary(&conn, &period_start, &period_end)?;

    Ok(LogisticsReport { period_start, period_end, water_bottles_summary: water_bottles, fuel_summary: fuel, vacuum_summary: vacuum, materials_summary: materials, requests_summary: requests })
}

// ============================================================================
// Helpers
// ============================================================================

fn get_request_by_id(conn: &rusqlite::Connection, id: &str) -> Result<LogisticsRequest, String> {
    conn.query_row(
        "SELECT id, request_type, quantity, action_requested, material_id, status, notes,
                requested_by, status_changed_by, requested_at, status_changed_at, created_at, updated_at
         FROM logistics_requests WHERE id = ?1", params![id],
        |row| Ok(LogisticsRequest {
            id: row.get(0)?, request_type: row.get(1)?, quantity: row.get(2)?,
            action_requested: row.get(3)?, material_id: row.get(4)?, status: row.get(5)?,
            notes: row.get(6)?, requested_by: row.get(7)?, status_changed_by: row.get(8)?,
            requested_at: row.get(9)?, status_changed_at: row.get(10)?,
            created_at: row.get(11)?, updated_at: row.get(12)?,
        }),
    ).map_err(|e| e.to_string())
}

fn build_water_bottles_summary(conn: &rusqlite::Connection, start: &str, end: &str) -> Result<WaterBottlesSummary, String> {
    let total_entries: i32 = conn.query_row(
        "SELECT COALESCE(SUM(quantity), 0) FROM logistics_water_bottles_movements WHERE movement_type = 'entry' AND created_at BETWEEN ?1 AND ?2",
        params![start, end], |row| row.get(0),
    ).map_err(|e| e.to_string())?;
    let total_exits: i32 = conn.query_row(
        "SELECT COALESCE(SUM(quantity), 0) FROM logistics_water_bottles_movements WHERE movement_type = 'exit' AND created_at BETWEEN ?1 AND ?2",
        params![start, end], |row| row.get(0),
    ).map_err(|e| e.to_string())?;
    Ok(WaterBottlesSummary { total_entries, total_exits, net: total_entries - total_exits })
}

fn build_fuel_summary(conn: &rusqlite::Connection, start: &str, end: &str) -> Result<FuelSummary, String> {
    let total_entries: f64 = conn.query_row(
        "SELECT COALESCE(SUM(amount), 0) FROM logistics_fuel_movements WHERE movement_type = 'entry' AND created_at BETWEEN ?1 AND ?2",
        params![start, end], |row| row.get(0),
    ).map_err(|e| e.to_string())?;
    let total_exits: f64 = conn.query_row(
        "SELECT COALESCE(SUM(amount), 0) FROM logistics_fuel_movements WHERE movement_type = 'exit' AND created_at BETWEEN ?1 AND ?2",
        params![start, end], |row| row.get(0),
    ).map_err(|e| e.to_string())?;
    Ok(FuelSummary { total_entries, total_exits, net: total_entries - total_exits })
}

fn build_vacuum_summary(conn: &rusqlite::Connection, start: &str, end: &str) -> Result<VacuumSummary, String> {
    let total_actions: i32 = conn.query_row(
        "SELECT COUNT(*) FROM logistics_vacuum_actions WHERE created_at BETWEEN ?1 AND ?2",
        params![start, end], |row| row.get(0),
    ).map_err(|e| e.to_string())?;
    Ok(VacuumSummary { total_actions })
}

fn build_materials_summary(conn: &rusqlite::Connection, start: &str, end: &str) -> Result<Vec<MaterialSummary>, String> {
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
            "SELECT COALESCE(SUM(quantity), 0) FROM logistics_materials_movements WHERE material_id = ?1 AND movement_type = 'entry' AND created_at BETWEEN ?2 AND ?3",
            params![id, start, end], |row| row.get(0),
        ).map_err(|e| e.to_string())?;
        let total_exits: f64 = conn.query_row(
            "SELECT COALESCE(SUM(quantity), 0) FROM logistics_materials_movements WHERE material_id = ?1 AND movement_type = 'exit' AND created_at BETWEEN ?2 AND ?3",
            params![id, start, end], |row| row.get(0),
        ).map_err(|e| e.to_string())?;
        summaries.push(MaterialSummary { material_id: id, material_name: name, unit, total_entries, total_exits, net: total_entries - total_exits });
    }
    Ok(summaries)
}

fn build_requests_summary(conn: &rusqlite::Connection, start: &str, end: &str) -> Result<RequestsSummary, String> {
    let total: i32 = conn.query_row("SELECT COUNT(*) FROM logistics_requests WHERE requested_at BETWEEN ?1 AND ?2", params![start, end], |row| row.get(0)).map_err(|e| e.to_string())?;
    let requested: i32 = conn.query_row("SELECT COUNT(*) FROM logistics_requests WHERE status = 'requested' AND requested_at BETWEEN ?1 AND ?2", params![start, end], |row| row.get(0)).map_err(|e| e.to_string())?;
    let pending: i32 = conn.query_row("SELECT COUNT(*) FROM logistics_requests WHERE status = 'pending' AND requested_at BETWEEN ?1 AND ?2", params![start, end], |row| row.get(0)).map_err(|e| e.to_string())?;
    let approved: i32 = conn.query_row("SELECT COUNT(*) FROM logistics_requests WHERE status = 'approved' AND requested_at BETWEEN ?1 AND ?2", params![start, end], |row| row.get(0)).map_err(|e| e.to_string())?;
    let rejected: i32 = conn.query_row("SELECT COUNT(*) FROM logistics_requests WHERE status = 'rejected' AND requested_at BETWEEN ?1 AND ?2", params![start, end], |row| row.get(0)).map_err(|e| e.to_string())?;
    Ok(RequestsSummary { total, requested, pending, approved, rejected })
}
