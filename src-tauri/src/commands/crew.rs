use crate::auth::get_session;
use crate::models::crew::{CrewShiftData, CrewShiftWithMembers};
use crate::state::AppState;
use tauri::State;

#[tauri::command]
pub async fn create_crew_shift(
    session_token: String,
    report_id: String,
    data: CrewShiftData,
    state: State<'_, AppState>,
) -> Result<CrewShiftWithMembers, String> {
    // Verify session
    get_session(&session_token, &state).map_err(|e| e.to_string())?;

    let conn = state
        .db
        .lock()
        .map_err(|e| format!("Failed to lock database: {}", e))?;

    let crew_shift = crate::models::crew::CrewShift::create(&conn, &report_id, &data)
        .map_err(|e| e.to_string())?;

    Ok(crew_shift)
}

#[tauri::command]
pub async fn list_crew_shifts(
    session_token: String,
    report_id: String,
    state: State<'_, AppState>,
) -> Result<Vec<CrewShiftWithMembers>, String> {
    // Verify session
    get_session(&session_token, &state).map_err(|e| e.to_string())?;

    let conn = state
        .db
        .lock()
        .map_err(|e| format!("Failed to lock database: {}", e))?;

    let crew_shifts = crate::models::crew::CrewShift::list_by_report(&conn, &report_id)
        .map_err(|e| e.to_string())?;

    Ok(crew_shifts)
}

#[tauri::command]
pub async fn delete_crew_shift(
    session_token: String,
    shift_id: String,
    state: State<'_, AppState>,
) -> Result<(), String> {
    // Verify session
    get_session(&session_token, &state).map_err(|e| e.to_string())?;

    let conn = state
        .db
        .lock()
        .map_err(|e| format!("Failed to lock database: {}", e))?;

    crate::models::crew::CrewShift::delete(&conn, &shift_id).map_err(|e| e.to_string())?;

    Ok(())
}

#[tauri::command]
pub async fn delete_all_crew_shifts(
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

    crate::models::crew::CrewShift::delete_all_by_report(&conn, &report_id)
        .map_err(|e| e.to_string())?;

    Ok(())
}
