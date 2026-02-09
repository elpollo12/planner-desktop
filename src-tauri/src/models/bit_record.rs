#![allow(dead_code)]

use crate::error::AppError;
use rusqlite::{params, Connection, Row};
use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct BitRecord {
    pub id: String,
    pub report_id: String,
    pub shift: Option<String>,
    pub size: Option<String>,
    pub manufacturer_code: Option<String>,
    pub brand: Option<String>,
    pub bit_type: Option<String>,
    pub serial_number: Option<String>,
    pub jets: Option<String>,
    pub tfa: Option<String>,
    pub depth_out: Option<String>,
    pub depth_in: Option<String>,
    pub footage: Option<String>,
    pub hours_total: Option<f64>,
    pub dp_tubos: Option<String>,
    pub kelly: Option<String>,
    pub created_at: String,
    pub updated_at: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CreateBitRecordRequest {
    pub shift: Option<String>,
    pub size: Option<String>,
    pub manufacturer_code: Option<String>,
    pub brand: Option<String>,
    pub bit_type: Option<String>,
    pub serial_number: Option<String>,
    pub jets: Option<String>,
    pub tfa: Option<String>,
    pub depth_out: Option<String>,
    pub depth_in: Option<String>,
    pub footage: Option<String>,
    pub hours_total: Option<f64>,
    pub dp_tubos: Option<String>,
    pub kelly: Option<String>,
}

impl BitRecord {
    fn from_row(row: &Row) -> Result<Self, rusqlite::Error> {
        Ok(BitRecord {
            id: row.get(0)?,
            report_id: row.get(1)?,
            shift: row.get(2)?,
            size: row.get(3)?,
            manufacturer_code: row.get(4)?,
            brand: row.get(5)?,
            bit_type: row.get(6)?,
            serial_number: row.get(7)?,
            jets: row.get(8)?,
            tfa: row.get(9)?,
            depth_out: row.get(10)?,
            depth_in: row.get(11)?,
            footage: row.get(12)?,
            hours_total: row.get(13)?,
            dp_tubos: row.get(14)?,
            kelly: row.get(15)?,
            created_at: row.get(16)?,
            updated_at: row.get(17)?,
        })
    }

    pub fn create(
        conn: &Connection,
        report_id: &str,
        data: &CreateBitRecordRequest,
    ) -> Result<BitRecord, AppError> {
        let id = uuid::Uuid::new_v4().to_string();
        let now = chrono::Utc::now().to_rfc3339();

        conn.execute(
            "INSERT INTO bit_records (id, report_id, shift, size, manufacturer_code, brand, bit_type, serial_number, jets, tfa, depth_out, depth_in, footage, hours_total, dp_tubos, kelly, created_at, updated_at)
             VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12, ?13, ?14, ?15, ?16, ?17, ?18)",
            params![
                &id,
                report_id,
                &data.shift,
                &data.size,
                &data.manufacturer_code,
                &data.brand,
                &data.bit_type,
                &data.serial_number,
                &data.jets,
                &data.tfa,
                &data.depth_out,
                &data.depth_in,
                &data.footage,
                &data.hours_total,
                &data.dp_tubos,
                &data.kelly,
                &now,
                &now
            ],
        )?;

        BitRecord::get_by_id(conn, &id)
    }

    pub fn get_by_id(conn: &Connection, id: &str) -> Result<BitRecord, AppError> {
        let record = conn.query_row(
            "SELECT id, report_id, shift, size, manufacturer_code, brand, bit_type, serial_number, jets, tfa, depth_out, depth_in, footage, hours_total, dp_tubos, kelly, created_at, updated_at
             FROM bit_records WHERE id = ?1",
            params![id],
            BitRecord::from_row,
        )?;

        Ok(record)
    }

    pub fn list_by_report(conn: &Connection, report_id: &str) -> Result<Vec<BitRecord>, AppError> {
        let mut stmt = conn.prepare(
            "SELECT id, report_id, shift, size, manufacturer_code, brand, bit_type, serial_number, jets, tfa, depth_out, depth_in, footage, hours_total, dp_tubos, kelly, created_at, updated_at
             FROM bit_records WHERE report_id = ?1 ORDER BY created_at"
        )?;

        let records = stmt
            .query_map(params![report_id], BitRecord::from_row)?
            .collect::<Result<Vec<_>, _>>()?;

        Ok(records)
    }

    pub fn update(
        conn: &Connection,
        id: &str,
        data: &CreateBitRecordRequest,
    ) -> Result<BitRecord, AppError> {
        let now = chrono::Utc::now().to_rfc3339();

        conn.execute(
            "UPDATE bit_records SET shift = ?1, size = ?2, manufacturer_code = ?3, brand = ?4, bit_type = ?5, serial_number = ?6, jets = ?7, tfa = ?8, depth_out = ?9, depth_in = ?10, footage = ?11, hours_total = ?12, dp_tubos = ?13, kelly = ?14, updated_at = ?15 WHERE id = ?16",
            params![
                &data.shift,
                &data.size,
                &data.manufacturer_code,
                &data.brand,
                &data.bit_type,
                &data.serial_number,
                &data.jets,
                &data.tfa,
                &data.depth_out,
                &data.depth_in,
                &data.footage,
                &data.hours_total,
                &data.dp_tubos,
                &data.kelly,
                &now,
                id
            ],
        )?;

        BitRecord::get_by_id(conn, id)
    }

    pub fn delete(conn: &Connection, id: &str) -> Result<(), AppError> {
        conn.execute("DELETE FROM bit_records WHERE id = ?1", params![id])?;
        Ok(())
    }

    pub fn delete_all_by_report(conn: &Connection, report_id: &str) -> Result<(), AppError> {
        conn.execute("DELETE FROM bit_records WHERE report_id = ?1", params![report_id])?;
        Ok(())
    }
}
