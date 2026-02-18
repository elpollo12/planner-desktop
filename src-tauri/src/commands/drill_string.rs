use crate::auth::get_session;
use crate::models::drill_string::{DrillString, DrillStringData};
use crate::models::report::Report;
use crate::state::AppState;
use tauri::State;

#[tauri::command]
pub async fn save_drill_string(
    session_token: String,
    report_id: String,
    data: DrillStringData,
    state: State<'_, AppState>,
) -> Result<DrillString, String> {
    // Verify session
    get_session(&session_token, &state).map_err(|e| e.to_string())?;

    let conn = state
        .db
        .lock()
        .map_err(|e| format!("Failed to lock database: {}", e))?;

    let drill_string = DrillString::save(&conn, &report_id, &data).map_err(|e| e.to_string())?;

    Report::touch_updated_at(&conn, &report_id).map_err(|e| e.to_string())?;

    Ok(drill_string)
}

#[tauri::command]
pub async fn get_drill_string(
    session_token: String,
    report_id: String,
    state: State<'_, AppState>,
) -> Result<DrillString, String> {
    // Verify session
    get_session(&session_token, &state).map_err(|e| e.to_string())?;

    let conn = state
        .db
        .lock()
        .map_err(|e| format!("Failed to lock database: {}", e))?;

    let drill_string = DrillString::get_by_report_id(&conn, &report_id).map_err(|e| e.to_string())?;

    Ok(drill_string)
}
