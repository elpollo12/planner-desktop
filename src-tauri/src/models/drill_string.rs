#![allow(dead_code)]

use crate::error::AppError;
use rusqlite::{params, Connection, Row};
use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct DrillString {
    pub id: String,
    pub report_id: String,
    pub size: Option<String>,
    pub weight: Option<String>,
    pub grade: Option<String>,
    pub connection_type: Option<String>,
    pub string_number: Option<String>,
    pub pump_brand: Option<String>,
    pub pump_type: Option<String>,
    pub header_length: Option<String>,
    pub created_at: String,
    pub updated_at: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct DrillStringData {
    pub size: Option<String>,
    pub weight: Option<String>,
    pub grade: Option<String>,
    pub connection_type: Option<String>,
    pub string_number: Option<String>,
    pub pump_brand: Option<String>,
    pub pump_type: Option<String>,
    pub header_length: Option<String>,
}

impl DrillString {
    fn from_row(row: &Row) -> Result<Self, rusqlite::Error> {
        Ok(DrillString {
            id: row.get(0)?,
            report_id: row.get(1)?,
            size: row.get(2)?,
            weight: row.get(3)?,
            grade: row.get(4)?,
            connection_type: row.get(5)?,
            string_number: row.get(6)?,
            pump_brand: row.get(7)?,
            pump_type: row.get(8)?,
            header_length: row.get(9)?,
            created_at: row.get(10)?,
            updated_at: row.get(11)?,
        })
    }

    pub fn save(
        conn: &Connection,
        report_id: &str,
        data: &DrillStringData,
    ) -> Result<DrillString, AppError> {
        // Check if already exists
        let exists: bool = conn
            .query_row(
                "SELECT COUNT(*) > 0 FROM drill_string WHERE report_id = ?1",
                params![report_id],
                |row| row.get(0),
            )?;

        let now = chrono::Utc::now().to_rfc3339();

        if exists {
            // Update existing
            conn.execute(
                "UPDATE drill_string SET size = ?1, weight = ?2, grade = ?3, connection_type = ?4, string_number = ?5, pump_brand = ?6, pump_type = ?7, header_length = ?8, updated_at = ?9 WHERE report_id = ?10",
                params![
                    &data.size,
                    &data.weight,
                    &data.grade,
                    &data.connection_type,
                    &data.string_number,
                    &data.pump_brand,
                    &data.pump_type,
                    &data.header_length,
                    &now,
                    report_id
                ],
            )?;
        } else {
            // Insert new
            let id = uuid::Uuid::new_v4().to_string();
            conn.execute(
                "INSERT INTO drill_string (id, report_id, size, weight, grade, connection_type, string_number, pump_brand, pump_type, header_length, created_at, updated_at)
                 VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12)",
                params![
                    &id,
                    report_id,
                    &data.size,
                    &data.weight,
                    &data.grade,
                    &data.connection_type,
                    &data.string_number,
                    &data.pump_brand,
                    &data.pump_type,
                    &data.header_length,
                    &now,
                    &now
                ],
            )?;
        }

        DrillString::get_by_report_id(conn, report_id)
    }

    pub fn get_by_report_id(conn: &Connection, report_id: &str) -> Result<DrillString, AppError> {
        let drill_string = conn.query_row(
            "SELECT id, report_id, size, weight, grade, connection_type, string_number, pump_brand, pump_type, header_length, created_at, updated_at
             FROM drill_string WHERE report_id = ?1",
            params![report_id],
            DrillString::from_row,
        )?;

        Ok(drill_string)
    }
}
