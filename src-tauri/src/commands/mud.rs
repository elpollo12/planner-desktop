use crate::auth::get_session;
use crate::models::mud::{CreateMudRecordRequest, CreateMudAdditiveRequest, MudRecord, MudAdditive};
use crate::state::AppState;
use tauri::State;

#[tauri::command]
pub async fn create_mud_record(
    session_token: String,
    report_id: String,
    data: CreateMudRecordRequest,
    state: State<'_, AppState>,
) -> Result<MudRecord, String> {
    get_session(&session_token, &state).map_err(|e| e.to_string())?;

    let conn = state
        .db
        .lock()
        .map_err(|e| format!("Failed to lock database: {}", e))?;

    let record = MudRecord::create(&conn, &report_id, &data).map_err(|e| e.to_string())?;
    Ok(record)
}

#[tauri::command]
pub async fn list_mud_records(
    session_token: String,
    report_id: String,
    state: State<'_, AppState>,
) -> Result<Vec<MudRecord>, String> {
    get_session(&session_token, &state).map_err(|e| e.to_string())?;

    let conn = state
        .db
        .lock()
        .map_err(|e| format!("Failed to lock database: {}", e))?;

    let records = MudRecord::list_by_report(&conn, &report_id).map_err(|e| e.to_string())?;
    Ok(records)
}

#[tauri::command]
pub async fn create_mud_additive(
    session_token: String,
    report_id: String,
    data: CreateMudAdditiveRequest,
    state: State<'_, AppState>,
) -> Result<MudAdditive, String> {
    get_session(&session_token, &state).map_err(|e| e.to_string())?;

    let conn = state
        .db
        .lock()
        .map_err(|e| format!("Failed to lock database: {}", e))?;

    let additive = MudAdditive::create(&conn, &report_id, &data).map_err(|e| e.to_string())?;
    Ok(additive)
}

#[tauri::command]
pub async fn list_mud_additives(
    session_token: String,
    report_id: String,
    state: State<'_, AppState>,
) -> Result<Vec<MudAdditive>, String> {
    get_session(&session_token, &state).map_err(|e| e.to_string())?;

    let conn = state
        .db
        .lock()
        .map_err(|e| format!("Failed to lock database: {}", e))?;

    let additives = MudAdditive::list_by_report(&conn, &report_id).map_err(|e| e.to_string())?;
    Ok(additives)
}
