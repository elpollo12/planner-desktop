use crate::auth::{check_permission, get_session};
use crate::models::report::{CreateReportRequest, Report, ReportFilters, UpdateReportRequest};
use crate::models::report_review::ReportReview;
use crate::models::user::{User, UserRole};
use crate::notification_helper;
use crate::state::AppState;
use rusqlite::Connection;
use serde::Serialize;
use tauri::State;

/// Verify that a non-admin user has access to the rig associated with a report.
/// Returns Ok(()) if access is allowed, Err if denied.
/// Admin users always pass. Users with has_all_rigs always pass.
/// Operators are handled separately (created_by check), so this mainly
/// guards supervisors with specific rig assignments.
fn check_report_rig_access(
    conn: &Connection,
    user_id: &str,
    user_role: &UserRole,
    report: &Report,
) -> Result<(), String> {
    // Admin always has access
    if *user_role == UserRole::Admin {
        return Ok(());
    }

    // Check if user has specific rig assignments (not has_all_rigs)
    if let Some(accessible_rig_names) = User::get_accessible_rig_names(conn, user_id)
        .map_err(|e| e.to_string())?
    {
        if let Some(ref report_rig) = report.rig_number {
            if !accessible_rig_names.contains(report_rig) {
                return Err("Permiso denegado: No tienes acceso al taladro de este reporte".to_string());
            }
        }
    }

    Ok(())
}
#[derive(Debug, Serialize)]
pub struct PaginatedReportsResponse {
    pub reports: Vec<Report>,
    pub total: i64,
    pub page: i64,
    pub page_size: i64,
    pub total_pages: i64,
}

#[tauri::command]
pub async fn create_report(
    session_token: String,
    report_data: CreateReportRequest,
    state: State<'_, AppState>,
) -> Result<Report, String> {
    // All authenticated users can create reports
    let session = get_session(&session_token, &state).map_err(|e| e.to_string())?;

    let conn = state
        .db
        .lock()
        .map_err(|e| format!("Failed to lock database: {}", e))?;

    let report = Report::create(&conn, &report_data, session.user_id).map_err(|e| e.to_string())?;

    Ok(report)
}

#[tauri::command]
pub async fn list_reports(
    session_token: String,
    filters: ReportFilters,
    page: Option<i64>,
    page_size: Option<i64>,
    state: State<'_, AppState>,
) -> Result<PaginatedReportsResponse, String> {
    let session = get_session(&session_token, &state).map_err(|e| e.to_string())?;
    let user_role = UserRole::from_str(&session.role).map_err(|e| e.to_string())?;

    let conn = state
        .db
        .lock()
        .map_err(|e| format!("Failed to lock database: {}", e))?;

    // Admin: see all reports without rig filter
    // Supervisor/Operator: filter by their assigned rigs
    let accessible_rig_names = if user_role == UserRole::Admin {
        None
    } else {
        User::get_accessible_rig_names(&conn, &session.user_id)
            .map_err(|e| e.to_string())?
    };

    // Call list with pagination
    let (reports, total) = Report::list(
        &conn,
        &filters,
        Some(&session.user_id),
        &user_role,
        accessible_rig_names.as_deref(),
        page,
        page_size,
    )
    .map_err(|e| e.to_string())?;

    // Calculate pagination metadata
    let page = page.unwrap_or(1).max(1);
    let page_size = page_size.unwrap_or(20).min(100);
    let total_pages = if total == 0 {
        0
    } else {
        (total as f64 / page_size as f64).ceil() as i64
    };

    Ok(PaginatedReportsResponse {
        reports,
        total,
        page,
        page_size,
        total_pages,
    })
}

#[tauri::command]
pub async fn get_report(
    session_token: String,
    report_id: String,
    state: State<'_, AppState>,
) -> Result<Report, String> {
    let session = get_session(&session_token, &state).map_err(|e| e.to_string())?;
    let user_role = UserRole::from_str(&session.role).map_err(|e| e.to_string())?;

    let conn = state
        .db
        .lock()
        .map_err(|e| format!("Failed to lock database: {}", e))?;

    let report = Report::get_by_id(&conn, &report_id).map_err(|e| e.to_string())?;

    // Check permission: operators can only see their own reports
    if user_role == UserRole::Operator && report.created_by.as_deref() != Some(&session.user_id) {
        return Err("Permission denied: You can only view your own reports".to_string());
    }

    // Check rig access for non-admin users
    check_report_rig_access(&conn, &session.user_id, &user_role, &report)?;

    Ok(report)
}

#[tauri::command]
pub async fn update_report(
    session_token: String,
    report_id: String,
    report_data: UpdateReportRequest,
    state: State<'_, AppState>,
) -> Result<Report, String> {
    let session = get_session(&session_token, &state).map_err(|e| e.to_string())?;
    let user_role = UserRole::from_str(&session.role).map_err(|e| e.to_string())?;

    let conn = state
        .db
        .lock()
        .map_err(|e| format!("Failed to lock database: {}", e))?;

    let report = Report::get_by_id(&conn, &report_id).map_err(|e| e.to_string())?;

    // Check rig access
    check_report_rig_access(&conn, &session.user_id, &user_role, &report)?;

    // Check if user can edit
    if !Report::can_edit(&report, &session.user_id, &user_role) {
        return Err("Permission denied: You cannot edit this report".to_string());
    }

    let updated_report = Report::update(&conn, &report_id, &report_data).map_err(|e| e.to_string())?;

    Ok(updated_report)
}

#[tauri::command]
pub async fn delete_report(
    session_token: String,
    report_id: String,
    state: State<'_, AppState>,
) -> Result<(), String> {
    let session = get_session(&session_token, &state).map_err(|e| e.to_string())?;
    let user_role = UserRole::from_str(&session.role).map_err(|e| e.to_string())?;

    let conn = state
        .db
        .lock()
        .map_err(|e| format!("Failed to lock database: {}", e))?;

    let report = Report::get_by_id(&conn, &report_id).map_err(|e| e.to_string())?;

    // Check rig access
    check_report_rig_access(&conn, &session.user_id, &user_role, &report)?;

    // Permission check: admin/supervisor can delete any, operator can delete own draft/submitted
    let can_delete = match user_role {
        UserRole::Admin | UserRole::Supervisor => true,
        UserRole::Operator => {
            (report.status == "draft" || report.status == "submitted")
                && report.created_by.as_deref() == Some(&session.user_id)
        }
    };

    if !can_delete {
        return Err("Permission denied: You cannot delete this report".to_string());
    }

    Report::delete(&conn, &report_id).map_err(|e| e.to_string())?;

    Ok(())
}

#[tauri::command]
pub async fn submit_report(
    session_token: String,
    report_id: String,
    state: State<'_, AppState>,
) -> Result<Report, String> {
    let session = get_session(&session_token, &state).map_err(|e| e.to_string())?;

    let conn = state
        .db
        .lock()
        .map_err(|e| format!("Failed to lock database: {}", e))?;

    // Verify user owns the report or is supervisor+
    let report = Report::get_by_id(&conn, &report_id).map_err(|e| e.to_string())?;
    let user_role = UserRole::from_str(&session.role).map_err(|e| e.to_string())?;

    // Check rig access
    check_report_rig_access(&conn, &session.user_id, &user_role, &report)?;

    if user_role == UserRole::Operator && report.created_by.as_deref() != Some(&session.user_id) {
        return Err("Permission denied: You can only submit your own reports".to_string());
    }

    let updated_report = Report::submit(&conn, &report_id).map_err(|e| e.to_string())?;

    // --- Notification: report submitted for approval ---
    let rig_id = report.rig_number.as_deref()
        .and_then(|name| notification_helper::resolve_rig_id_by_name(&conn, name));
    notification_helper::notify_action(
        &conn, &session, "report", "report_submitted",
        "Reporte enviado para aprobación",
        "Un reporte fue enviado para revisión",
        Some(&report_id), Some("report"), rig_id.as_deref(),
    );

    Ok(updated_report)
}

#[tauri::command]
pub async fn approve_report(
    session_token: String,
    report_id: String,
    comment: Option<String>,
    state: State<'_, AppState>,
) -> Result<Report, String> {
    // Only supervisor+ can approve
    let session = check_permission(&session_token, UserRole::Supervisor, &state)
        .map_err(|e| e.to_string())?;

    let conn = state
        .db
        .lock()
        .map_err(|e| format!("Failed to lock database: {}", e))?;

    // Get current status before transition
    let current_report = Report::get_by_id(&conn, &report_id).map_err(|e| e.to_string())?;
    let previous_status = current_report.status.clone();

    // Check rig access
    let user_role = UserRole::from_str(&session.role).map_err(|e| e.to_string())?;
    check_report_rig_access(&conn, &session.user_id, &user_role, &current_report)?;

    let updated_report = Report::approve(&conn, &report_id, session.user_id.clone()).map_err(|e| e.to_string())?;

    // Create audit trail entry
    ReportReview::create(
        &conn,
        &report_id,
        &session.user_id,
        "approved",
        comment.as_deref(),
        Some(&previous_status),
        Some("approved"),
    ).map_err(|e| format!("Failed to create review audit: {}", e))?;

    // --- Notification: notify the report creator ---
    if let Some(ref creator_id) = current_report.created_by {
        let rig_id = current_report.rig_number.as_deref()
            .and_then(|name| notification_helper::resolve_rig_id_by_name(&conn, name));
        notification_helper::notify_user(
            &conn, &session, creator_id, "report", "report_approved",
            "Reporte aprobado",
            "Tu reporte fue aprobado",
            Some(&report_id), Some("report"), rig_id.as_deref(),
        );
    }

    Ok(updated_report)
}

#[tauri::command]
pub async fn reject_report(
    session_token: String,
    report_id: String,
    reason: String,
    state: State<'_, AppState>,
) -> Result<Report, String> {
    // Only supervisor+ can reject
    let session = check_permission(&session_token, UserRole::Supervisor, &state)
        .map_err(|e| e.to_string())?;

    let conn = state
        .db
        .lock()
        .map_err(|e| format!("Failed to lock database: {}", e))?;

    // Get current status before transition (reject)
    let current_report = Report::get_by_id(&conn, &report_id).map_err(|e| e.to_string())?;
    let previous_status = current_report.status.clone();

    // Check rig access
    let user_role = UserRole::from_str(&session.role).map_err(|e| e.to_string())?;
    check_report_rig_access(&conn, &session.user_id, &user_role, &current_report)?;

    let updated_report = Report::reject(&conn, &report_id, session.user_id.clone(), reason.clone()).map_err(|e| e.to_string())?;

    // Create audit trail entry
    ReportReview::create(
        &conn,
        &report_id,
        &session.user_id,
        "rejected",
        Some(&reason),
        Some(&previous_status),
        Some("rejected"),
    ).map_err(|e| format!("Failed to create review audit: {}", e))?;

    // --- Notification: notify the report creator about rejection ---
    if let Some(ref creator_id) = current_report.created_by {
        let rig_id = current_report.rig_number.as_deref()
            .and_then(|name| notification_helper::resolve_rig_id_by_name(&conn, name));
        notification_helper::notify_user(
            &conn, &session, creator_id, "report", "report_rejected",
            "Reporte rechazado",
            &format!("Tu reporte fue rechazado: {}", reason),
            Some(&report_id), Some("report"), rig_id.as_deref(),
        );
    }

    Ok(updated_report)
}

#[tauri::command]
pub async fn get_report_completeness(
    session_token: String,
    report_id: String,
    state: State<'_, AppState>,
) -> Result<crate::models::report::ReportCompleteness, String> {
    let _session = get_session(&session_token, &state).map_err(|e| e.to_string())?;

    let conn = state
        .db
        .lock()
        .map_err(|e| format!("Failed to lock database: {}", e))?;

    let completeness = crate::models::report::Report::get_completeness(&conn, &report_id)
        .map_err(|e| e.to_string())?;

    Ok(completeness)
}

#[tauri::command]
pub async fn reopen_report(
    session_token: String,
    report_id: String,
    state: State<'_, AppState>,
) -> Result<Report, String> {
    let session = get_session(&session_token, &state).map_err(|e| e.to_string())?;
    let user_role = UserRole::from_str(&session.role).map_err(|e| e.to_string())?;

    let conn = state
        .db
        .lock()
        .map_err(|e| format!("Failed to lock database: {}", e))?;

    let report = Report::get_by_id(&conn, &report_id).map_err(|e| e.to_string())?;

    // Check rig access
    check_report_rig_access(&conn, &session.user_id, &user_role, &report)?;

    // Only the creator or supervisor+ can reopen
    if user_role == UserRole::Operator && report.created_by.as_deref() != Some(&session.user_id) {
        return Err("Permission denied: You can only reopen your own reports".to_string());
    }

    // Supervisors cannot reopen approved reports — only admin can
    if user_role == UserRole::Supervisor && report.status == "approved" {
        return Err("Permission denied: Only administrators can reopen approved reports".to_string());
    }

    // Operators cannot reopen approved or submitted reports
    if user_role == UserRole::Operator && (report.status == "approved" || report.status == "submitted") {
        return Err("Permission denied: Contact a supervisor to reopen this report".to_string());
    }

    let previous_status = report.status.clone();

    let updated_report = Report::reopen(&conn, &report_id).map_err(|e| e.to_string())?;

    // Create audit trail entry
    let _ = ReportReview::create(
        &conn,
        &report_id,
        &session.user_id,
        "resubmitted",
        Some("Reporte reabierto para correcciones"),
        Some(&previous_status),
        Some("draft"),
    );

    // --- Notification: notify the report creator about reopening ---
    if let Some(ref creator_id) = report.created_by {
        let rig_id = report.rig_number.as_deref()
            .and_then(|name| notification_helper::resolve_rig_id_by_name(&conn, name));
        notification_helper::notify_user(
            &conn, &session, creator_id, "report", "report_reopened",
            "Reporte reabierto",
            "Tu reporte fue reabierto para correcciones",
            Some(&report_id), Some("report"), rig_id.as_deref(),
        );
    }

    Ok(updated_report)
}
