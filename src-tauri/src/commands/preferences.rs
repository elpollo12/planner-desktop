use crate::auth::get_session;
use crate::error::Result;
use crate::models::user_preferences::{SavePreferencesInput, UserPreferences};
use crate::state::AppState;
use chrono::Utc;
use rusqlite::params;
use tauri::State;
use uuid::Uuid;

#[tauri::command]
pub async fn get_user_preferences(
    session_token: String,
    state: State<'_, AppState>,
) -> Result<Option<UserPreferences>> {
    let session = get_session(&session_token, &state)?;
    let conn = state.db.lock().unwrap();

    let result = conn.query_row(
        "SELECT id, user_id, theme_mode, created_at, updated_at
         FROM user_preferences WHERE user_id = ?1",
        params![&session.user_id],
        |row| {
            Ok(UserPreferences {
                id: row.get(0)?,
                user_id: row.get(1)?,
                theme_mode: row.get(2)?,
                created_at: row.get(3)?,
                updated_at: row.get(4)?,
            })
        },
    );

    match result {
        Ok(prefs) => Ok(Some(prefs)),
        Err(rusqlite::Error::QueryReturnedNoRows) => Ok(None),
        Err(e) => Err(e.into()),
    }
}

#[tauri::command]
pub async fn save_user_preferences(
    session_token: String,
    input: SavePreferencesInput,
    state: State<'_, AppState>,
) -> Result<UserPreferences> {
    let session = get_session(&session_token, &state)?;

    // Validate theme mode
    if let Some(ref mode) = input.theme_mode {
        if mode != "light" && mode != "dark" {
            return Err(crate::error::AppError::ValidationError(
                "Invalid theme mode. Use 'light' or 'dark'".to_string(),
            ));
        }
    }

    let conn = state.db.lock().unwrap();
    let now = Utc::now().to_rfc3339();
    let id = Uuid::new_v4().to_string();

    let mode = input.theme_mode.unwrap_or_else(|| "light".to_string());

    conn.execute(
        "INSERT INTO user_preferences (id, user_id, theme_mode, created_at, updated_at)
         VALUES (?1, ?2, ?3, ?4, ?5)
         ON CONFLICT(user_id) DO UPDATE SET
           theme_mode = excluded.theme_mode,
           updated_at = excluded.updated_at",
        params![&id, &session.user_id, &mode, &now, &now],
    )?;

    // Fetch the saved preferences
    let prefs = conn.query_row(
        "SELECT id, user_id, theme_mode, created_at, updated_at
         FROM user_preferences WHERE user_id = ?1",
        params![&session.user_id],
        |row| {
            Ok(UserPreferences {
                id: row.get(0)?,
                user_id: row.get(1)?,
                theme_mode: row.get(2)?,
                created_at: row.get(3)?,
                updated_at: row.get(4)?,
            })
        },
    )?;

    Ok(prefs)
}
