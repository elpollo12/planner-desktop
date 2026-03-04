use crate::error::AppError;
use rusqlite::{params, Connection, Row};
use serde::{Deserialize, Serialize};
use uuid::Uuid;

// ============================================================================
// Structs
// ============================================================================

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct RigContractor {
    pub id: String,
    pub rig_id: String,
    pub company_id: String,
    pub created_at: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct RigContractorWithCompany {
    pub id: String,
    pub rig_id: String,
    pub company_id: String,
    pub company_name: String,
    pub created_at: String,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct AddRigContractorInput {
    pub company_id: String,
}

// ============================================================================
// DB methods
// ============================================================================

impl RigContractor {
    fn from_row(row: &Row) -> Result<Self, rusqlite::Error> {
        Ok(Self {
            id: row.get(0)?,
            rig_id: row.get(1)?,
            company_id: row.get(2)?,
            created_at: row.get(3)?,
        })
    }

    /// List all contractors for a rig, joined with company name
    pub fn list_for_rig(
        conn: &Connection,
        rig_id: &str,
    ) -> Result<Vec<RigContractorWithCompany>, AppError> {
        let mut stmt = conn.prepare(
            "SELECT rc.id, rc.rig_id, rc.company_id, c.name, rc.created_at
             FROM rig_contractors rc
             JOIN companies c ON c.id = rc.company_id
             WHERE rc.rig_id = ?1
               AND (c.is_deleted IS NULL OR c.is_deleted = 0)
             ORDER BY c.name ASC",
        )?;

        let rows = stmt
            .query_map(params![rig_id], |row| {
                Ok(RigContractorWithCompany {
                    id: row.get(0)?,
                    rig_id: row.get(1)?,
                    company_id: row.get(2)?,
                    company_name: row.get(3)?,
                    created_at: row.get(4)?,
                })
            })?
            .collect::<Result<Vec<_>, _>>()?;

        Ok(rows)
    }

    /// Add a contractor to a rig. Silently succeeds if already linked (IGNORE).
    pub fn add(
        conn: &Connection,
        rig_id: &str,
        company_id: &str,
    ) -> Result<RigContractor, AppError> {
        let id = Uuid::new_v4().to_string();
        let now = chrono::Utc::now().to_rfc3339();

        conn.execute(
            "INSERT OR IGNORE INTO rig_contractors (id, rig_id, company_id, created_at)
             VALUES (?1, ?2, ?3, ?4)",
            params![&id, rig_id, company_id, &now],
        )?;

        // Fetch the actual row (may have been the existing one if IGNORE fired)
        let row = conn.query_row(
            "SELECT id, rig_id, company_id, created_at
             FROM rig_contractors WHERE rig_id = ?1 AND company_id = ?2",
            params![rig_id, company_id],
            Self::from_row,
        )?;

        Ok(row)
    }

    /// Remove a specific contractor from a rig by rig_contractor id
    pub fn remove(conn: &Connection, id: &str) -> Result<(), AppError> {
        conn.execute(
            "DELETE FROM rig_contractors WHERE id = ?1",
            params![id],
        )?;
        Ok(())
    }

    /// Remove a contractor from a rig by company_id (convenience)
    pub fn remove_by_company(
        conn: &Connection,
        rig_id: &str,
        company_id: &str,
    ) -> Result<(), AppError> {
        conn.execute(
            "DELETE FROM rig_contractors WHERE rig_id = ?1 AND company_id = ?2",
            params![rig_id, company_id],
        )?;
        Ok(())
    }

    /// Replace all contractors for a rig with a new list of company_ids.
    /// Used when updating a rig's contractor assignments in bulk.
    pub fn replace_all(
        conn: &Connection,
        rig_id: &str,
        company_ids: &[String],
    ) -> Result<Vec<RigContractor>, AppError> {
        // Delete existing
        conn.execute(
            "DELETE FROM rig_contractors WHERE rig_id = ?1",
            params![rig_id],
        )?;

        // Insert new
        let mut result = Vec::new();
        for company_id in company_ids {
            let id = Uuid::new_v4().to_string();
            let now = chrono::Utc::now().to_rfc3339();
            conn.execute(
                "INSERT INTO rig_contractors (id, rig_id, company_id, created_at)
                 VALUES (?1, ?2, ?3, ?4)",
                params![&id, rig_id, company_id, &now],
            )?;
            result.push(RigContractor {
                id,
                rig_id: rig_id.to_string(),
                company_id: company_id.clone(),
                created_at: now,
            });
        }

        Ok(result)
    }
}
