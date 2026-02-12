#![allow(dead_code)]

use crate::error::AppError;
use rusqlite::{params, Connection, Row};
use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct RigPersonnel {
    pub id: String,
    pub rig_id: String,
    pub name: String,
    pub ci: Option<String>,
    pub default_position: String,
    pub active: bool,
    pub created_at: String,
    pub updated_at: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CreateRigPersonnelInput {
    pub name: String,
    pub ci: Option<String>,
    pub default_position: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct UpdateRigPersonnelInput {
    pub name: Option<String>,
    pub ci: Option<String>,
    pub default_position: Option<String>,
    pub active: Option<bool>,
}

impl RigPersonnel {
    fn from_row(row: &Row) -> Result<Self, rusqlite::Error> {
        Ok(RigPersonnel {
            id: row.get(0)?,
            rig_id: row.get(1)?,
            name: row.get(2)?,
            ci: row.get(3)?,
            default_position: row.get(4)?,
            active: row.get::<_, i32>(5)? == 1,
            created_at: row.get(6)?,
            updated_at: row.get(7)?,
        })
    }

    pub fn create(
        conn: &Connection,
        rig_id: &str,
        input: &CreateRigPersonnelInput,
    ) -> Result<RigPersonnel, AppError> {
        let id = uuid::Uuid::new_v4().to_string();
        let now = chrono::Utc::now().to_rfc3339();

        conn.execute(
            "INSERT INTO rig_personnel (id, rig_id, name, ci, default_position, active, created_at, updated_at)
             VALUES (?1, ?2, ?3, ?4, ?5, 1, ?6, ?7)",
            params![&id, rig_id, &input.name, &input.ci, &input.default_position, &now, &now],
        )?;

        RigPersonnel::get_by_id(conn, &id)
    }

    pub fn get_by_id(conn: &Connection, id: &str) -> Result<RigPersonnel, AppError> {
        let person = conn.query_row(
            "SELECT id, rig_id, name, ci, default_position, active, created_at, updated_at
             FROM rig_personnel WHERE id = ?1",
            params![id],
            RigPersonnel::from_row,
        )?;
        Ok(person)
    }

    pub fn list_by_rig(
        conn: &Connection,
        rig_id: &str,
        active_only: bool,
    ) -> Result<Vec<RigPersonnel>, AppError> {
        let query = if active_only {
            "SELECT id, rig_id, name, ci, default_position, active, created_at, updated_at
             FROM rig_personnel WHERE rig_id = ?1 AND active = 1 AND (is_deleted IS NULL OR is_deleted = 0)
             ORDER BY default_position, name"
        } else {
            "SELECT id, rig_id, name, ci, default_position, active, created_at, updated_at
             FROM rig_personnel WHERE rig_id = ?1 AND (is_deleted IS NULL OR is_deleted = 0)
             ORDER BY default_position, name"
        };

        let mut stmt = conn.prepare(query)?;
        let personnel = stmt
            .query_map(params![rig_id], RigPersonnel::from_row)?
            .collect::<Result<Vec<_>, _>>()?;

        Ok(personnel)
    }

    pub fn update(
        conn: &Connection,
        id: &str,
        input: &UpdateRigPersonnelInput,
    ) -> Result<RigPersonnel, AppError> {
        let mut updates = Vec::new();
        let mut params_vec: Vec<Box<dyn rusqlite::ToSql>> = Vec::new();

        if let Some(ref name) = input.name {
            updates.push("name = ?");
            params_vec.push(Box::new(name.clone()));
        }
        if let Some(ref ci) = input.ci {
            updates.push("ci = ?");
            params_vec.push(Box::new(ci.clone()));
        }
        if let Some(ref pos) = input.default_position {
            updates.push("default_position = ?");
            params_vec.push(Box::new(pos.clone()));
        }
        if let Some(active) = input.active {
            updates.push("active = ?");
            params_vec.push(Box::new(if active { 1 } else { 0 }));
        }

        let now = chrono::Utc::now().to_rfc3339();
        updates.push("updated_at = ?");
        params_vec.push(Box::new(now));

        params_vec.push(Box::new(id.to_string()));

        let query = format!(
            "UPDATE rig_personnel SET {} WHERE id = ?",
            updates.join(", ")
        );
        let params_refs: Vec<&dyn rusqlite::ToSql> =
            params_vec.iter().map(|p| p.as_ref()).collect();

        conn.execute(&query, params_refs.as_slice())?;

        RigPersonnel::get_by_id(conn, id)
    }

    /// Soft delete (marks is_deleted = 1 so sync propagates it)
    pub fn delete(conn: &Connection, id: &str) -> Result<(), AppError> {
        let now = chrono::Utc::now().to_rfc3339();
        conn.execute(
            "UPDATE rig_personnel SET is_deleted = 1, active = 0, updated_at = ?1 WHERE id = ?2",
            params![&now, id],
        )?;
        Ok(())
    }
}
