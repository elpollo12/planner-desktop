use serde::{Deserialize, Serialize};

// ============================================================================
// Core structs
// ============================================================================

#[allow(dead_code)]
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Rig {
    pub id: String,
    pub name: String,
    /// Legacy text field — kept for backwards-compat, prefer operator_id
    pub operator: String,
    pub operator_id: Option<String>,
    pub power: String,
    pub area_id: Option<String>,
    pub active: bool,
    pub created_by: Option<String>,
    pub updated_by: Option<String>,
    pub created_at: String,
    pub updated_at: String,
}

/// Rig joined with its area, operator company, and contractor list
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct RigFull {
    pub id: String,
    pub name: String,
    pub operator: String,
    pub operator_id: Option<String>,
    pub operator_name: Option<String>,
    pub power: String,
    pub area_id: Option<String>,
    pub area_name: Option<String>,
    pub area_country: Option<String>,
    pub area_state: Option<String>,
    pub active: bool,
    pub created_at: String,
    pub updated_at: String,
    /// Populated separately — list of contractors assigned to this rig
    pub contractors: Vec<RigContractorEntry>,
}

/// A single contractor entry embedded in RigFull
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct RigContractorEntry {
    pub rig_contractor_id: String,
    pub company_id: String,
    pub company_name: String,
}

/// Kept for backwards compat where only area join is needed
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct RigWithArea {
    pub id: String,
    pub name: String,
    pub operator: String,
    pub operator_id: Option<String>,
    pub operator_name: Option<String>,
    pub power: String,
    pub area_id: Option<String>,
    pub area_name: Option<String>,
    pub area_country: Option<String>,
    pub area_state: Option<String>,
    pub active: bool,
    pub created_at: String,
    pub updated_at: String,
}

// ============================================================================
// Input structs
// ============================================================================

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CreateRigInput {
    pub name: String,
    /// Legacy — kept so existing callers don't break
    pub operator: String,
    /// New FK field — required for the wizard flow
    pub operator_id: Option<String>,
    pub power: String,
    pub area_id: Option<String>,
    pub active: Option<bool>,
    /// Contractor company IDs to link via rig_contractors on creation
    pub contractor_ids: Option<Vec<String>>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct UpdateRigInput {
    pub name: Option<String>,
    pub operator: Option<String>,
    pub operator_id: Option<String>,
    pub power: Option<String>,
    pub area_id: Option<String>,
    pub active: Option<bool>,
}
