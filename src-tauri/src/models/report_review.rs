use crate::error::AppError;
use rusqlite::{params, Connection, Row};
use serde::{Deserialize, Serialize};

/// Valid actions for a report review entry
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub enum ReviewAction {
    Approved,
    Rejected,
    RevisionRequested,
    Comment,
    Resubmitted,
}

impl ReviewAction {
    pub fn from_str(s: &str) -> Result<Self, AppError> {
        match s {
            "approved" => Ok(ReviewAction::Approved),
            "rejected" => Ok(ReviewAction::Rejected),
            "revision_requested" => Ok(ReviewAction::RevisionRequested),
            "comment" => Ok(ReviewAction::Comment),
            "resubmitted" => Ok(ReviewAction::Resubmitted),
            _ => Err(AppError::ValidationError(format!(
                "Invalid review action: {}",
                s
            ))),
        }
    }
}

/// A single review entry in the report approval audit trail
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ReportReview {
    pub id: String,
    pub report_id: String,
    pub reviewer_id: String,
    pub action: String,
    pub comment: Option<String>,
    pub previous_status: Option<String>,
    pub new_status: Option<String>,
    pub created_at: String,
    pub updated_at: String,
    pub is_deleted: bool,
}

impl ReportReview {
    fn from_row(row: &Row) -> Result<Self, rusqlite::Error> {
        Ok(ReportReview {
            id: row.get(0)?,
            report_id: row.get(1)?,
            reviewer_id: row.get(2)?,
            action: row.get(3)?,
            comment: row.get(4)?,
            previous_status: row.get(5)?,
            new_status: row.get(6)?,
            created_at: row.get(7)?,
            updated_at: row.get(8)?,
            is_deleted: row.get::<_, i32>(9)? == 1,
        })
    }

    /// Create a new review entry (immutable audit log)
    pub fn create(
        conn: &Connection,
        report_id: &str,
        reviewer_id: &str,
        action: &str,
        comment: Option<&str>,
        previous_status: Option<&str>,
        new_status: Option<&str>,
    ) -> Result<ReportReview, AppError> {
        // Validate the action value
        ReviewAction::from_str(action)?;

        let id = uuid::Uuid::new_v4().to_string();
        let now = chrono::Utc::now().to_rfc3339();

        conn.execute(
            "INSERT INTO report_reviews (id, report_id, reviewer_id, action, comment, previous_status, new_status, created_at, updated_at, is_deleted)
             VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, 0)",
            params![
                &id,
                report_id,
                reviewer_id,
                action,
                comment,
                previous_status,
                new_status,
                &now,
                &now,
            ],
        )?;

        ReportReview::get_by_id(conn, &id)
    }

    /// Get a single review by ID
    pub fn get_by_id(conn: &Connection, review_id: &str) -> Result<ReportReview, AppError> {
        let review = conn.query_row(
            "SELECT id, report_id, reviewer_id, action, comment, previous_status, new_status, created_at, updated_at, is_deleted
             FROM report_reviews WHERE id = ?1",
            params![review_id],
            ReportReview::from_row,
        )?;
        Ok(review)
    }

    /// List all reviews for a given report, ordered chronologically (oldest first)
    pub fn list_by_report(conn: &Connection, report_id: &str) -> Result<Vec<ReportReview>, AppError> {
        let mut stmt = conn.prepare(
            "SELECT id, report_id, reviewer_id, action, comment, previous_status, new_status, created_at, updated_at, is_deleted
             FROM report_reviews
             WHERE report_id = ?1 AND (is_deleted IS NULL OR is_deleted = 0)
             ORDER BY created_at ASC",
        )?;

        let reviews = stmt
            .query_map(params![report_id], ReportReview::from_row)?
            .collect::<Result<Vec<_>, _>>()?;

        Ok(reviews)
    }
}
