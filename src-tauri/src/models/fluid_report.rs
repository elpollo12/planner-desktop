#![allow(dead_code)]

use crate::error::AppError;
use crate::models::fluid_props::{FluidProps, FluidSolidsControl};
use crate::models::fluid_inventory::{FluidInventoryItem, FluidService};
use crate::models::fluid_tanks::{FluidTank, FluidVolStats};
use crate::models::fluid_activity::FluidActivity;
use rusqlite::{params, Connection, Row};
use serde::{Deserialize, Serialize};

// ============================================================================
// Structs
// ============================================================================

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct FluidReport {
    pub id: String,
    pub report_id: Option<String>, // nullable — legacy, not used
    pub rig_id: Option<String>,    // FK to rigs(id)

    // Encabezado propio (independiente del DDR)
    pub report_number: Option<i32>,
    pub report_date: Option<String>,
    pub well_number: Option<String>,
    pub rig_number: Option<String>,
    pub contract: Option<String>,
    pub contractor: Option<String>,
    pub operator: Option<String>,
    pub field_district: Option<String>,
    pub supervisor_24h: Option<String>,

    // Datos propios del módulo
    pub fluid_type: Option<String>,
    pub well_phase: Option<String>,

    // Personal de guardia de fluidos
    pub fluid_coordinator: Option<String>,
    pub tech_rep_1: Option<String>,
    pub tech_rep_2: Option<String>,
    pub trainee: Option<String>,
    pub ops_supervisor: Option<String>,

    // Parámetros de circulación
    pub bottom_down_min: Option<f64>,
    pub bottom_down_emb: Option<i32>,
    pub bottom_up_min: Option<f64>,
    pub bottom_up_emb: Option<i32>,
    pub well_cycle_min: Option<f64>,
    pub well_cycle_emb: Option<i32>,
    pub total_cycle_min: Option<f64>,
    pub total_cycle_emb: Option<i32>,

    // Volumetría DIMS
    pub vol_inicial: Option<f64>,
    pub vol_perdido_hoyo: Option<f64>,
    pub vol_descartado: Option<f64>,
    pub vol_preparado: Option<f64>,
    pub vol_transferido: Option<f64>,
    pub vol_recibido: Option<f64>,
    pub vol_perdido_sup: Option<f64>,
    pub vol_final: Option<f64>,

    // Hidráulica
    pub esd: Option<f64>,
    pub ecd: Option<f64>,
    pub emb_n_tuberia: Option<f64>,
    pub emb_n_anular: Option<f64>,
    pub emb_k_tuberia: Option<f64>,
    pub emb_k_anular: Option<f64>,

    // Comentarios
    pub fluid_comments: Option<String>,
    pub product_comments: Option<String>,
    pub vol_comments: Option<String>,

    // Metadatos
    pub is_deleted: bool,
    pub created_by: Option<String>,
    pub updated_by: Option<String>,
    pub created_at: String,
    pub updated_at: String,
    pub synced: bool,
}

/// Reporte completo con todos los datos anidados (para GET /fluid/:id).
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct FluidReportFull {
    #[serde(flatten)]
    pub report: FluidReport,

    // Sub-tablas
    pub props: Vec<FluidProps>,
    pub solids_control: Vec<FluidSolidsControl>,
    pub inventory: Vec<FluidInventoryItem>,
    pub services: Vec<FluidService>,
    pub activity: Option<FluidActivity>,
    pub tanks: Vec<FluidTank>,
    pub vol_stats: Option<FluidVolStats>,
}

/// Item de la lista paginada.
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct FluidReportListItem {
    pub id: String,
    pub rig_id: Option<String>,
    pub report_number: Option<i32>,
    pub report_date: Option<String>,
    pub well_number: Option<String>,
    pub rig_number: Option<String>,
    pub fluid_type: Option<String>,
    pub well_phase: Option<String>,
    pub created_at: String,
    pub updated_at: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CreateFluidReportRequest {
    pub rig_id: Option<String>,
    pub report_date: Option<String>,
    pub well_number: Option<String>,
    pub rig_number: Option<String>,
    pub contract: Option<String>,
    pub contractor: Option<String>,
    pub operator: Option<String>,
    pub field_district: Option<String>,
    pub supervisor_24h: Option<String>,
    pub fluid_type: Option<String>,
    pub well_phase: Option<String>,
    pub fluid_coordinator: Option<String>,
    pub tech_rep_1: Option<String>,
    pub tech_rep_2: Option<String>,
    pub trainee: Option<String>,
    pub ops_supervisor: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct UpdateFluidHeaderRequest {
    // Encabezado propio
    pub rig_id: Option<String>,
    pub report_date: Option<String>,
    pub well_number: Option<String>,
    pub rig_number: Option<String>,
    pub contract: Option<String>,
    pub contractor: Option<String>,
    pub operator: Option<String>,
    pub field_district: Option<String>,
    pub supervisor_24h: Option<String>,
    // Datos del fluido
    pub fluid_type: Option<String>,
    pub well_phase: Option<String>,
    pub fluid_coordinator: Option<String>,
    pub tech_rep_1: Option<String>,
    pub tech_rep_2: Option<String>,
    pub trainee: Option<String>,
    pub ops_supervisor: Option<String>,
    pub bottom_down_min: Option<f64>,
    pub bottom_down_emb: Option<i32>,
    pub bottom_up_min: Option<f64>,
    pub bottom_up_emb: Option<i32>,
    pub well_cycle_min: Option<f64>,
    pub well_cycle_emb: Option<i32>,
    pub total_cycle_min: Option<f64>,
    pub total_cycle_emb: Option<i32>,
    pub vol_inicial: Option<f64>,
    pub vol_perdido_hoyo: Option<f64>,
    pub vol_descartado: Option<f64>,
    pub vol_preparado: Option<f64>,
    pub vol_transferido: Option<f64>,
    pub vol_recibido: Option<f64>,
    pub vol_perdido_sup: Option<f64>,
    pub vol_final: Option<f64>,
    pub esd: Option<f64>,
    pub ecd: Option<f64>,
    pub emb_n_tuberia: Option<f64>,
    pub emb_n_anular: Option<f64>,
    pub emb_k_tuberia: Option<f64>,
    pub emb_k_anular: Option<f64>,
    pub fluid_comments: Option<String>,
    pub product_comments: Option<String>,
    pub vol_comments: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct FluidReportFilters {
    pub page: Option<i64>,
    pub page_size: Option<i64>,
    pub rig_id: Option<String>,
    pub rig_number: Option<String>,
    pub well_number: Option<String>,
    pub date_from: Option<String>,
    pub date_to: Option<String>,
}

// ============================================================================
// DB impl
// ============================================================================

const SELECT_COLS: &str =
    "id,report_id,rig_id,report_number,report_date,well_number,rig_number,
     contract,contractor,operator,field_district,supervisor_24h,
     fluid_type,well_phase,
     fluid_coordinator,tech_rep_1,tech_rep_2,trainee,ops_supervisor,
     bottom_down_min,bottom_down_emb,bottom_up_min,bottom_up_emb,
     well_cycle_min,well_cycle_emb,total_cycle_min,total_cycle_emb,
     vol_inicial,vol_perdido_hoyo,vol_descartado,vol_preparado,
     vol_transferido,vol_recibido,vol_perdido_sup,vol_final,
     esd,ecd,emb_n_tuberia,emb_n_anular,emb_k_tuberia,emb_k_anular,
     fluid_comments,product_comments,vol_comments,
     is_deleted,created_by,updated_by,created_at,updated_at,synced";

impl FluidReport {
    fn from_row(row: &Row) -> Result<Self, rusqlite::Error> {
        Ok(FluidReport {
            id: row.get(0)?,
            report_id: row.get(1)?,
            rig_id: row.get(2)?,
            report_number: row.get(3)?,
            report_date: row.get(4)?,
            well_number: row.get(5)?,
            rig_number: row.get(6)?,
            contract: row.get(7)?,
            contractor: row.get(8)?,
            operator: row.get(9)?,
            field_district: row.get(10)?,
            supervisor_24h: row.get(11)?,
            fluid_type: row.get(12)?,
            well_phase: row.get(13)?,
            fluid_coordinator: row.get(14)?,
            tech_rep_1: row.get(15)?,
            tech_rep_2: row.get(16)?,
            trainee: row.get(17)?,
            ops_supervisor: row.get(18)?,
            bottom_down_min: row.get(19)?,
            bottom_down_emb: row.get(20)?,
            bottom_up_min: row.get(21)?,
            bottom_up_emb: row.get(22)?,
            well_cycle_min: row.get(23)?,
            well_cycle_emb: row.get(24)?,
            total_cycle_min: row.get(25)?,
            total_cycle_emb: row.get(26)?,
            vol_inicial: row.get(27)?,
            vol_perdido_hoyo: row.get(28)?,
            vol_descartado: row.get(29)?,
            vol_preparado: row.get(30)?,
            vol_transferido: row.get(31)?,
            vol_recibido: row.get(32)?,
            vol_perdido_sup: row.get(33)?,
            vol_final: row.get(34)?,
            esd: row.get(35)?,
            ecd: row.get(36)?,
            emb_n_tuberia: row.get(37)?,
            emb_n_anular: row.get(38)?,
            emb_k_tuberia: row.get(39)?,
            emb_k_anular: row.get(40)?,
            fluid_comments: row.get(41)?,
            product_comments: row.get(42)?,
            vol_comments: row.get(43)?,
            is_deleted: row.get::<_, i32>(44)? != 0,
            created_by: row.get(45)?,
            updated_by: row.get(46)?,
            created_at: row.get(47)?,
            updated_at: row.get(48)?,
            synced: row.get::<_, i32>(49)? != 0,
        })
    }

    /// Crea un reporte de fluidos independiente, autonumera report_number.
    pub fn create(
        conn: &Connection,
        data: &CreateFluidReportRequest,
        created_by: &str,
    ) -> Result<FluidReport, AppError> {
        let id = uuid::Uuid::new_v4().to_string();
        let now = chrono::Utc::now().to_rfc3339();

        // Auto-increment report_number
        let max_num: i32 = conn
            .query_row(
                "SELECT COALESCE(MAX(report_number), 0) FROM fluid_reports",
                [],
                |r| r.get(0),
            )
            .unwrap_or(0);
        let report_number = max_num + 1;

        conn.execute(
            "INSERT INTO fluid_reports
                (id, rig_id, report_number, report_date, well_number, rig_number,
                 contract, contractor, operator, field_district, supervisor_24h,
                 fluid_type, well_phase,
                 fluid_coordinator, tech_rep_1, tech_rep_2, trainee, ops_supervisor,
                 is_deleted, created_by, updated_by, created_at, updated_at, synced)
             VALUES
                (?1,?2,?3,?4,?5,?6,?7,?8,?9,?10,?11,?12,?13,?14,?15,?16,?17,?18,
                 0,?19,?19,?20,?20,0)",
            params![
                &id, &data.rig_id, report_number, &data.report_date,
                &data.well_number, &data.rig_number,
                &data.contract, &data.contractor, &data.operator,
                &data.field_district, &data.supervisor_24h,
                &data.fluid_type, &data.well_phase,
                &data.fluid_coordinator, &data.tech_rep_1, &data.tech_rep_2,
                &data.trainee, &data.ops_supervisor,
                created_by, &now
            ],
        )?;

        Self::get_by_id(conn, &id)
    }

    pub fn get_by_id(conn: &Connection, id: &str) -> Result<FluidReport, AppError> {
        let sql = format!("SELECT {} FROM fluid_reports WHERE id=?1 AND is_deleted=0", SELECT_COLS);
        Ok(conn.query_row(&sql, params![id], Self::from_row)?)
    }

    pub fn list(
        conn: &Connection,
        filters: &FluidReportFilters,
    ) -> Result<(Vec<FluidReportListItem>, i64), AppError> {
        let page = filters.page.unwrap_or(1).max(1);
        let page_size = filters.page_size.unwrap_or(20).clamp(1, 100);
        let offset = (page - 1) * page_size;

        // Build dynamic WHERE with sequential param indices
        let mut conditions = vec!["is_deleted = 0".to_string()];
        let mut filter_params: Vec<Box<dyn rusqlite::types::ToSql>> = Vec::new();

        if let Some(ref ri) = filters.rig_id {
            filter_params.push(Box::new(ri.clone()));
            conditions.push(format!("rig_id = ?{}", filter_params.len()));
        }
        if let Some(ref rn) = filters.rig_number {
            filter_params.push(Box::new(rn.clone()));
            conditions.push(format!("rig_number = ?{}", filter_params.len()));
        }
        if let Some(ref wn) = filters.well_number {
            filter_params.push(Box::new(format!("%{}%", wn)));
            conditions.push(format!("well_number LIKE ?{}", filter_params.len()));
        }
        if let Some(ref df) = filters.date_from {
            filter_params.push(Box::new(df.clone()));
            conditions.push(format!("report_date >= ?{}", filter_params.len()));
        }
        if let Some(ref dt) = filters.date_to {
            filter_params.push(Box::new(dt.clone()));
            conditions.push(format!("report_date <= ?{}", filter_params.len()));
        }

        let where_clause = conditions.join(" AND ");

        // Count — only filter params, no LIMIT/OFFSET
        let count_sql = format!("SELECT COUNT(*) FROM fluid_reports WHERE {}", where_clause);
        let count_refs: Vec<&dyn rusqlite::types::ToSql> = filter_params.iter().map(|p| p.as_ref()).collect();
        let total: i64 = conn.query_row(
            &count_sql,
            count_refs.as_slice(),
            |r| r.get(0),
        )?;

        // Select — filter params + LIMIT/OFFSET at the end
        let limit_idx = filter_params.len() + 1;
        let offset_idx = filter_params.len() + 2;
        let select_sql = format!(
            "SELECT id, rig_id, report_number, report_date, well_number, rig_number,
                    fluid_type, well_phase, created_at, updated_at
             FROM fluid_reports
             WHERE {}
             ORDER BY report_date DESC, created_at DESC
             LIMIT ?{} OFFSET ?{}",
            where_clause, limit_idx, offset_idx
        );

        // Combine filter params + pagination params
        let mut all_params: Vec<Box<dyn rusqlite::types::ToSql>> = Vec::new();
        for p in &filter_params {
            // Re-box the values — we need owned copies
            all_params.push(Box::new(p.as_ref()));
        }
        // Simpler: just rebuild refs
        let mut select_refs: Vec<&dyn rusqlite::types::ToSql> = filter_params.iter().map(|p| p.as_ref()).collect();
        let ps = page_size;
        let os = offset;
        select_refs.push(&ps);
        select_refs.push(&os);

        let mut stmt = conn.prepare(&select_sql)?;
        let rows = stmt.query_map(
            select_refs.as_slice(),
            |row| {
                Ok(FluidReportListItem {
                    id: row.get(0)?,
                    rig_id: row.get(1)?,
                    report_number: row.get(2)?,
                    report_date: row.get(3)?,
                    well_number: row.get(4)?,
                    rig_number: row.get(5)?,
                    fluid_type: row.get(6)?,
                    well_phase: row.get(7)?,
                    created_at: row.get(8)?,
                    updated_at: row.get(9)?,
                })
            },
        )?.collect::<Result<Vec<_>, _>>()?;

        Ok((rows, total))
    }

    pub fn update_header(
        conn: &Connection,
        id: &str,
        data: &UpdateFluidHeaderRequest,
        updated_by: &str,
    ) -> Result<FluidReport, AppError> {
        let now = chrono::Utc::now().to_rfc3339();

        conn.execute(
            "UPDATE fluid_reports SET
                rig_id=COALESCE(?1,rig_id),
                report_date=COALESCE(?2,report_date), well_number=COALESCE(?3,well_number),
                rig_number=COALESCE(?4,rig_number), contract=COALESCE(?5,contract),
                contractor=COALESCE(?6,contractor), operator=COALESCE(?7,operator),
                field_district=COALESCE(?8,field_district), supervisor_24h=COALESCE(?9,supervisor_24h),
                fluid_type=COALESCE(?10,fluid_type), well_phase=COALESCE(?11,well_phase),
                fluid_coordinator=COALESCE(?12,fluid_coordinator),
                tech_rep_1=COALESCE(?13,tech_rep_1), tech_rep_2=COALESCE(?14,tech_rep_2),
                trainee=COALESCE(?15,trainee), ops_supervisor=COALESCE(?16,ops_supervisor),
                bottom_down_min=COALESCE(?17,bottom_down_min), bottom_down_emb=COALESCE(?18,bottom_down_emb),
                bottom_up_min=COALESCE(?19,bottom_up_min), bottom_up_emb=COALESCE(?20,bottom_up_emb),
                well_cycle_min=COALESCE(?21,well_cycle_min), well_cycle_emb=COALESCE(?22,well_cycle_emb),
                total_cycle_min=COALESCE(?23,total_cycle_min), total_cycle_emb=COALESCE(?24,total_cycle_emb),
                vol_inicial=COALESCE(?25,vol_inicial), vol_perdido_hoyo=COALESCE(?26,vol_perdido_hoyo),
                vol_descartado=COALESCE(?27,vol_descartado), vol_preparado=COALESCE(?28,vol_preparado),
                vol_transferido=COALESCE(?29,vol_transferido), vol_recibido=COALESCE(?30,vol_recibido),
                vol_perdido_sup=COALESCE(?31,vol_perdido_sup), vol_final=COALESCE(?32,vol_final),
                esd=COALESCE(?33,esd), ecd=COALESCE(?34,ecd),
                emb_n_tuberia=COALESCE(?35,emb_n_tuberia), emb_n_anular=COALESCE(?36,emb_n_anular),
                emb_k_tuberia=COALESCE(?37,emb_k_tuberia), emb_k_anular=COALESCE(?38,emb_k_anular),
                fluid_comments=COALESCE(?39,fluid_comments),
                product_comments=COALESCE(?40,product_comments),
                vol_comments=COALESCE(?41,vol_comments),
                updated_by=?42, updated_at=?43, synced=0
             WHERE id=?44 AND is_deleted=0",
            params![
                &data.rig_id,
                &data.report_date, &data.well_number, &data.rig_number,
                &data.contract, &data.contractor, &data.operator,
                &data.field_district, &data.supervisor_24h,
                &data.fluid_type, &data.well_phase,
                &data.fluid_coordinator, &data.tech_rep_1, &data.tech_rep_2,
                &data.trainee, &data.ops_supervisor,
                &data.bottom_down_min, &data.bottom_down_emb,
                &data.bottom_up_min, &data.bottom_up_emb,
                &data.well_cycle_min, &data.well_cycle_emb,
                &data.total_cycle_min, &data.total_cycle_emb,
                &data.vol_inicial, &data.vol_perdido_hoyo,
                &data.vol_descartado, &data.vol_preparado,
                &data.vol_transferido, &data.vol_recibido,
                &data.vol_perdido_sup, &data.vol_final,
                &data.esd, &data.ecd,
                &data.emb_n_tuberia, &data.emb_n_anular,
                &data.emb_k_tuberia, &data.emb_k_anular,
                &data.fluid_comments, &data.product_comments, &data.vol_comments,
                updated_by, &now, id
            ],
        )?;

        Self::get_by_id(conn, id)
    }

    /// Soft-delete del reporte de fluidos.
    pub fn soft_delete(conn: &Connection, id: &str, updated_by: &str) -> Result<(), AppError> {
        let now = chrono::Utc::now().to_rfc3339();
        conn.execute(
            "UPDATE fluid_reports SET is_deleted=1, updated_by=?1, updated_at=?2, synced=0 WHERE id=?3",
            params![updated_by, &now, id],
        )?;
        Ok(())
    }
}
