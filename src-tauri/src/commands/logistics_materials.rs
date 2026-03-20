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

fn material_category(material_id: &str) -> String {
    format!("material:{}", material_id)
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

// ============================================================================
// Catálogo de materiales (GLOBAL — sin rig_id)
// ============================================================================

#[tauri::command]
pub async fn create_material(
    session_token: String,
    input: CreateMaterial,
    state: State<'_, AppState>,
) -> Result<Material, String> {
    let session = get_session(&session_token, &state).map_err(|e| e.to_string())?;

    match session.role.as_str() {
        "supervisor" | "admin" => {}
        _ => return Err("No tienes permisos para crear materiales".to_string()),
    }
    let name = input.name.trim().to_lowercase();
    let unit = input.unit.trim().to_lowercase();
    let description = input.description.map(|d| d.trim().to_string()).filter(|d| !d.is_empty());

    if name.is_empty() { return Err("El nombre del material es requerido".to_string()); }
    if unit.is_empty() { return Err("La unidad de medida es requerida".to_string()); }

    let conn = state.db.lock().map_err(|e| format!("Failed to lock database: {}", e))?;

    let exists: bool = conn.query_row(
        "SELECT COUNT(*) > 0 FROM logistics_materials WHERE LOWER(name) = ?1 AND is_deleted = 0",
        params![name], |row| row.get(0),
    ).map_err(|e| e.to_string())?;

    if exists {
        return Err(format!("Ya existe un material con el nombre '{}'", name));
    }

    let id = Uuid::new_v4().to_string();
    let now = chrono::Utc::now().to_rfc3339();

    conn.execute(
        "INSERT INTO logistics_materials (id, name, unit, description, active, created_by, created_at, updated_at)
         VALUES (?1, ?2, ?3, ?4, 1, ?5, ?6, ?7)",
        params![id, name, unit, description, session.user_id, now, now],
    ).map_err(|e| e.to_string())?;

    Ok(Material {
        id, name, unit, description, active: true,
        created_by: Some(session.user_id), created_at: now.clone(), updated_at: now,
    })
}

#[tauri::command]
pub async fn list_materials(
    session_token: String,
    active_only: Option<bool>,
    state: State<'_, AppState>,
) -> Result<Vec<Material>, String> {
    get_session(&session_token, &state).map_err(|e| e.to_string())?;
    let conn = state.db.lock().map_err(|e| format!("Failed to lock database: {}", e))?;

    let query = if active_only.unwrap_or(true) {
        "SELECT id, name, unit, description, active, created_by, created_at, updated_at
         FROM logistics_materials WHERE active = 1 AND is_deleted = 0 ORDER BY name ASC"
    } else {
        "SELECT id, name, unit, description, active, created_by, created_at, updated_at
         FROM logistics_materials WHERE is_deleted = 0 ORDER BY name ASC"
    };

    let mut stmt = conn.prepare(query).map_err(|e| e.to_string())?;
    let rows = stmt.query_map([], |row| {
        Ok(Material {
            id: row.get(0)?, name: row.get(1)?, unit: row.get(2)?, description: row.get(3)?,
            active: row.get(4)?, created_by: row.get(5)?, created_at: row.get(6)?, updated_at: row.get(7)?,
        })
    }).map_err(|e| e.to_string())?;

    let mut result = Vec::new();
    for row in rows { result.push(row.map_err(|e| e.to_string())?); }
    Ok(result)
}

#[tauri::command]
pub async fn update_material(
    session_token: String, material_id: String, input: UpdateMaterial, state: State<'_, AppState>,
) -> Result<Material, String> {
    let session = get_session(&session_token, &state).map_err(|e| e.to_string())?;
    match session.role.as_str() { "supervisor" | "admin" => {} _ => return Err("No tienes permisos para editar materiales".to_string()), }

    let conn = state.db.lock().map_err(|e| format!("Failed to lock database: {}", e))?;
    let now = chrono::Utc::now().to_rfc3339();
    let mut updates = Vec::new();
    let mut param_values: Vec<Box<dyn rusqlite::types::ToSql>> = Vec::new();
    let mut idx = 1;

    if let Some(ref name) = input.name {
        if name.trim().is_empty() { return Err("El nombre no puede estar vacío".to_string()); }
        updates.push(format!("name = ?{}", idx)); param_values.push(Box::new(name.trim().to_string())); idx += 1;
    }
    if let Some(ref unit) = input.unit { updates.push(format!("unit = ?{}", idx)); param_values.push(Box::new(unit.clone())); idx += 1; }
    if let Some(ref desc) = input.description { updates.push(format!("description = ?{}", idx)); param_values.push(Box::new(desc.clone())); idx += 1; }
    if let Some(active) = input.active { updates.push(format!("active = ?{}", idx)); param_values.push(Box::new(active)); idx += 1; }

    if updates.is_empty() { return Err("No hay campos para actualizar".to_string()); }

    updates.push(format!("updated_at = ?{}", idx)); param_values.push(Box::new(now)); idx += 1;
    param_values.push(Box::new(material_id.clone()));

    let query = format!("UPDATE logistics_materials SET {} WHERE id = ?{}", updates.join(", "), idx);
    let params_refs: Vec<&dyn rusqlite::types::ToSql> = param_values.iter().map(|p| p.as_ref()).collect();
    let affected = conn.execute(&query, params_refs.as_slice()).map_err(|e| e.to_string())?;
    if affected == 0 { return Err("Material no encontrado".to_string()); }

    conn.query_row(
        "SELECT id, name, unit, description, active, created_by, created_at, updated_at FROM logistics_materials WHERE id = ?1",
        params![material_id],
        |row| Ok(Material {
            id: row.get(0)?, name: row.get(1)?, unit: row.get(2)?, description: row.get(3)?,
            active: row.get(4)?, created_by: row.get(5)?, created_at: row.get(6)?, updated_at: row.get(7)?,
        }),
    ).map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn delete_material(
    session_token: String, material_id: String, state: State<'_, AppState>,
) -> Result<(), String> {
    let session = get_session(&session_token, &state).map_err(|e| e.to_string())?;
    if session.role != "admin" {
        return Err("Solo administradores pueden eliminar materiales".to_string());
    }

    let conn = state.db.lock().map_err(|e| format!("Failed to lock database: {}", e))?;

    let now = chrono::Utc::now().to_rfc3339();
    let affected = conn.execute(
        "UPDATE logistics_materials SET is_deleted = 1, updated_at = ?1 WHERE id = ?2 AND is_deleted = 0",
        params![now, material_id],
    ).map_err(|e| e.to_string())?;
    if affected == 0 { return Err("Material no encontrado".to_string()); }

    // Also soft-delete all movements for this material
    conn.execute(
        "UPDATE logistics_materials_movements SET is_deleted = 1, updated_at = ?1 WHERE material_id = ?2 AND is_deleted = 0",
        params![now, material_id],
    ).map_err(|e| e.to_string())?;

    // Clean up stock cache entries for this material across all rigs
    let cat = material_category(&material_id);
    conn.execute("DELETE FROM logistics_stock WHERE category = ?1", params![cat]).map_err(|e| e.to_string())?;

    Ok(())
}

// ============================================================================
// Movimientos de materiales (CON rig_id)
// ============================================================================

#[tauri::command]
pub async fn create_material_movement(
    session_token: String, rig_id: String, movement: CreateMaterialMovement, state: State<'_, AppState>,
) -> Result<MaterialMovement, String> {
    let session = get_session(&session_token, &state).map_err(|e| e.to_string())?;

    let mut conn = state.db.lock().map_err(|e| format!("Failed to lock database: {}", e))?;
    let has_access = User::has_rig_access(&conn, &session.user_id, &rig_id).map_err(|e| e.to_string())?;
    if !has_access {
        return Err("No tienes acceso a este taladro".to_string());
    }

    match movement.movement_type.as_str() { "entry" | "exit" => {} _ => return Err(format!("Tipo de movimiento inválido: {}", movement.movement_type)), }
    if movement.quantity <= 0.0 { return Err("La cantidad debe ser mayor a 0".to_string()); }

    let active: bool = conn.query_row(
        "SELECT active FROM logistics_materials WHERE id = ?1 AND is_deleted = 0", params![movement.material_id], |row| row.get(0),
    ).map_err(|_| "Material no encontrado".to_string())?;
    if !active { return Err("El material está desactivado".to_string()); }

    let id = Uuid::new_v4().to_string();
    let now = chrono::Utc::now().to_rfc3339();
    let cat = material_category(&movement.material_id);
    let delta = if movement.movement_type == "entry" { movement.quantity } else { -movement.quantity };

    let tx = conn.transaction().map_err(|e| e.to_string())?;

    // Validate stock for exit movements
    if movement.movement_type == "exit" {
        let current_stock = read_cached_stock(&tx, &rig_id, &cat)?;
        if movement.quantity > current_stock {
            let mat_name: String = tx.query_row(
                "SELECT name FROM logistics_materials WHERE id = ?1", params![movement.material_id], |row| row.get(0),
            ).unwrap_or_else(|_| "Desconocido".to_string());
            return Err(format!("Stock insuficiente de {}. Stock actual: {:.2}, intentando retirar: {:.2}", mat_name, current_stock, movement.quantity));
        }
    }

    tx.execute(
        "INSERT INTO logistics_materials_movements (id, rig_id, material_id, movement_type, quantity, notes, created_by, created_at, updated_at)
         VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9)",
        params![id, rig_id, movement.material_id, movement.movement_type, movement.quantity, movement.notes, session.user_id, now, now],
    ).map_err(|e| e.to_string())?;

    adjust_cached_stock(&tx, &rig_id, &cat, delta)?;
    tx.commit().map_err(|e| e.to_string())?;

    Ok(MaterialMovement {
        id, rig_id: Some(rig_id), material_id: movement.material_id, movement_type: movement.movement_type,
        quantity: movement.quantity, notes: movement.notes, created_by: Some(session.user_id), created_at: now,
    })
}

#[tauri::command]
pub async fn get_material_movements(
    session_token: String,
    rig_id: String,
    material_id: Option<String>,
    page: Option<i64>,
    page_size: Option<i64>,
    state: State<'_, AppState>,
) -> Result<PaginatedResponse<MaterialMovement>, String> {
    let session = get_session(&session_token, &state).map_err(|e| e.to_string())?;

    let conn = state.db.lock().map_err(|e| format!("Failed to lock database: {}", e))?;
    let has_access = User::has_rig_access(&conn, &session.user_id, &rig_id).map_err(|e| e.to_string())?;
    if !has_access {
        return Err("No tienes acceso a este taladro".to_string());
    }

    let mut conditions = vec!["rig_id = ?1".to_string(), "is_deleted = 0".to_string()];
    let mut param_values: Vec<Box<dyn rusqlite::types::ToSql>> = vec![Box::new(rig_id.clone())];
    let mut idx = 2;

    if let Some(ref mid) = material_id {
        conditions.push(format!("material_id = ?{}", idx));
        param_values.push(Box::new(mid.clone()));
        idx += 1;
    }
    let _ = idx;

    let where_clause = format!("WHERE {}", conditions.join(" AND "));

    let count_query = format!("SELECT COUNT(*) FROM logistics_materials_movements {}", where_clause);
    let count_refs: Vec<&dyn rusqlite::types::ToSql> = param_values.iter().map(|p| p.as_ref()).collect();
    let total: i64 = conn.query_row(&count_query, count_refs.as_slice(), |row| row.get(0)).map_err(|e| e.to_string())?;

    let (pg, ps, offset) = paginate(page, page_size);

    let data_query = format!(
        "SELECT id, rig_id, material_id, movement_type, quantity, notes, created_by, created_at
         FROM logistics_materials_movements {} ORDER BY created_at DESC LIMIT {} OFFSET {}",
        where_clause, ps, offset
    );

    let mut stmt = conn.prepare(&data_query).map_err(|e| e.to_string())?;
    let data_refs: Vec<&dyn rusqlite::types::ToSql> = param_values.iter().map(|p| p.as_ref()).collect();

    let rows = stmt.query_map(data_refs.as_slice(), |row| {
        Ok(MaterialMovement {
            id: row.get(0)?, rig_id: row.get(1)?, material_id: row.get(2)?, movement_type: row.get(3)?,
            quantity: row.get(4)?, notes: row.get(5)?, created_by: row.get(6)?, created_at: row.get(7)?,
        })
    }).map_err(|e| e.to_string())?;

    let mut data = Vec::new();
    for row in rows { data.push(row.map_err(|e| e.to_string())?); }

    Ok(PaginatedResponse { data, total, page: pg, page_size: ps, total_pages: total_pages(total, ps) })
}

#[tauri::command]
pub async fn delete_material_movement(
    session_token: String, movement_id: String, state: State<'_, AppState>,
) -> Result<(), String> {
    let session = get_session(&session_token, &state).map_err(|e| e.to_string())?;
    match session.role.as_str() { "supervisor" | "admin" => {} _ => return Err("No tienes permisos para eliminar movimientos".to_string()), }

    let mut conn = state.db.lock().map_err(|e| format!("Failed to lock database: {}", e))?;

    let (rig_id, mat_id, movement_type, quantity): (Option<String>, String, String, f64) = conn.query_row(
        "SELECT rig_id, material_id, movement_type, quantity FROM logistics_materials_movements WHERE id = ?1 AND is_deleted = 0",
        params![movement_id],
        |row| Ok((row.get(0)?, row.get(1)?, row.get(2)?, row.get(3)?)),
    ).map_err(|_| "Movimiento no encontrado".to_string())?;

    if let Some(ref rid) = rig_id {
        let has_access = User::has_rig_access(&conn, &session.user_id, rid).map_err(|e| e.to_string())?;
        if !has_access {
            return Err("No tienes acceso a este taladro".to_string());
        }
    }

    let tx = conn.transaction().map_err(|e| e.to_string())?;

    let now_del = chrono::Utc::now().to_rfc3339();
    let affected = tx.execute(
        "UPDATE logistics_materials_movements SET is_deleted = 1, updated_at = ?1 WHERE id = ?2 AND is_deleted = 0",
        params![now_del, movement_id],
    ).map_err(|e| e.to_string())?;
    if affected == 0 { return Err("Movimiento no encontrado".to_string()); }

    if let Some(ref rid) = rig_id {
        let cat = material_category(&mat_id);
        let reverse_delta = if movement_type == "entry" { -quantity } else { quantity };
        adjust_cached_stock(&tx, rid, &cat, reverse_delta)?;
    }

    tx.commit().map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
pub async fn get_material_stock(
    session_token: String,
    rig_id: String,
    material_id: String,
    state: State<'_, AppState>,
) -> Result<f64, String> {
    let session = get_session(&session_token, &state).map_err(|e| e.to_string())?;

    let conn = state.db.lock().map_err(|e| format!("Failed to lock database: {}", e))?;
    let has_access = User::has_rig_access(&conn, &session.user_id, &rig_id).map_err(|e| e.to_string())?;
    if !has_access {
        return Err("No tienes acceso a este taladro".to_string());
    }

    let cat = material_category(&material_id);
    let stock = read_cached_stock(&conn, &rig_id, &cat)?;
    Ok(stock)
}
