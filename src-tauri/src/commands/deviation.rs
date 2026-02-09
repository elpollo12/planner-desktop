use crate::auth::get_session;
use crate::models::deviation::{CreateDeviationRecordRequest, DeviationRecord};
use crate::state::AppState;
use tauri::State;

#[tauri::command]
pub async fn create_deviation_record(
    session_token: String,
    report_id: String,
    data: CreateDeviationRecordRequest,
    state: State<'_, AppState>,
) -> Result<DeviationRecord, String> {
    get_session(&session_token, &state).map_err(|e| e.to_string())?;

    let conn = state
        .db
        .lock()
        .map_err(|e| format!("Failed to lock database: {}", e))?;

    let record = DeviationRecord::create(&conn, &report_id, &data)
        .map_err(|e| e.to_string())?;

    Ok(record)
}

#[tauri::command]
pub async fn list_deviation_records(
    session_token: String,
    report_id: String,
    state: State<'_, AppState>,
) -> Result<Vec<DeviationRecord>, String> {
    get_session(&session_token, &state).map_err(|e| e.to_string())?;

    let conn = state
        .db
        .lock()
        .map_err(|e| format!("Failed to lock database: {}", e))?;

    let records = DeviationRecord::list_by_report(&conn, &report_id)
        .map_err(|e| e.to_string())?;

    Ok(records)
}


#[tauri::command]
pub async fn delete_all_deviation_records(
    session_token: String,
    report_id: String,
    state: State<'_, AppState>,
) -> Result<(), String> {
    get_session(&session_token, &state).map_err(|e| e.to_string())?;

    let conn = state
        .db
        .lock()
        .map_err(|e| format!("Failed to lock database: {}", e))?;

    DeviationRecord::delete_all_by_report(&conn, &report_id)
        .map_err(|e| e.to_string())?;

    Ok(())
}
