use crate::error::Result;
use crate::models::{CreateRigInput, Rig, RigWithArea, UpdateRigInput};
use crate::state::AppState;
use chrono::Utc;
use rusqlite::params;
use tauri::State;
use uuid::Uuid;

#[tauri::command]
pub async fn create_rig(
    state: State<'_, AppState>,
    input: CreateRigInput,
    user_id: String,
) -> Result<Rig> {
    let conn = state.db.lock().unwrap();
    let id = Uuid::new_v4().to_string();
    let now = Utc::now().to_rfc3339();

    conn.execute(
        "INSERT INTO rigs (id, name, operator, power, area_id, active, created_by, created_at, updated_at)
         VALUES (?1, ?2, ?3, ?4, ?5, 1, ?6, ?7, ?8)",
        params![
            &id,
            &input.name,
            &input.operator,
            &input.power,
            &input.area_id,
            &user_id,
            &now,
            &now
        ],
    )?;

    Ok(Rig {
        id,
        name: input.name,
        operator: input.operator,
        power: input.power,
        area_id: input.area_id,
        active: true,
        created_by: Some(user_id),
        updated_by: None,
        created_at: now.clone(),
        updated_at: now,
    })
}

#[tauri::command]
pub async fn list_rigs(
    state: State<'_, AppState>,
    include_inactive: bool,
) -> Result<Vec<RigWithArea>> {
    let conn = state.db.lock().unwrap();

    let query = if include_inactive {
        "SELECT r.id, r.name, r.operator, r.power, r.area_id, 
                a.name, a.country, a.state, r.active, r.created_at, r.updated_at
         FROM rigs r
         LEFT JOIN areas a ON r.area_id = a.id
         ORDER BY r.name ASC"
    } else {
        "SELECT r.id, r.name, r.operator, r.power, r.area_id, 
                a.name, a.country, a.state, r.active, r.created_at, r.updated_at
         FROM rigs r
         LEFT JOIN areas a ON r.area_id = a.id
         WHERE r.active = 1
         ORDER BY r.name ASC"
    };

    let mut stmt = conn.prepare(query)?;
    let rigs = stmt
        .query_map([], |row| {
            Ok(RigWithArea {
                id: row.get(0)?,
                name: row.get(1)?,
                operator: row.get(2)?,
                power: row.get(3)?,
                area_id: row.get(4)?,
                area_name: row.get(5)?,
                area_country: row.get(6)?,
                area_state: row.get(7)?,
                active: row.get::<_, i32>(8)? == 1,
                created_at: row.get(9)?,
                updated_at: row.get(10)?,
            })
        })?
        .collect::<std::result::Result<Vec<_>, _>>()?;

    Ok(rigs)
}

#[tauri::command]
pub async fn get_rig(state: State<'_, AppState>, id: String) -> Result<RigWithArea> {
    let conn = state.db.lock().unwrap();

    let rig = conn.query_row(
        "SELECT r.id, r.name, r.operator, r.power, r.area_id, 
                a.name, a.country, a.state, r.active, r.created_at, r.updated_at
         FROM rigs r
         LEFT JOIN areas a ON r.area_id = a.id
         WHERE r.id = ?1",
        params![&id],
        |row| {
            Ok(RigWithArea {
                id: row.get(0)?,
                name: row.get(1)?,
                operator: row.get(2)?,
                power: row.get(3)?,
                area_id: row.get(4)?,
                area_name: row.get(5)?,
                area_country: row.get(6)?,
                area_state: row.get(7)?,
                active: row.get::<_, i32>(8)? == 1,
                created_at: row.get(9)?,
                updated_at: row.get(10)?,
            })
        },
    )?;

    Ok(rig)
}

#[tauri::command]
pub async fn update_rig(
    state: State<'_, AppState>,
    id: String,
    input: UpdateRigInput,
    user_id: String,
) -> Result<RigWithArea> {
    // Perform the update in a scope to ensure all non-Send types are dropped before await
    {
        let conn = state.db.lock().unwrap();
        let now = Utc::now().to_rfc3339();

        let mut updates = Vec::new();
        let mut params_vec: Vec<Box<dyn rusqlite::ToSql>> = Vec::new();

        if let Some(name) = &input.name {
            updates.push("name = ?");
            params_vec.push(Box::new(name.clone()));
        }
        if let Some(operator) = &input.operator {
            updates.push("operator = ?");
            params_vec.push(Box::new(operator.clone()));
        }
        if let Some(power) = &input.power {
            updates.push("power = ?");
            params_vec.push(Box::new(power.clone()));
        }
        if let Some(area_id) = &input.area_id {
            updates.push("area_id = ?");
            params_vec.push(Box::new(area_id.clone()));
        }
        if let Some(active) = input.active {
            updates.push("active = ?");
            params_vec.push(Box::new(if active { 1 } else { 0 }));
        }

        updates.push("updated_by = ?");
        updates.push("updated_at = ?");
        params_vec.push(Box::new(user_id.clone()));
        params_vec.push(Box::new(now.clone()));

        let query = format!("UPDATE rigs SET {} WHERE id = ?", updates.join(", "));
        params_vec.push(Box::new(id.clone()));

        let params_refs: Vec<&dyn rusqlite::ToSql> = params_vec.iter().map(|p| p.as_ref()).collect();
        conn.execute(&query, params_refs.as_slice())?;
    } // All non-Send types (conn, params_vec, params_refs) are dropped here

    get_rig(state, id).await
}

#[tauri::command]
pub async fn delete_rig(state: State<'_, AppState>, id: String) -> Result<()> {
    let conn = state.db.lock().unwrap();

    conn.execute("DELETE FROM rigs WHERE id = ?1", params![&id])?;

    Ok(())
}
