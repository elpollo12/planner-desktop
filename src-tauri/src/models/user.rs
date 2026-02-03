use crate::error::AppError;
use rusqlite::{params, Connection, Row};
use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub enum UserRole {
    Operator,
    Supervisor,
    Admin,
}

impl UserRole {
    pub fn from_str(s: &str) -> Result<Self, AppError> {
        match s {
            "operator" => Ok(UserRole::Operator),
            "supervisor" => Ok(UserRole::Supervisor),
            "admin" => Ok(UserRole::Admin),
            _ => Err(AppError::ValidationError(format!("Invalid role: {}", s))),
        }
    }

    pub fn to_str(&self) -> &str {
        match self {
            UserRole::Operator => "operator",
            UserRole::Supervisor => "supervisor",
            UserRole::Admin => "admin",
        }
    }

    /// Check if this role has the required permission
    /// Admin > Supervisor > Operator
    pub fn has_permission(&self, required: &UserRole) -> bool {
        match (self, required) {
            (UserRole::Admin, _) => true,
            (UserRole::Supervisor, UserRole::Supervisor) => true,
            (UserRole::Supervisor, UserRole::Operator) => true,
            (UserRole::Operator, UserRole::Operator) => true,
            _ => false,
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct User {
    pub id: String,
    pub username: String,
    #[serde(skip_serializing)]
    pub password_hash: String,
    pub full_name: String,
    pub ci: Option<String>,
    pub role: String,
    pub position: Option<String>,
    pub active: bool,
    pub last_login: Option<String>,
    pub created_by: Option<String>,
    pub updated_by: Option<String>,
    pub created_at: String,
    pub updated_at: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CreateUserRequest {
    pub username: String,
    pub password: String,
    pub full_name: String,
    pub ci: Option<String>,
    pub role: String,
    pub position: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct UpdateUserRequest {
    pub full_name: Option<String>,
    pub ci: Option<String>,
    pub role: Option<String>,
    pub position: Option<String>,
    pub active: Option<bool>,
}

impl User {
    fn from_row(row: &Row) -> Result<Self, rusqlite::Error> {
        Ok(User {
            id: row.get(0)?,
            username: row.get(1)?,
            password_hash: row.get(2)?,
            full_name: row.get(3)?,
            ci: row.get(4)?,
            role: row.get(5)?,
            position: row.get(6)?,
            active: row.get::<_, i32>(7)? == 1,
            last_login: row.get(8)?,
            created_by: row.get(9)?,
            updated_by: row.get(10)?,
            created_at: row.get(11)?,
            updated_at: row.get(12)?,
        })
    }

    /// Create a new user
    pub fn create(
        conn: &Connection,
        request: &CreateUserRequest,
        password_hash: String,
        created_by: Option<String>,
    ) -> Result<User, AppError> {
        let id = uuid::Uuid::new_v4().to_string();
        let now = chrono::Utc::now().to_rfc3339();

        // Validate role
        UserRole::from_str(&request.role)?;

        conn.execute(
            "INSERT INTO users (id, username, password_hash, full_name, ci, role, position, active, created_by, created_at, updated_at)
             VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11)",
            params![
                &id,
                &request.username,
                &password_hash,
                &request.full_name,
                &request.ci,
                &request.role,
                &request.position,
                1,
                &created_by,
                &now,
                &now
            ],
        )?;

        User::get_by_id(conn, &id)
    }

    /// Get user by ID
    pub fn get_by_id(conn: &Connection, user_id: &str) -> Result<User, AppError> {
        let user = conn.query_row(
            "SELECT id, username, password_hash, full_name, ci, role, position, active, last_login, created_by, updated_by, created_at, updated_at
             FROM users WHERE id = ?1",
            params![user_id],
            User::from_row,
        )?;

        Ok(user)
    }

    /// Get user by username
    pub fn get_by_username(conn: &Connection, username: &str) -> Result<User, AppError> {
        let user = conn.query_row(
            "SELECT id, username, password_hash, full_name, ci, role, position, active, last_login, created_by, updated_by, created_at, updated_at
             FROM users WHERE username = ?1",
            params![username],
            User::from_row,
        )?;

        Ok(user)
    }

    /// List all users
    pub fn list(conn: &Connection) -> Result<Vec<User>, AppError> {
        let mut stmt = conn.prepare(
            "SELECT id, username, password_hash, full_name, ci, role, position, active, last_login, created_by, updated_by, created_at, updated_at
             FROM users ORDER BY created_at DESC"
        )?;

        let users = stmt
            .query_map([], User::from_row)?
            .collect::<Result<Vec<_>, _>>()?;

        Ok(users)
    }

    /// Update user
    pub fn update(
        conn: &Connection,
        user_id: &str,
        request: &UpdateUserRequest,
        updated_by: Option<String>,
    ) -> Result<User, AppError> {
        let now = chrono::Utc::now().to_rfc3339();

        // Validate role if provided
        if let Some(ref role) = request.role {
            UserRole::from_str(role)?;
        }

        // Build dynamic update query
        let mut updates = Vec::new();
        let mut params_vec: Vec<Box<dyn rusqlite::ToSql>> = Vec::new();

        if let Some(ref full_name) = request.full_name {
            updates.push("full_name = ?");
            params_vec.push(Box::new(full_name.clone()));
        }
        if let Some(ref ci) = request.ci {
            updates.push("ci = ?");
            params_vec.push(Box::new(ci.clone()));
        }
        if let Some(ref role) = request.role {
            updates.push("role = ?");
            params_vec.push(Box::new(role.clone()));
        }
        if let Some(ref position) = request.position {
            updates.push("position = ?");
            params_vec.push(Box::new(position.clone()));
        }
        if let Some(active) = request.active {
            updates.push("active = ?");
            params_vec.push(Box::new(if active { 1 } else { 0 }));
        }

        updates.push("updated_by = ?");
        params_vec.push(Box::new(updated_by.clone()));
        updates.push("updated_at = ?");
        params_vec.push(Box::new(now.clone()));

        params_vec.push(Box::new(user_id.to_string()));

        let query = format!("UPDATE users SET {} WHERE id = ?", updates.join(", "));

        let params_refs: Vec<&dyn rusqlite::ToSql> = params_vec.iter().map(|p| p.as_ref()).collect();

        conn.execute(&query, params_refs.as_slice())?;

        User::get_by_id(conn, user_id)
    }

    /// Update last login timestamp
    pub fn update_last_login(conn: &Connection, user_id: &str) -> Result<(), AppError> {
        let now = chrono::Utc::now().to_rfc3339();

        conn.execute(
            "UPDATE users SET last_login = ?1 WHERE id = ?2",
            params![&now, user_id],
        )?;

        Ok(())
    }

    /// Delete user (soft delete by setting active = 0, or hard delete)
    pub fn delete(conn: &Connection, user_id: &str) -> Result<(), AppError> {
        conn.execute("DELETE FROM users WHERE id = ?1", params![user_id])?;
        Ok(())
    }
}
