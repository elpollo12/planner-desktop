use rusqlite::{params, Connection};
use std::collections::{HashMap, HashSet};
use std::sync::{Arc, Mutex};
use std::time::Instant;

#[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]
pub struct SessionInfo {
    pub user_id: String,
    pub username: String,
    pub role: String,
    pub login_time: String,
    pub expires_at: String,
}

pub struct AppState {
    pub db: Arc<Mutex<Connection>>,
    pub sessions: Arc<Mutex<HashMap<String, SessionInfo>>>,
    pub login_attempts: Arc<Mutex<HashMap<String, Vec<Instant>>>>,
    /// Tracks which user_ids have already completed their first push this session.
    /// Resets on app restart. Prevents non-admins from skipping push forever
    /// when last_push_at is null (fresh DB / first login).
    pub initial_push_done: Arc<Mutex<HashSet<String>>>,
}

impl AppState {
    pub fn new(db: Connection) -> Self {
        Self {
            db: Arc::new(Mutex::new(db)),
            sessions: Arc::new(Mutex::new(HashMap::new())),
            login_attempts: Arc::new(Mutex::new(HashMap::new())),
            initial_push_done: Arc::new(Mutex::new(HashSet::new())),
        }
    }
}

/// Load valid (non-expired) sessions from SQLite into the in-memory HashMap.
/// Called once at app startup.
pub fn load_sessions_from_db(conn: &Connection) -> HashMap<String, SessionInfo> {
    let now = chrono::Utc::now().to_rfc3339();
    let mut map = HashMap::new();

    let mut stmt = match conn.prepare(
        "SELECT token, user_id, username, role, login_time, expires_at
         FROM sessions WHERE expires_at > ?1",
    ) {
        Ok(s) => s,
        Err(e) => {
            eprintln!("Failed to prepare session query: {}", e);
            return map;
        }
    };

    let rows = match stmt.query_map(params![&now], |row| {
        Ok((
            row.get::<_, String>(0)?,
            SessionInfo {
                user_id: row.get(1)?,
                username: row.get(2)?,
                role: row.get(3)?,
                login_time: row.get(4)?,
                expires_at: row.get(5)?,
            },
        ))
    }) {
        Ok(r) => r,
        Err(e) => {
            eprintln!("Failed to query sessions: {}", e);
            return map;
        }
    };

    for row in rows {
        if let Ok((token, info)) = row {
            map.insert(token, info);
        }
    }

    // Clean up expired sessions
    let _ = conn.execute(
        "DELETE FROM sessions WHERE expires_at <= ?1",
        params![&now],
    );

    println!("Loaded {} active sessions from database", map.len());
    map
}

/// Save a session to SQLite.
pub fn save_session_to_db(conn: &Connection, token: &str, info: &SessionInfo) {
    if let Err(e) = conn.execute(
        "INSERT OR REPLACE INTO sessions (token, user_id, username, role, login_time, expires_at)
         VALUES (?1, ?2, ?3, ?4, ?5, ?6)",
        params![
            token,
            &info.user_id,
            &info.username,
            &info.role,
            &info.login_time,
            &info.expires_at,
        ],
    ) {
        eprintln!("Failed to save session to DB: {}", e);
    }
}

/// Remove a session from SQLite.
pub fn remove_session_from_db(conn: &Connection, token: &str) {
    if let Err(e) = conn.execute("DELETE FROM sessions WHERE token = ?1", params![token]) {
        eprintln!("Failed to remove session from DB: {}", e);
    }
}
