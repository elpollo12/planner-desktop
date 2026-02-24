#![allow(dead_code)]

use crate::error::AppError;
use rusqlite::{params, Connection, Row};
use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CrewShift {
    pub id: String,
    pub report_id: String,
    pub shift: String,
    pub shift_start: Option<String>,
    pub shift_end: Option<String>,
    pub created_at: String,
    pub updated_at: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CrewMember {
    pub id: String,
    pub crew_shift_id: String,
    pub personnel_id: Option<String>,
    pub position: String,
    pub ci: Option<String>,
    pub name: Option<String>,
    pub hours: Option<f64>,
    // Denormalized from rig_personnel via JOIN
    pub personnel_name: Option<String>,
    pub personnel_ci: Option<String>,
    pub created_at: String,
    pub updated_at: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CrewMemberData {
    pub personnel_id: Option<String>,
    pub position: String,
    pub hours: Option<f64>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CrewShiftData {
    pub shift: String,
    pub shift_start: Option<String>,
    pub shift_end: Option<String>,
    pub members: Vec<CrewMemberData>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CrewShiftWithMembers {
    #[serde(flatten)]
    pub shift: CrewShift,
    pub members: Vec<CrewMember>,
}

impl CrewShift {
    fn from_row(row: &Row) -> Result<Self, rusqlite::Error> {
        Ok(CrewShift {
            id: row.get(0)?,
            report_id: row.get(1)?,
            shift: row.get(2)?,
            shift_start: row.get(3)?,
            shift_end: row.get(4)?,
            created_at: row.get(5)?,
            updated_at: row.get(6)?,
        })
    }

    pub fn create(
        conn: &Connection,
        report_id: &str,
        data: &CrewShiftData,
    ) -> Result<CrewShiftWithMembers, AppError> {
        let shift_id = uuid::Uuid::new_v4().to_string();
        let now = chrono::Utc::now().to_rfc3339();

        // Validate shift
        if !["morning", "afternoon", "night"].contains(&data.shift.as_str()) {
            return Err(AppError::ValidationError(format!(
                "Invalid shift: {}. Must be morning, afternoon, or night",
                data.shift
            )));
        }

        // Insert shift
        conn.execute(
            "INSERT INTO crew_shifts (id, report_id, shift, shift_start, shift_end, created_at, updated_at)
             VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7)",
            params![
                &shift_id,
                report_id,
                &data.shift,
                &data.shift_start,
                &data.shift_end,
                &now,
                &now
            ],
        )?;

        // Insert members with personnel_id reference
        for member_data in &data.members {
            let member_id = uuid::Uuid::new_v4().to_string();
            conn.execute(
                "INSERT INTO crew_members (id, crew_shift_id, personnel_id, position, hours, created_at, updated_at)
                 VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7)",
                params![
                    &member_id,
                    &shift_id,
                    &member_data.personnel_id,
                    &member_data.position,
                    &member_data.hours,
                    &now,
                    &now
                ],
            )?;
        }

        CrewShift::get_with_members(conn, &shift_id)
    }

    pub fn get_with_members(conn: &Connection, shift_id: &str) -> Result<CrewShiftWithMembers, AppError> {
        let shift = conn.query_row(
            "SELECT id, report_id, shift, shift_start, shift_end, created_at, updated_at
             FROM crew_shifts WHERE id = ?1",
            params![shift_id],
            CrewShift::from_row,
        )?;

        let members = CrewMember::list_by_shift(conn, shift_id)?;

        Ok(CrewShiftWithMembers { shift, members })
    }

    pub fn list_by_report(conn: &Connection, report_id: &str) -> Result<Vec<CrewShiftWithMembers>, AppError> {
        let mut stmt = conn.prepare(
            "SELECT id, report_id, shift, shift_start, shift_end, created_at, updated_at
             FROM crew_shifts WHERE report_id = ?1 ORDER BY shift"
        )?;

        let shifts: Vec<CrewShift> = stmt
            .query_map(params![report_id], CrewShift::from_row)?
            .collect::<Result<Vec<_>, _>>()?;

        let mut result = Vec::new();
        for shift in shifts {
            let members = CrewMember::list_by_shift(conn, &shift.id)?;
            result.push(CrewShiftWithMembers { shift, members });
        }

        Ok(result)
    }

    pub fn delete(conn: &Connection, shift_id: &str) -> Result<(), AppError> {
        conn.execute("DELETE FROM crew_shifts WHERE id = ?1", params![shift_id])?;
        Ok(())
    }

    pub fn delete_all_by_report(conn: &Connection, report_id: &str) -> Result<(), AppError> {
        conn.execute("DELETE FROM crew_shifts WHERE report_id = ?1", params![report_id])?;
        Ok(())
    }

    pub fn save_bulk(
        conn: &Connection,
        report_id: &str,
        shifts: &[CrewShiftData],
    ) -> Result<Vec<CrewShiftWithMembers>, AppError> {
        let now = chrono::Utc::now().to_rfc3339();

        // CASCADE delete removes crew_members automatically
        conn.execute("DELETE FROM crew_shifts WHERE report_id = ?1", params![report_id])?;

        for data in shifts {
            if !["morning", "afternoon", "night"].contains(&data.shift.as_str()) {
                return Err(AppError::ValidationError(format!(
                    "Invalid shift: {}. Must be morning, afternoon, or night",
                    data.shift
                )));
            }

            let shift_id = uuid::Uuid::new_v4().to_string();
            conn.execute(
                "INSERT INTO crew_shifts (id, report_id, shift, shift_start, shift_end, created_at, updated_at)
                 VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7)",
                params![&shift_id, report_id, &data.shift, &data.shift_start, &data.shift_end, &now, &now],
            )?;

            for member_data in &data.members {
                let member_id = uuid::Uuid::new_v4().to_string();
                conn.execute(
                    "INSERT INTO crew_members (id, crew_shift_id, personnel_id, position, hours, created_at, updated_at)
                     VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7)",
                    params![&member_id, &shift_id, &member_data.personnel_id, &member_data.position, &member_data.hours, &now, &now],
                )?;
            }
        }

        CrewShift::list_by_report(conn, report_id)
    }
}

impl CrewMember {
    fn from_row_with_personnel(row: &Row) -> Result<Self, rusqlite::Error> {
        Ok(CrewMember {
            id: row.get(0)?,
            crew_shift_id: row.get(1)?,
            personnel_id: row.get(2)?,
            position: row.get(3)?,
            hours: row.get(4)?,
            personnel_name: row.get(5)?,
            personnel_ci: row.get(6)?,
            // Legacy fallback columns
            name: row.get(7)?,
            ci: row.get(8)?,
            created_at: row.get(9)?,
            updated_at: row.get(10)?,
        })
    }

    pub fn list_by_shift(conn: &Connection, shift_id: &str) -> Result<Vec<CrewMember>, AppError> {
        let mut stmt = conn.prepare(
            "SELECT cm.id, cm.crew_shift_id, cm.personnel_id, cm.position, cm.hours,
                    rp.name AS personnel_name, rp.ci AS personnel_ci,
                    cm.name, cm.ci,
                    cm.created_at, cm.updated_at
             FROM crew_members cm
             LEFT JOIN rig_personnel rp ON cm.personnel_id = rp.id
             WHERE cm.crew_shift_id = ?1"
        )?;

        let members = stmt
            .query_map(params![shift_id], CrewMember::from_row_with_personnel)?
            .collect::<Result<Vec<_>, _>>()?;

        Ok(members)
    }
}
