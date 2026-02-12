use serde::{Deserialize, Serialize};

// ============================================================================
// BOTELLONES DE AGUA
// ============================================================================

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct WaterBottlesMovement {
    pub id: String,
    pub movement_type: String,
    pub quantity: i32,
    pub notes: Option<String>,
    pub created_by: Option<String>,
    pub created_at: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CreateWaterBottlesMovement {
    pub movement_type: String,
    pub quantity: i32,
    pub notes: Option<String>,
}

// ============================================================================
// COMBUSTIBLE
// ============================================================================

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct FuelMovement {
    pub id: String,
    pub movement_type: String,
    pub amount: f64,
    pub notes: Option<String>,
    pub created_by: Option<String>,
    pub created_at: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CreateFuelMovement {
    pub movement_type: String,
    pub amount: f64,
    pub notes: Option<String>,
}

// ============================================================================
// VACUUM / CISTERNA
// ============================================================================

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct VacuumAction {
    pub id: String,
    pub action_name: String,
    pub notes: Option<String>,
    pub created_by: Option<String>,
    pub created_at: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CreateVacuumAction {
    pub action_name: String,
    pub notes: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct UpdateVacuumAction {
    pub action_name: Option<String>,
    pub notes: Option<String>,
}

// ============================================================================
// MATERIALES (Catálogo)
// ============================================================================

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Material {
    pub id: String,
    pub name: String,
    pub unit: String,
    pub description: Option<String>,
    pub active: bool,
    pub created_by: Option<String>,
    pub created_at: String,
    pub updated_at: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CreateMaterial {
    pub name: String,
    pub unit: String,
    pub description: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct UpdateMaterial {
    pub name: Option<String>,
    pub unit: Option<String>,
    pub description: Option<String>,
    pub active: Option<bool>,
}

// ============================================================================
// MATERIALES (Movimientos)
// ============================================================================

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct MaterialMovement {
    pub id: String,
    pub material_id: String,
    pub movement_type: String,
    pub quantity: f64,
    pub notes: Option<String>,
    pub created_by: Option<String>,
    pub created_at: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CreateMaterialMovement {
    pub material_id: String,
    pub movement_type: String,
    pub quantity: f64,
    pub notes: Option<String>,
}

// ============================================================================
// SOLICITUDES
// ============================================================================

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct LogisticsRequest {
    pub id: String,
    pub request_type: String,
    pub quantity: Option<f64>,
    pub action_requested: Option<String>,
    pub material_id: Option<String>,
    pub status: String,
    pub notes: Option<String>,
    pub requested_by: Option<String>,
    pub status_changed_by: Option<String>,
    pub requested_at: String,
    pub status_changed_at: Option<String>,
    pub created_at: String,
    pub updated_at: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CreateLogisticsRequest {
    pub request_type: String,
    pub quantity: Option<f64>,
    pub action_requested: Option<String>,
    pub material_id: Option<String>,
    pub notes: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct UpdateRequestStatus {
    pub status: String,
}

// ============================================================================
// REPORTES (Estructuras de respuesta)
// ============================================================================

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct LogisticsReport {
    pub period_start: String,
    pub period_end: String,
    pub water_bottles_summary: WaterBottlesSummary,
    pub fuel_summary: FuelSummary,
    pub vacuum_summary: VacuumSummary,
    pub materials_summary: Vec<MaterialSummary>,
    pub requests_summary: RequestsSummary,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct WaterBottlesSummary {
    pub total_entries: i32,
    pub total_exits: i32,
    pub net: i32,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct FuelSummary {
    pub total_entries: f64,
    pub total_exits: f64,
    pub net: f64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct VacuumSummary {
    pub total_actions: i32,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct MaterialSummary {
    pub material_id: String,
    pub material_name: String,
    pub unit: String,
    pub total_entries: f64,
    pub total_exits: f64,
    pub net: f64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct RequestsSummary {
    pub total: i32,
    pub requested: i32,
    pub pending: i32,
    pub approved: i32,
    pub rejected: i32,
}

// ============================================================================
// RESPUESTA PAGINADA GENÉRICA
// ============================================================================

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct PaginatedResponse<T: Serialize> {
    pub data: Vec<T>,
    pub total: i64,
    pub page: i64,
    pub page_size: i64,
    pub total_pages: i64,
}
