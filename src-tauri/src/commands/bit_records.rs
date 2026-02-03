use crate::auth::get_session;
use crate::models::bit_record::{BitRecord, CreateBitRecordRequest};
use crate::state::AppState;
use tauri::State;

#[tauri::command]
pub async fn create_bit_record(
    session_token: String,
    report_id: String,
    data: CreateBitRecordRequest,
    state: State<'_, AppState>,
) -> Result<BitRecord, String> {
    // Verify session
    get_session(&session_token, &state).map_err(|e| e.to_string())?;

    let conn = state
        .db
        .lock()
        .map_err(|e| format!("Failed to lock database: {}", e))?;

    let bit_record = BitRecord::create(&conn, &report_id, &data).map_err(|e| e.to_string())?;

    Ok(bit_record)
}

#[tauri::command]
pub async fn list_bit_records(
    session_token: String,
    report_id: String,
    state: State<'_, AppState>,
) -> Result<Vec<BitRecord>, String> {
    // Verify session
    get_session(&session_token, &state).map_err(|e| e.to_string())?;

    let conn = state
        .db
        .lock()
        .map_err(|e| format!("Failed to lock database: {}", e))?;

    let records = BitRecord::list_by_report(&conn, &report_id).map_err(|e| e.to_string())?;

    Ok(records)
}

#[tauri::command]
pub async fn update_bit_record(
    session_token: String,
    record_id: String,
    data: CreateBitRecordRequest,
    state: State<'_, AppState>,
) -> Result<BitRecord, String> {
    // Verify session
    get_session(&session_token, &state).map_err(|e| e.to_string())?;

    let conn = state
        .db
        .lock()
        .map_err(|e| format!("Failed to lock database: {}", e))?;

    let record = BitRecord::update(&conn, &record_id, &data).map_err(|e| e.to_string())?;

    Ok(record)
}

#[tauri::command]
pub async fn delete_bit_record(
    session_token: String,
    record_id: String,
    state: State<'_, AppState>,
) -> Result<(), String> {
    // Verify session
    get_session(&session_token, &state).map_err(|e| e.to_string())?;

    let conn = state
        .db
        .lock()
        .map_err(|e| format!("Failed to lock database: {}", e))?;

    BitRecord::delete(&conn, &record_id).map_err(|e| e.to_string())?;

    Ok(())
}
