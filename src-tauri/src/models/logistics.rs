use serde::{Deserialize, Serialize};
use chrono::{DateTime, Utc};

// ============================================================================
// BOTELLONES DE AGUA
// ============================================================================

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct WaterBottles {
    pub id: String,
    pub full_bottles: i32,
    pub empty_bottles: i32,
    pub last_updated_by: Option<String>,
    pub notes: Option<String>,
    pub created_at: String,
    pub updated_at: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct WaterBottlesMovement {
    pub id: String,
    pub movement_type: String, // 'register_full' | 'register_empty' | 'request'
    pub quantity: i32,
    pub notes: Option<String>,
    pub created_by: Option<String>,
    pub created_at: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CreateWaterBottlesMovement {
    pub movement_type: String,
    pub quantity: i32,
    pub notes: Option<String>,
}

// ============================================================================
// COMBUSTIBLE
// ============================================================================

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Fuel {
    pub id: String,
    pub reserve_amount: f64,
    pub in_use_amount: f64,
    pub consumed_amount: f64,
    pub unit: String, // 'gallons' | 'liters'
    pub last_updated_by: Option<String>,
    pub notes: Option<String>,
    pub created_at: String,
    pub updated_at: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct FuelMovement {
    pub id: String,
    pub movement_type: String, // 'load' | 'assign_to_use' | 'register_consumption' | 'request'
    pub amount: f64,
    pub unit: String,
    pub notes: Option<String>,
    pub created_by: Option<String>,
    pub created_at: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CreateFuelMovement {
    pub movement_type: String,
    pub amount: f64,
    pub unit: String,
    pub notes: Option<String>,
}

// ============================================================================
// Vacuum
// ============================================================================

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct WaterTank {
    pub id: String,
    pub reserve_amount: f64,
    pub in_use_amount: f64,
    pub consumed_amount: f64,
    pub unit: String, // 'gallons' | 'liters'
    pub last_updated_by: Option<String>,
    pub notes: Option<String>,
    pub created_at: String,
    pub updated_at: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct WaterTankMovement {
    pub id: String,
    pub movement_type: String, // 'refill' | 'assign_to_use' | 'register_consumption' | 'request'
    pub amount: f64,
    pub unit: String,
    pub notes: Option<String>,
    pub created_by: Option<String>,
    pub created_at: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CreateWaterTankMovement {
    pub movement_type: String,
    pub amount: f64,
    pub unit: String,
    pub notes: Option<String>,
}

// ============================================================================
// CONSUMIBLES/MATERIALES
// ============================================================================

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Consumable {
    pub id: String,
    pub name: String,
    pub description: Option<String>,
    pub unit: String,
    pub available_quantity: f64,
    pub used_quantity: f64,
    pub min_stock: Option<f64>,
    pub category: Option<String>,
    pub active: bool,
    pub last_updated_by: Option<String>,
    pub created_at: String,
    pub updated_at: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CreateConsumable {
    pub name: String,
    pub description: Option<String>,
    pub unit: String,
    pub available_quantity: f64,
    pub min_stock: Option<f64>,
    pub category: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct UpdateConsumable {
    pub name: Option<String>,
    pub description: Option<String>,
    pub unit: Option<String>,
    pub min_stock: Option<f64>,
    pub category: Option<String>,
    pub active: Option<bool>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ConsumableMovement {
    pub id: String,
    pub consumable_id: String,
    pub movement_type: String, // 'add_stock' | 'register_use' | 'request' | 'adjustment'
    pub quantity: f64,
    pub notes: Option<String>,
    pub created_by: Option<String>,
    pub created_at: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CreateConsumableMovement {
    pub consumable_id: String,
    pub movement_type: String,
    pub quantity: f64,
    pub notes: Option<String>,
}

// ============================================================================
// SOLICITUDES
// ============================================================================

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct LogisticsRequest {
    pub id: String,
    pub request_type: String, // 'water_bottles' | 'fuel' | 'water_tank' | 'consumable'
    pub consumable_id: Option<String>,
    pub quantity: f64,
    pub unit: Option<String>,
    pub description: Option<String>,
    pub priority: String, // 'low' | 'medium' | 'high' | 'urgent'
    pub status: String, // 'pending' | 'approved' | 'rejected' | 'completed' | 'cancelled'
    pub requested_by: Option<String>,
    pub approved_by: Option<String>,
    pub completed_by: Option<String>,
    pub rejection_reason: Option<String>,
    pub requested_at: String,
    pub approved_at: Option<String>,
    pub completed_at: Option<String>,
    pub rejected_at: Option<String>,
    pub cancelled_at: Option<String>,
    pub created_at: String,
    pub updated_at: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CreateLogisticsRequest {
    pub request_type: String,
    pub consumable_id: Option<String>,
    pub quantity: f64,
    pub unit: Option<String>,
    pub description: Option<String>,
    pub priority: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct UpdateLogisticsRequestStatus {
    pub status: String,
    pub rejection_reason: Option<String>,
}

// ============================================================================
// REPORTES Y ESTADÍSTICAS
// ============================================================================

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct LogisticsReport {
    pub period_start: String,
    pub period_end: String,
    pub water_bottles_summary: WaterBottlesSummary,
    pub fuel_summary: FuelSummary,
    pub water_tank_summary: WaterTankSummary,
    pub consumables_summary: Vec<ConsumableSummary>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct WaterBottlesSummary {
    pub current_full: i32,
    pub current_empty: i32,
    pub total_registered_full: i32,
    pub total_registered_empty: i32,
    pub total_requests: i32,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct FuelSummary {
    pub current_reserve: f64,
    pub current_in_use: f64,
    pub total_consumed: f64,
    pub total_loaded: f64,
    pub total_requests: i32,
    pub unit: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct WaterTankSummary {
    pub current_reserve: f64,
    pub current_in_use: f64,
    pub total_consumed: f64,
    pub total_refilled: f64,
    pub total_requests: i32,
    pub unit: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ConsumableSummary {
    pub consumable_id: String,
    pub name: String,
    pub current_available: f64,
    pub total_used: f64,
    pub total_added: f64,
    pub total_requests: i32,
    pub unit: String,
}
