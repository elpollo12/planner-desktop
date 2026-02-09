use crate::auth::get_session;
use crate::models::time_distribution::{TimeDistribution, TimeDistributionData};
use crate::state::AppState;
use tauri::State;

#[tauri::command]
pub async fn save_time_distributions(
    session_token: String,
    report_id: String,
    data: Vec<TimeDistributionData>,
    state: State<'_, AppState>,
) -> Result<Vec<TimeDistribution>, String> {
    get_session(&session_token, &state).map_err(|e| e.to_string())?;

    let conn = state
        .db
        .lock()
        .map_err(|e| format!("Failed to lock database: {}", e))?;

    let records = TimeDistribution::save_bulk(&conn, &report_id, &data)
        .map_err(|e| e.to_string())?;

    Ok(records)
}

#[tauri::command]
pub async fn list_time_distributions(
    session_token: String,
    report_id: String,
    state: State<'_, AppState>,
) -> Result<Vec<TimeDistribution>, String> {
    get_session(&session_token, &state).map_err(|e| e.to_string())?;

    let conn = state
        .db
        .lock()
        .map_err(|e| format!("Failed to lock database: {}", e))?;

    let records = TimeDistribution::list_by_report(&conn, &report_id)
        .map_err(|e| e.to_string())?;

    Ok(records)
}


#[tauri::command]
pub async fn delete_all_time_distributions(
    session_token: String,
    report_id: String,
    state: State<'_, AppState>,
) -> Result<(), String> {
    get_session(&session_token, &state).map_err(|e| e.to_string())?;

    let conn = state
        .db
        .lock()
        .map_err(|e| format!("Failed to lock database: {}", e))?;

    TimeDistribution::delete_all_by_report(&conn, &report_id)
        .map_err(|e| e.to_string())?;

    Ok(())
}
