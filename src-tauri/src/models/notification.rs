use serde::{Deserialize, Serialize};

// ============================================================================
// NOTIFICATION MODEL
// ============================================================================

/// Full notification row (for API responses)
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Notification {
    pub id: String,
    pub recipient_id: String,
    pub actor_id: String,
    pub actor_name: String,
    pub category: String,
    pub action_type: String,
    pub title: String,
    pub message: String,
    pub reference_id: Option<String>,
    pub reference_type: Option<String>,
    pub rig_id: Option<String>,
    pub rig_name: Option<String>,
    pub is_read: bool,
    pub read_at: Option<String>,
    pub created_at: String,
    pub updated_at: String,
}

/// Paginated response for notification listing
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct PaginatedNotifications {
    pub data: Vec<Notification>,
    pub total: i64,
    pub page: i64,
    pub page_size: i64,
    pub total_pages: i64,
    pub unread_count: i64,
}

// ============================================================================
// INTERNAL INPUT (used by notification_helper, not exposed to frontend)
// ============================================================================

/// Input for creating a notification internally from the backend.
/// The frontend never calls "create notification" directly.
#[derive(Debug, Clone)]
pub struct CreateNotificationInput {
    pub recipient_id: String,
    pub actor_id: String,
    pub actor_name: String,
    pub category: String,
    pub action_type: String,
    pub title: String,
    pub message: String,
    pub reference_id: Option<String>,
    pub reference_type: Option<String>,
    pub rig_id: Option<String>,
    pub rig_name: Option<String>,
}
