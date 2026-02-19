#![allow(dead_code)]

use crate::error::AppError;
use rusqlite::{params, Connection, Row};
use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct DrillStringComponent {
    pub id: String,
    pub report_id: String,
    pub entry_number: i64,
    pub piece_name: String,
    pub length: Option<f64>,
    pub created_at: String,
    pub updated_at: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CreateDrillStringComponentRequest {
    pub piece_name: String,
    pub length: Option<f64>,
}

impl DrillStringComponent {
    fn from_row(row: &Row) -> Result<Self, rusqlite::Error> {
        Ok(DrillStringComponent {
            id: row.get(0)?,
            report_id: row.get(1)?,
            entry_number: row.get(2)?,
            piece_name: row.get(3)?,
            length: row.get(4)?,
            created_at: row.get(5)?,
            updated_at: row.get(6)?,
        })
    }

    pub fn create(
        conn: &Connection,
        report_id: &str,
        data: &CreateDrillStringComponentRequest,
    ) -> Result<DrillStringComponent, AppError> {
        let id = uuid::Uuid::new_v4().to_string();
        let now = chrono::Utc::now().to_rfc3339();

        // Auto-increment entry_number per report
        let next_entry: i64 = conn
            .query_row(
                "SELECT COALESCE(MAX(entry_number), 0) + 1 FROM drill_string_components WHERE report_id = ?1",
                params![report_id],
                |row| row.get(0),
            )
            .unwrap_or(1);

        conn.execute(
            "INSERT INTO drill_string_components (id, report_id, entry_number, piece_name, length, created_at, updated_at)
             VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7)",
            params![
                &id,
                report_id,
                next_entry,
                &data.piece_name,
                &data.length,
                &now,
                &now
            ],
        )?;

        DrillStringComponent::get_by_id(conn, &id)
    }

    pub fn get_by_id(conn: &Connection, id: &str) -> Result<DrillStringComponent, AppError> {
        let component = conn.query_row(
            "SELECT id, report_id, entry_number, piece_name, length, created_at, updated_at
             FROM drill_string_components WHERE id = ?1",
            params![id],
            DrillStringComponent::from_row,
        )?;

        Ok(component)
    }

    pub fn list_by_report(
        conn: &Connection,
        report_id: &str,
    ) -> Result<Vec<DrillStringComponent>, AppError> {
        let mut stmt = conn.prepare(
            "SELECT id, report_id, entry_number, piece_name, length, created_at, updated_at
             FROM drill_string_components WHERE report_id = ?1 ORDER BY entry_number ASC",
        )?;

        let components = stmt
            .query_map(params![report_id], DrillStringComponent::from_row)?
            .collect::<Result<Vec<_>, _>>()?;

        Ok(components)
    }

    pub fn delete_all_by_report(conn: &Connection, report_id: &str) -> Result<(), AppError> {
        conn.execute(
            "DELETE FROM drill_string_components WHERE report_id = ?1",
            params![report_id],
        )?;
        Ok(())
    }
}
