use rusqlite::{params, Connection, Row};
use serde::{Deserialize, Serialize};
use uuid::Uuid;

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Operator {
    pub id: String,
    pub name: String,
    pub logo_path: Option<String>,
    pub active: bool,
    pub created_at: String,
    pub updated_at: String,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CreateOperatorInput {
    pub name: String,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct UpdateOperatorInput {
    pub name: Option<String>,
    pub active: Option<bool>,
}

impl Operator {
    pub fn from_row(row: &Row) -> rusqlite::Result<Self> {
        Ok(Self {
            id: row.get("id")?,
            name: row.get("name")?,
            logo_path: row.get("logo_path")?,
            active: row.get::<_, i32>("active")? == 1,
            created_at: row.get("created_at")?,
            updated_at: row.get("updated_at")?,
        })
    }

    /// Get all operators (optionally filter by active status)
    pub fn list(conn: &Connection, only_active: bool) -> rusqlite::Result<Vec<Self>> {
        let sql = if only_active {
            "SELECT * FROM operators WHERE active = 1 ORDER BY name ASC"
        } else {
            "SELECT * FROM operators ORDER BY name ASC"
        };

        let mut stmt = conn.prepare(sql)?;
        let rows = stmt.query_map([], |row| Self::from_row(row))?;

        let mut operators = Vec::new();
        for row in rows {
            operators.push(row?);
        }
        Ok(operators)
    }

    /// Get operator by ID
    pub fn get_by_id(conn: &Connection, id: &str) -> rusqlite::Result<Option<Self>> {
        let mut stmt = conn.prepare("SELECT * FROM operators WHERE id = ?")?;
        let mut rows = stmt.query(params![id])?;

        if let Some(row) = rows.next()? {
            Ok(Some(Self::from_row(row)?))
        } else {
            Ok(None)
        }
    }

    /// Get operator by name
    pub fn get_by_name(conn: &Connection, name: &str) -> rusqlite::Result<Option<Self>> {
        let mut stmt = conn.prepare("SELECT * FROM operators WHERE name = ?")?;
        let mut rows = stmt.query(params![name])?;

        if let Some(row) = rows.next()? {
            Ok(Some(Self::from_row(row)?))
        } else {
            Ok(None)
        }
    }

    /// Create a new operator
    /// Uses a deterministic UUID (v5) based on the operator name to prevent duplicates across clients
    pub fn create(conn: &Connection, input: &CreateOperatorInput) -> rusqlite::Result<Self> {
        // Use UUID v5 (deterministic) based on the name
        // This ensures all clients creating "Shell" generate the same UUID
        let namespace = Uuid::parse_str("6ba7b810-9dad-11d1-80b4-00c04fd430c8").unwrap(); // DNS namespace
        let id = Uuid::new_v5(&namespace, input.name.trim().as_bytes()).to_string();

        // Check if operator already exists (could be from another client after sync)
        if let Some(existing) = Self::get_by_id(conn, &id)? {
            return Ok(existing);
        }

        let now = chrono::Utc::now().to_rfc3339();

        conn.execute(
            "INSERT INTO operators (id, name, created_at, updated_at) VALUES (?, ?, ?, ?)",
            params![id, input.name.trim(), now, now],
        )?;

        Self::get_by_id(conn, &id)?.ok_or_else(|| {
            rusqlite::Error::QueryReturnedNoRows
        })
    }

    /// Update an existing operator
    pub fn update(conn: &Connection, id: &str, input: &UpdateOperatorInput) -> rusqlite::Result<Option<Self>> {
        let existing = Self::get_by_id(conn, id)?;
        if existing.is_none() {
            return Ok(None);
        }
        let existing = existing.unwrap();

        let name = input.name.as_ref().map(|n| n.trim()).unwrap_or(&existing.name);
        let active = input.active.unwrap_or(existing.active);
        let now = chrono::Utc::now().to_rfc3339();

        conn.execute(
            "UPDATE operators SET name = ?, active = ?, updated_at = ? WHERE id = ?",
            params![name, active as i32, now, id],
        )?;

        Self::get_by_id(conn, id)
    }

    /// Delete an operator (soft delete by setting active = 0)
    pub fn delete(conn: &Connection, id: &str) -> rusqlite::Result<bool> {
        let rows = conn.execute(
            "UPDATE operators SET active = 0, updated_at = ? WHERE id = ?",
            params![chrono::Utc::now().to_rfc3339(), id],
        )?;
        Ok(rows > 0)
    }

    /// Hard delete an operator
    pub fn hard_delete(conn: &Connection, id: &str) -> rusqlite::Result<bool> {
        let rows = conn.execute("DELETE FROM operators WHERE id = ?", params![id])?;
        Ok(rows > 0)
    }

    /// Update logo path
    pub fn update_logo(conn: &Connection, id: &str, logo_path: Option<&str>) -> rusqlite::Result<Option<Self>> {
        let now = chrono::Utc::now().to_rfc3339();
        conn.execute(
            "UPDATE operators SET logo_path = ?, updated_at = ? WHERE id = ?",
            params![logo_path, now, id],
        )?;
        Self::get_by_id(conn, id)
    }
}
