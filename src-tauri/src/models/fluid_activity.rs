#![allow(dead_code)]

use crate::error::AppError;
use rusqlite::{params, Connection, Row};
use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct FluidActivity {
    pub id: String,
    pub fluid_report_id: String,
    pub hours_moving: f64,
    pub hours_circulating: f64,
    pub hours_drilling: f64,
    pub hours_tripping: f64,
    pub hours_cleaning: f64,
    pub hours_backreaming: f64,
    pub hours_cementing: f64,
    pub hours_running_csg: f64,
    pub hours_other: f64,
    pub hours_total: f64,
    pub created_at: String,
    pub updated_at: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SaveFluidActivityRequest {
    pub hours_moving: f64,
    pub hours_circulating: f64,
    pub hours_drilling: f64,
    pub hours_tripping: f64,
    pub hours_cleaning: f64,
    pub hours_backreaming: f64,
    pub hours_cementing: f64,
    pub hours_running_csg: f64,
    pub hours_other: f64,
}

impl FluidActivity {
    fn from_row(row: &Row) -> Result<Self, rusqlite::Error> {
        Ok(FluidActivity {
            id: row.get(0)?,
            fluid_report_id: row.get(1)?,
            hours_moving: row.get(2)?,
            hours_circulating: row.get(3)?,
            hours_drilling: row.get(4)?,
            hours_tripping: row.get(5)?,
            hours_cleaning: row.get(6)?,
            hours_backreaming: row.get(7)?,
            hours_cementing: row.get(8)?,
            hours_running_csg: row.get(9)?,
            hours_other: row.get(10)?,
            hours_total: row.get(11)?,
            created_at: row.get(12)?,
            updated_at: row.get(13)?,
        })
    }

    pub fn get_by_fluid_report(
        conn: &Connection,
        fluid_report_id: &str,
    ) -> Result<Option<FluidActivity>, AppError> {
        match conn.query_row(
            "SELECT id,fluid_report_id,
                    hours_moving,hours_circulating,hours_drilling,hours_tripping,
                    hours_cleaning,hours_backreaming,hours_cementing,hours_running_csg,
                    hours_other,hours_total,created_at,updated_at
             FROM fluid_activity WHERE fluid_report_id=?1",
            params![fluid_report_id],
            Self::from_row,
        ) {
            Ok(r) => Ok(Some(r)),
            Err(rusqlite::Error::QueryReturnedNoRows) => Ok(None),
            Err(e) => Err(AppError::from(e)),
        }
    }

    pub fn upsert(
        conn: &Connection,
        fluid_report_id: &str,
        data: &SaveFluidActivityRequest,
    ) -> Result<Option<FluidActivity>, AppError> {
        let now = chrono::Utc::now().to_rfc3339();
        let total = data.hours_moving + data.hours_circulating + data.hours_drilling
            + data.hours_tripping + data.hours_cleaning + data.hours_backreaming
            + data.hours_cementing + data.hours_running_csg + data.hours_other;

        let exists: i32 = conn.query_row(
            "SELECT COUNT(*) FROM fluid_activity WHERE fluid_report_id=?1",
            params![fluid_report_id],
            |r| r.get(0),
        )?;

        if exists == 0 {
            let id = uuid::Uuid::new_v4().to_string();
            conn.execute(
                "INSERT INTO fluid_activity
                    (id,fluid_report_id,
                     hours_moving,hours_circulating,hours_drilling,hours_tripping,
                     hours_cleaning,hours_backreaming,hours_cementing,hours_running_csg,
                     hours_other,hours_total,created_at,updated_at)
                 VALUES (?1,?2,?3,?4,?5,?6,?7,?8,?9,?10,?11,?12,?13,?13)",
                params![
                    &id, fluid_report_id,
                    &data.hours_moving, &data.hours_circulating, &data.hours_drilling,
                    &data.hours_tripping, &data.hours_cleaning, &data.hours_backreaming,
                    &data.hours_cementing, &data.hours_running_csg,
                    &data.hours_other, &total, &now
                ],
            )?;
        } else {
            conn.execute(
                "UPDATE fluid_activity SET
                    hours_moving=?1,hours_circulating=?2,hours_drilling=?3,
                    hours_tripping=?4,hours_cleaning=?5,hours_backreaming=?6,
                    hours_cementing=?7,hours_running_csg=?8,
                    hours_other=?9,hours_total=?10,updated_at=?11
                 WHERE fluid_report_id=?12",
                params![
                    &data.hours_moving, &data.hours_circulating, &data.hours_drilling,
                    &data.hours_tripping, &data.hours_cleaning, &data.hours_backreaming,
                    &data.hours_cementing, &data.hours_running_csg,
                    &data.hours_other, &total, &now, fluid_report_id
                ],
            )?;
        }

        Self::get_by_fluid_report(conn, fluid_report_id)
    }
}
