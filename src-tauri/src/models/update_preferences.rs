use serde::{Deserialize, Serialize};

/// User preferences for automatic updates.
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct UpdatePreferences {
    pub id: String,
    pub user_id: String,
    pub auto_update: bool,
    pub channel: String,
    pub check_interval_hours: i32,
    pub last_check_at: Option<String>,
    pub postponed_version: Option<String>,
    pub postpone_count: i32,
    pub created_at: String,
    pub updated_at: String,
}

/// Input for saving update preferences.
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SaveUpdatePreferencesInput {
    pub auto_update: Option<bool>,
    pub channel: Option<String>,
    pub check_interval_hours: Option<i32>,
}

/// Input for postponing an update.
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct PostponeUpdateInput {
    pub version: String,
}

/// Information about an available update (from API).
/// NOTE: Currently unused but kept for future API integration.
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
#[allow(dead_code)]
pub struct UpdateInfo {
    pub version: String,
    pub channel: String,
    pub pub_date: String,
    pub notes: String,
    pub breaking_changes: bool,
    pub download_url: String,
    pub signature: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub size: Option<u64>,
}

/// Response from check update API.
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CheckUpdateResponse {
    pub update_available: bool,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub release: Option<ApiRelease>,
    pub latest_version: String,
    pub current_version: String,
}

/// Release info from API.
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ApiRelease {
    pub version: String,
    pub channel: String,
    pub pub_date: String,
    pub notes: String,
    #[serde(default)]
    pub breaking_changes: bool,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub min_version: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub asset: Option<ApiAsset>,
}

/// Asset info from API.
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ApiAsset {
    pub url: String,
    pub signature: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub checksum: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub size: Option<u64>,
}

/// Status of update check operation.
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct UpdateCheckStatus {
    pub preferences: Option<UpdatePreferences>,
    pub current_version: String,
    pub last_check_at: Option<String>,
    pub can_postpone: bool,
    pub max_postpones: i32,
}

impl Default for UpdatePreferences {
    fn default() -> Self {
        Self {
            id: String::new(),
            user_id: String::new(),
            auto_update: false,
            channel: "stable".to_string(),
            check_interval_hours: 24,
            last_check_at: None,
            postponed_version: None,
            postpone_count: 0,
            created_at: String::new(),
            updated_at: String::new(),
        }
    }
}
