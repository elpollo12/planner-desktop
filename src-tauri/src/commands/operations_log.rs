use crate::auth::get_session;
use crate::models::operations_log::{CreateOperationLogRequest, OperationLog};
use crate::models::report::Report;
use crate::state::AppState;
use tauri::State;

#[tauri::command]
pub async fn save_operation_logs(
    session_token: String,
    report_id: String,
    data: Vec<CreateOperationLogRequest>,
    state: State<'_, AppState>,
) -> Result<Vec<OperationLog>, String> {
    get_session(&session_token, &state).map_err(|e| e.to_string())?;

    let conn = state
        .db
        .lock()
        .map_err(|e| format!("Failed to lock database: {}", e))?;

    conn.execute_batch("BEGIN IMMEDIATE").map_err(|e| e.to_string())?;
    let result = (|| -> Result<_, String> {
        let logs = OperationLog::save_bulk(&conn, &report_id, &data)
            .map_err(|e| e.to_string())?;
        Report::touch_updated_at(&conn, &report_id).map_err(|e| e.to_string())?;
        Ok(logs)
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
pub async fn create_operation_log(
    session_token: String,
    report_id: String,
    data: CreateOperationLogRequest,
    state: State<'_, AppState>,
) -> Result<OperationLog, String> {
    get_session(&session_token, &state).map_err(|e| e.to_string())?;

    let conn = state
        .db
        .lock()
        .map_err(|e| format!("Failed to lock database: {}", e))?;

    let log = OperationLog::create(&conn, &report_id, &data)
        .map_err(|e| e.to_string())?;

    Report::touch_updated_at(&conn, &report_id).map_err(|e| e.to_string())?;

    Ok(log)
}

#[tauri::command]
pub async fn list_operation_logs(
    session_token: String,
    report_id: String,
    state: State<'_, AppState>,
) -> Result<Vec<OperationLog>, String> {
    get_session(&session_token, &state).map_err(|e| e.to_string())?;

    let conn = state
        .db
        .lock()
        .map_err(|e| format!("Failed to lock database: {}", e))?;

    let logs = OperationLog::list_by_report(&conn, &report_id)
        .map_err(|e| e.to_string())?;

    Ok(logs)
}


#[tauri::command]
pub async fn delete_all_operation_logs(
    session_token: String,
    report_id: String,
    state: State<'_, AppState>,
) -> Result<(), String> {
    get_session(&session_token, &state).map_err(|e| e.to_string())?;

    let conn = state
        .db
        .lock()
        .map_err(|e| format!("Failed to lock database: {}", e))?;

    OperationLog::delete_all_by_report(&conn, &report_id)
        .map_err(|e| e.to_string())?;

    Report::touch_updated_at(&conn, &report_id).map_err(|e| e.to_string())?;

    Ok(())
}
