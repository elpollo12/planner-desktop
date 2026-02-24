use crate::auth::{check_permission, get_session};
use crate::models::notification::{Notification, PaginatedNotifications};
use crate::models::user::{User, UserRole};
use crate::state::AppState;
use rusqlite::params;
use tauri::State;

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

fn row_to_notification(row: &rusqlite::Row) -> rusqlite::Result<Notification> {
    Ok(Notification {
        id: row.get(0)?,
        recipient_id: row.get(1)?,
        actor_id: row.get(2)?,
        actor_name: row.get(3)?,
        category: row.get(4)?,
        action_type: row.get(5)?,
        title: row.get(6)?,
        message: row.get(7)?,
        reference_id: row.get(8)?,
        reference_type: row.get(9)?,
        rig_id: row.get(10)?,
        rig_name: row.get(11)?,
        is_read: row.get::<_, i32>(12)? == 1,
        read_at: row.get(13)?,
        created_at: row.get(14)?,
        updated_at: row.get(15)?,
    })
}

const SELECT_COLUMNS: &str =
    "n.id, n.recipient_id, n.actor_id, n.actor_name, n.category, n.action_type, n.title, n.message,
     n.reference_id, n.reference_type, n.rig_id, n.rig_name, n.is_read, n.read_at, n.created_at, n.updated_at";

/// Rig access mode for the current user.
/// - `All`: admin or has_all_rigs — no filtering needed
/// - `Specific(Vec<String>)`: only these rig IDs are allowed
/// - `NoneAssigned`: no rigs assigned — only see notifications without rig_id
enum RigAccess {
    All,
    Specific(Vec<String>),
    NoneAssigned,
}

fn get_rig_access(conn: &rusqlite::Connection, user_id: &str) -> Result<RigAccess, String> {
    let user = User::get_by_id(conn, user_id).map_err(|e| e.to_string())?;

    if user.role == "admin" || user.has_all_rigs {
        return Ok(RigAccess::All);
    }

    let rig_ids = User::get_assigned_rig_ids(conn, user_id).map_err(|e| e.to_string())?;

    if rig_ids.is_empty() {
        Ok(RigAccess::NoneAssigned)
    } else {
        Ok(RigAccess::Specific(rig_ids))
    }
}

/// Append rig-access condition and parameters to the given vectors.
/// Uses table alias "n" for SELECT queries.
fn append_rig_filter_select(
    access: &RigAccess,
    conditions: &mut Vec<String>,
    param_values: &mut Vec<Box<dyn rusqlite::types::ToSql>>,
    idx: &mut usize,
) {
    match access {
        RigAccess::All => { /* No filter */ }
        RigAccess::NoneAssigned => {
            conditions.push("n.rig_id IS NULL".to_string());
        }
        RigAccess::Specific(rig_ids) => {
            let placeholders: Vec<String> = rig_ids.iter().enumerate()
                .map(|(i, _)| format!("?{}", *idx + i))
                .collect();
            conditions.push(format!(
                "(n.rig_id IS NULL OR n.rig_id IN ({}))",
                placeholders.join(", ")
            ));
            for rig_id in rig_ids {
                param_values.push(Box::new(rig_id.clone()));
            }
            *idx += rig_ids.len();
        }
    }
}

// ============================================================================
// LIST NOTIFICATIONS (paginated, filtered, rig-access aware)
// ============================================================================

#[tauri::command]
pub async fn list_notifications(
    session_token: String,
    category: Option<String>,
    is_read: Option<bool>,
    page: Option<i64>,
    page_size: Option<i64>,
    state: State<'_, AppState>,
) -> Result<PaginatedNotifications, String> {
    let session = get_session(&session_token, &state).map_err(|e| e.to_string())?;

    let conn = state.db.lock().map_err(|e| format!("Failed to lock database: {}", e))?;

    let access = get_rig_access(&conn, &session.user_id)?;

    // --- Build WHERE for the main list query ---
    let mut conditions = vec![
        "n.recipient_id = ?1".to_string(),
        "n.is_deleted = 0".to_string(),
    ];
    let mut param_values: Vec<Box<dyn rusqlite::types::ToSql>> = vec![
        Box::new(session.user_id.clone()),
    ];
    let mut idx: usize = 2;

    if let Some(ref cat) = category {
        if !cat.is_empty() {
            conditions.push(format!("n.category = ?{}", idx));
            param_values.push(Box::new(cat.clone()));
            idx += 1;
        }
    }

    if let Some(read) = is_read {
        conditions.push(format!("n.is_read = ?{}", idx));
        param_values.push(Box::new(if read { 1 } else { 0 }));
        idx += 1;
    }

    append_rig_filter_select(&access, &mut conditions, &mut param_values, &mut idx);

    let where_clause = format!("WHERE {}", conditions.join(" AND "));

    // Count total
    let count_query = format!("SELECT COUNT(*) FROM notifications n {}", where_clause);
    let count_refs: Vec<&dyn rusqlite::types::ToSql> = param_values.iter().map(|p| p.as_ref()).collect();
    let total: i64 = conn
        .query_row(&count_query, count_refs.as_slice(), |row| row.get(0))
        .map_err(|e| e.to_string())?;

    // --- Count unread (separate query with same rig filter but no category/isRead) ---
    let mut unread_conditions = vec![
        "n.recipient_id = ?1".to_string(),
        "n.is_read = 0".to_string(),
        "n.is_deleted = 0".to_string(),
    ];
    let mut unread_params: Vec<Box<dyn rusqlite::types::ToSql>> = vec![
        Box::new(session.user_id.clone()),
    ];
    let mut unread_idx: usize = 2;
    append_rig_filter_select(&access, &mut unread_conditions, &mut unread_params, &mut unread_idx);

    let unread_where = format!("WHERE {}", unread_conditions.join(" AND "));
    let unread_query = format!("SELECT COUNT(*) FROM notifications n {}", unread_where);
    let unread_refs: Vec<&dyn rusqlite::types::ToSql> = unread_params.iter().map(|p| p.as_ref()).collect();
    let unread_count: i64 = conn
        .query_row(&unread_query, unread_refs.as_slice(), |row| row.get(0))
        .map_err(|e| e.to_string())?;

    // --- Paginated data query ---
    let (pg, ps, offset) = paginate(page, page_size);
    let data_query = format!(
        "SELECT {} FROM notifications n {} ORDER BY n.created_at DESC LIMIT {} OFFSET {}",
        SELECT_COLUMNS, where_clause, ps, offset
    );
    let data_refs: Vec<&dyn rusqlite::types::ToSql> = param_values.iter().map(|p| p.as_ref()).collect();

    let mut stmt = conn.prepare(&data_query).map_err(|e| e.to_string())?;
    let rows = stmt
        .query_map(data_refs.as_slice(), row_to_notification)
        .map_err(|e| e.to_string())?;

    let mut data = Vec::new();
    for row in rows {
        data.push(row.map_err(|e| e.to_string())?);
    }

    Ok(PaginatedNotifications {
        data,
        total,
        page: pg,
        page_size: ps,
        total_pages: total_pages(total, ps),
        unread_count,
    })
}

// ============================================================================
// GET UNREAD COUNT (lightweight, for header badge, rig-access aware)
// ============================================================================

#[tauri::command]
pub async fn get_unread_count(
    session_token: String,
    state: State<'_, AppState>,
) -> Result<i64, String> {
    let session = get_session(&session_token, &state).map_err(|e| e.to_string())?;

    let conn = state.db.lock().map_err(|e| format!("Failed to lock database: {}", e))?;

    let access = get_rig_access(&conn, &session.user_id)?;

    let mut conditions = vec![
        "n.recipient_id = ?1".to_string(),
        "n.is_read = 0".to_string(),
        "n.is_deleted = 0".to_string(),
    ];
    let mut param_values: Vec<Box<dyn rusqlite::types::ToSql>> = vec![
        Box::new(session.user_id.clone()),
    ];
    let mut idx: usize = 2;

    append_rig_filter_select(&access, &mut conditions, &mut param_values, &mut idx);

    let query = format!(
        "SELECT COUNT(*) FROM notifications n WHERE {}",
        conditions.join(" AND ")
    );
    let refs: Vec<&dyn rusqlite::types::ToSql> = param_values.iter().map(|p| p.as_ref()).collect();

    let count: i64 = conn
        .query_row(&query, refs.as_slice(), |row| row.get(0))
        .map_err(|e| e.to_string())?;

    Ok(count)
}

// ============================================================================
// MARK NOTIFICATION AS READ
// ============================================================================

#[tauri::command]
pub async fn mark_notification_read(
    session_token: String,
    notification_id: String,
    state: State<'_, AppState>,
) -> Result<(), String> {
    let session = get_session(&session_token, &state).map_err(|e| e.to_string())?;

    let conn = state.db.lock().map_err(|e| format!("Failed to lock database: {}", e))?;

    let now = chrono::Utc::now().to_rfc3339();
    let affected = conn
        .execute(
            "UPDATE notifications SET is_read = 1, read_at = ?1, updated_at = ?2
             WHERE id = ?3 AND recipient_id = ?4 AND is_deleted = 0",
            params![now, now, notification_id, session.user_id],
        )
        .map_err(|e| e.to_string())?;

    if affected == 0 {
        return Err("Notificación no encontrada".to_string());
    }

    Ok(())
}

// ============================================================================
// MARK ALL NOTIFICATIONS AS READ (rig-access aware)
// ============================================================================

#[tauri::command]
pub async fn mark_all_notifications_read(
    session_token: String,
    state: State<'_, AppState>,
) -> Result<(), String> {
    let session = get_session(&session_token, &state).map_err(|e| e.to_string())?;

    let conn = state.db.lock().map_err(|e| format!("Failed to lock database: {}", e))?;

    let access = get_rig_access(&conn, &session.user_id)?;

    let now = chrono::Utc::now().to_rfc3339();

    // UPDATE doesn't support table aliases in SQLite, so use bare column names
    let query = match &access {
        RigAccess::All => {
            "UPDATE notifications SET is_read = 1, read_at = ?1, updated_at = ?2
             WHERE recipient_id = ?3 AND is_read = 0 AND is_deleted = 0".to_string()
        }
        RigAccess::NoneAssigned => {
            "UPDATE notifications SET is_read = 1, read_at = ?1, updated_at = ?2
             WHERE recipient_id = ?3 AND is_read = 0 AND is_deleted = 0
             AND rig_id IS NULL".to_string()
        }
        RigAccess::Specific(rig_ids) => {
            let placeholders: Vec<String> = rig_ids.iter().enumerate()
                .map(|(i, _)| format!("?{}", 4 + i))
                .collect();
            format!(
                "UPDATE notifications SET is_read = 1, read_at = ?1, updated_at = ?2
                 WHERE recipient_id = ?3 AND is_read = 0 AND is_deleted = 0
                 AND (rig_id IS NULL OR rig_id IN ({}))",
                placeholders.join(", ")
            )
        }
    };

    let mut param_values: Vec<Box<dyn rusqlite::types::ToSql>> = vec![
        Box::new(now.clone()),
        Box::new(now),
        Box::new(session.user_id.clone()),
    ];
    if let RigAccess::Specific(rig_ids) = &access {
        for rig_id in rig_ids {
            param_values.push(Box::new(rig_id.clone()));
        }
    }
    let refs: Vec<&dyn rusqlite::types::ToSql> = param_values.iter().map(|p| p.as_ref()).collect();

    conn.execute(&query, refs.as_slice()).map_err(|e| e.to_string())?;

    Ok(())
}

// ============================================================================
// DELETE NOTIFICATION (soft delete)
// ============================================================================

#[tauri::command]
pub async fn delete_notification(
    session_token: String,
    notification_id: String,
    state: State<'_, AppState>,
) -> Result<(), String> {
    let session = get_session(&session_token, &state).map_err(|e| e.to_string())?;

    let conn = state.db.lock().map_err(|e| format!("Failed to lock database: {}", e))?;

    let now = chrono::Utc::now().to_rfc3339();
    let affected = conn
        .execute(
            "UPDATE notifications SET is_deleted = 1, updated_at = ?1
             WHERE id = ?2 AND recipient_id = ?3 AND is_deleted = 0",
            params![now, notification_id, session.user_id],
        )
        .map_err(|e| e.to_string())?;

    if affected == 0 {
        return Err("Notificación no encontrada".to_string());
    }

    Ok(())
}

// ============================================================================
// RETENTION SETTINGS (admin only)
// ============================================================================

#[tauri::command]
pub async fn get_notification_retention_days(
    session_token: String,
    state: State<'_, AppState>,
) -> Result<i32, String> {
    let _session = get_session(&session_token, &state).map_err(|e| e.to_string())?;

    let conn = state.db.lock().map_err(|e| format!("DB lock: {}", e))?;

    let days: i32 = conn
        .query_row(
            "SELECT notification_retention_days FROM app_settings WHERE id = 1",
            [],
            |row| row.get(0),
        )
        .map_err(|e| e.to_string())?;

    Ok(days)
}

#[tauri::command]
pub async fn set_notification_retention_days(
    session_token: String,
    days: i32,
    state: State<'_, AppState>,
) -> Result<(), String> {
    let _session = check_permission(&session_token, UserRole::Admin, &state)
        .map_err(|e| e.to_string())?;

    // Validate allowed values: 0 (indefinite), 5, 15, 30, 120
    if ![0, 5, 15, 30, 120].contains(&days) {
        return Err("Valor no permitido. Use: 5, 15, 30, 120 o 0 (indefinido)".to_string());
    }

    let conn = state.db.lock().map_err(|e| format!("DB lock: {}", e))?;
    let now = chrono::Utc::now().to_rfc3339();

    conn.execute(
        "UPDATE app_settings SET notification_retention_days = ?1, updated_at = ?2 WHERE id = 1",
        params![days, now],
    )
    .map_err(|e| e.to_string())?;

    Ok(())
}
