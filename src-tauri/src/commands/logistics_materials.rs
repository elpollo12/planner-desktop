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

// --- Catálogo de materiales ---

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
    if input.name.trim().is_empty() { return Err("El nombre del material es requerido".to_string()); }
    if input.unit.trim().is_empty() { return Err("La unidad de medida es requerida".to_string()); }

    let conn = state.db.lock().map_err(|e| format!("Failed to lock database: {}", e))?;
    let id = Uuid::new_v4().to_string();
    let now = chrono::Utc::now().to_rfc3339();

    conn.execute(
        "INSERT INTO logistics_materials (id, name, unit, description, active, created_by, created_at, updated_at)
         VALUES (?1, ?2, ?3, ?4, 1, ?5, ?6, ?7)",
        params![id, input.name.trim(), input.unit.trim(), input.description, session.user_id, now, now],
    ).map_err(|e| e.to_string())?;

    Ok(Material {
        id, name: input.name.trim().to_string(), unit: input.unit.trim().to_string(),
        description: input.description, active: true, created_by: Some(session.user_id),
        created_at: now.clone(), updated_at: now,
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
         FROM logistics_materials WHERE active = 1 ORDER BY name ASC"
    } else {
        "SELECT id, name, unit, description, active, created_by, created_at, updated_at
         FROM logistics_materials ORDER BY name ASC"
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
    match session.role.as_str() { "admin" => {} _ => return Err("Solo administradores pueden eliminar materiales".to_string()), }

    let conn = state.db.lock().map_err(|e| format!("Failed to lock database: {}", e))?;
    let affected = conn.execute("DELETE FROM logistics_materials WHERE id = ?1", params![material_id]).map_err(|e| e.to_string())?;
    if affected == 0 { return Err("Material no encontrado".to_string()); }
    Ok(())
}

// --- Movimientos de materiales (paginados) ---

#[tauri::command]
pub async fn create_material_movement(
    session_token: String, movement: CreateMaterialMovement, state: State<'_, AppState>,
) -> Result<MaterialMovement, String> {
    let session = get_session(&session_token, &state).map_err(|e| e.to_string())?;

    match movement.movement_type.as_str() { "entry" | "exit" => {} _ => return Err(format!("Tipo de movimiento inválido: {}", movement.movement_type)), }
    if movement.quantity <= 0.0 { return Err("La cantidad debe ser mayor a 0".to_string()); }

    let conn = state.db.lock().map_err(|e| format!("Failed to lock database: {}", e))?;

    let active: bool = conn.query_row(
        "SELECT active FROM logistics_materials WHERE id = ?1", params![movement.material_id], |row| row.get(0),
    ).map_err(|_| "Material no encontrado".to_string())?;
    if !active { return Err("El material está desactivado".to_string()); }

    let id = Uuid::new_v4().to_string();
    let now = chrono::Utc::now().to_rfc3339();

    conn.execute(
        "INSERT INTO logistics_materials_movements (id, material_id, movement_type, quantity, notes, created_by, created_at)
         VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7)",
        params![id, movement.material_id, movement.movement_type, movement.quantity, movement.notes, session.user_id, now],
    ).map_err(|e| e.to_string())?;

    Ok(MaterialMovement {
        id, material_id: movement.material_id, movement_type: movement.movement_type,
        quantity: movement.quantity, notes: movement.notes, created_by: Some(session.user_id), created_at: now,
    })
}

#[tauri::command]
pub async fn get_material_movements(
    session_token: String,
    material_id: Option<String>,
    page: Option<i64>,
    page_size: Option<i64>,
    state: State<'_, AppState>,
) -> Result<PaginatedResponse<MaterialMovement>, String> {
    get_session(&session_token, &state).map_err(|e| e.to_string())?;
    let conn = state.db.lock().map_err(|e| format!("Failed to lock database: {}", e))?;

    let (count_query, data_query, params_vec): (String, String, Vec<Box<dyn rusqlite::types::ToSql>>) =
        if let Some(ref mid) = material_id {
            (
                "SELECT COUNT(*) FROM logistics_materials_movements WHERE material_id = ?1".to_string(),
                "SELECT id, material_id, movement_type, quantity, notes, created_by, created_at
                 FROM logistics_materials_movements WHERE material_id = ?1 ORDER BY created_at DESC".to_string(),
                vec![Box::new(mid.clone()) as Box<dyn rusqlite::types::ToSql>],
            )
        } else {
            (
                "SELECT COUNT(*) FROM logistics_materials_movements".to_string(),
                "SELECT id, material_id, movement_type, quantity, notes, created_by, created_at
                 FROM logistics_materials_movements ORDER BY created_at DESC".to_string(),
                vec![],
            )
        };

    let count_refs: Vec<&dyn rusqlite::types::ToSql> = params_vec.iter().map(|p| p.as_ref()).collect();
    let total: i64 = conn.query_row(&count_query, count_refs.as_slice(), |row| row.get(0)).map_err(|e| e.to_string())?;

    let (pg, ps, offset) = paginate(page, page_size);

    let paginated_query = format!("{} LIMIT {} OFFSET {}", data_query, ps, offset);
    let mut stmt = conn.prepare(&paginated_query).map_err(|e| e.to_string())?;

    let data_refs: Vec<&dyn rusqlite::types::ToSql> = params_vec.iter().map(|p| p.as_ref()).collect();
    let rows = stmt.query_map(data_refs.as_slice(), |row| {
        Ok(MaterialMovement {
            id: row.get(0)?, material_id: row.get(1)?, movement_type: row.get(2)?,
            quantity: row.get(3)?, notes: row.get(4)?, created_by: row.get(5)?, created_at: row.get(6)?,
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

    let conn = state.db.lock().map_err(|e| format!("Failed to lock database: {}", e))?;
    let affected = conn.execute("DELETE FROM logistics_materials_movements WHERE id = ?1", params![movement_id]).map_err(|e| e.to_string())?;
    if affected == 0 { return Err("Movimiento no encontrado".to_string()); }
    Ok(())
}
