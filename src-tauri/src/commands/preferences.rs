use crate::auth::get_session;
use crate::error::Result;
use crate::models::user_preferences::{SavePreferencesInput, UserPreferences};
use crate::state::AppState;
use chrono::Utc;
use rusqlite::params;
use std::fmt::Write;
use std::path::Path;
use tauri::State;
use uuid::Uuid;

fn is_valid_hex_color(color: &str) -> bool {
    if color.len() != 7 || !color.starts_with('#') {
        return false;
    }
    color[1..].chars().all(|c| c.is_ascii_hexdigit())
}

#[tauri::command]
pub async fn get_user_preferences(
    session_token: String,
    state: State<'_, AppState>,
) -> Result<Option<UserPreferences>> {
    let session = get_session(&session_token, &state)?;
    let conn = state.db.lock().unwrap();

    let result = conn.query_row(
        "SELECT id, user_id, primary_color, secondary_color, theme_mode, logo_path, created_at, updated_at
         FROM user_preferences WHERE user_id = ?1",
        params![&session.user_id],
        |row| {
            Ok(UserPreferences {
                id: row.get(0)?,
                user_id: row.get(1)?,
                primary_color: row.get(2)?,
                secondary_color: row.get(3)?,
                theme_mode: row.get(4)?,
                logo_path: row.get(5)?,
                created_at: row.get(6)?,
                updated_at: row.get(7)?,
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

    // Validate colors
    if let Some(ref color) = input.primary_color {
        if !is_valid_hex_color(color) {
            return Err(crate::error::AppError::ValidationError(
                "Invalid primary color format. Use #rrggbb".to_string(),
            ));
        }
    }
    if let Some(ref color) = input.secondary_color {
        if !is_valid_hex_color(color) {
            return Err(crate::error::AppError::ValidationError(
                "Invalid secondary color format. Use #rrggbb".to_string(),
            ));
        }
    }
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

    let primary = input.primary_color.unwrap_or_else(|| "#1e3a5f".to_string());
    let secondary = input.secondary_color.unwrap_or_else(|| "#f97316".to_string());
    let mode = input.theme_mode.unwrap_or_else(|| "light".to_string());

    conn.execute(
        "INSERT INTO user_preferences (id, user_id, primary_color, secondary_color, theme_mode, created_at, updated_at)
         VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7)
         ON CONFLICT(user_id) DO UPDATE SET
           primary_color = excluded.primary_color,
           secondary_color = excluded.secondary_color,
           theme_mode = excluded.theme_mode,
           updated_at = excluded.updated_at",
        params![&id, &session.user_id, &primary, &secondary, &mode, &now, &now],
    )?;

    // Fetch the saved preferences
    let prefs = conn.query_row(
        "SELECT id, user_id, primary_color, secondary_color, theme_mode, logo_path, created_at, updated_at
         FROM user_preferences WHERE user_id = ?1",
        params![&session.user_id],
        |row| {
            Ok(UserPreferences {
                id: row.get(0)?,
                user_id: row.get(1)?,
                primary_color: row.get(2)?,
                secondary_color: row.get(3)?,
                theme_mode: row.get(4)?,
                logo_path: row.get(5)?,
                created_at: row.get(6)?,
                updated_at: row.get(7)?,
            })
        },
    )?;

    Ok(prefs)
}

#[tauri::command]
pub async fn upload_logo(
    session_token: String,
    file_data: Vec<u8>,
    file_name: String,
    state: State<'_, AppState>,
) -> Result<String> {
    let session = get_session(&session_token, &state)?;

    // Validate file size (max 2MB)
    if file_data.len() > 2 * 1024 * 1024 {
        return Err(crate::error::AppError::ValidationError(
            "File size exceeds 2MB limit".to_string(),
        ));
    }

    // Validate extension
    let ext = file_name
        .rsplit('.')
        .next()
        .unwrap_or("")
        .to_lowercase();
    if !["png", "jpg", "jpeg", "svg", "webp"].contains(&ext.as_str()) {
        return Err(crate::error::AppError::ValidationError(
            "Invalid file type. Use PNG, JPG, SVG or WEBP".to_string(),
        ));
    }

    // Get app data directory
    let app_data_dir = dirs::data_dir()
        .ok_or_else(|| crate::error::AppError::Internal("Could not find app data directory".to_string()))?;

    let logos_dir = app_data_dir.join("d-planner-temp").join("logos");
    std::fs::create_dir_all(&logos_dir)
        .map_err(|e| crate::error::AppError::Internal(format!("Failed to create logos directory: {}", e)))?;

    // Delete old logo if exists
    {
        let conn = state.db.lock().unwrap();
        let old_path: Option<String> = conn
            .query_row(
                "SELECT logo_path FROM user_preferences WHERE user_id = ?1",
                params![&session.user_id],
                |row| row.get(0),
            )
            .unwrap_or(None);

        if let Some(ref path) = old_path {
            let _ = std::fs::remove_file(path);
        }
    }

    // Save new file
    let timestamp = Utc::now().timestamp();
    let new_filename = format!("{}_{}.{}", session.user_id, timestamp, ext);
    let file_path = logos_dir.join(&new_filename);
    let file_path_str = file_path.to_string_lossy().to_string();

    std::fs::write(&file_path, &file_data)
        .map_err(|e| crate::error::AppError::Internal(format!("Failed to save logo file: {}", e)))?;

    // Update or insert preferences with logo path
    let conn = state.db.lock().unwrap();
    let now = Utc::now().to_rfc3339();
    let id = Uuid::new_v4().to_string();

    conn.execute(
        "INSERT INTO user_preferences (id, user_id, logo_path, created_at, updated_at)
         VALUES (?1, ?2, ?3, ?4, ?5)
         ON CONFLICT(user_id) DO UPDATE SET
           logo_path = excluded.logo_path,
           updated_at = excluded.updated_at",
        params![&id, &session.user_id, &file_path_str, &now, &now],
    )?;

    Ok(file_path_str)
}

#[tauri::command]
pub async fn remove_logo(
    session_token: String,
    state: State<'_, AppState>,
) -> Result<()> {
    let session = get_session(&session_token, &state)?;
    let conn = state.db.lock().unwrap();

    // Get current logo path
    let old_path: Option<String> = conn
        .query_row(
            "SELECT logo_path FROM user_preferences WHERE user_id = ?1",
            params![&session.user_id],
            |row| row.get(0),
        )
        .unwrap_or(None);

    // Delete file
    if let Some(ref path) = old_path {
        let _ = std::fs::remove_file(path);
    }

    // Clear logo path in DB
    let now = Utc::now().to_rfc3339();
    conn.execute(
        "UPDATE user_preferences SET logo_path = NULL, updated_at = ?1 WHERE user_id = ?2",
        params![&now, &session.user_id],
    )?;

    Ok(())
}

fn get_mime_type(ext: &str) -> &str {
    match ext {
        "png" => "image/png",
        "jpg" | "jpeg" => "image/jpeg",
        "svg" => "image/svg+xml",
        "webp" => "image/webp",
        _ => "application/octet-stream",
    }
}

#[tauri::command]
pub async fn get_logo_data(
    session_token: String,
    state: State<'_, AppState>,
) -> Result<Option<String>> {
    let session = get_session(&session_token, &state)?;
    let conn = state.db.lock().unwrap();

    let logo_path: Option<String> = conn
        .query_row(
            "SELECT logo_path FROM user_preferences WHERE user_id = ?1",
            params![&session.user_id],
            |row| row.get(0),
        )
        .unwrap_or(None);

    match logo_path {
        Some(ref path_str) => {
            let path = Path::new(path_str);
            if !path.exists() {
                return Ok(None);
            }
            let data = std::fs::read(path)
                .map_err(|e| crate::error::AppError::Internal(format!("Failed to read logo: {}", e)))?;

            let ext = path.extension()
                .and_then(|e| e.to_str())
                .unwrap_or("png")
                .to_lowercase();
            let mime = get_mime_type(&ext);

            let mut b64 = String::from("data:");
            b64.push_str(mime);
            b64.push_str(";base64,");

            let encoded = base64_encode(&data);
            write!(&mut b64, "{}", encoded).unwrap();

            Ok(Some(b64))
        }
        None => Ok(None),
    }
}

fn base64_encode(data: &[u8]) -> String {
    const CHARS: &[u8] = b"ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
    let mut result = String::with_capacity((data.len() + 2) / 3 * 4);

    for chunk in data.chunks(3) {
        let b0 = chunk[0] as u32;
        let b1 = if chunk.len() > 1 { chunk[1] as u32 } else { 0 };
        let b2 = if chunk.len() > 2 { chunk[2] as u32 } else { 0 };

        let triple = (b0 << 16) | (b1 << 8) | b2;

        result.push(CHARS[((triple >> 18) & 0x3F) as usize] as char);
        result.push(CHARS[((triple >> 12) & 0x3F) as usize] as char);

        if chunk.len() > 1 {
            result.push(CHARS[((triple >> 6) & 0x3F) as usize] as char);
        } else {
            result.push('=');
        }

        if chunk.len() > 2 {
            result.push(CHARS[(triple & 0x3F) as usize] as char);
        } else {
            result.push('=');
        }
    }

    result
}
