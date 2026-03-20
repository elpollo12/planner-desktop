#![allow(dead_code)]

use crate::error::AppError;
use rusqlite::{params, Connection, Row};
use serde::{Deserialize, Serialize};

// ============================================================================
// Structs — fluid_inventory
// ============================================================================

/// Un ítem del inventario con datos del producto del catálogo (JOIN).
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct FluidInventoryItem {
    pub id: String,
    pub fluid_report_id: String,
    pub product_id: String,
    // Campos del catálogo (JOIN)
    pub product_code: String,
    pub product_name: String,
    pub ge: Option<f64>,
    pub package: Option<String>,
    pub weight_lbs: Option<f64>,
    pub vol_gal: Option<f64>,
    // Cantidades
    pub inv_inicial: f64,
    pub received_today: f64,
    pub transferred_today: f64,
    pub consumed_today: f64,
    pub inv_final: f64,
    pub received_total: f64,
    pub transferred_total: f64,
    pub consumed_total: f64,
    pub daily_cost: Option<f64>,
    pub notes: Option<String>,
    pub created_at: String,
    pub updated_at: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SaveFluidInventoryItem {
    pub product_id: String,
    pub inv_inicial: f64,
    pub received_today: f64,
    pub transferred_today: f64,
    pub consumed_today: f64,
    pub inv_final: f64,
    pub received_total: f64,
    pub transferred_total: f64,
    pub consumed_total: f64,
    pub daily_cost: Option<f64>,
    pub notes: Option<String>,
}

// ============================================================================
// Structs — fluid_services
// ============================================================================

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct FluidService {
    pub id: String,
    pub fluid_report_id: String,
    pub service_name: String,
    pub hours_per_day: Option<f64>,
    pub quantity: Option<f64>,
    pub days_today: Option<f64>,
    pub days_total: Option<f64>,
    pub cost_bsf: Option<f64>,
    pub cost_usd: Option<f64>,
    pub daily_cost: Option<f64>,
    pub accumulated_cost: Option<f64>,
    pub created_at: String,
    pub updated_at: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SaveFluidServiceItem {
    pub service_name: String,
    pub hours_per_day: Option<f64>,
    pub quantity: Option<f64>,
    pub days_today: Option<f64>,
    pub days_total: Option<f64>,
    pub cost_bsf: Option<f64>,
    pub cost_usd: Option<f64>,
    pub daily_cost: Option<f64>,
    pub accumulated_cost: Option<f64>,
}

// ============================================================================
// DB impl — FluidInventoryItem
// ============================================================================

impl FluidInventoryItem {
    fn from_row(row: &Row) -> Result<Self, rusqlite::Error> {
        Ok(FluidInventoryItem {
            id: row.get(0)?,
            fluid_report_id: row.get(1)?,
            product_id: row.get(2)?,
            product_code: row.get(3)?,
            product_name: row.get(4)?,
            ge: row.get(5)?,
            package: row.get(6)?,
            weight_lbs: row.get(7)?,
            vol_gal: row.get(8)?,
            inv_inicial: row.get(9)?,
            received_today: row.get(10)?,
            transferred_today: row.get(11)?,
            consumed_today: row.get(12)?,
            inv_final: row.get(13)?,
            received_total: row.get(14)?,
            transferred_total: row.get(15)?,
            consumed_total: row.get(16)?,
            daily_cost: row.get(17)?,
            notes: row.get(18)?,
            created_at: row.get(19)?,
            updated_at: row.get(20)?,
        })
    }

    pub fn list_by_fluid_report(
        conn: &Connection,
        fluid_report_id: &str,
    ) -> Result<Vec<FluidInventoryItem>, AppError> {
        let mut stmt = conn.prepare(
            "SELECT fi.id, fi.fluid_report_id, fi.product_id,
                    fpc.code, fpc.name, fpc.ge, fpc.package, fpc.weight_lbs, fpc.vol_gal,
                    fi.inv_inicial, fi.received_today, fi.transferred_today, fi.consumed_today,
                    fi.inv_final, fi.received_total, fi.transferred_total, fi.consumed_total,
                    fi.daily_cost, fi.notes, fi.created_at, fi.updated_at
             FROM fluid_inventory fi
             JOIN fluid_product_catalog fpc ON fpc.id = fi.product_id
             WHERE fi.fluid_report_id = ?1
             ORDER BY fpc.code ASC",
        )?;

        let rows = stmt
            .query_map(params![fluid_report_id], Self::from_row)?
            .collect::<Result<Vec<_>, _>>()?;
        Ok(rows)
    }

    /// Reemplaza todo el inventario del fluid_report en una operación atómica.
    pub fn save_bulk(
        conn: &Connection,
        fluid_report_id: &str,
        items: &[SaveFluidInventoryItem],
    ) -> Result<Vec<FluidInventoryItem>, AppError> {
        let now = chrono::Utc::now().to_rfc3339();

        conn.execute(
            "DELETE FROM fluid_inventory WHERE fluid_report_id=?1",
            params![fluid_report_id],
        )?;

        for item in items {
            let id = uuid::Uuid::new_v4().to_string();
            conn.execute(
                "INSERT INTO fluid_inventory
                    (id,fluid_report_id,product_id,
                     inv_inicial,received_today,transferred_today,consumed_today,inv_final,
                     received_total,transferred_total,consumed_total,
                     daily_cost,notes,created_at,updated_at)
                 VALUES (?1,?2,?3,?4,?5,?6,?7,?8,?9,?10,?11,?12,?13,?14,?14)",
                params![
                    &id, fluid_report_id, &item.product_id,
                    &item.inv_inicial, &item.received_today,
                    &item.transferred_today, &item.consumed_today, &item.inv_final,
                    &item.received_total, &item.transferred_total, &item.consumed_total,
                    &item.daily_cost, &item.notes, &now
                ],
            )?;
        }

        Self::list_by_fluid_report(conn, fluid_report_id)
    }
}

// ============================================================================
// DB impl — FluidService
// ============================================================================

impl FluidService {
    fn from_row(row: &Row) -> Result<Self, rusqlite::Error> {
        Ok(FluidService {
            id: row.get(0)?,
            fluid_report_id: row.get(1)?,
            service_name: row.get(2)?,
            hours_per_day: row.get(3)?,
            quantity: row.get(4)?,
            days_today: row.get(5)?,
            days_total: row.get(6)?,
            cost_bsf: row.get(7)?,
            cost_usd: row.get(8)?,
            daily_cost: row.get(9)?,
            accumulated_cost: row.get(10)?,
            created_at: row.get(11)?,
            updated_at: row.get(12)?,
        })
    }

    pub fn list_by_fluid_report(
        conn: &Connection,
        fluid_report_id: &str,
    ) -> Result<Vec<FluidService>, AppError> {
        let mut stmt = conn.prepare(
            "SELECT id,fluid_report_id,service_name,hours_per_day,quantity,
                    days_today,days_total,cost_bsf,cost_usd,daily_cost,accumulated_cost,
                    created_at,updated_at
             FROM fluid_services WHERE fluid_report_id=?1 ORDER BY rowid ASC",
        )?;
        let rows = stmt
            .query_map(params![fluid_report_id], Self::from_row)?
            .collect::<Result<Vec<_>, _>>()?;
        Ok(rows)
    }

    pub fn save_bulk(
        conn: &Connection,
        fluid_report_id: &str,
        items: &[SaveFluidServiceItem],
    ) -> Result<Vec<FluidService>, AppError> {
        let now = chrono::Utc::now().to_rfc3339();

        conn.execute(
            "DELETE FROM fluid_services WHERE fluid_report_id=?1",
            params![fluid_report_id],
        )?;

        for item in items {
            let id = uuid::Uuid::new_v4().to_string();
            conn.execute(
                "INSERT INTO fluid_services
                    (id,fluid_report_id,service_name,hours_per_day,quantity,
                     days_today,days_total,cost_bsf,cost_usd,daily_cost,accumulated_cost,
                     created_at,updated_at)
                 VALUES (?1,?2,?3,?4,?5,?6,?7,?8,?9,?10,?11,?12,?12)",
                params![
                    &id, fluid_report_id, &item.service_name,
                    &item.hours_per_day, &item.quantity,
                    &item.days_today, &item.days_total,
                    &item.cost_bsf, &item.cost_usd,
                    &item.daily_cost, &item.accumulated_cost,
                    &now
                ],
            )?;
        }

        Self::list_by_fluid_report(conn, fluid_report_id)
    }
}
