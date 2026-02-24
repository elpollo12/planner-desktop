use crate::auth::{check_permission, get_session};
use crate::models::report::Report;
use crate::models::report_review::ReportReview;
use crate::models::user::UserRole;
use crate::state::AppState;
use tauri::State;

#[tauri::command]
pub async fn create_report_review(
    session_token: String,
    report_id: String,
    action: String,
    comment: Option<String>,
    state: State<'_, AppState>,
) -> Result<ReportReview, String> {
    // Only supervisor+ can create reviews
    let session = check_permission(&session_token, UserRole::Supervisor, &state)
        .map_err(|e| e.to_string())?;

    let conn = state
        .db
        .lock()
        .map_err(|e| format!("Failed to lock database: {}", e))?;

    // Verify report exists
    let report = Report::get_by_id(&conn, &report_id).map_err(|e| e.to_string())?;

    let review = ReportReview::create(
        &conn,
        &report_id,
        &session.user_id,
        &action,
        comment.as_deref(),
        Some(&report.status),
        None, // new_status is determined by the action context
    )
    .map_err(|e| e.to_string())?;

    Ok(review)
}

#[tauri::command]
pub async fn list_report_reviews(
    session_token: String,
    report_id: String,
    state: State<'_, AppState>,
) -> Result<Vec<ReportReview>, String> {
    let session = get_session(&session_token, &state).map_err(|e| e.to_string())?;
    let user_role = UserRole::from_str(&session.role).map_err(|e| e.to_string())?;

    let conn = state
        .db
        .lock()
        .map_err(|e| format!("Failed to lock database: {}", e))?;

    // Verify the user can see this report
    let report = Report::get_by_id(&conn, &report_id).map_err(|e| e.to_string())?;

    // Operators can only see reviews of their own reports
    if user_role == UserRole::Operator && report.created_by.as_deref() != Some(&session.user_id) {
        return Err("Permission denied: You can only view reviews of your own reports".to_string());
    }

    let reviews =
        ReportReview::list_by_report(&conn, &report_id).map_err(|e| e.to_string())?;

    Ok(reviews)
}
