use crate::error::Result;
use crate::models::{Area, CreateAreaInput, UpdateAreaInput};
use crate::state::AppState;
use chrono::Utc;
use rusqlite::params;
use tauri::State;
use uuid::Uuid;

#[tauri::command]
pub async fn create_area(
    state: State<'_, AppState>,
    input: CreateAreaInput,
    user_id: String,
) -> Result<Area> {
    let conn = state.db.lock().unwrap();
    let id = Uuid::new_v4().to_string();
    let now = Utc::now().to_rfc3339();

    let active_int = if input.active { 1 } else { 0 };
    
    conn.execute(
        "INSERT INTO areas (id, name, country, state, active, created_by, created_at, updated_at)
         VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8)",
        params![&id, &input.name, &input.country, &input.state, active_int, &user_id, &now, &now],
    )?;

    Ok(Area {
        id,
        name: input.name,
        country: input.country,
        state: input.state,
        active: input.active,
        created_by: Some(user_id),
        updated_by: None,
        created_at: now.clone(),
        updated_at: now,
    })
}

#[tauri::command]
pub async fn list_areas(state: State<'_, AppState>, include_inactive: bool) -> Result<Vec<Area>> {
    let conn = state.db.lock().unwrap();
    
    let query = if include_inactive {
        "SELECT id, name, country, state, active, created_by, updated_by, created_at, updated_at
         FROM areas WHERE (is_deleted IS NULL OR is_deleted = 0) ORDER BY name ASC"
    } else {
        "SELECT id, name, country, state, active, created_by, updated_by, created_at, updated_at
         FROM areas WHERE active = 1 AND (is_deleted IS NULL OR is_deleted = 0) ORDER BY name ASC"
    };

    let mut stmt = conn.prepare(query)?;
    let areas = stmt
        .query_map([], |row| {
            Ok(Area {
                id: row.get(0)?,
                name: row.get(1)?,
                country: row.get(2)?,
                state: row.get(3)?,
                active: row.get::<_, i32>(4)? == 1,
                created_by: row.get(5)?,
                updated_by: row.get(6)?,
                created_at: row.get(7)?,
                updated_at: row.get(8)?,
            })
        })?
        .collect::<std::result::Result<Vec<_>, _>>()?;

    Ok(areas)
}

#[tauri::command]
pub async fn get_area(state: State<'_, AppState>, id: String) -> Result<Area> {
    let conn = state.db.lock().unwrap();
    
    let area = conn.query_row(
        "SELECT id, name, country, state, active, created_by, updated_by, created_at, updated_at 
         FROM areas WHERE id = ?1",
        params![&id],
        |row| {
            Ok(Area {
                id: row.get(0)?,
                name: row.get(1)?,
                country: row.get(2)?,
                state: row.get(3)?,
                active: row.get::<_, i32>(4)? == 1,
                created_by: row.get(5)?,
                updated_by: row.get(6)?,
                created_at: row.get(7)?,
                updated_at: row.get(8)?,
            })
        },
    )?;

    Ok(area)
}

#[tauri::command]
pub async fn update_area(
    state: State<'_, AppState>,
    id: String,
    input: UpdateAreaInput,
    user_id: String,
) -> Result<Area> {
    // Perform the update in a scope to ensure all non-Send types are dropped before await
    {
        let conn = state.db.lock().unwrap();
        let now = Utc::now().to_rfc3339();

        // Build dynamic update query
        let mut updates = Vec::new();
        let mut params_vec: Vec<Box<dyn rusqlite::ToSql>> = Vec::new();

        if let Some(name) = &input.name {
            updates.push("name = ?");
            params_vec.push(Box::new(name.clone()));
        }
        if let Some(country) = &input.country {
            updates.push("country = ?");
            params_vec.push(Box::new(country.clone()));
        }
        if let Some(state_val) = &input.state {
            updates.push("state = ?");
            params_vec.push(Box::new(state_val.clone()));
        }
        if let Some(active) = input.active {
            updates.push("active = ?");
            params_vec.push(Box::new(if active { 1 } else { 0 }));
        }

        updates.push("updated_by = ?");
        updates.push("updated_at = ?");
        params_vec.push(Box::new(user_id.clone()));
        params_vec.push(Box::new(now.clone()));

        let query = format!("UPDATE areas SET {} WHERE id = ?", updates.join(", "));
        params_vec.push(Box::new(id.clone()));

        let params_refs: Vec<&dyn rusqlite::ToSql> = params_vec.iter().map(|p| p.as_ref()).collect();
        conn.execute(&query, params_refs.as_slice())?;
    } // All non-Send types (conn, params_vec, params_refs) are dropped here

    // Fetch updated area
    get_area(state, id).await
}

#[tauri::command]
pub async fn delete_area(state: State<'_, AppState>, id: String) -> Result<()> {
    let conn = state.db.lock().unwrap();
    let now = Utc::now().to_rfc3339();

    conn.execute(
        "UPDATE areas SET is_deleted = 1, active = 0, updated_at = ?1 WHERE id = ?2",
        params![&now, &id],
    )?;

    Ok(())
}
