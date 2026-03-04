use rusqlite::{params, Connection, Row};
use serde::{Deserialize, Serialize};
use uuid::Uuid;

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Company {
    pub id: String,
    pub name: String,
    pub logo: Option<String>,
    pub company_type: String,
    pub active: bool,
    pub created_at: String,
    pub updated_at: String,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CreateCompanyInput {
    pub name: String,
    pub company_type: String,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct UpdateCompanyInput {
    pub name: Option<String>,
    pub company_type: Option<String>,
    pub active: Option<bool>,
}

impl Company {
    pub fn from_row(row: &Row) -> rusqlite::Result<Self> {
        Ok(Self {
            id: row.get("id")?,
            name: row.get("name")?,
            logo: row.get("logo")?,
            company_type: row.get("company_type")?,
            active: row.get::<_, i32>("active")? == 1,
            created_at: row.get("created_at")?,
            updated_at: row.get("updated_at")?,
        })
    }

    /// Validate that company_type is one of the allowed values
    pub fn validate_type(company_type: &str) -> Result<(), String> {
        match company_type {
            "operator" | "contractor" => Ok(()),
            _ => Err(format!(
                "Tipo de empresa inválido '{}'. Debe ser 'operator' o 'contractor'",
                company_type
            )),
        }
    }

    /// List companies, optionally filtered by active status and/or type
    pub fn list(
        conn: &Connection,
        only_active: bool,
        company_type: Option<&str>,
    ) -> rusqlite::Result<Vec<Self>> {
        let sql = match (only_active, company_type) {
            (true, Some(_)) => {
                "SELECT * FROM companies WHERE active = 1 AND (is_deleted IS NULL OR is_deleted = 0) AND company_type = ? ORDER BY name ASC"
            }
            (false, Some(_)) => {
                "SELECT * FROM companies WHERE (is_deleted IS NULL OR is_deleted = 0) AND company_type = ? ORDER BY name ASC"
            }
            (true, None) => {
                "SELECT * FROM companies WHERE active = 1 AND (is_deleted IS NULL OR is_deleted = 0) ORDER BY name ASC"
            }
            (false, None) => {
                "SELECT * FROM companies WHERE (is_deleted IS NULL OR is_deleted = 0) ORDER BY name ASC"
            }
        };

        let mut stmt = conn.prepare(sql)?;
        let rows = if let Some(t) = company_type {
            stmt.query_map(params![t], |row| Self::from_row(row))?
                .collect::<Result<Vec<_>, _>>()?
        } else {
            stmt.query_map([], |row| Self::from_row(row))?
                .collect::<Result<Vec<_>, _>>()?
        };

        Ok(rows)
    }

    /// Get company by ID
    pub fn get_by_id(conn: &Connection, id: &str) -> rusqlite::Result<Option<Self>> {
        let mut stmt = conn.prepare(
            "SELECT * FROM companies WHERE id = ? AND (is_deleted IS NULL OR is_deleted = 0)",
        )?;
        let mut rows = stmt.query(params![id])?;
        if let Some(row) = rows.next()? {
            Ok(Some(Self::from_row(row)?))
        } else {
            Ok(None)
        }
    }

    /// Get company by name (and optionally type)
    pub fn get_by_name(
        conn: &Connection,
        name: &str,
        company_type: Option<&str>,
    ) -> rusqlite::Result<Option<Self>> {
        let (sql, use_type) = match company_type {
            Some(_) => (
                "SELECT * FROM companies WHERE name = ? AND company_type = ? AND (is_deleted IS NULL OR is_deleted = 0)",
                true,
            ),
            None => (
                "SELECT * FROM companies WHERE name = ? AND (is_deleted IS NULL OR is_deleted = 0)",
                false,
            ),
        };

        let mut stmt = conn.prepare(sql)?;
        let mut rows = if use_type {
            stmt.query(params![name, company_type.unwrap()])?
        } else {
            stmt.query(params![name])?
        };

        if let Some(row) = rows.next()? {
            Ok(Some(Self::from_row(row)?))
        } else {
            Ok(None)
        }
    }

    /// Create a new company.
    /// Uses UUID v5 (deterministic) seeded on name+type so that duplicate
    /// names within the same type generate the same ID across clients,
    /// but "Shell" as operator and "Shell" as contractor are distinct records.
    pub fn create(conn: &Connection, input: &CreateCompanyInput) -> rusqlite::Result<Self> {
        let namespace = Uuid::parse_str("6ba7b810-9dad-11d1-80b4-00c04fd430c8").unwrap();
        let seed = format!("{}_{}", input.name.trim(), input.company_type.trim());
        let id = Uuid::new_v5(&namespace, seed.as_bytes()).to_string();

        // If already exists (e.g. synced from another client), return existing
        if let Some(existing) = Self::get_by_id(conn, &id)? {
            return Ok(existing);
        }

        let now = chrono::Utc::now().to_rfc3339();

        conn.execute(
            "INSERT INTO companies (id, name, company_type, active, is_deleted, created_at, updated_at)
             VALUES (?, ?, ?, 1, 0, ?, ?)",
            params![id, input.name.trim(), input.company_type.trim(), now, now],
        )?;

        Self::get_by_id(conn, &id)?.ok_or(rusqlite::Error::QueryReturnedNoRows)
    }

    /// Update an existing company
    pub fn update(
        conn: &Connection,
        id: &str,
        input: &UpdateCompanyInput,
    ) -> rusqlite::Result<Option<Self>> {
        let existing = match Self::get_by_id(conn, id)? {
            Some(c) => c,
            None => return Ok(None),
        };

        let name = input
            .name
            .as_deref()
            .map(str::trim)
            .unwrap_or(&existing.name);
        let company_type = input
            .company_type
            .as_deref()
            .unwrap_or(&existing.company_type);
        let active = input.active.unwrap_or(existing.active);
        let now = chrono::Utc::now().to_rfc3339();

        conn.execute(
            "UPDATE companies SET name = ?, company_type = ?, active = ?, updated_at = ? WHERE id = ?",
            params![name, company_type, active as i32, now, id],
        )?;

        Self::get_by_id(conn, id)
    }

    /// Soft delete (marks is_deleted = 1 so sync propagates the deletion).
    /// Also removes rig_contractors referencing this company — ON DELETE CASCADE
    /// doesn't fire on UPDATE (soft-delete), so we clean up manually.
    pub fn delete(conn: &Connection, id: &str) -> rusqlite::Result<bool> {
        let now = chrono::Utc::now().to_rfc3339();
        let rows = conn.execute(
            "UPDATE companies SET is_deleted = 1, active = 0, updated_at = ? WHERE id = ?",
            params![now, id],
        )?;
        if rows > 0 {
            conn.execute(
                "DELETE FROM rig_contractors WHERE company_id = ?",
                params![id],
            )?;
        }
        Ok(rows > 0)
    }

    /// Update logo (base64 data URL or None to remove)
    pub fn update_logo(
        conn: &Connection,
        id: &str,
        logo: Option<&str>,
    ) -> rusqlite::Result<Option<Self>> {
        let now = chrono::Utc::now().to_rfc3339();
        conn.execute(
            "UPDATE companies SET logo = ?, updated_at = ? WHERE id = ?",
            params![logo, now, id],
        )?;
        Self::get_by_id(conn, id)
    }
}
