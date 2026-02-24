use crate::auth::get_session;
use crate::models::incident::*;
use crate::models::user::User;
use crate::notification_helper;
use crate::state::AppState;
use rusqlite::params;
use tauri::State;
use uuid::Uuid;

// ============================================================================
// HELPERS
// ============================================================================

fn paginate(page: Option<i64>, page_size: Option<i64>) -> (i64, i64, i64) {
    let page = page.unwrap_or(1).max(1);
    let page_size = page_size.unwrap_or(20).clamp(1, 100);
    let offset = (page - 1) * page_size;
    (page, page_size, offset)
}

fn total_pages(total: i64, page_size: i64) -> i64 {
    if total == 0 { 0 } else { (total as f64 / page_size as f64).ceil() as i64 }
}

// ============================================================================
// CREATE INCIDENT
// ============================================================================

#[tauri::command]
pub async fn create_incident(
    session_token: String,
    rig_id: String,
    input: CreateIncidentInput,
    state: State<'_, AppState>,
) -> Result<IncidentWithPersonnel, String> {
    let session = get_session(&session_token, &state).map_err(|e| e.to_string())?;

    let mut conn = state.db.lock().map_err(|e| format!("Failed to lock database: {}", e))?;

    // Validate rig access
    let has_access = User::has_rig_access(&conn, &session.user_id, &rig_id)
        .map_err(|e| e.to_string())?;
    if !has_access {
        return Err("No tienes acceso a este taladro".to_string());
    }

    // Validate incident type exists
    let type_exists: bool = conn.query_row(
        "SELECT COUNT(*) > 0 FROM incident_types WHERE id = ?1 AND is_deleted = 0",
        params![input.incident_type],
        |row| row.get(0),
    ).map_err(|e| e.to_string())?;
    if !type_exists {
        return Err(format!("Tipo de incidencia inválido: {}", input.incident_type));
    }

    // Validate description is not empty
    let description = input.description.trim().to_string();
    if description.is_empty() {
        return Err("La descripción de la incidencia es requerida".to_string());
    }

    let id = Uuid::new_v4().to_string();
    let now = chrono::Utc::now().to_rfc3339();

    // --- BEGIN TRANSACTION ---
    let tx = conn.transaction().map_err(|e| e.to_string())?;

    // Insert incident
    tx.execute(
        "INSERT INTO incidents (id, rig_id, incident_type, description, created_by, created_at, updated_at)
         VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7)",
        params![id, rig_id, input.incident_type, description, session.user_id, now, now],
    ).map_err(|e| e.to_string())?;

    // Insert involved personnel
    let mut personnel_list: Vec<IncidentPersonnelInfo> = Vec::new();
    for personnel_id in &input.personnel_ids {
        let ip_id = Uuid::new_v4().to_string();
        tx.execute(
            "INSERT INTO incident_personnel (id, incident_id, personnel_id, created_at, updated_at)
             VALUES (?1, ?2, ?3, ?4, ?5)",
            params![ip_id, id, personnel_id, now, now],
        ).map_err(|e| e.to_string())?;

        // Resolve personnel name
        let info = tx.query_row(
            "SELECT name, ci, default_position FROM rig_personnel WHERE id = ?1",
            params![personnel_id],
            |row| Ok(IncidentPersonnelInfo {
                id: ip_id.clone(),
                personnel_id: personnel_id.clone(),
                name: row.get(0)?,
                ci: row.get(1)?,
                position: row.get(2)?,
            }),
        ).map_err(|e| format!("Personal no encontrado ({}): {}", personnel_id, e))?;

        personnel_list.push(info);
    }

    tx.commit().map_err(|e| e.to_string())?;
    // --- END TRANSACTION ---

    // Resolve creator name
    let created_by_name: Option<String> = conn.query_row(
        "SELECT full_name FROM users WHERE id = ?1",
        params![session.user_id],
        |row| row.get(0),
    ).ok();

    // --- Notification: incident created ---
    notification_helper::notify_action(
        &conn, &session, "incident", "incident_created",
        "Nueva incidencia registrada",
        "Se registró una nueva incidencia",
        Some(&id), Some("incident"), Some(&rig_id),
    );

    Ok(IncidentWithPersonnel {
        incident: Incident {
            id,
            rig_id,
            incident_type: input.incident_type,
            description,
            created_by: session.user_id,
            created_by_name,
            created_at: now.clone(),
            updated_at: now,
        },
        personnel: personnel_list,
    })
}

// ============================================================================
// LIST INCIDENTS (with role-based filtering)
// ============================================================================

#[tauri::command]
pub async fn list_incidents(
    session_token: String,
    rig_id: String,
    incident_type: Option<String>,
    page: Option<i64>,
    page_size: Option<i64>,
    state: State<'_, AppState>,
) -> Result<PaginatedIncidents, String> {
    let session = get_session(&session_token, &state).map_err(|e| e.to_string())?;

    let conn = state.db.lock().map_err(|e| format!("Failed to lock database: {}", e))?;

    // Validate rig access
    let has_access = User::has_rig_access(&conn, &session.user_id, &rig_id)
        .map_err(|e| e.to_string())?;
    if !has_access {
        return Err("No tienes acceso a este taladro".to_string());
    }

    // Build WHERE clause based on role
    // Operator: only see own incidents
    // Supervisor/Admin: see all incidents in the rig
    let is_operator = session.role == "operator";

    let mut where_clauses = vec![
        "i.rig_id = ?1".to_string(),
        "i.is_deleted = 0".to_string(),
    ];
    let mut count_params: Vec<Box<dyn rusqlite::ToSql>> = vec![Box::new(rig_id.clone())];

    if is_operator {
        where_clauses.push(format!("i.created_by = ?{}", count_params.len() + 1));
        count_params.push(Box::new(session.user_id.clone()));
    }

    if let Some(ref itype) = incident_type {
        if !itype.is_empty() {
            where_clauses.push(format!("i.incident_type = ?{}", count_params.len() + 1));
            count_params.push(Box::new(itype.clone()));
        }
    }

    let where_sql = where_clauses.join(" AND ");

    // Count total
    let count_sql = format!("SELECT COUNT(*) FROM incidents i WHERE {}", where_sql);
    let count_refs: Vec<&dyn rusqlite::ToSql> = count_params.iter().map(|p| p.as_ref()).collect();
    let total: i64 = conn
        .query_row(&count_sql, count_refs.as_slice(), |row| row.get(0))
        .map_err(|e| e.to_string())?;

    let (pg, ps, offset) = paginate(page, page_size);

    // Query with pagination
    let query_sql = format!(
        "SELECT i.id, i.rig_id, i.incident_type, i.description, i.created_by, u.full_name, i.created_at, i.updated_at
         FROM incidents i
         LEFT JOIN users u ON u.id = i.created_by
         WHERE {}
         ORDER BY i.created_at DESC
         LIMIT ?{} OFFSET ?{}",
        where_sql,
        count_params.len() + 1,
        count_params.len() + 2,
    );

    let mut query_params: Vec<Box<dyn rusqlite::ToSql>> = count_params
        .into_iter()
        .collect();
    query_params.push(Box::new(ps));
    query_params.push(Box::new(offset));

    let query_refs: Vec<&dyn rusqlite::ToSql> = query_params.iter().map(|p| p.as_ref()).collect();

    let mut stmt = conn.prepare(&query_sql).map_err(|e| e.to_string())?;
    let rows = stmt
        .query_map(query_refs.as_slice(), |row| {
            Ok(Incident {
                id: row.get(0)?,
                rig_id: row.get(1)?,
                incident_type: row.get(2)?,
                description: row.get(3)?,
                created_by: row.get(4)?,
                created_by_name: row.get(5)?,
                created_at: row.get(6)?,
                updated_at: row.get(7)?,
            })
        })
        .map_err(|e| e.to_string())?;

    let mut data = Vec::new();
    for row in rows {
        data.push(row.map_err(|e| e.to_string())?);
    }

    Ok(PaginatedIncidents {
        data,
        total,
        page: pg,
        page_size: ps,
        total_pages: total_pages(total, ps),
    })
}

// ============================================================================
// GET INCIDENT DETAIL (with personnel)
// ============================================================================

#[tauri::command]
pub async fn get_incident(
    session_token: String,
    incident_id: String,
    state: State<'_, AppState>,
) -> Result<IncidentWithPersonnel, String> {
    let session = get_session(&session_token, &state).map_err(|e| e.to_string())?;

    let conn = state.db.lock().map_err(|e| format!("Failed to lock database: {}", e))?;

    // Load the incident
    let incident = conn.query_row(
        "SELECT i.id, i.rig_id, i.incident_type, i.description, i.created_by, u.full_name, i.created_at, i.updated_at
         FROM incidents i
         LEFT JOIN users u ON u.id = i.created_by
         WHERE i.id = ?1 AND i.is_deleted = 0",
        params![incident_id],
        |row| Ok(Incident {
            id: row.get(0)?,
            rig_id: row.get(1)?,
            incident_type: row.get(2)?,
            description: row.get(3)?,
            created_by: row.get(4)?,
            created_by_name: row.get(5)?,
            created_at: row.get(6)?,
            updated_at: row.get(7)?,
        }),
    ).map_err(|_| "Incidencia no encontrada".to_string())?;

    // Validate rig access
    let has_access = User::has_rig_access(&conn, &session.user_id, &incident.rig_id)
        .map_err(|e| e.to_string())?;
    if !has_access {
        return Err("No tienes acceso a este taladro".to_string());
    }

    // Operator can only see own incidents
    if session.role == "operator" && incident.created_by != session.user_id {
        return Err("No tienes permisos para ver esta incidencia".to_string());
    }

    // Load involved personnel
    let mut stmt = conn.prepare(
        "SELECT ip.id, ip.personnel_id, rp.name, rp.ci, rp.default_position
         FROM incident_personnel ip
         JOIN rig_personnel rp ON rp.id = ip.personnel_id
         WHERE ip.incident_id = ?1
         ORDER BY rp.name"
    ).map_err(|e| e.to_string())?;

    let personnel = stmt
        .query_map(params![incident_id], |row| {
            Ok(IncidentPersonnelInfo {
                id: row.get(0)?,
                personnel_id: row.get(1)?,
                name: row.get(2)?,
                ci: row.get(3)?,
                position: row.get(4)?,
            })
        })
        .map_err(|e| e.to_string())?
        .collect::<Result<Vec<_>, _>>()
        .map_err(|e| e.to_string())?;

    Ok(IncidentWithPersonnel { incident, personnel })
}

// ============================================================================
// DELETE INCIDENT (soft delete, role-based)
// ============================================================================

#[tauri::command]
pub async fn delete_incident(
    session_token: String,
    incident_id: String,
    state: State<'_, AppState>,
) -> Result<(), String> {
    let session = get_session(&session_token, &state).map_err(|e| e.to_string())?;

    let conn = state.db.lock().map_err(|e| format!("Failed to lock database: {}", e))?;

    // Load incident to check ownership and rig access
    let (rig_id, created_by): (String, String) = conn.query_row(
        "SELECT rig_id, created_by FROM incidents WHERE id = ?1 AND is_deleted = 0",
        params![incident_id],
        |row| Ok((row.get(0)?, row.get(1)?)),
    ).map_err(|_| "Incidencia no encontrada".to_string())?;

    // Validate rig access
    let has_access = User::has_rig_access(&conn, &session.user_id, &rig_id)
        .map_err(|e| e.to_string())?;
    if !has_access {
        return Err("No tienes acceso a este taladro".to_string());
    }

    // Operator can only delete own incidents
    if session.role == "operator" && created_by != session.user_id {
        return Err("Solo puedes eliminar tus propias incidencias".to_string());
    }

    let now = chrono::Utc::now().to_rfc3339();
    let affected = conn
        .execute(
            "UPDATE incidents SET is_deleted = 1, updated_at = ?1 WHERE id = ?2 AND is_deleted = 0",
            params![now, incident_id],
        )
        .map_err(|e| e.to_string())?;

    if affected == 0 {
        return Err("Incidencia no encontrada".to_string());
    }

    Ok(())
}
