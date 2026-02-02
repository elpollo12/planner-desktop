use crate::error::AppError;
use rusqlite::{params, Connection, Row};
use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct OperationLog {
    pub id: String,
    pub report_id: String,
    pub shift: Option<String>,
    pub time_from: Option<String>,
    pub time_to: Option<String>,
    pub duration: Option<String>,
    pub operation_code: Option<String>,
    pub details: Option<String>,
    pub created_at: String,
    pub updated_at: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CreateOperationLogRequest {
    pub shift: Option<String>,
    pub time_from: Option<String>,
    pub time_to: Option<String>,
    pub duration: Option<String>,
    pub operation_code: Option<String>,
    pub details: Option<String>,
}

impl OperationLog {
    fn from_row(row: &Row) -> Result<Self, rusqlite::Error> {
        Ok(OperationLog {
            id: row.get(0)?,
            report_id: row.get(1)?,
            shift: row.get(2)?,
            time_from: row.get(3)?,
            time_to: row.get(4)?,
            duration: row.get(5)?,
            operation_code: row.get(6)?,
            details: row.get(7)?,
            created_at: row.get(8)?,
            updated_at: row.get(9)?,
        })
    }

    pub fn create(
        conn: &Connection,
        report_id: &str,
        data: &CreateOperationLogRequest,
    ) -> Result<OperationLog, AppError> {
        let id = uuid::Uuid::new_v4().to_string();
        let now = chrono::Utc::now().to_rfc3339();

        conn.execute(
            "INSERT INTO operations_log (id, report_id, shift, time_from, time_to, duration, operation_code, details, created_at, updated_at)
             VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10)",
            params![
                &id,
                report_id,
                &data.shift,
                &data.time_from,
                &data.time_to,
                &data.duration,
                &data.operation_code,
                &data.details,
                &now,
                &now
            ],
        )?;

        OperationLog::get_by_id(conn, &id)
    }

    pub fn get_by_id(conn: &Connection, id: &str) -> Result<OperationLog, AppError> {
        let log = conn.query_row(
            "SELECT id, report_id, shift, time_from, time_to, duration, operation_code, details, created_at, updated_at
             FROM operations_log WHERE id = ?1",
            params![id],
            OperationLog::from_row,
        )?;

        Ok(log)
    }

    pub fn list_by_report(conn: &Connection, report_id: &str) -> Result<Vec<OperationLog>, AppError> {
        let mut stmt = conn.prepare(
            "SELECT id, report_id, shift, time_from, time_to, duration, operation_code, details, created_at, updated_at
             FROM operations_log WHERE report_id = ?1 ORDER BY created_at"
        )?;

        let logs = stmt
            .query_map(params![report_id], OperationLog::from_row)?
            .collect::<Result<Vec<_>, _>>()?;

        Ok(logs)
    }

    pub fn delete(conn: &Connection, id: &str) -> Result<(), AppError> {
        conn.execute("DELETE FROM operations_log WHERE id = ?1", params![id])?;
        Ok(())
    }
}
