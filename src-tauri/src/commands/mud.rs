use crate::auth::get_session;
use crate::models::mud::{CreateMudRecordRequest, CreateMudAdditiveRequest, MudRecord, MudAdditive, SaveMudDataRequest, save_mud_bulk};
use crate::models::report::Report;
use crate::state::AppState;
use serde::{Deserialize, Serialize};
use tauri::State;

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SaveMudResponse {
    pub records: Vec<MudRecord>,
    pub additives: Vec<MudAdditive>,
}

#[tauri::command]
pub async fn save_mud_data(
    session_token: String,
    report_id: String,
    data: SaveMudDataRequest,
    state: State<'_, AppState>,
) -> Result<SaveMudResponse, String> {
    get_session(&session_token, &state).map_err(|e| e.to_string())?;

    let conn = state
        .db
        .lock()
        .map_err(|e| format!("Failed to lock database: {}", e))?;

    let (records, additives) = save_mud_bulk(&conn, &report_id, &data)
        .map_err(|e| e.to_string())?;

    Report::touch_updated_at(&conn, &report_id).map_err(|e| e.to_string())?;

    Ok(SaveMudResponse { records, additives })
}

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

    Report::touch_updated_at(&conn, &report_id).map_err(|e| e.to_string())?;

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

    Report::touch_updated_at(&conn, &report_id).map_err(|e| e.to_string())?;

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


#[tauri::command]
pub async fn delete_all_mud_records(
    session_token: String,
    report_id: String,
    state: State<'_, AppState>,
) -> Result<(), String> {
    get_session(&session_token, &state).map_err(|e| e.to_string())?;

    let conn = state
        .db
        .lock()
        .map_err(|e| format!("Failed to lock database: {}", e))?;

    MudRecord::delete_all_by_report(&conn, &report_id).map_err(|e| e.to_string())?;

    Report::touch_updated_at(&conn, &report_id).map_err(|e| e.to_string())?;

    Ok(())
}

#[tauri::command]
pub async fn delete_all_mud_additives(
    session_token: String,
    report_id: String,
    state: State<'_, AppState>,
) -> Result<(), String> {
    get_session(&session_token, &state).map_err(|e| e.to_string())?;

    let conn = state
        .db
        .lock()
        .map_err(|e| format!("Failed to lock database: {}", e))?;

    MudAdditive::delete_all_by_report(&conn, &report_id).map_err(|e| e.to_string())?;

    Report::touch_updated_at(&conn, &report_id).map_err(|e| e.to_string())?;

    Ok(())
}
