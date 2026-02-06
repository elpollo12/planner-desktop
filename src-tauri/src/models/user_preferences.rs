use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct UserPreferences {
    pub id: String,
    pub user_id: String,
    pub primary_color: String,
    pub secondary_color: String,
    pub theme_mode: String,
    pub logo_path: Option<String>,
    pub created_at: String,
    pub updated_at: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SavePreferencesInput {
    pub primary_color: Option<String>,
    pub secondary_color: Option<String>,
    pub theme_mode: Option<String>,
}
