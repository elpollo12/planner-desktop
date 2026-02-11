#![allow(dead_code)]

use crate::error::AppError;
use rusqlite::{params, Connection, Row};
use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct DrillingParameter {
    pub id: String,
    pub report_id: String,
    pub shift: Option<String>,
    pub depth_from: Option<String>,
    pub depth_to: Option<String>,
    pub core_number: Option<String>,
    pub rotary_rpm: Option<String>,
    pub bit_weight: Option<String>,
    pub pump_pressure: Option<String>,
    pub pump_number: Option<String>,
    pub pump_liner: Option<String>,
    pub pump_spm: Option<String>,
    pub total_gpm: Option<String>,
    pub method_used: Option<String>,
    pub lithology_notes: Option<String>,
    pub created_at: String,
    pub updated_at: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CreateDrillingParameterRequest {
    pub shift: Option<String>,
    pub depth_from: Option<String>,
    pub depth_to: Option<String>,
    pub core_number: Option<String>,
    pub rotary_rpm: Option<String>,
    pub bit_weight: Option<String>,
    pub pump_pressure: Option<String>,
    pub pump_number: Option<String>,
    pub pump_liner: Option<String>,
    pub pump_spm: Option<String>,
    pub total_gpm: Option<String>,
    pub method_used: Option<String>,
    pub lithology_notes: Option<String>,
}

impl DrillingParameter {
    fn from_row(row: &Row) -> Result<Self, rusqlite::Error> {
        Ok(DrillingParameter {
            id: row.get(0)?,
            report_id: row.get(1)?,
            shift: row.get(2)?,
            depth_from: row.get(3)?,
            depth_to: row.get(4)?,
            core_number: row.get(5)?,
            rotary_rpm: row.get(6)?,
            bit_weight: row.get(7)?,
            pump_pressure: row.get(8)?,
            pump_number: row.get(9)?,
            pump_liner: row.get(10)?,
            pump_spm: row.get(11)?,
            total_gpm: row.get(12)?,
            method_used: row.get(13)?,
            lithology_notes: row.get(14)?,
            created_at: row.get(15)?,
            updated_at: row.get(16)?,
        })
    }

    pub fn create(
        conn: &Connection,
        report_id: &str,
        data: &CreateDrillingParameterRequest,
    ) -> Result<DrillingParameter, AppError> {
        let id = uuid::Uuid::new_v4().to_string();
        let now = chrono::Utc::now().to_rfc3339();

        conn.execute(
            "INSERT INTO drilling_parameters (id, report_id, shift, depth_from, depth_to, core_number, rotary_rpm, bit_weight, pump_pressure, pump_number, pump_liner, pump_spm, total_gpm, method_used, lithology_notes, created_at, updated_at)
             VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12, ?13, ?14, ?15, ?16, ?17)",
            params![
                &id,
                report_id,
                &data.shift,
                &data.depth_from,
                &data.depth_to,
                &data.core_number,
                &data.rotary_rpm,
                &data.bit_weight,
                &data.pump_pressure,
                &data.pump_number,
                &data.pump_liner,
                &data.pump_spm,
                &data.total_gpm,
                &data.method_used,
                &data.lithology_notes,
                &now,
                &now
            ],
        )?;

        DrillingParameter::get_by_id(conn, &id)
    }

    pub fn get_by_id(conn: &Connection, id: &str) -> Result<DrillingParameter, AppError> {
        let param = conn.query_row(
            "SELECT id, report_id, shift, depth_from, depth_to, core_number, rotary_rpm, bit_weight, pump_pressure, pump_number, pump_liner, pump_spm, total_gpm, method_used, lithology_notes, created_at, updated_at
             FROM drilling_parameters WHERE id = ?1",
            params![id],
            DrillingParameter::from_row,
        )?;

        Ok(param)
    }

    pub fn list_by_report(conn: &Connection, report_id: &str) -> Result<Vec<DrillingParameter>, AppError> {
        let mut stmt = conn.prepare(
            "SELECT id, report_id, shift, depth_from, depth_to, core_number, rotary_rpm, bit_weight, pump_pressure, pump_number, pump_liner, pump_spm, total_gpm, method_used, lithology_notes, created_at, updated_at
             FROM drilling_parameters WHERE report_id = ?1 ORDER BY created_at"
        )?;

        let params = stmt
            .query_map(params![report_id], DrillingParameter::from_row)?
            .collect::<Result<Vec<_>, _>>()?;

        Ok(params)
    }

    pub fn delete(conn: &Connection, id: &str) -> Result<(), AppError> {
        conn.execute("DELETE FROM drilling_parameters WHERE id = ?1", params![id])?;
        Ok(())
    }

    pub fn delete_all_by_report(conn: &Connection, report_id: &str) -> Result<(), AppError> {
        conn.execute("DELETE FROM drilling_parameters WHERE report_id = ?1", params![report_id])?;
        Ok(())
    }
}