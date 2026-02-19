#![allow(dead_code)]

use crate::error::AppError;
use crate::models::bit_record::BitRecord;
use crate::models::crew::CrewShift;
use crate::models::deviation::DeviationRecord;
use crate::models::drill_string::DrillString;
use crate::models::drilling_params::DrillingParameter;
use crate::models::mud::{MudAdditive, MudRecord};
use crate::models::operations_log::OperationLog;
use crate::models::report::Report;
use crate::models::time_distribution::TimeDistribution;
use rusqlite::{params, Connection};
use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct LastReportSnapshot {
    pub id: String,
    pub rig_id: String,

    // Header
    pub report_number: i32,
    pub well_number: Option<String>,
    pub api_number: Option<String>,
    pub contract: Option<String>,
    pub contractor: Option<String>,
    pub operator: Option<String>,
    pub field_district: Option<String>,
    pub municipality: Option<String>,
    pub rig_number: Option<String>,
    pub company: Option<String>,
    pub supervisor_24h: Option<String>,

    // Sections as JSON strings
    pub crew_data: Option<String>,
    pub time_distribution_data: Option<String>,
    pub bit_records_data: Option<String>,
    pub mud_records_data: Option<String>,
    pub mud_additives_data: Option<String>,
    pub drilling_params_data: Option<String>,
    pub deviation_data: Option<String>,
    pub operations_log_data: Option<String>,
    pub drill_string_data: Option<String>,

    // Metadata
    pub source_report_id: Option<String>,
    pub updated_by: Option<String>,
    pub updated_at: String,
}

impl LastReportSnapshot {
    /// Get snapshot by rig_id — single query, returns all data
    pub fn get_by_rig(conn: &Connection, rig_id: &str) -> Result<Option<Self>, AppError> {
        let mut stmt = conn.prepare(
            "SELECT id, rig_id, report_number, well_number, api_number, contract,
                    contractor, operator, field_district, municipality, rig_number,
                    company, supervisor_24h, crew_data, time_distribution_data,
                    bit_records_data, mud_records_data, mud_additives_data,
                    drilling_params_data, deviation_data, operations_log_data,
                    drill_string_data, source_report_id, updated_by, updated_at
             FROM last_report_snapshot WHERE rig_id = ?1",
        )?;

        let result = stmt.query_row(params![rig_id], |row| {
            Ok(LastReportSnapshot {
                id: row.get(0)?,
                rig_id: row.get(1)?,
                report_number: row.get(2)?,
                well_number: row.get(3)?,
                api_number: row.get(4)?,
                contract: row.get(5)?,
                contractor: row.get(6)?,
                operator: row.get(7)?,
                field_district: row.get(8)?,
                municipality: row.get(9)?,
                rig_number: row.get(10)?,
                company: row.get(11)?,
                supervisor_24h: row.get(12)?,
                crew_data: row.get(13)?,
                time_distribution_data: row.get(14)?,
                bit_records_data: row.get(15)?,
                mud_records_data: row.get(16)?,
                mud_additives_data: row.get(17)?,
                drilling_params_data: row.get(18)?,
                deviation_data: row.get(19)?,
                operations_log_data: row.get(20)?,
                drill_string_data: row.get(21)?,
                source_report_id: row.get(22)?,
                updated_by: row.get(23)?,
                updated_at: row.get(24)?,
            })
        });

        match result {
            Ok(snapshot) => Ok(Some(snapshot)),
            Err(rusqlite::Error::QueryReturnedNoRows) => Ok(None),
            Err(e) => Err(AppError::Database(e)),
        }
    }

    /// Build and save snapshot from an existing report + its sections.
    /// Uses UPSERT (INSERT ... ON CONFLICT ... DO UPDATE) so only 1 row per rig exists.
    pub fn save_from_report(
        conn: &Connection,
        rig_id: &str,
        report_id: &str,
        user_id: &str,
        report: &Report,
    ) -> Result<(), AppError> {
        // Gather all sections and serialize to JSON
        let crew_json = Self::serialize_crew(conn, report_id);
        let time_json = Self::serialize_list::<TimeDistribution>(
            &TimeDistribution::list_by_report(conn, report_id).unwrap_or_default(),
        );
        let bits_json = Self::serialize_list::<BitRecord>(
            &BitRecord::list_by_report(conn, report_id).unwrap_or_default(),
        );
        let mud_json = Self::serialize_list::<MudRecord>(
            &MudRecord::list_by_report(conn, report_id).unwrap_or_default(),
        );
        let additives_json = Self::serialize_list::<MudAdditive>(
            &MudAdditive::list_by_report(conn, report_id).unwrap_or_default(),
        );
        let drilling_json = Self::serialize_list::<DrillingParameter>(
            &DrillingParameter::list_by_report(conn, report_id).unwrap_or_default(),
        );
        let deviation_json = Self::serialize_list::<DeviationRecord>(
            &DeviationRecord::list_by_report(conn, report_id).unwrap_or_default(),
        );
        let ops_json = Self::serialize_list::<OperationLog>(
            &OperationLog::list_by_report(conn, report_id).unwrap_or_default(),
        );
        let drill_string_json = Self::serialize_drill_string(conn, report_id);

        let id = uuid::Uuid::new_v4().to_string();
        let now = chrono::Utc::now().to_rfc3339();

        conn.execute(
            "INSERT INTO last_report_snapshot (
                id, rig_id, report_number, well_number, api_number, contract,
                contractor, operator, field_district, municipality, rig_number,
                company, supervisor_24h, crew_data, time_distribution_data,
                bit_records_data, mud_records_data, mud_additives_data,
                drilling_params_data, deviation_data, operations_log_data,
                drill_string_data, source_report_id, updated_by, updated_at
            ) VALUES (
                ?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12, ?13,
                ?14, ?15, ?16, ?17, ?18, ?19, ?20, ?21, ?22, ?23, ?24, ?25
            )
            ON CONFLICT(rig_id) DO UPDATE SET
                report_number = excluded.report_number,
                well_number = excluded.well_number,
                api_number = excluded.api_number,
                contract = excluded.contract,
                contractor = excluded.contractor,
                operator = excluded.operator,
                field_district = excluded.field_district,
                municipality = excluded.municipality,
                rig_number = excluded.rig_number,
                company = excluded.company,
                supervisor_24h = excluded.supervisor_24h,
                crew_data = excluded.crew_data,
                time_distribution_data = excluded.time_distribution_data,
                bit_records_data = excluded.bit_records_data,
                mud_records_data = excluded.mud_records_data,
                mud_additives_data = excluded.mud_additives_data,
                drilling_params_data = excluded.drilling_params_data,
                deviation_data = excluded.deviation_data,
                operations_log_data = excluded.operations_log_data,
                drill_string_data = excluded.drill_string_data,
                source_report_id = excluded.source_report_id,
                updated_by = excluded.updated_by,
                updated_at = excluded.updated_at",
            params![
                &id,
                rig_id,
                report.report_number,
                &report.well_number,
                &report.api_number,
                &report.contract,
                &report.contractor,
                &report.operator,
                &report.field_district,
                &report.municipality,
                &report.rig_number,
                &report.company,
                &report.supervisor_24h,
                &crew_json,
                &time_json,
                &bits_json,
                &mud_json,
                &additives_json,
                &drilling_json,
                &deviation_json,
                &ops_json,
                &drill_string_json,
                report_id,
                user_id,
                &now
            ],
        )?;

        Ok(())
    }

    // ── Serialization helpers ────────────────────────────────────────────

    fn serialize_list<T: Serialize>(items: &[T]) -> Option<String> {
        if items.is_empty() {
            None
        } else {
            serde_json::to_string(items).ok()
        }
    }

    /// Crew needs special handling because it's shifts-with-members
    fn serialize_crew(conn: &Connection, report_id: &str) -> Option<String> {
        let shifts = CrewShift::list_by_report(conn, report_id).unwrap_or_default();
        if shifts.is_empty() {
            None
        } else {
            serde_json::to_string(&shifts).ok()
        }
    }

    fn serialize_drill_string(conn: &Connection, report_id: &str) -> Option<String> {
        match DrillString::get_by_report_id(conn, report_id) {
            Ok(ds) => serde_json::to_string(&ds).ok(),
            Err(_) => None,
        }
    }
}
