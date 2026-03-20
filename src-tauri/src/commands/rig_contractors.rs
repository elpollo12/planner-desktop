use crate::error::Result;
use crate::models::rig_contractor::{AddRigContractorInput, RigContractor, RigContractorWithCompany};
use crate::state::AppState;
use tauri::State;

/// List all contractors assigned to a rig
#[tauri::command]
pub async fn list_rig_contractors(
    state: State<'_, AppState>,
    rig_id: String,
) -> Result<Vec<RigContractorWithCompany>> {
    let conn = state.db.lock().unwrap();
    let contractors = RigContractor::list_for_rig(&conn, &rig_id)?;
    Ok(contractors)
}

/// Add a contractor to a rig (idempotent — safe to call if already linked)
#[tauri::command]
pub async fn add_rig_contractor(
    state: State<'_, AppState>,
    rig_id: String,
    input: AddRigContractorInput,
) -> Result<RigContractor> {
    let conn = state.db.lock().unwrap();
    let entry = RigContractor::add(&conn, &rig_id, &input.company_id)?;
    Ok(entry)
}

/// Remove a contractor from a rig by rig_contractor id
#[tauri::command]
pub async fn remove_rig_contractor(
    state: State<'_, AppState>,
    id: String,
) -> Result<()> {
    let conn = state.db.lock().unwrap();
    RigContractor::remove(&conn, &id)?;
    Ok(())
}

/// Replace all contractors for a rig with a new list of company IDs.
/// Used in the edit wizard to sync the full contractor list in one call.
#[tauri::command]
pub async fn replace_rig_contractors(
    state: State<'_, AppState>,
    rig_id: String,
    company_ids: Vec<String>,
) -> Result<Vec<RigContractor>> {
    if company_ids.is_empty() {
        return Err(crate::error::AppError::ValidationError(
            "Se requiere al menos un contratista".into(),
        ));
    }
    let conn = state.db.lock().unwrap();
    let result = RigContractor::replace_all(&conn, &rig_id, &company_ids)?;
    Ok(result)
}
