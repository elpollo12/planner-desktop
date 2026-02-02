use crate::error::AppError;
use rusqlite::Connection;
use std::path::PathBuf;

pub fn get_db_path() -> Result<PathBuf, AppError> {
    // Get the app data directory
    // On Windows: C:\Users\[User]\AppData\Roaming\d-planner-temp
    // On macOS: ~/Library/Application Support/d-planner-temp
    // On Linux: ~/.local/share/d-planner-temp

    let app_data_dir = dirs::data_dir()
        .ok_or_else(|| AppError::Internal("Could not find app data directory".to_string()))?;

    let mut db_dir = app_data_dir;
    db_dir.push("d-planner-temp");

    // Create the directory if it doesn't exist
    if !db_dir.exists() {
        std::fs::create_dir_all(&db_dir)
            .map_err(|e| AppError::Internal(format!("Failed to create app directory: {}", e)))?;
    }

    db_dir.push("planner.db");
    Ok(db_dir)
}

pub fn initialize_database() -> Result<Connection, AppError> {
    let db_path = get_db_path()?;

    let conn = Connection::open(&db_path)
        .map_err(|e| AppError::Database(e))?;

    // Enable foreign key constraints
    conn.execute("PRAGMA foreign_keys = ON;", [])
        .map_err(|e| AppError::Database(e))?;

    Ok(conn)
}

pub fn create_default_admin_user(conn: &Connection) -> Result<(), AppError> {
    use rusqlite::params;

    // Check if admin user exists
    let admin_exists: bool = conn
        .query_row(
            "SELECT COUNT(*) > 0 FROM users WHERE username = ?1",
            params!["admin"],
            |row| row.get(0),
        )
        .map_err(|e| AppError::Database(e))?;

    if !admin_exists {
        // Generate password hash for "admin123"
        let password_hash = bcrypt::hash("admin123", 12)
            .map_err(|e| AppError::PasswordHashError(e))?;

        let admin_id = uuid::Uuid::new_v4().to_string();
        let now = chrono::Utc::now().to_rfc3339();

        conn.execute(
            "INSERT INTO users (id, username, password_hash, full_name, role, active, created_at, updated_at)
             VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8)",
            params![
                &admin_id,
                "admin",
                &password_hash,
                "Administrator",
                "admin",
                1,
                &now,
                &now
            ],
        )
        .map_err(|e| AppError::Database(e))?;

        println!("Default admin user created successfully");
    }

    Ok(())
}
