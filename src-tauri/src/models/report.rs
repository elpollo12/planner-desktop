#![allow(dead_code)]

use crate::error::AppError;
use crate::models::user::UserRole;
use rusqlite::{params, Connection, Row};
use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub enum ReportStatus {
    Draft,
    Submitted,
    Approved,
    Rejected,
}

impl ReportStatus {
    pub fn from_str(s: &str) -> Result<Self, AppError> {
        match s {
            "draft" => Ok(ReportStatus::Draft),
            "submitted" => Ok(ReportStatus::Submitted),
            "approved" => Ok(ReportStatus::Approved),
            "rejected" => Ok(ReportStatus::Rejected),
            _ => Err(AppError::ValidationError(format!("Invalid status: {}", s))),
        }
    }

    pub fn to_str(&self) -> &str {
        match self {
            ReportStatus::Draft => "draft",
            ReportStatus::Submitted => "submitted",
            ReportStatus::Approved => "approved",
            ReportStatus::Rejected => "rejected",
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Report {
    pub id: String,
    pub report_number: i32,
    pub report_date: String,
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
    pub status: String,
    pub created_by: Option<String>,
    pub approved_by: Option<String>,
    pub submitted_at: Option<String>,
    pub approved_at: Option<String>,
    pub rejected_at: Option<String>,
    pub rejection_reason: Option<String>,
    pub created_at: String,
    pub updated_at: String,
    pub synced: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CreateReportRequest {
    pub report_number: i32,
    pub report_date: String,
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
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct UpdateReportRequest {
    pub report_number: Option<i32>,
    pub report_date: Option<String>,
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
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ReportFilters {
    pub date_from: Option<String>,
    pub date_to: Option<String>,
    pub status: Option<String>,
    pub created_by: Option<String>,
    pub well_number: Option<String>,
    pub rig_number: Option<String>,
}

impl Report {
    /// Update the report's updated_at timestamp.
    /// Must be called whenever a child section (crew, drill_string, etc.) is modified,
    /// so that incremental sync picks up the report and cleans up stale child rows.
    pub fn touch_updated_at(conn: &Connection, report_id: &str) -> Result<(), AppError> {
        let now = chrono::Utc::now().to_rfc3339();
        conn.execute(
            "UPDATE reports SET updated_at = ?1 WHERE id = ?2",
            params![&now, report_id],
        )?;
        Ok(())
    }

    fn from_row(row: &Row) -> Result<Self, rusqlite::Error> {
        Ok(Report {
            id: row.get(0)?,
            report_number: row.get(1)?,
            report_date: row.get(2)?,
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
            status: row.get(13)?,
            created_by: row.get(14)?,
            approved_by: row.get(15)?,
            submitted_at: row.get(16)?,
            approved_at: row.get(17)?,
            rejected_at: row.get(18)?,
            rejection_reason: row.get(19)?,
            created_at: row.get(20)?,
            updated_at: row.get(21)?,
            synced: row.get::<_, i32>(22)? == 1,
        })
    }

    /// Create a new report
    pub fn create(
        conn: &Connection,
        request: &CreateReportRequest,
        created_by: String,
    ) -> Result<Report, AppError> {
        let id = uuid::Uuid::new_v4().to_string();
        let now = chrono::Utc::now().to_rfc3339();

        conn.execute(
            "INSERT INTO reports (id, report_number, report_date, well_number, api_number, contract, contractor, operator, field_district, municipality, rig_number, company, supervisor_24h, status, created_by, created_at, updated_at, synced)
             VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12, ?13, ?14, ?15, ?16, ?17, ?18)",
            params![
                &id,
                request.report_number,
                &request.report_date,
                &request.well_number,
                &request.api_number,
                &request.contract,
                &request.contractor,
                &request.operator,
                &request.field_district,
                &request.municipality,
                &request.rig_number,
                &request.company,
                &request.supervisor_24h,
                "draft",
                &created_by,
                &now,
                &now,
                0
            ],
        )?;

        Report::get_by_id(conn, &id)
    }

    /// Get report by ID
    pub fn get_by_id(conn: &Connection, report_id: &str) -> Result<Report, AppError> {
        let report = conn.query_row(
            "SELECT id, report_number, report_date, well_number, api_number, contract, contractor, operator, field_district, municipality, rig_number, company, supervisor_24h, status, created_by, approved_by, submitted_at, approved_at, rejected_at, rejection_reason, created_at, updated_at, synced
             FROM reports WHERE id = ?1",
            params![report_id],
            Report::from_row,
        )?;

        Ok(report)
    }

    /// List reports with filters and permission-aware filtering
        pub fn list(
        conn: &Connection,
        filters: &ReportFilters,
        user_id: Option<&str>,
        user_role: &UserRole,
        accessible_rig_names: Option<&[String]>,
        page: Option<i64>,
        page_size: Option<i64>,
    ) -> Result<(Vec<Report>, i64), AppError> {
        // Pagination defaults
        let page = page.unwrap_or(1).max(1);
        let page_size = page_size.unwrap_or(20).min(100);
        let offset = (page - 1) * page_size;

        // Base query for selecting reports
        let mut query = String::from(
            "SELECT id, report_number, report_date, well_number, api_number, contract, contractor, operator, field_district, municipality, rig_number, company, supervisor_24h, status, created_by, approved_by, submitted_at, approved_at, rejected_at, rejection_reason, created_at, updated_at, synced FROM reports WHERE (is_deleted IS NULL OR is_deleted = 0)"
        );

        // Query for counting total
        let mut count_query = String::from(
            "SELECT COUNT(*) FROM reports WHERE (is_deleted IS NULL OR is_deleted = 0)"
        );
        
        let mut params_vec: Vec<Box<dyn rusqlite::ToSql>> = Vec::new();

        // Permission-based filtering: operators only see their own reports
        if *user_role == UserRole::Operator {
            if let Some(uid) = user_id {
                let clause = " AND created_by = ?";
                query.push_str(clause);
                count_query.push_str(clause);
                params_vec.push(Box::new(uid.to_string()));
            }
        }

        // Filter by accessible rigs (if user doesn't have access to all rigs)
        if let Some(rig_names) = accessible_rig_names {
            if rig_names.is_empty() {
                // User has no rig access - return empty
                return Ok((Vec::new(), 0));
            }
            // Build IN clause for rig names
            let placeholders: Vec<&str> = rig_names.iter().map(|_| "?").collect();
            let clause = format!(" AND rig_number IN ({})", placeholders.join(","));
            query.push_str(&clause);
            count_query.push_str(&clause);
            for name in rig_names {
                params_vec.push(Box::new(name.clone()));
            }
        }

        // Apply filters (same to both queries)
        if let Some(ref date_from) = filters.date_from {
            let clause = " AND report_date >= ?";
            query.push_str(clause);
            count_query.push_str(clause);
            params_vec.push(Box::new(date_from.clone()));
        }

        if let Some(ref date_to) = filters.date_to {
            let clause = " AND report_date <= ?";
            query.push_str(clause);
            count_query.push_str(clause);
            params_vec.push(Box::new(date_to.clone()));
        }

        if let Some(ref status) = filters.status {
            let clause = " AND status = ?";
            query.push_str(clause);
            count_query.push_str(clause);
            params_vec.push(Box::new(status.clone()));
        }

        if let Some(ref created_by) = filters.created_by {
            let clause = " AND created_by = ?";
            query.push_str(clause);
            count_query.push_str(clause);
            params_vec.push(Box::new(created_by.clone()));
        }

        // Case-insensitive partial search for well number
        if let Some(ref well_number) = filters.well_number {
            let clause = " AND LOWER(well_number) LIKE LOWER(?)";
            query.push_str(clause);
            count_query.push_str(clause);
            params_vec.push(Box::new(format!("%{}%", well_number)));
        }

        // Case-insensitive partial search for rig number
        if let Some(ref rig_number) = filters.rig_number {
            let clause = " AND LOWER(rig_number) LIKE LOWER(?)";
            query.push_str(clause);
            count_query.push_str(clause);
            params_vec.push(Box::new(format!("%{}%", rig_number)));
        }

        // Get total count first
        let params_refs: Vec<&dyn rusqlite::ToSql> = params_vec.iter().map(|p| p.as_ref()).collect();
        let total: i64 = conn.query_row(&count_query, params_refs.as_slice(), |row| row.get(0))?;

        // Add ORDER BY + LIMIT + OFFSET to main query
        query.push_str(" ORDER BY report_date DESC, created_at DESC");
        query.push_str(&format!(" LIMIT {} OFFSET {}", page_size, offset));

        // Execute main query
        let mut stmt = conn.prepare(&query)?;
        let reports = stmt
            .query_map(params_refs.as_slice(), Report::from_row)?
            .collect::<Result<Vec<_>, _>>()?;

        Ok((reports, total))
    }

    /// Update report
    pub fn update(
        conn: &Connection,
        report_id: &str,
        request: &UpdateReportRequest,
    ) -> Result<Report, AppError> {
        let now = chrono::Utc::now().to_rfc3339();

        let mut updates = Vec::new();
        let mut params_vec: Vec<Box<dyn rusqlite::ToSql>> = Vec::new();

        if let Some(report_number) = request.report_number {
            updates.push("report_number = ?");
            params_vec.push(Box::new(report_number));
        }
        if let Some(ref report_date) = request.report_date {
            updates.push("report_date = ?");
            params_vec.push(Box::new(report_date.clone()));
        }
        if let Some(ref well_number) = request.well_number {
            updates.push("well_number = ?");
            params_vec.push(Box::new(well_number.clone()));
        }
        if let Some(ref api_number) = request.api_number {
            updates.push("api_number = ?");
            params_vec.push(Box::new(api_number.clone()));
        }
        if let Some(ref contract) = request.contract {
            updates.push("contract = ?");
            params_vec.push(Box::new(contract.clone()));
        }
        if let Some(ref contractor) = request.contractor {
            updates.push("contractor = ?");
            params_vec.push(Box::new(contractor.clone()));
        }
        if let Some(ref operator) = request.operator {
            updates.push("operator = ?");
            params_vec.push(Box::new(operator.clone()));
        }
        if let Some(ref field_district) = request.field_district {
            updates.push("field_district = ?");
            params_vec.push(Box::new(field_district.clone()));
        }
        if let Some(ref municipality) = request.municipality {
            updates.push("municipality = ?");
            params_vec.push(Box::new(municipality.clone()));
        }
        if let Some(ref rig_number) = request.rig_number {
            updates.push("rig_number = ?");
            params_vec.push(Box::new(rig_number.clone()));
        }
        if let Some(ref company) = request.company {
            updates.push("company = ?");
            params_vec.push(Box::new(company.clone()));
        }
        if let Some(ref supervisor_24h) = request.supervisor_24h {
            updates.push("supervisor_24h = ?");
            params_vec.push(Box::new(supervisor_24h.clone()));
        }

        updates.push("updated_at = ?");
        params_vec.push(Box::new(now.clone()));

        params_vec.push(Box::new(report_id.to_string()));

        let query = format!("UPDATE reports SET {} WHERE id = ?", updates.join(", "));

        let params_refs: Vec<&dyn rusqlite::ToSql> = params_vec.iter().map(|p| p.as_ref()).collect();

        conn.execute(&query, params_refs.as_slice())?;

        Report::get_by_id(conn, report_id)
    }

    /// Soft-delete report (marks is_deleted = 1 so sync propagates it).
    /// Child entities are left in place and cleaned up by the purge cycle.
    pub fn delete(conn: &Connection, report_id: &str) -> Result<(), AppError> {
        let now = chrono::Utc::now().to_rfc3339();
        conn.execute(
            "UPDATE reports SET is_deleted = 1, updated_at = ?1 WHERE id = ?2",
            params![&now, report_id],
        )?;
        Ok(())
    }

    /// Submit report (draft → submitted)
    pub fn submit(conn: &Connection, report_id: &str) -> Result<Report, AppError> {
        let now = chrono::Utc::now().to_rfc3339();

        conn.execute(
            "UPDATE reports SET status = ?1, submitted_at = ?2, approved_at = NULL, approved_by = NULL, rejected_at = NULL, rejection_reason = NULL, updated_at = ?3 WHERE id = ?4",
            params!["submitted", &now, &now, report_id],
        )?;

        Report::get_by_id(conn, report_id)
    }

    /// Approve report (submitted → approved)
    pub fn approve(conn: &Connection, report_id: &str, approved_by: String) -> Result<Report, AppError> {
        let now = chrono::Utc::now().to_rfc3339();

        conn.execute(
            "UPDATE reports SET status = ?1, approved_by = ?2, approved_at = ?3, updated_at = ?4 WHERE id = ?5",
            params!["approved", &approved_by, &now, &now, report_id],
        )?;

        Report::get_by_id(conn, report_id)
    }

    /// Reject report (submitted → rejected)
    pub fn reject(
        conn: &Connection,
        report_id: &str,
        rejected_by: String,
        reason: String,
    ) -> Result<Report, AppError> {
        let now = chrono::Utc::now().to_rfc3339();

        conn.execute(
            "UPDATE reports SET status = ?1, approved_by = ?2, rejected_at = ?3, rejection_reason = ?4, updated_at = ?5 WHERE id = ?6",
            params!["rejected", &rejected_by, &now, &reason, &now, report_id],
        )?;

        Report::get_by_id(conn, report_id)
    }

    /// Reopen a rejected report back to draft so the creator can fix and resubmit
    /// (rejected → draft)
    pub fn reopen(conn: &Connection, report_id: &str) -> Result<Report, AppError> {
        let report = Report::get_by_id(conn, report_id)?;

        if report.status != "rejected" {
            return Err(AppError::ValidationError(
                "Only rejected reports can be reopened".to_string(),
            ));
        }

        let now = chrono::Utc::now().to_rfc3339();

        conn.execute(
            "UPDATE reports SET status = ?1, rejection_reason = NULL, rejected_at = NULL, updated_at = ?2 WHERE id = ?3",
            params!["draft", &now, report_id],
        )?;

        Report::get_by_id(conn, report_id)
    }

    /// Check if user can edit report
    pub fn can_edit(report: &Report, user_id: &str, user_role: &UserRole) -> bool {
        match user_role {
            UserRole::Admin | UserRole::Supervisor => true,
            UserRole::Operator => {
                // Operators can only edit their own draft reports
                report.status == "draft" && report.created_by.as_deref() == Some(user_id)
            }
        }
    }

    /// Get report completeness - which sections have data
    pub fn get_completeness(conn: &Connection, report_id: &str) -> Result<ReportCompleteness, AppError> {
        // Check header (always true if report exists)
        let has_header = true;

        // Check crew shifts
        let crew_count: i32 = conn.query_row(
            "SELECT COUNT(*) FROM crew_shifts WHERE report_id = ?1",
            params![report_id],
            |row| row.get(0),
        )?;
        let has_crew = crew_count > 0;

        // Check time distribution
        let time_count: i32 = conn.query_row(
            "SELECT COUNT(*) FROM time_distributions WHERE report_id = ?1",
            params![report_id],
            |row| row.get(0),
        )?;
        let has_time_distribution = time_count > 0;

        // Check bit records
        let bit_count: i32 = conn.query_row(
            "SELECT COUNT(*) FROM bit_records WHERE report_id = ?1",
            params![report_id],
            |row| row.get(0),
        )?;
        let has_bit_records = bit_count > 0;

        // Check mud records
        let mud_count: i32 = conn.query_row(
            "SELECT COUNT(*) FROM mud_records WHERE report_id = ?1",
            params![report_id],
            |row| row.get(0),
        )?;
        let has_mud = mud_count > 0;

        // Check drilling parameters
        let drilling_count: i32 = conn.query_row(
            "SELECT COUNT(*) FROM drilling_parameters WHERE report_id = ?1",
            params![report_id],
            |row| row.get(0),
        )?;
        let has_drilling_params = drilling_count > 0;

        // Check deviation history
        let deviation_count: i32 = conn.query_row(
            "SELECT COUNT(*) FROM deviation_history WHERE report_id = ?1",
            params![report_id],
            |row| row.get(0),
        )?;
        let has_deviation = deviation_count > 0;

        // Check operations log
        let operations_count: i32 = conn.query_row(
            "SELECT COUNT(*) FROM operations_log WHERE report_id = ?1",
            params![report_id],
            |row| row.get(0),
        )?;
        let has_operations_log = operations_count > 0;

        // Check drill string
        let drill_string_count: i32 = conn.query_row(
            "SELECT COUNT(*) FROM drill_string WHERE report_id = ?1",
            params![report_id],
            |row| row.get(0),
        )?;
        let has_drill_string = drill_string_count > 0;

        Ok(ReportCompleteness {
            has_header,
            has_crew,
            has_time_distribution,
            has_bit_records,
            has_mud,
            has_drilling_params,
            has_deviation,
            has_operations_log,
            has_drill_string,
        })
    }
}

/// Report completeness information
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ReportCompleteness {
    pub has_header: bool,
    pub has_crew: bool,
    pub has_time_distribution: bool,
    pub has_bit_records: bool,
    pub has_mud: bool,
    pub has_drilling_params: bool,
    pub has_deviation: bool,
    pub has_operations_log: bool,
    pub has_drill_string: bool,
}
