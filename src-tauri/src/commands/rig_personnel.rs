use crate::error::Result;
use crate::models::rig_personnel::{
    CreateRigPersonnelInput, RigPersonnel, UpdateRigPersonnelInput,
};
use crate::state::AppState;
use tauri::State;

#[tauri::command]
pub async fn create_rig_personnel(
    state: State<'_, AppState>,
    rig_id: String,
    input: CreateRigPersonnelInput,
) -> Result<RigPersonnel> {
    let conn = state.db.lock().unwrap();
    let person = RigPersonnel::create(&conn, &rig_id, &input)?;
    Ok(person)
}

#[tauri::command]
pub async fn list_rig_personnel(
    state: State<'_, AppState>,
    rig_id: String,
    include_inactive: bool,
) -> Result<Vec<RigPersonnel>> {
    let conn = state.db.lock().unwrap();
    let personnel = RigPersonnel::list_by_rig(&conn, &rig_id, !include_inactive)?;
    Ok(personnel)
}

#[tauri::command]
pub async fn update_rig_personnel(
    state: State<'_, AppState>,
    id: String,
    input: UpdateRigPersonnelInput,
) -> Result<RigPersonnel> {
    let conn = state.db.lock().unwrap();
    let person = RigPersonnel::update(&conn, &id, &input)?;
    Ok(person)
}

#[tauri::command]
pub async fn delete_rig_personnel(
    state: State<'_, AppState>,
    id: String,
) -> Result<()> {
    let conn = state.db.lock().unwrap();
    RigPersonnel::delete(&conn, &id)?;
    Ok(())
}
