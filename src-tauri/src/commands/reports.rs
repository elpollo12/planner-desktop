use crate::auth::{check_permission, get_session};
use crate::models::report::{CreateReportRequest, Report, ReportFilters, UpdateReportRequest};
use crate::models::user::{User, UserRole};
use crate::state::AppState;
use serde::Serialize;
use tauri::State;
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

    // Get user's accessible rig names for filtering
    let accessible_rig_names = User::get_accessible_rig_names(&conn, &session.user_id)
        .map_err(|e| e.to_string())?;

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
    // Only supervisor+ can delete reports
    check_permission(&session_token, UserRole::Supervisor, &state).map_err(|e| e.to_string())?;

    let conn = state
        .db
        .lock()
        .map_err(|e| format!("Failed to lock database: {}", e))?;

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

    if user_role == UserRole::Operator && report.created_by.as_deref() != Some(&session.user_id) {
        return Err("Permission denied: You can only submit your own reports".to_string());
    }

    let updated_report = Report::submit(&conn, &report_id).map_err(|e| e.to_string())?;

    Ok(updated_report)
}

#[tauri::command]
pub async fn approve_report(
    session_token: String,
    report_id: String,
    state: State<'_, AppState>,
) -> Result<Report, String> {
    // Only supervisor+ can approve
    let session = check_permission(&session_token, UserRole::Supervisor, &state)
        .map_err(|e| e.to_string())?;

    let conn = state
        .db
        .lock()
        .map_err(|e| format!("Failed to lock database: {}", e))?;

    let updated_report = Report::approve(&conn, &report_id, session.user_id).map_err(|e| e.to_string())?;

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

    let updated_report = Report::reject(&conn, &report_id, session.user_id, reason).map_err(|e| e.to_string())?;

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
