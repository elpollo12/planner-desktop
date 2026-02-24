use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct IncidentType {
    pub id: String,
    pub name: String,
    pub color: String,
    pub sort_order: i32,
    pub created_by: Option<String>,
    pub created_at: String,
    pub updated_at: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CreateIncidentTypeInput {
    pub name: String,
    pub color: Option<String>,
    pub sort_order: Option<i32>,
}
