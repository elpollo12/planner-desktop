use crate::auth::get_session;
use crate::models::drill_string::{CreateDrillStringComponentRequest, DrillStringComponent};
use crate::models::report::Report;
use crate::state::AppState;
use tauri::State;

#[tauri::command]
pub async fn save_drill_string_components(
    session_token: String,
    report_id: String,
    data: Vec<CreateDrillStringComponentRequest>,
    state: State<'_, AppState>,
) -> Result<Vec<DrillStringComponent>, String> {
    get_session(&session_token, &state).map_err(|e| e.to_string())?;

    let conn = state
        .db
        .lock()
        .map_err(|e| format!("Failed to lock database: {}", e))?;

    conn.execute_batch("BEGIN IMMEDIATE").map_err(|e| e.to_string())?;
    let result = (|| -> Result<_, String> {
        let components = DrillStringComponent::save_bulk(&conn, &report_id, &data)
            .map_err(|e| e.to_string())?;
        Report::touch_updated_at(&conn, &report_id).map_err(|e| e.to_string())?;
        Ok(components)
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
pub async fn create_drill_string_component(
    session_token: String,
    report_id: String,
    data: CreateDrillStringComponentRequest,
    state: State<'_, AppState>,
) -> Result<DrillStringComponent, String> {
    get_session(&session_token, &state).map_err(|e| e.to_string())?;

    let conn = state
        .db
        .lock()
        .map_err(|e| format!("Failed to lock database: {}", e))?;

    let component =
        DrillStringComponent::create(&conn, &report_id, &data).map_err(|e| e.to_string())?;

    Report::touch_updated_at(&conn, &report_id).map_err(|e| e.to_string())?;

    Ok(component)
}

#[tauri::command]
pub async fn list_drill_string_components(
    session_token: String,
    report_id: String,
    state: State<'_, AppState>,
) -> Result<Vec<DrillStringComponent>, String> {
    get_session(&session_token, &state).map_err(|e| e.to_string())?;

    let conn = state
        .db
        .lock()
        .map_err(|e| format!("Failed to lock database: {}", e))?;

    let components =
        DrillStringComponent::list_by_report(&conn, &report_id).map_err(|e| e.to_string())?;

    Ok(components)
}

#[tauri::command]
pub async fn delete_all_drill_string_components(
    session_token: String,
    report_id: String,
    state: State<'_, AppState>,
) -> Result<(), String> {
    get_session(&session_token, &state).map_err(|e| e.to_string())?;

    let conn = state
        .db
        .lock()
        .map_err(|e| format!("Failed to lock database: {}", e))?;

    DrillStringComponent::delete_all_by_report(&conn, &report_id).map_err(|e| e.to_string())?;

    Report::touch_updated_at(&conn, &report_id).map_err(|e| e.to_string())?;

    Ok(())
}
