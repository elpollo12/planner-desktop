use serde::{Deserialize, Serialize};

// ============================================================================
// ADMIN STATISTICS MODELS
// ============================================================================

/// Single data point for daily activity charts
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct DailyCount {
    pub day: String,
    pub count: i64,
}

/// Count grouped by a named category (status, type, etc.)
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CategoryCount {
    pub category: String,
    pub count: i64,
}

/// Count grouped by rig name
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct RigCount {
    pub rig_name: String,
    pub count: i64,
}

/// Incident type count with color info
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct IncidentTypeCount {
    pub type_id: String,
    pub type_name: String,
    pub color: String,
    pub count: i64,
}

// ============================================================================
// RESPONSE STRUCTS
// ============================================================================

/// Response for reports activity stats
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ActivityStats {
    pub daily_reports: Vec<DailyCount>,
    pub total_period: i64,
}

/// Response for logistics admin stats
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct LogisticsAdminStats {
    pub by_status: Vec<CategoryCount>,
    pub by_type: Vec<CategoryCount>,
    pub daily_requests: Vec<DailyCount>,
    pub top_rigs: Vec<RigCount>,
    pub total_requests: i64,
    pub pending_count: i64,
}

/// Response for incidents admin stats
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct IncidentsAdminStats {
    pub by_type: Vec<IncidentTypeCount>,
    pub daily_incidents: Vec<DailyCount>,
    pub top_rigs: Vec<RigCount>,
    pub total_incidents: i64,
}

/// Response for fluid/API report admin stats
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct FluidAdminStats {
    pub total_reports: i64,
    pub by_fluid_type: Vec<CategoryCount>,
    pub by_well_phase: Vec<CategoryCount>,
    pub daily_reports: Vec<DailyCount>,
    pub top_rigs: Vec<RigCount>,
}
