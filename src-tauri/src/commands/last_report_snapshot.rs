use crate::auth::get_session;
use crate::models::last_report_snapshot::LastReportSnapshot;
use crate::models::report::Report;
use crate::state::AppState;
use rusqlite::params;
use tauri::State;

/// Get the last report snapshot for a rig (1 single query)
#[tauri::command]
pub async fn get_last_report_snapshot(
    session_token: String,
    rig_id: String,
    state: State<'_, AppState>,
) -> Result<Option<LastReportSnapshot>, String> {
    let _session = get_session(&session_token, &state).map_err(|e| e.to_string())?;

    let conn = state
        .db
        .lock()
        .map_err(|e| format!("Failed to lock database: {}", e))?;

    LastReportSnapshot::get_by_rig(&conn, &rig_id).map_err(|e| e.to_string())
}

/// Build and save a snapshot from an existing report.
/// Called by the frontend after saving all sections of a report.
#[tauri::command]
pub async fn update_report_snapshot(
    session_token: String,
    report_id: String,
    state: State<'_, AppState>,
) -> Result<(), String> {
    let session = get_session(&session_token, &state).map_err(|e| e.to_string())?;

    let conn = state
        .db
        .lock()
        .map_err(|e| format!("Failed to lock database: {}", e))?;

    let report = Report::get_by_id(&conn, &report_id).map_err(|e| e.to_string())?;

    // Resolve rig_id from rig_number (reports store the rig name, not the id)
    let rig_id: Option<String> = conn
        .query_row(
            "SELECT id FROM rigs WHERE name = ?1 AND active = 1",
            params![&report.rig_number],
            |row| row.get(0),
        )
        .ok();

    let Some(rig_id) = rig_id else {
        // No matching rig found — skip snapshot silently
        println!(
            "[snapshot] No active rig found for rig_number={:?}, skipping snapshot",
            &report.rig_number
        );
        return Ok(());
    };

    LastReportSnapshot::save_from_report(&conn, &rig_id, &report_id, &session.user_id, &report)
        .map_err(|e| e.to_string())?;

    println!(
        "[snapshot] Updated snapshot for rig_id={} from report_id={}",
        rig_id, report_id
    );

    Ok(())
}
