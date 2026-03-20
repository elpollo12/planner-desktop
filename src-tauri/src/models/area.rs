use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Area {
    pub id: String,
    pub name: String,
    pub country: String,
    pub state: String,
    pub active: bool,
    pub created_by: Option<String>,
    pub updated_by: Option<String>,
    pub created_at: String,
    pub updated_at: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CreateAreaInput {
    pub name: String,
    pub country: String,
    pub state: String,
    #[serde(default = "default_active")]
    pub active: bool,
}

fn default_active() -> bool {
    true
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct UpdateAreaInput {
    pub name: Option<String>,
    pub country: Option<String>,
    pub state: Option<String>,
    pub active: Option<bool>,
}
