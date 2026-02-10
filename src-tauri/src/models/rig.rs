use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Rig {
    pub id: String,
    pub name: String,
    pub operator: String,
    pub power: String,
    pub area_id: Option<String>,
    pub active: bool,
    pub created_by: Option<String>,
    pub updated_by: Option<String>,
    pub created_at: String,
    pub updated_at: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct RigWithArea {
    pub id: String,
    pub name: String,
    pub operator: String,
    pub power: String,
    pub area_id: Option<String>,
    pub area_name: Option<String>,
    pub area_country: Option<String>,
    pub area_state: Option<String>,
    pub active: bool,
    pub created_at: String,
    pub updated_at: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CreateRigInput {
    pub name: String,
    pub operator: String,
    pub power: String,
    pub area_id: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct UpdateRigInput {
    pub name: Option<String>,
    pub operator: Option<String>,
    pub power: Option<String>,
    pub area_id: Option<String>,
    pub active: Option<bool>,
}
