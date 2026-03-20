use crate::error::AppError;
use crate::models::audit_log::AuditEntry;
use crate::models::notification::CreateNotificationInput;
use crate::state::SessionInfo;
use rusqlite::{params, Connection};
use uuid::Uuid;

// ============================================================================
// NOTIFICATION HELPER
// ============================================================================
// This module provides internal functions to create notifications from within
// existing Tauri commands. It is NOT exposed as a Tauri command itself.
//
// Flow:
//   Operator action  → notify supervisors + admins with rig access
//   Supervisor/Admin action → notify the operator who created the resource
// ============================================================================

/// Create notifications for an action, automatically resolving recipients
/// based on the actor's role and the action type.
///
/// This function is designed to be called at the END of a successful command,
/// after the main transaction has committed. Notification failures are logged
/// but never propagate — the primary action must never fail because of
/// a notification error.
pub fn notify_action(
    conn: &Connection,
    session: &SessionInfo,
    category: &str,
    action_type: &str,
    title: &str,
    message: &str,
    reference_id: Option<&str>,
    reference_type: Option<&str>,
    rig_id: Option<&str>,
) {
    if let Err(e) = notify_action_inner(
        conn, session, category, action_type, title, message,
        reference_id, reference_type, rig_id,
    ) {
        eprintln!(
            "[notifications] Error creating notification (category={}, action={}): {}",
            category, action_type, e
        );
    }
}

fn notify_action_inner(
    conn: &Connection,
    session: &SessionInfo,
    category: &str,
    action_type: &str,
    title: &str,
    message: &str,
    reference_id: Option<&str>,
    reference_type: Option<&str>,
    rig_id: Option<&str>,
) -> Result<(), AppError> {
    // Resolve rig name if rig_id is provided
    let rig_name = match rig_id {
        Some(rid) => get_rig_name(conn, rid).ok(),
        None => None,
    };

    // Resolve actor full name (session only has username)
    let actor_name = get_user_full_name(conn, &session.user_id)
        .unwrap_or_else(|| session.username.clone());

    // Determine recipients based on actor role
    let recipients = resolve_recipients(conn, session, rig_id)?;

    if recipients.is_empty() {
        return Ok(());
    }

    let now = chrono::Utc::now().to_rfc3339();

    for recipient_id in &recipients {
        let input = CreateNotificationInput {
            recipient_id: recipient_id.clone(),
            actor_id: session.user_id.clone(),
            actor_name: actor_name.clone(),
            category: category.to_string(),
            action_type: action_type.to_string(),
            title: title.to_string(),
            message: message.to_string(),
            reference_id: reference_id.map(|s| s.to_string()),
            reference_type: reference_type.map(|s| s.to_string()),
            rig_id: rig_id.map(|s| s.to_string()),
            rig_name: rig_name.clone(),
        };

        insert_notification(conn, &input, &now)?;
    }

    Ok(())
}

/// Create a notification targeting a specific user (for responses: approve, reject, etc.)
/// Used when a supervisor/admin responds to an operator's resource.
pub fn notify_user(
    conn: &Connection,
    session: &SessionInfo,
    recipient_id: &str,
    category: &str,
    action_type: &str,
    title: &str,
    message: &str,
    reference_id: Option<&str>,
    reference_type: Option<&str>,
    rig_id: Option<&str>,
) {
    // Don't notify yourself
    if recipient_id == session.user_id {
        return;
    }

    if let Err(e) = notify_user_inner(
        conn, session, recipient_id, category, action_type, title, message,
        reference_id, reference_type, rig_id,
    ) {
        eprintln!(
            "[notifications] Error creating targeted notification for user {}: {}",
            recipient_id, e
        );
    }
}

fn notify_user_inner(
    conn: &Connection,
    session: &SessionInfo,
    recipient_id: &str,
    category: &str,
    action_type: &str,
    title: &str,
    message: &str,
    reference_id: Option<&str>,
    reference_type: Option<&str>,
    rig_id: Option<&str>,
) -> Result<(), AppError> {
    let rig_name = match rig_id {
        Some(rid) => get_rig_name(conn, rid).ok(),
        None => None,
    };

    // Resolve actor full name
    let actor_name = get_user_full_name(conn, &session.user_id)
        .unwrap_or_else(|| session.username.clone());

    let now = chrono::Utc::now().to_rfc3339();

    let input = CreateNotificationInput {
        recipient_id: recipient_id.to_string(),
        actor_id: session.user_id.clone(),
        actor_name,
        category: category.to_string(),
        action_type: action_type.to_string(),
        title: title.to_string(),
        message: message.to_string(),
        reference_id: reference_id.map(|s| s.to_string()),
        reference_type: reference_type.map(|s| s.to_string()),
        rig_id: rig_id.map(|s| s.to_string()),
        rig_name,
    };

    insert_notification(conn, &input, &now)
}

// ============================================================================
// PRIVATE HELPERS
// ============================================================================

/// Resolve notification recipients based on actor's role and rig context.
///
/// - Operator → all active supervisors + admins with access to the rig
/// - Supervisor/Admin → (use `notify_user` directly for targeted responses)
///   For general actions, notify other supervisors + admins with rig access
fn resolve_recipients(
    conn: &Connection,
    session: &SessionInfo,
    rig_id: Option<&str>,
) -> Result<Vec<String>, AppError> {
    match session.role.as_str() {
        "operator" => {
            // Notify supervisors and admins with access to this rig
            get_supervisors_and_admins_for_rig(conn, &session.user_id, rig_id)
        }
        "supervisor" | "admin" => {
            // For upward notifications from supervisor/admin (rare case),
            // notify other supervisors + admins with rig access, excluding self
            get_supervisors_and_admins_for_rig(conn, &session.user_id, rig_id)
        }
        _ => Ok(Vec::new()),
    }
}

/// Get all active supervisors and admins who have access to a specific rig.
/// Excludes the actor (no self-notifications).
fn get_supervisors_and_admins_for_rig(
    conn: &Connection,
    exclude_user_id: &str,
    rig_id: Option<&str>,
) -> Result<Vec<String>, AppError> {
    let query = match rig_id {
        Some(_) => {
            "SELECT DISTINCT u.id
             FROM users u
             LEFT JOIN user_rigs ur ON u.id = ur.user_id
             WHERE u.active = 1
               AND (u.is_deleted IS NULL OR u.is_deleted = 0)
               AND u.role IN ('supervisor', 'admin')
               AND u.id != ?1
               AND (u.has_all_rigs = 1 OR ur.rig_id = ?2)"
        }
        None => {
            // No rig context — notify all supervisors/admins
            "SELECT DISTINCT u.id
             FROM users u
             WHERE u.active = 1
               AND (u.is_deleted IS NULL OR u.is_deleted = 0)
               AND u.role IN ('supervisor', 'admin')
               AND u.id != ?1"
        }
    };

    let mut stmt = conn.prepare(query)?;

    let mut recipients = Vec::new();
    match rig_id {
        Some(rid) => {
            let rows = stmt.query_map(params![exclude_user_id, rid], |row| row.get::<_, String>(0))?;
            for row in rows {
                recipients.push(row?);
            }
        }
        None => {
            let rows = stmt.query_map(params![exclude_user_id], |row| row.get::<_, String>(0))?;
            for row in rows {
                recipients.push(row?);
            }
        }
    }

    Ok(recipients)
}

/// Get rig name by ID
fn get_rig_name(conn: &Connection, rig_id: &str) -> Result<String, AppError> {
    let name: String = conn.query_row(
        "SELECT name FROM rigs WHERE id = ?1",
        params![rig_id],
        |row| row.get(0),
    )?;
    Ok(name)
}

/// Get user full_name by ID. Returns None if not found.
fn get_user_full_name(conn: &Connection, user_id: &str) -> Option<String> {
    conn.query_row(
        "SELECT full_name FROM users WHERE id = ?1",
        params![user_id],
        |row| row.get::<_, String>(0),
    )
    .ok()
}

/// Resolve a rig name to its ID. Used for reports which store rig_number (name) 
/// instead of rig_id (UUID).
pub fn resolve_rig_id_by_name(conn: &Connection, rig_name: &str) -> Option<String> {
    conn.query_row(
        "SELECT id FROM rigs WHERE name = ?1 AND (is_deleted IS NULL OR is_deleted = 0)",
        params![rig_name],
        |row| row.get::<_, String>(0),
    )
    .ok()
}

/// Insert a single notification row into the database
fn insert_notification(
    conn: &Connection,
    input: &CreateNotificationInput,
    now: &str,
) -> Result<(), AppError> {
    let id = Uuid::new_v4().to_string();

    conn.execute(
        "INSERT INTO notifications (
            id, recipient_id, actor_id, actor_name,
            category, action_type, title, message,
            reference_id, reference_type, rig_id, rig_name,
            is_read, created_at, updated_at, is_deleted
        ) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12, 0, ?13, ?14, 0)",
        params![
            id,
            input.recipient_id,
            input.actor_id,
            input.actor_name,
            input.category,
            input.action_type,
            input.title,
            input.message,
            input.reference_id,
            input.reference_type,
            input.rig_id,
            input.rig_name,
            now,
            now,
        ],
    )?;

    Ok(())
}

/// Cleanup old notifications + audit log entries on each login.
/// Reads `notification_retention_days` from `app_settings` for notifications.
/// Audit log is always purged with a fixed 90-day retention.
/// Both operations are silent — failures are logged but never propagate.
pub fn cleanup_old_notifications(conn: &Connection) {
    // Read retention days from app_settings
    let retention_days: i64 = conn
        .query_row(
            "SELECT notification_retention_days FROM app_settings WHERE id = 1",
            [],
            |row| row.get(0),
        )
        .unwrap_or(5);

    // 0 means indefinite — skip cleanup
    if retention_days == 0 {
        return;
    }

    let cutoff = chrono::Utc::now()
        .checked_sub_signed(chrono::Duration::days(retention_days))
        .map(|dt| dt.to_rfc3339());

    if let Some(cutoff_date) = cutoff {
        let result = conn.execute(
            "UPDATE notifications SET is_deleted = 1, updated_at = ?1
             WHERE is_read = 1 AND created_at < ?2 AND is_deleted = 0",
            params![chrono::Utc::now().to_rfc3339(), cutoff_date],
        );

        match result {
            Ok(count) => {
                if count > 0 {
                    println!("[notifications] Cleaned up {} old read notifications", count);
                }
            }
            Err(e) => eprintln!("[notifications] Cleanup error: {}", e),
        }
    }

    // Purge old audit log entries (90-day fixed retention)
    AuditEntry::purge_old(conn, 90);
}
