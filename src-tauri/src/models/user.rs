#![allow(dead_code)]

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
    pub has_all_rigs: bool,
    pub supervisor_id: Option<String>,
    pub last_login: Option<String>,
    pub created_by: Option<String>,
    pub updated_by: Option<String>,
    pub created_at: String,
    pub updated_at: String,
}

/// User with assigned rigs (for API responses)
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct UserWithRigs {
    #[serde(flatten)]
    pub user: User,
    pub assigned_rig_ids: Vec<String>,
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
    #[serde(default)]
    pub has_all_rigs: bool,
    #[serde(default)]
    pub assigned_rig_ids: Vec<String>,
    pub supervisor_id: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct UpdateUserRequest {
    pub full_name: Option<String>,
    pub ci: Option<String>,
    pub role: Option<String>,
    pub position: Option<String>,
    pub active: Option<bool>,
    pub has_all_rigs: Option<bool>,
    pub assigned_rig_ids: Option<Vec<String>>,
    pub supervisor_id: Option<Option<String>>,
}

impl User {
    pub fn from_row(row: &Row) -> Result<Self, rusqlite::Error> {
        Ok(User {
            id: row.get(0)?,
            username: row.get(1)?,
            password_hash: row.get(2)?,
            full_name: row.get(3)?,
            ci: row.get(4)?,
            role: row.get(5)?,
            position: row.get(6)?,
            active: row.get::<_, i32>(7)? == 1,
            has_all_rigs: row.get::<_, i32>(8).unwrap_or(0) == 1,
            supervisor_id: row.get(9)?,
            last_login: row.get(10)?,
            created_by: row.get(11)?,
            updated_by: row.get(12)?,
            created_at: row.get(13)?,
            updated_at: row.get(14)?,
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
            "INSERT INTO users (id, username, password_hash, full_name, ci, role, position, active, has_all_rigs, supervisor_id, created_by, created_at, updated_at)
             VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12, ?13)",
            params![
                &id,
                &request.username,
                &password_hash,
                &request.full_name,
                &request.ci,
                &request.role,
                &request.position,
                1,
                if request.has_all_rigs { 1 } else { 0 },
                &request.supervisor_id,
                &created_by,
                &now,
                &now
            ],
        )?;

        // Assign rigs if specified
        if !request.has_all_rigs && !request.assigned_rig_ids.is_empty() {
            User::assign_rigs(conn, &id, &request.assigned_rig_ids, created_by.as_deref())?;
        }

        User::get_by_id(conn, &id)
    }

    /// Get user by ID (excludes soft-deleted users)
    pub fn get_by_id(conn: &Connection, user_id: &str) -> Result<User, AppError> {
        let user = conn.query_row(
            "SELECT id, username, password_hash, full_name, ci, role, position, active, has_all_rigs, supervisor_id, last_login, created_by, updated_by, created_at, updated_at
             FROM users WHERE id = ?1 AND (is_deleted IS NULL OR is_deleted = 0)",
            params![user_id],
            User::from_row,
        )?;

        Ok(user)
    }

    /// Get user by username (excludes soft-deleted users)
    pub fn get_by_username(conn: &Connection, username: &str) -> Result<User, AppError> {
        let user = conn.query_row(
            "SELECT id, username, password_hash, full_name, ci, role, position, active, has_all_rigs, supervisor_id, last_login, created_by, updated_by, created_at, updated_at
             FROM users WHERE username = ?1 AND (is_deleted IS NULL OR is_deleted = 0)",
            params![username],
            User::from_row,
        )?;

        Ok(user)
    }

    /// List all users (excludes soft-deleted)
    pub fn list(conn: &Connection) -> Result<Vec<User>, AppError> {
        let mut stmt = conn.prepare(
            "SELECT id, username, password_hash, full_name, ci, role, position, active, has_all_rigs, supervisor_id, last_login, created_by, updated_by, created_at, updated_at
             FROM users WHERE (is_deleted IS NULL OR is_deleted = 0) ORDER BY created_at DESC"
        )?;

        let users = stmt
            .query_map([], User::from_row)?
            .collect::<Result<Vec<_>, _>>()?;

        Ok(users)
    }

    /// Get user with assigned rigs
    pub fn get_with_rigs(conn: &Connection, user_id: &str) -> Result<UserWithRigs, AppError> {
        let user = User::get_by_id(conn, user_id)?;
        let assigned_rig_ids = User::get_assigned_rig_ids(conn, user_id)?;
        Ok(UserWithRigs { user, assigned_rig_ids })
    }

    /// List all users with their assigned rigs
    pub fn list_with_rigs(conn: &Connection) -> Result<Vec<UserWithRigs>, AppError> {
        let users = User::list(conn)?;
        let mut users_with_rigs = Vec::new();

        for user in users {
            let assigned_rig_ids = User::get_assigned_rig_ids(conn, &user.id)?;
            users_with_rigs.push(UserWithRigs { user, assigned_rig_ids });
        }

        Ok(users_with_rigs)
    }

    /// Get assigned rig IDs for a user
    pub fn get_assigned_rig_ids(conn: &Connection, user_id: &str) -> Result<Vec<String>, AppError> {
        let mut stmt = conn.prepare(
            "SELECT rig_id FROM user_rigs WHERE user_id = ?1"
        )?;

        let rig_ids = stmt
            .query_map(params![user_id], |row| row.get(0))?
            .collect::<Result<Vec<String>, _>>()?;

        Ok(rig_ids)
    }

    /// Assign rigs to a user (replaces existing assignments)
    pub fn assign_rigs(conn: &Connection, user_id: &str, rig_ids: &[String], assigned_by: Option<&str>) -> Result<(), AppError> {
        let now = chrono::Utc::now().to_rfc3339();

        // Remove existing assignments
        conn.execute("DELETE FROM user_rigs WHERE user_id = ?1", params![user_id])?;

        // Add new assignments
        for rig_id in rig_ids {
            let id = uuid::Uuid::new_v4().to_string();
            conn.execute(
                "INSERT INTO user_rigs (id, user_id, rig_id, assigned_by, assigned_at, created_at, updated_at) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7)",
                params![&id, user_id, rig_id, assigned_by, &now, &now, &now],
            )?;
        }

        Ok(())
    }

    /// Check if user has access to a specific rig
    pub fn has_rig_access(conn: &Connection, user_id: &str, rig_id: &str) -> Result<bool, AppError> {
        let user = User::get_by_id(conn, user_id)?;

        // Admin or has_all_rigs = full access
        if user.role == "admin" || user.has_all_rigs {
            return Ok(true);
        }

        // Check specific assignment
        let count: i32 = conn.query_row(
            "SELECT COUNT(*) FROM user_rigs WHERE user_id = ?1 AND rig_id = ?2",
            params![user_id, rig_id],
            |row| row.get(0),
        )?;

        Ok(count > 0)
    }

    /// Get rigs accessible by user (returns all if has_all_rigs or admin)
    pub fn get_accessible_rig_ids(conn: &Connection, user_id: &str) -> Result<Option<Vec<String>>, AppError> {
        let user = User::get_by_id(conn, user_id)?;

        // Admin or has_all_rigs = no filter (None means all)
        if user.role == "admin" || user.has_all_rigs {
            return Ok(None);
        }

        // Return specific assignments
        let rig_ids = User::get_assigned_rig_ids(conn, user_id)?;
        Ok(Some(rig_ids))
    }

    /// Get rig names by their IDs
    pub fn get_rig_names_by_ids(conn: &Connection, rig_ids: &[String]) -> Result<Vec<String>, AppError> {
        if rig_ids.is_empty() {
            return Ok(Vec::new());
        }

        let placeholders: Vec<&str> = rig_ids.iter().map(|_| "?").collect();
        let query = format!("SELECT name FROM rigs WHERE id IN ({})", placeholders.join(","));

        let mut stmt = conn.prepare(&query)?;
        let params: Vec<&dyn rusqlite::ToSql> = rig_ids.iter().map(|id| id as &dyn rusqlite::ToSql).collect();

        let names = stmt
            .query_map(params.as_slice(), |row| row.get::<_, String>(0))?
            .collect::<Result<Vec<String>, _>>()?;

        Ok(names)
    }

    /// Get accessible rig names for a user (None means all rigs - no filter needed)
    pub fn get_accessible_rig_names(conn: &Connection, user_id: &str) -> Result<Option<Vec<String>>, AppError> {
        let rig_ids = User::get_accessible_rig_ids(conn, user_id)?;

        match rig_ids {
            None => Ok(None), // User has access to all rigs
            Some(ids) => {
                let names = User::get_rig_names_by_ids(conn, &ids)?;
                Ok(Some(names))
            }
        }
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
        if let Some(has_all_rigs) = request.has_all_rigs {
            updates.push("has_all_rigs = ?");
            params_vec.push(Box::new(if has_all_rigs { 1 } else { 0 }));
        }
        if let Some(ref supervisor_id) = request.supervisor_id {
            updates.push("supervisor_id = ?");
            params_vec.push(Box::new(supervisor_id.clone()));
        }

        updates.push("updated_by = ?");
        params_vec.push(Box::new(updated_by.clone()));
        updates.push("updated_at = ?");
        params_vec.push(Box::new(now.clone()));

        params_vec.push(Box::new(user_id.to_string()));

        let query = format!("UPDATE users SET {} WHERE id = ?", updates.join(", "));

        let params_refs: Vec<&dyn rusqlite::ToSql> = params_vec.iter().map(|p| p.as_ref()).collect();

        conn.execute(&query, params_refs.as_slice())?;

        // Update rig assignments if provided
        if let Some(ref rig_ids) = request.assigned_rig_ids {
            User::assign_rigs(conn, user_id, rig_ids, updated_by.as_deref())?;
        }

        User::get_by_id(conn, user_id)
    }

    /// Update last login timestamp (also updates updated_at for sync)
    pub fn update_last_login(conn: &Connection, user_id: &str) -> Result<(), AppError> {
        let now = chrono::Utc::now().to_rfc3339();

        conn.execute(
            "UPDATE users SET last_login = ?1, updated_at = ?2 WHERE id = ?3",
            params![&now, &now, user_id],
        )?;

        Ok(())
    }

    /// Soft delete user (marks is_deleted = 1 so sync propagates it)
    pub fn delete(conn: &Connection, user_id: &str) -> Result<(), AppError> {
        let now = chrono::Utc::now().to_rfc3339();
        conn.execute(
            "UPDATE users SET is_deleted = 1, active = 0, updated_at = ?1 WHERE id = ?2",
            params![&now, user_id],
        )?;
        Ok(())
    }
}
