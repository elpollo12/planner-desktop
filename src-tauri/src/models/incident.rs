use serde::{Deserialize, Serialize};

// ============================================================================
// INCIDENT TYPES
// ============================================================================

/// Incident with personnel names resolved (for list/detail responses)
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Incident {
    pub id: String,
    pub rig_id: String,
    pub incident_type: String,
    pub description: String,
    pub created_by: String,
    pub created_by_name: Option<String>,
    pub created_at: String,
    pub updated_at: String,
}

/// Full incident with involved personnel
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct IncidentWithPersonnel {
    #[serde(flatten)]
    pub incident: Incident,
    pub personnel: Vec<IncidentPersonnelInfo>,
}

/// Personnel info attached to an incident
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct IncidentPersonnelInfo {
    pub id: String,
    pub personnel_id: String,
    pub name: String,
    pub ci: Option<String>,
    pub position: String,
}

/// Input for creating an incident
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CreateIncidentInput {
    pub incident_type: String,
    pub description: String,
    /// List of rig_personnel IDs involved
    #[serde(default)]
    pub personnel_ids: Vec<String>,
}

/// Paginated response (reuses pattern from logistics)
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct PaginatedIncidents {
    pub data: Vec<Incident>,
    pub total: i64,
    pub page: i64,
    pub page_size: i64,
    pub total_pages: i64,
}
