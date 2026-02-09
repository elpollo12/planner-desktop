#![allow(dead_code)]

use crate::error::AppError;
use rusqlite::{params, Connection, Row};
use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TimeDistribution {
    pub id: String,
    pub report_id: String,
    pub operation_code_id: String,
    pub hours_shift1: f64,
    pub hours_shift2: f64,
    pub hours_shift3: f64,
    pub created_at: String,
    pub updated_at: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TimeDistributionData {
    pub operation_code_id: String,
    pub hours_shift1: f64,
    pub hours_shift2: f64,
    pub hours_shift3: f64,
}

impl TimeDistribution {
    fn from_row(row: &Row) -> Result<Self, rusqlite::Error> {
        Ok(TimeDistribution {
            id: row.get(0)?,
            report_id: row.get(1)?,
            operation_code_id: row.get(2)?,
            hours_shift1: row.get(3)?,
            hours_shift2: row.get(4)?,
            hours_shift3: row.get(5)?,
            created_at: row.get(6)?,
            updated_at: row.get(7)?,
        })
    }

    pub fn save_bulk(
        conn: &Connection,
        report_id: &str,
        distributions: &[TimeDistributionData],
    ) -> Result<Vec<TimeDistribution>, AppError> {
        let now = chrono::Utc::now().to_rfc3339();

        // Delete existing distributions for this report
        conn.execute(
            "DELETE FROM time_distribution WHERE report_id = ?1",
            params![report_id],
        )?;

        // Insert new distributions
        for dist_data in distributions {
            let id = uuid::Uuid::new_v4().to_string();
            conn.execute(
                "INSERT INTO time_distribution (id, report_id, operation_code_id, hours_shift1, hours_shift2, hours_shift3, created_at, updated_at)
                 VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8)",
                params![
                    &id,
                    report_id,
                    &dist_data.operation_code_id,
                    dist_data.hours_shift1,
                    dist_data.hours_shift2,
                    dist_data.hours_shift3,
                    &now,
                    &now
                ],
            )?;
        }

        TimeDistribution::list_by_report(conn, report_id)
    }

    pub fn list_by_report(conn: &Connection, report_id: &str) -> Result<Vec<TimeDistribution>, AppError> {
        let mut stmt = conn.prepare(
            "SELECT id, report_id, operation_code_id, hours_shift1, hours_shift2, hours_shift3, created_at, updated_at
             FROM time_distribution WHERE report_id = ?1"
        )?;

        let distributions = stmt
            .query_map(params![report_id], TimeDistribution::from_row)?
            .collect::<Result<Vec<_>, _>>()?;

        Ok(distributions)
    }

    pub fn delete_all_by_report(conn: &Connection, report_id: &str) -> Result<(), AppError> {
        conn.execute("DELETE FROM time_distribution WHERE report_id = ?1", params![report_id])?;
        Ok(())
    }
}
