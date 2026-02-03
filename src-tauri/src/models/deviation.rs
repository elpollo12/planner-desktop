use crate::error::AppError;
use rusqlite::{params, Connection, Row};
use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct DeviationRecord {
    pub id: String,
    pub report_id: String,
    pub depth: Option<String>,
    pub deviation: Option<String>,
    pub direction: Option<String>,
    pub tvo: Option<String>,
    pub horizontal_displacement: Option<String>,
    pub created_at: String,
    pub updated_at: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CreateDeviationRecordRequest {
    pub depth: Option<String>,
    pub deviation: Option<String>,
    pub direction: Option<String>,
    pub tvo: Option<String>,
    pub horizontal_displacement: Option<String>,
}

impl DeviationRecord {
    fn from_row(row: &Row) -> Result<Self, rusqlite::Error> {
        Ok(DeviationRecord {
            id: row.get(0)?,
            report_id: row.get(1)?,
            depth: row.get(2)?,
            deviation: row.get(3)?,
            direction: row.get(4)?,
            tvo: row.get(5)?,
            horizontal_displacement: row.get(6)?,
            created_at: row.get(7)?,
            updated_at: row.get(8)?,
        })
    }

    pub fn create(
        conn: &Connection,
        report_id: &str,
        data: &CreateDeviationRecordRequest,
    ) -> Result<DeviationRecord, AppError> {
        let id = uuid::Uuid::new_v4().to_string();
        let now = chrono::Utc::now().to_rfc3339();

        conn.execute(
            "INSERT INTO deviation_history (id, report_id, depth, deviation, direction, tvo, horizontal_displacement, created_at, updated_at)
             VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9)",
            params![
                &id,
                report_id,
                &data.depth,
                &data.deviation,
                &data.direction,
                &data.tvo,
                &data.horizontal_displacement,
                &now,
                &now
            ],
        )?;

        DeviationRecord::get_by_id(conn, &id)
    }

    pub fn get_by_id(conn: &Connection, id: &str) -> Result<DeviationRecord, AppError> {
        let record = conn.query_row(
            "SELECT id, report_id, depth, deviation, direction, tvo, horizontal_displacement, created_at, updated_at
             FROM deviation_history WHERE id = ?1",
            params![id],
            DeviationRecord::from_row,
        )?;

        Ok(record)
    }

    pub fn list_by_report(conn: &Connection, report_id: &str) -> Result<Vec<DeviationRecord>, AppError> {
        let mut stmt = conn.prepare(
            "SELECT id, report_id, depth, deviation, direction, tvo, horizontal_displacement, created_at, updated_at
             FROM deviation_history WHERE report_id = ?1 ORDER BY created_at"
        )?;

        let records = stmt
            .query_map(params![report_id], DeviationRecord::from_row)?
            .collect::<Result<Vec<_>, _>>()?;

        Ok(records)
    }

    pub fn delete(conn: &Connection, id: &str) -> Result<(), AppError> {
        conn.execute("DELETE FROM deviation_history WHERE id = ?1", params![id])?;
        Ok(())
    }
}
