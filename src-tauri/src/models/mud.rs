#![allow(dead_code)]

use crate::error::AppError;
use rusqlite::{params, Connection, Row};
use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct MudRecord {
    pub id: String,
    pub report_id: String,
    pub shift: Option<String>,
    pub hour: Option<String>,
    pub weight: Option<String>,
    pub viscosity: Option<String>,
    pub pvp: Option<String>,
    pub gels: Option<String>,
    pub filtrate: Option<String>,
    pub ph: Option<String>,
    pub solids: Option<String>,
    pub created_at: String,
    pub updated_at: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct MudAdditive {
    pub id: String,
    pub report_id: String,
    pub shift: Option<String>,
    pub additive_type: Option<String>,
    pub quantity: Option<String>,
    pub created_at: String,
    pub updated_at: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CreateMudRecordRequest {
    pub shift: Option<String>,
    pub hour: Option<String>,
    pub weight: Option<String>,
    pub viscosity: Option<String>,
    pub pvp: Option<String>,
    pub gels: Option<String>,
    pub filtrate: Option<String>,
    pub ph: Option<String>,
    pub solids: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CreateMudAdditiveRequest {
    pub shift: Option<String>,
    pub additive_type: Option<String>,
    pub quantity: Option<String>,
}

impl MudRecord {
    fn from_row(row: &Row) -> Result<Self, rusqlite::Error> {
        Ok(MudRecord {
            id: row.get(0)?,
            report_id: row.get(1)?,
            shift: row.get(2)?,
            hour: row.get(3)?,
            weight: row.get(4)?,
            viscosity: row.get(5)?,
            pvp: row.get(6)?,
            gels: row.get(7)?,
            filtrate: row.get(8)?,
            ph: row.get(9)?,
            solids: row.get(10)?,
            created_at: row.get(11)?,
            updated_at: row.get(12)?,
        })
    }

    pub fn create(
        conn: &Connection,
        report_id: &str,
        data: &CreateMudRecordRequest,
    ) -> Result<MudRecord, AppError> {
        let id = uuid::Uuid::new_v4().to_string();
        let now = chrono::Utc::now().to_rfc3339();

        conn.execute(
            "INSERT INTO mud_records (id, report_id, shift, hour, weight, viscosity, pvp, gels, filtrate, ph, solids, created_at, updated_at)
             VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12, ?13)",
            params![
                &id,
                report_id,
                &data.shift,
                &data.hour,
                &data.weight,
                &data.viscosity,
                &data.pvp,
                &data.gels,
                &data.filtrate,
                &data.ph,
                &data.solids,
                &now,
                &now
            ],
        )?;

        MudRecord::get_by_id(conn, &id)
    }

    pub fn get_by_id(conn: &Connection, id: &str) -> Result<MudRecord, AppError> {
        let record = conn.query_row(
            "SELECT id, report_id, shift, hour, weight, viscosity, pvp, gels, filtrate, ph, solids, created_at, updated_at
             FROM mud_records WHERE id = ?1",
            params![id],
            MudRecord::from_row,
        )?;

        Ok(record)
    }

    pub fn list_by_report(conn: &Connection, report_id: &str) -> Result<Vec<MudRecord>, AppError> {
        let mut stmt = conn.prepare(
            "SELECT id, report_id, shift, hour, weight, viscosity, pvp, gels, filtrate, ph, solids, created_at, updated_at
             FROM mud_records WHERE report_id = ?1 ORDER BY created_at"
        )?;

        let records = stmt
            .query_map(params![report_id], MudRecord::from_row)?
            .collect::<Result<Vec<_>, _>>()?;

        Ok(records)
    }

    pub fn delete(conn: &Connection, id: &str) -> Result<(), AppError> {
        conn.execute("DELETE FROM mud_records WHERE id = ?1", params![id])?;
        Ok(())
    }

    pub fn delete_all_by_report(conn: &Connection, report_id: &str) -> Result<(), AppError> {
        conn.execute("DELETE FROM mud_records WHERE report_id = ?1", params![report_id])?;
        Ok(())
    }
}

impl MudAdditive {
    fn from_row(row: &Row) -> Result<Self, rusqlite::Error> {
        Ok(MudAdditive {
            id: row.get(0)?,
            report_id: row.get(1)?,
            shift: row.get(2)?,
            additive_type: row.get(3)?,
            quantity: row.get(4)?,
            created_at: row.get(5)?,
            updated_at: row.get(6)?,
        })
    }

    pub fn create(
        conn: &Connection,
        report_id: &str,
        data: &CreateMudAdditiveRequest,
    ) -> Result<MudAdditive, AppError> {
        let id = uuid::Uuid::new_v4().to_string();
        let now = chrono::Utc::now().to_rfc3339();

        conn.execute(
            "INSERT INTO mud_additives (id, report_id, shift, additive_type, quantity, created_at, updated_at)
             VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7)",
            params![
                &id,
                report_id,
                &data.shift,
                &data.additive_type,
                &data.quantity,
                &now,
                &now
            ],
        )?;

        MudAdditive::get_by_id(conn, &id)
    }

    pub fn get_by_id(conn: &Connection, id: &str) -> Result<MudAdditive, AppError> {
        let additive = conn.query_row(
            "SELECT id, report_id, shift, additive_type, quantity, created_at, updated_at
             FROM mud_additives WHERE id = ?1",
            params![id],
            MudAdditive::from_row,
        )?;

        Ok(additive)
    }

    pub fn list_by_report(conn: &Connection, report_id: &str) -> Result<Vec<MudAdditive>, AppError> {
        let mut stmt = conn.prepare(
            "SELECT id, report_id, shift, additive_type, quantity, created_at, updated_at
             FROM mud_additives WHERE report_id = ?1 ORDER BY created_at"
        )?;

        let additives = stmt
            .query_map(params![report_id], MudAdditive::from_row)?
            .collect::<Result<Vec<_>, _>>()?;

        Ok(additives)
    }

    pub fn delete(conn: &Connection, id: &str) -> Result<(), AppError> {
        conn.execute("DELETE FROM mud_additives WHERE id = ?1", params![id])?;
        Ok(())
    }

    pub fn delete_all_by_report(conn: &Connection, report_id: &str) -> Result<(), AppError> {
        conn.execute("DELETE FROM mud_additives WHERE report_id = ?1", params![report_id])?;
        Ok(())
    }
}

