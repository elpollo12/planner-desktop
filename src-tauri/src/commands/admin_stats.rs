use crate::auth::check_permission;
use crate::models::admin_stats::*;
use crate::models::user::UserRole;
use crate::state::AppState;
use rusqlite::params;
use tauri::State;

// ============================================================================
// GET ACTIVITY STATS (reports created per day)
// ============================================================================

#[tauri::command]
pub async fn get_admin_activity_stats(
    session_token: String,
    days: Option<i64>,
    state: State<'_, AppState>,
) -> Result<ActivityStats, String> {
    check_permission(&session_token, UserRole::Admin, &state)
        .map_err(|e| e.to_string())?;

    let conn = state
        .db
        .lock()
        .map_err(|e| format!("Failed to lock database: {}", e))?;

    let period_days = days.unwrap_or(30).clamp(7, 90);

    // Reports created per day in the period
    let mut stmt = conn
        .prepare(
            "SELECT DATE(created_at) as day, COUNT(*) as count
             FROM reports
             WHERE created_at >= date('now', ?1)
               AND is_deleted = 0
             GROUP BY DATE(created_at)
             ORDER BY day ASC",
        )
        .map_err(|e| e.to_string())?;

    let modifier = format!("-{} days", period_days);
    let daily_reports: Vec<DailyCount> = stmt
        .query_map(params![modifier], |row| {
            Ok(DailyCount {
                day: row.get(0)?,
                count: row.get(1)?,
            })
        })
        .map_err(|e| e.to_string())?
        .collect::<Result<Vec<_>, _>>()
        .map_err(|e| e.to_string())?;

    let total_period: i64 = daily_reports.iter().map(|d| d.count).sum();

    Ok(ActivityStats {
        daily_reports,
        total_period,
    })
}

// ============================================================================
// GET LOGISTICS ADMIN STATS
// ============================================================================

#[tauri::command]
pub async fn get_admin_logistics_stats(
    session_token: String,
    days: Option<i64>,
    state: State<'_, AppState>,
) -> Result<LogisticsAdminStats, String> {
    check_permission(&session_token, UserRole::Admin, &state)
        .map_err(|e| e.to_string())?;

    let conn = state
        .db
        .lock()
        .map_err(|e| format!("Failed to lock database: {}", e))?;

    let period_days = days.unwrap_or(30).clamp(7, 90);
    let modifier = format!("-{} days", period_days);

    // 1) Requests by status (all time)
    let mut stmt = conn
        .prepare(
            "SELECT status, COUNT(*) as count
             FROM logistics_requests
             WHERE is_deleted = 0
             GROUP BY status
             ORDER BY count DESC",
        )
        .map_err(|e| e.to_string())?;

    let by_status: Vec<CategoryCount> = stmt
        .query_map([], |row| {
            Ok(CategoryCount {
                category: row.get(0)?,
                count: row.get(1)?,
            })
        })
        .map_err(|e| e.to_string())?
        .collect::<Result<Vec<_>, _>>()
        .map_err(|e| e.to_string())?;

    // 2) Requests by type (all time)
    let mut stmt = conn
        .prepare(
            "SELECT request_type, COUNT(*) as count
             FROM logistics_requests
             WHERE is_deleted = 0
             GROUP BY request_type
             ORDER BY count DESC",
        )
        .map_err(|e| e.to_string())?;

    let by_type: Vec<CategoryCount> = stmt
        .query_map([], |row| {
            Ok(CategoryCount {
                category: row.get(0)?,
                count: row.get(1)?,
            })
        })
        .map_err(|e| e.to_string())?
        .collect::<Result<Vec<_>, _>>()
        .map_err(|e| e.to_string())?;

    // 3) Daily requests in period
    let mut stmt = conn
        .prepare(
            "SELECT DATE(created_at) as day, COUNT(*) as count
             FROM logistics_requests
             WHERE created_at >= date('now', ?1)
               AND is_deleted = 0
             GROUP BY DATE(created_at)
             ORDER BY day ASC",
        )
        .map_err(|e| e.to_string())?;

    let daily_requests: Vec<DailyCount> = stmt
        .query_map(params![modifier], |row| {
            Ok(DailyCount {
                day: row.get(0)?,
                count: row.get(1)?,
            })
        })
        .map_err(|e| e.to_string())?
        .collect::<Result<Vec<_>, _>>()
        .map_err(|e| e.to_string())?;

    // 4) Top 5 rigs by request count
    let mut stmt = conn
        .prepare(
            "SELECT r.name as rig_name, COUNT(lr.id) as count
             FROM logistics_requests lr
             JOIN rigs r ON lr.rig_id = r.id
             WHERE lr.is_deleted = 0
             GROUP BY lr.rig_id
             ORDER BY count DESC
             LIMIT 5",
        )
        .map_err(|e| e.to_string())?;

    let top_rigs: Vec<RigCount> = stmt
        .query_map([], |row| {
            Ok(RigCount {
                rig_name: row.get(0)?,
                count: row.get(1)?,
            })
        })
        .map_err(|e| e.to_string())?
        .collect::<Result<Vec<_>, _>>()
        .map_err(|e| e.to_string())?;

    // 5) Totals
    let total_requests: i64 = conn
        .query_row("SELECT COUNT(*) FROM logistics_requests WHERE is_deleted = 0", [], |row| {
            row.get(0)
        })
        .map_err(|e| e.to_string())?;

    let pending_count: i64 = conn
        .query_row(
            "SELECT COUNT(*) FROM logistics_requests WHERE status IN ('requested', 'pending') AND is_deleted = 0",
            [],
            |row| row.get(0),
        )
        .map_err(|e| e.to_string())?;

    Ok(LogisticsAdminStats {
        by_status,
        by_type,
        daily_requests,
        top_rigs,
        total_requests,
        pending_count,
    })
}

// ============================================================================
// GET INCIDENTS ADMIN STATS
// ============================================================================

#[tauri::command]
pub async fn get_admin_incidents_stats(
    session_token: String,
    days: Option<i64>,
    state: State<'_, AppState>,
) -> Result<IncidentsAdminStats, String> {
    check_permission(&session_token, UserRole::Admin, &state)
        .map_err(|e| e.to_string())?;

    let conn = state
        .db
        .lock()
        .map_err(|e| format!("Failed to lock database: {}", e))?;

    let period_days = days.unwrap_or(30).clamp(7, 90);
    let modifier = format!("-{} days", period_days);

    // 1) Incidents by type with color
    let mut stmt = conn
        .prepare(
            "SELECT i.incident_type, COALESCE(it.name, i.incident_type) as type_name,
                    COALESCE(it.color, 'gray') as color, COUNT(*) as count
             FROM incidents i
             LEFT JOIN incident_types it ON i.incident_type = it.id AND it.is_deleted = 0
             WHERE i.is_deleted = 0
             GROUP BY i.incident_type
             ORDER BY count DESC",
        )
        .map_err(|e| e.to_string())?;

    let by_type: Vec<IncidentTypeCount> = stmt
        .query_map([], |row| {
            Ok(IncidentTypeCount {
                type_id: row.get(0)?,
                type_name: row.get(1)?,
                color: row.get(2)?,
                count: row.get(3)?,
            })
        })
        .map_err(|e| e.to_string())?
        .collect::<Result<Vec<_>, _>>()
        .map_err(|e| e.to_string())?;

    // 2) Daily incidents in period
    let mut stmt = conn
        .prepare(
            "SELECT DATE(created_at) as day, COUNT(*) as count
             FROM incidents
             WHERE created_at >= date('now', ?1)
               AND is_deleted = 0
             GROUP BY DATE(created_at)
             ORDER BY day ASC",
        )
        .map_err(|e| e.to_string())?;

    let daily_incidents: Vec<DailyCount> = stmt
        .query_map(params![modifier], |row| {
            Ok(DailyCount {
                day: row.get(0)?,
                count: row.get(1)?,
            })
        })
        .map_err(|e| e.to_string())?
        .collect::<Result<Vec<_>, _>>()
        .map_err(|e| e.to_string())?;

    // 3) Top 5 rigs by incident count
    let mut stmt = conn
        .prepare(
            "SELECT r.name as rig_name, COUNT(i.id) as count
             FROM incidents i
             JOIN rigs r ON i.rig_id = r.id
             WHERE i.is_deleted = 0
             GROUP BY i.rig_id
             ORDER BY count DESC
             LIMIT 5",
        )
        .map_err(|e| e.to_string())?;

    let top_rigs: Vec<RigCount> = stmt
        .query_map([], |row| {
            Ok(RigCount {
                rig_name: row.get(0)?,
                count: row.get(1)?,
            })
        })
        .map_err(|e| e.to_string())?
        .collect::<Result<Vec<_>, _>>()
        .map_err(|e| e.to_string())?;

    // 4) Total
    let total_incidents: i64 = conn
        .query_row(
            "SELECT COUNT(*) FROM incidents WHERE is_deleted = 0",
            [],
            |row| row.get(0),
        )
        .map_err(|e| e.to_string())?;

    Ok(IncidentsAdminStats {
        by_type,
        daily_incidents,
        top_rigs,
        total_incidents,
    })
}

// ============================================================================
// GET FLUID / API REPORT STATS
// ============================================================================

#[tauri::command]
pub async fn get_admin_fluid_stats(
    session_token: String,
    days: Option<i64>,
    state: State<'_, AppState>,
) -> Result<FluidAdminStats, String> {
    check_permission(&session_token, UserRole::Admin, &state)
        .map_err(|e| e.to_string())?;

    let conn = state
        .db
        .lock()
        .map_err(|e| format!("Failed to lock database: {}", e))?;

    let period_days = days.unwrap_or(30).clamp(7, 90);
    let modifier = format!("-{} days", period_days);

    // 1) Total active reports
    let total_reports: i64 = conn
        .query_row(
            "SELECT COUNT(*) FROM fluid_reports WHERE is_deleted = 0",
            [],
            |row| row.get(0),
        )
        .map_err(|e| e.to_string())?;

    // 2) By fluid type
    let mut stmt = conn
        .prepare(
            "SELECT COALESCE(fluid_type, 'N/A') as category, COUNT(*) as count
             FROM fluid_reports
             WHERE is_deleted = 0
             GROUP BY fluid_type
             ORDER BY count DESC",
        )
        .map_err(|e| e.to_string())?;

    let by_fluid_type: Vec<CategoryCount> = stmt
        .query_map([], |row| {
            Ok(CategoryCount {
                category: row.get(0)?,
                count: row.get(1)?,
            })
        })
        .map_err(|e| e.to_string())?
        .collect::<Result<Vec<_>, _>>()
        .map_err(|e| e.to_string())?;

    // 3) By well phase
    let mut stmt = conn
        .prepare(
            "SELECT COALESCE(well_phase, 'N/A') as category, COUNT(*) as count
             FROM fluid_reports
             WHERE is_deleted = 0
             GROUP BY well_phase
             ORDER BY count DESC",
        )
        .map_err(|e| e.to_string())?;

    let by_well_phase: Vec<CategoryCount> = stmt
        .query_map([], |row| {
            Ok(CategoryCount {
                category: row.get(0)?,
                count: row.get(1)?,
            })
        })
        .map_err(|e| e.to_string())?
        .collect::<Result<Vec<_>, _>>()
        .map_err(|e| e.to_string())?;

    // 4) Daily reports in period
    let mut stmt = conn
        .prepare(
            "SELECT DATE(created_at) as day, COUNT(*) as count
             FROM fluid_reports
             WHERE created_at >= date('now', ?1)
               AND is_deleted = 0
             GROUP BY DATE(created_at)
             ORDER BY day ASC",
        )
        .map_err(|e| e.to_string())?;

    let daily_reports: Vec<DailyCount> = stmt
        .query_map(params![modifier], |row| {
            Ok(DailyCount {
                day: row.get(0)?,
                count: row.get(1)?,
            })
        })
        .map_err(|e| e.to_string())?
        .collect::<Result<Vec<_>, _>>()
        .map_err(|e| e.to_string())?;

    // 5) Top 5 rigs
    let mut stmt = conn
        .prepare(
            "SELECT COALESCE(r.name, fr.rig_number, 'N/A') as rig_name, COUNT(fr.id) as count
             FROM fluid_reports fr
             LEFT JOIN rigs r ON fr.rig_id = r.id
             WHERE fr.is_deleted = 0
             GROUP BY COALESCE(fr.rig_id, fr.rig_number)
             ORDER BY count DESC
             LIMIT 5",
        )
        .map_err(|e| e.to_string())?;

    let top_rigs: Vec<RigCount> = stmt
        .query_map([], |row| {
            Ok(RigCount {
                rig_name: row.get(0)?,
                count: row.get(1)?,
            })
        })
        .map_err(|e| e.to_string())?
        .collect::<Result<Vec<_>, _>>()
        .map_err(|e| e.to_string())?;

    Ok(FluidAdminStats {
        total_reports,
        by_fluid_type,
        by_well_phase,
        daily_reports,
        top_rigs,
    })
}
