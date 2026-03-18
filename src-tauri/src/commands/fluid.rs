use crate::auth::get_session;
use crate::models::fluid_activity::{FluidActivity, SaveFluidActivityRequest};
use crate::models::fluid_changelog::{FluidChangelogEntry, compute_header_diff, compute_subtable_diff};
use crate::models::fluid_inventory::{FluidInventoryItem, FluidService, SaveFluidInventoryItem, SaveFluidServiceItem};
use crate::models::fluid_product_catalog::{CreateFluidProductRequest, FluidProduct, UpdateFluidProductRequest};
use crate::models::fluid_props::{FluidProps, FluidSolidsControl, SaveFluidPropsItem, SaveFluidSolidsControlItem};
use crate::models::fluid_report::{
    CreateFluidReportRequest, FluidReport, FluidReportFull, FluidReportFilters,
    FluidReportListItem, UpdateFluidHeaderRequest,
};
use crate::models::fluid_tanks::{FluidTank, FluidVolStats, SaveFluidTankItem, SaveFluidVolStatsRequest};
use crate::state::AppState;
use serde::{Deserialize, Serialize};
use serde_json::Value as JsonValue;
use tauri::State;

// ============================================================================
// Response types
// ============================================================================

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct PaginatedFluidReportsResponse {
    pub data: Vec<FluidReportListItem>,
    pub total: i64,
    pub page: i64,
    pub page_size: i64,
    pub total_pages: i64,
}

#[derive(Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SaveFluidTab1Response {
    pub report: FluidReport,
    pub props: Vec<FluidProps>,
    pub solids_control: Vec<FluidSolidsControl>,
}

#[derive(Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SaveFluidTab2Response {
    pub inventory: Vec<FluidInventoryItem>,
    pub services: Vec<FluidService>,
}

#[derive(Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SaveFluidTab3Response {
    pub tanks: Vec<FluidTank>,
    pub activity: Option<FluidActivity>,
    pub vol_stats: Option<FluidVolStats>,
}

// ============================================================================
// Request types for bulk saves
// ============================================================================

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SaveFluidTab1Request {
    pub header: UpdateFluidHeaderRequest,
    pub props: Vec<SaveFluidPropsItem>,
    pub solids_control: Vec<SaveFluidSolidsControlItem>,
    pub note: Option<String>,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SaveFluidTab2Request {
    pub inventory: Vec<SaveFluidInventoryItem>,
    pub services: Vec<SaveFluidServiceItem>,
    pub note: Option<String>,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SaveFluidTab3Request {
    pub tanks: Vec<SaveFluidTankItem>,
    pub activity: Option<SaveFluidActivityRequest>,
    pub vol_stats: Option<SaveFluidVolStatsRequest>,
    pub note: Option<String>,
}

// ============================================================================
// Fluid report commands
// ============================================================================

#[tauri::command]
pub async fn list_fluid_reports(
    session_token: String,
    filters: FluidReportFilters,
    state: State<'_, AppState>,
) -> Result<PaginatedFluidReportsResponse, String> {
    get_session(&session_token, &state).map_err(|e| e.to_string())?;

    let conn = state
        .db
        .lock()
        .map_err(|e| format!("Failed to lock database: {}", e))?;

    let page = filters.page.unwrap_or(1).max(1);
    let page_size = filters.page_size.unwrap_or(20).clamp(1, 100);

    let (data, total) = FluidReport::list(&conn, &filters).map_err(|e| e.to_string())?;

    let total_pages = if total == 0 {
        0
    } else {
        (total as f64 / page_size as f64).ceil() as i64
    };

    Ok(PaginatedFluidReportsResponse {
        data,
        total,
        page,
        page_size,
        total_pages,
    })
}

#[tauri::command]
pub async fn get_fluid_report(
    session_token: String,
    fluid_report_id: String,
    state: State<'_, AppState>,
) -> Result<FluidReportFull, String> {
    get_session(&session_token, &state).map_err(|e| e.to_string())?;

    let conn = state
        .db
        .lock()
        .map_err(|e| format!("Failed to lock database: {}", e))?;

    let report = FluidReport::get_by_id(&conn, &fluid_report_id).map_err(|e| e.to_string())?;

    // Cargar sub-tablas
    let props = FluidProps::list_by_fluid_report(&conn, &fluid_report_id).map_err(|e| e.to_string())?;
    let solids_control = FluidSolidsControl::list_by_fluid_report(&conn, &fluid_report_id).map_err(|e| e.to_string())?;
    let inventory = FluidInventoryItem::list_by_fluid_report(&conn, &fluid_report_id).map_err(|e| e.to_string())?;
    let services = FluidService::list_by_fluid_report(&conn, &fluid_report_id).map_err(|e| e.to_string())?;
    let activity = FluidActivity::get_by_fluid_report(&conn, &fluid_report_id).map_err(|e| e.to_string())?;
    let tanks = FluidTank::list_by_fluid_report(&conn, &fluid_report_id).map_err(|e| e.to_string())?;
    let vol_stats = FluidVolStats::get_by_fluid_report(&conn, &fluid_report_id).map_err(|e| e.to_string())?;

    Ok(FluidReportFull {
        report,
        props,
        solids_control,
        inventory,
        services,
        activity,
        tanks,
        vol_stats,
    })
}

#[tauri::command]
pub async fn create_fluid_report(
    session_token: String,
    data: CreateFluidReportRequest,
    state: State<'_, AppState>,
) -> Result<FluidReport, String> {
    let session = get_session(&session_token, &state).map_err(|e| e.to_string())?;

    let conn = state
        .db
        .lock()
        .map_err(|e| format!("Failed to lock database: {}", e))?;

    FluidReport::create(&conn, &data, &session.user_id).map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn save_fluid_tab1(
    session_token: String,
    fluid_report_id: String,
    data: SaveFluidTab1Request,
    state: State<'_, AppState>,
) -> Result<SaveFluidTab1Response, String> {
    let session = get_session(&session_token, &state).map_err(|e| e.to_string())?;

    let conn = state
        .db
        .lock()
        .map_err(|e| format!("Failed to lock database: {}", e))?;

    // ── Snapshot old state for diff ──
    let old_report = FluidReport::get_by_id(&conn, &fluid_report_id).ok();
    let old_props = FluidProps::list_by_fluid_report(&conn, &fluid_report_id).unwrap_or_default();
    let old_solids = FluidSolidsControl::list_by_fluid_report(&conn, &fluid_report_id).unwrap_or_default();

    // ── Apply changes ──
    let report = FluidReport::update_header(&conn, &fluid_report_id, &data.header, &session.user_id)
        .map_err(|e| e.to_string())?;

    let props = FluidProps::save_bulk(&conn, &fluid_report_id, &data.props)
        .map_err(|e| e.to_string())?;

    let solids_control = FluidSolidsControl::save_bulk(&conn, &fluid_report_id, &data.solids_control)
        .map_err(|e| e.to_string())?;

    // ── Compute diff & insert changelog ──
    let mut diff = serde_json::Map::new();

    if let Some(ref old) = old_report {
        let old_json = serde_json::to_value(old).unwrap_or(JsonValue::Null);
        let new_json = serde_json::to_value(&report).unwrap_or(JsonValue::Null);
        if let (Some(old_map), Some(new_map)) = (old_json.as_object(), new_json.as_object()) {
            let header_diff = compute_header_diff(old_map, new_map);
            if !header_diff.is_empty() {
                diff.insert("header".to_string(), JsonValue::Object(header_diff));
            }
        }
    }

    let old_props_json: Vec<JsonValue> = old_props.iter().map(|p| serde_json::to_value(p).unwrap_or(JsonValue::Null)).collect();
    let new_props_json: Vec<JsonValue> = data.props.iter().map(|p| serde_json::to_value(p).unwrap_or(JsonValue::Null)).collect();
    if let Some(d) = compute_subtable_diff(&old_props_json, &new_props_json, "props", "sampleHour") {
        diff.insert("props".to_string(), d);
    }

    let old_solids_json: Vec<JsonValue> = old_solids.iter().map(|s| serde_json::to_value(s).unwrap_or(JsonValue::Null)).collect();
    let new_solids_json: Vec<JsonValue> = data.solids_control.iter().map(|s| serde_json::to_value(s).unwrap_or(JsonValue::Null)).collect();
    if let Some(d) = compute_subtable_diff(&old_solids_json, &new_solids_json, "solidsControl", "equipment") {
        diff.insert("solidsControl".to_string(), d);
    }

    let changes = JsonValue::Object(diff);
    let _ = FluidChangelogEntry::insert(
        &conn, &fluid_report_id, "tab1", &session.user_id,
        data.note.as_deref(), &changes,
    );

    Ok(SaveFluidTab1Response {
        report,
        props,
        solids_control,
    })
}

#[tauri::command]
pub async fn save_fluid_tab2(
    session_token: String,
    fluid_report_id: String,
    data: SaveFluidTab2Request,
    state: State<'_, AppState>,
) -> Result<SaveFluidTab2Response, String> {
    let session = get_session(&session_token, &state).map_err(|e| e.to_string())?;

    let conn = state
        .db
        .lock()
        .map_err(|e| format!("Failed to lock database: {}", e))?;

    // ── Snapshot old state ──
    let old_inv = FluidInventoryItem::list_by_fluid_report(&conn, &fluid_report_id).unwrap_or_default();
    let old_svc = FluidService::list_by_fluid_report(&conn, &fluid_report_id).unwrap_or_default();

    // ── Apply changes ──
    let inventory = FluidInventoryItem::save_bulk(&conn, &fluid_report_id, &data.inventory)
        .map_err(|e| e.to_string())?;

    let services = FluidService::save_bulk(&conn, &fluid_report_id, &data.services)
        .map_err(|e| e.to_string())?;

    // ── Compute diff ──
    let mut diff = serde_json::Map::new();

    let old_inv_json: Vec<JsonValue> = old_inv.iter().map(|i| serde_json::to_value(i).unwrap_or(JsonValue::Null)).collect();
    let new_inv_json: Vec<JsonValue> = data.inventory.iter().map(|i| serde_json::to_value(i).unwrap_or(JsonValue::Null)).collect();
    if let Some(d) = compute_subtable_diff(&old_inv_json, &new_inv_json, "inventory", "productId") {
        diff.insert("inventory".to_string(), d);
    }

    let old_svc_json: Vec<JsonValue> = old_svc.iter().map(|s| serde_json::to_value(s).unwrap_or(JsonValue::Null)).collect();
    let new_svc_json: Vec<JsonValue> = data.services.iter().map(|s| serde_json::to_value(s).unwrap_or(JsonValue::Null)).collect();
    if let Some(d) = compute_subtable_diff(&old_svc_json, &new_svc_json, "services", "serviceName") {
        diff.insert("services".to_string(), d);
    }

    let changes = JsonValue::Object(diff);
    let _ = FluidChangelogEntry::insert(
        &conn, &fluid_report_id, "tab2", &session.user_id,
        data.note.as_deref(), &changes,
    );

    Ok(SaveFluidTab2Response {
        inventory,
        services,
    })
}

#[tauri::command]
pub async fn save_fluid_tab3(
    session_token: String,
    fluid_report_id: String,
    data: SaveFluidTab3Request,
    state: State<'_, AppState>,
) -> Result<SaveFluidTab3Response, String> {
    let session = get_session(&session_token, &state).map_err(|e| e.to_string())?;

    let conn = state
        .db
        .lock()
        .map_err(|e| format!("Failed to lock database: {}", e))?;

    // ── Snapshot old state ──
    let old_tanks = FluidTank::list_by_fluid_report(&conn, &fluid_report_id).unwrap_or_default();

    // ── Apply changes ──
    let tanks = FluidTank::save_bulk(&conn, &fluid_report_id, &data.tanks)
        .map_err(|e| e.to_string())?;

    let activity = if let Some(ref activity_data) = data.activity {
        FluidActivity::upsert(&conn, &fluid_report_id, activity_data)
            .map_err(|e| e.to_string())?
    } else {
        FluidActivity::get_by_fluid_report(&conn, &fluid_report_id)
            .map_err(|e| e.to_string())?
    };

    let vol_stats = if let Some(ref vol_data) = data.vol_stats {
        FluidVolStats::upsert(&conn, &fluid_report_id, vol_data)
            .map_err(|e| e.to_string())?
    } else {
        FluidVolStats::get_by_fluid_report(&conn, &fluid_report_id)
            .map_err(|e| e.to_string())?
    };

    // ── Compute diff ──
    let mut diff = serde_json::Map::new();

    let old_tanks_json: Vec<JsonValue> = old_tanks.iter().map(|t| serde_json::to_value(t).unwrap_or(JsonValue::Null)).collect();
    let new_tanks_json: Vec<JsonValue> = data.tanks.iter().map(|t| serde_json::to_value(t).unwrap_or(JsonValue::Null)).collect();
    if let Some(d) = compute_subtable_diff(&old_tanks_json, &new_tanks_json, "tanks", "name") {
        diff.insert("tanks".to_string(), d);
    }

    let changes = JsonValue::Object(diff);
    let _ = FluidChangelogEntry::insert(
        &conn, &fluid_report_id, "tab3", &session.user_id,
        data.note.as_deref(), &changes,
    );

    Ok(SaveFluidTab3Response {
        tanks,
        activity,
        vol_stats,
    })
}

// ============================================================================
// Changelog commands
// ============================================================================

#[tauri::command]
pub async fn list_fluid_changelog(
    session_token: String,
    fluid_report_id: String,
    state: State<'_, AppState>,
) -> Result<Vec<FluidChangelogEntry>, String> {
    get_session(&session_token, &state).map_err(|e| e.to_string())?;

    let conn = state
        .db
        .lock()
        .map_err(|e| format!("Failed to lock database: {}", e))?;

    FluidChangelogEntry::list_for_report(&conn, &fluid_report_id).map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn delete_fluid_report(
    session_token: String,
    fluid_report_id: String,
    state: State<'_, AppState>,
) -> Result<(), String> {
    let session = get_session(&session_token, &state).map_err(|e| e.to_string())?;

    let conn = state
        .db
        .lock()
        .map_err(|e| format!("Failed to lock database: {}", e))?;

    FluidReport::soft_delete(&conn, &fluid_report_id, &session.user_id)
        .map_err(|e| e.to_string())
}

// ============================================================================
// Fluid product catalog commands
// ============================================================================

#[tauri::command]
pub async fn list_fluid_products(
    session_token: String,
    state: State<'_, AppState>,
) -> Result<Vec<FluidProduct>, String> {
    get_session(&session_token, &state).map_err(|e| e.to_string())?;

    let conn = state
        .db
        .lock()
        .map_err(|e| format!("Failed to lock database: {}", e))?;

    FluidProduct::list_all(&conn).map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn list_fluid_products_active(
    session_token: String,
    state: State<'_, AppState>,
) -> Result<Vec<FluidProduct>, String> {
    get_session(&session_token, &state).map_err(|e| e.to_string())?;

    let conn = state
        .db
        .lock()
        .map_err(|e| format!("Failed to lock database: {}", e))?;

    FluidProduct::list_active(&conn).map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn create_fluid_product(
    session_token: String,
    data: CreateFluidProductRequest,
    state: State<'_, AppState>,
) -> Result<FluidProduct, String> {
    let session = get_session(&session_token, &state).map_err(|e| e.to_string())?;

    if session.role != "admin" {
        return Err("Solo administradores pueden crear productos de fluidos".to_string());
    }

    let conn = state
        .db
        .lock()
        .map_err(|e| format!("Failed to lock database: {}", e))?;

    FluidProduct::create(&conn, &data, &session.user_id).map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn update_fluid_product(
    session_token: String,
    product_id: String,
    data: UpdateFluidProductRequest,
    state: State<'_, AppState>,
) -> Result<FluidProduct, String> {
    let session = get_session(&session_token, &state).map_err(|e| e.to_string())?;

    if session.role != "admin" {
        return Err("Solo administradores pueden editar productos de fluidos".to_string());
    }

    let conn = state
        .db
        .lock()
        .map_err(|e| format!("Failed to lock database: {}", e))?;

    FluidProduct::update(&conn, &product_id, &data, &session.user_id).map_err(|e| e.to_string())
}
