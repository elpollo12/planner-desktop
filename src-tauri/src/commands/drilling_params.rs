use crate::auth::get_session;
use crate::models::drilling_params::{CreateDrillingParameterRequest, DrillingParameter};
use crate::models::report::Report;
use crate::state::AppState;
use tauri::State;

#[tauri::command]
pub async fn save_drilling_parameters(
    session_token: String,
    report_id: String,
    data: Vec<CreateDrillingParameterRequest>,
    state: State<'_, AppState>,
) -> Result<Vec<DrillingParameter>, String> {
    get_session(&session_token, &state).map_err(|e| e.to_string())?;

    let conn = state
        .db
        .lock()
        .map_err(|e| format!("Failed to lock database: {}", e))?;

    conn.execute_batch("BEGIN IMMEDIATE").map_err(|e| e.to_string())?;
    let result = (|| -> Result<_, String> {
        let params = DrillingParameter::save_bulk(&conn, &report_id, &data)
            .map_err(|e| e.to_string())?;
        Report::touch_updated_at(&conn, &report_id).map_err(|e| e.to_string())?;
        Ok(params)
    })();
    match result {
        Ok(v) => {
            conn.execute_batch("COMMIT").map_err(|e| e.to_string())?;
            Ok(v)
        }
        Err(e) => {
            let _ = conn.execute_batch("ROLLBACK");
            Err(e)
        }
    }
}

#[tauri::command]
pub async fn create_drilling_parameter(
    session_token: String,
    report_id: String,
    data: CreateDrillingParameterRequest,
    state: State<'_, AppState>,
) -> Result<DrillingParameter, String> {
    get_session(&session_token, &state).map_err(|e| e.to_string())?;

    let conn = state
        .db
        .lock()
        .map_err(|e| format!("Failed to lock database: {}", e))?;

    let param = DrillingParameter::create(&conn, &report_id, &data)
        .map_err(|e| e.to_string())?;

    Report::touch_updated_at(&conn, &report_id).map_err(|e| e.to_string())?;

    Ok(param)
}

#[tauri::command]
pub async fn list_drilling_parameters(
    session_token: String,
    report_id: String,
    state: State<'_, AppState>,
) -> Result<Vec<DrillingParameter>, String> {
    get_session(&session_token, &state).map_err(|e| e.to_string())?;

    let conn = state
        .db
        .lock()
        .map_err(|e| format!("Failed to lock database: {}", e))?;

    let params = DrillingParameter::list_by_report(&conn, &report_id)
        .map_err(|e| e.to_string())?;

    Ok(params)
}


#[tauri::command]
pub async fn delete_all_drilling_parameters(
    session_token: String,
    report_id: String,
    state: State<'_, AppState>,
) -> Result<(), String> {
    get_session(&session_token, &state).map_err(|e| e.to_string())?;

    let conn = state
        .db
        .lock()
        .map_err(|e| format!("Failed to lock database: {}", e))?;

    DrillingParameter::delete_all_by_report(&conn, &report_id)
        .map_err(|e| e.to_string())?;

    Report::touch_updated_at(&conn, &report_id).map_err(|e| e.to_string())?;

    Ok(())
}
