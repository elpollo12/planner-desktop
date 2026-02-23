use crate::auth::get_session;
use crate::models::bit_record::{BitRecord, CreateBitRecordRequest};
use crate::models::report::Report;
use crate::state::AppState;
use tauri::State;

#[tauri::command]
pub async fn save_bit_records(
    session_token: String,
    report_id: String,
    data: Vec<CreateBitRecordRequest>,
    state: State<'_, AppState>,
) -> Result<Vec<BitRecord>, String> {
    get_session(&session_token, &state).map_err(|e| e.to_string())?;

    let conn = state
        .db
        .lock()
        .map_err(|e| format!("Failed to lock database: {}", e))?;

    let records = BitRecord::save_bulk(&conn, &report_id, &data)
        .map_err(|e| e.to_string())?;

    Report::touch_updated_at(&conn, &report_id).map_err(|e| e.to_string())?;

    Ok(records)
}

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

    Report::touch_updated_at(&conn, &report_id).map_err(|e| e.to_string())?;

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

    // Touch parent report so incremental sync picks up changes
    if let Ok(report_id) = conn.query_row::<String, _, _>(
        "SELECT report_id FROM bit_records WHERE id = ?1",
        rusqlite::params![&record_id],
        |row| row.get(0),
    ) {
        let _ = Report::touch_updated_at(&conn, &report_id);
    }

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

    // Get report_id before deleting
    let report_id: Option<String> = conn.query_row(
        "SELECT report_id FROM bit_records WHERE id = ?1",
        rusqlite::params![&record_id],
        |row| row.get(0),
    ).ok();

    BitRecord::delete(&conn, &record_id).map_err(|e| e.to_string())?;

    if let Some(rid) = report_id {
        let _ = Report::touch_updated_at(&conn, &rid);
    }

    Ok(())
}

#[tauri::command]
pub async fn delete_all_bit_records(
    session_token: String,
    report_id: String,
    state: State<'_, AppState>,
) -> Result<(), String> {
    // Verify session
    get_session(&session_token, &state).map_err(|e| e.to_string())?;

    let conn = state
        .db
        .lock()
        .map_err(|e| format!("Failed to lock database: {}", e))?;

    BitRecord::delete_all_by_report(&conn, &report_id).map_err(|e| e.to_string())?;

    Report::touch_updated_at(&conn, &report_id).map_err(|e| e.to_string())?;

    Ok(())
}
