use serde::{Deserialize, Serialize};

#[derive(Debug, Serialize, Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct CrewPosition {
    pub id: String,
    pub name: String,
    pub sort_order: i32,
    pub is_default: bool,
    pub created_by: Option<String>,
    pub created_at: String,
    pub updated_at: String,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CreateCrewPositionInput {
    pub name: String,
    pub sort_order: Option<i32>,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct UpdateCrewPositionInput {
    pub name: Option<String>,
    pub sort_order: Option<i32>,
}
