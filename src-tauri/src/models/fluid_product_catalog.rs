#![allow(dead_code)]

use crate::error::AppError;
use rusqlite::{params, Connection, Row};
use serde::{Deserialize, Serialize};

// ============================================================================
// Structs
// ============================================================================

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct FluidProduct {
    pub id: String,
    pub code: String,
    pub name: String,
    pub ge: Option<f64>,
    pub package: Option<String>,
    pub weight_lbs: Option<f64>,
    pub vol_gal: Option<f64>,
    pub active: bool,
    pub created_by: Option<String>,
    pub updated_by: Option<String>,
    pub created_at: String,
    pub updated_at: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CreateFluidProductRequest {
    pub code: String,
    pub name: String,
    pub ge: Option<f64>,
    pub package: Option<String>,
    pub weight_lbs: Option<f64>,
    pub vol_gal: Option<f64>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct UpdateFluidProductRequest {
    pub code: Option<String>,
    pub name: Option<String>,
    pub ge: Option<f64>,
    pub package: Option<String>,
    pub weight_lbs: Option<f64>,
    pub vol_gal: Option<f64>,
    pub active: Option<bool>,
}

// ============================================================================
// DB impl
// ============================================================================

impl FluidProduct {
    fn from_row(row: &Row) -> Result<Self, rusqlite::Error> {
        Ok(FluidProduct {
            id: row.get(0)?,
            code: row.get(1)?,
            name: row.get(2)?,
            ge: row.get(3)?,
            package: row.get(4)?,
            weight_lbs: row.get(5)?,
            vol_gal: row.get(6)?,
            active: row.get::<_, i32>(7)? != 0,
            created_by: row.get(8)?,
            updated_by: row.get(9)?,
            created_at: row.get(10)?,
            updated_at: row.get(11)?,
        })
    }

    pub fn create(
        conn: &Connection,
        data: &CreateFluidProductRequest,
        created_by: &str,
    ) -> Result<FluidProduct, AppError> {
        let id = uuid::Uuid::new_v4().to_string();
        let now = chrono::Utc::now().to_rfc3339();

        conn.execute(
            "INSERT INTO fluid_product_catalog
                (id, code, name, ge, package, weight_lbs, vol_gal, active, created_by, updated_by, created_at, updated_at)
             VALUES (?1,?2,?3,?4,?5,?6,?7,1,?8,?8,?9,?9)",
            params![
                &id, &data.code, &data.name, &data.ge, &data.package,
                &data.weight_lbs, &data.vol_gal, created_by, &now
            ],
        )?;

        Self::get_by_id(conn, &id)
    }

    pub fn get_by_id(conn: &Connection, id: &str) -> Result<FluidProduct, AppError> {
        Ok(conn.query_row(
            "SELECT id,code,name,ge,package,weight_lbs,vol_gal,active,created_by,updated_by,created_at,updated_at
             FROM fluid_product_catalog WHERE id=?1",
            params![id],
            Self::from_row,
        )?)
    }

    /// Todos los productos, activos primero, luego por código.
    pub fn list_all(conn: &Connection) -> Result<Vec<FluidProduct>, AppError> {
        let mut stmt = conn.prepare(
            "SELECT id,code,name,ge,package,weight_lbs,vol_gal,active,created_by,updated_by,created_at,updated_at
             FROM fluid_product_catalog
             ORDER BY active DESC, code ASC",
        )?;
        let rows = stmt
            .query_map([], Self::from_row)?
            .collect::<Result<Vec<_>, _>>()?;
        Ok(rows)
    }

    /// Solo los activos (para selectores en el wizard).
    pub fn list_active(conn: &Connection) -> Result<Vec<FluidProduct>, AppError> {
        let mut stmt = conn.prepare(
            "SELECT id,code,name,ge,package,weight_lbs,vol_gal,active,created_by,updated_by,created_at,updated_at
             FROM fluid_product_catalog
             WHERE active=1
             ORDER BY code ASC",
        )?;
        let rows = stmt
            .query_map([], Self::from_row)?
            .collect::<Result<Vec<_>, _>>()?;
        Ok(rows)
    }

    pub fn update(
        conn: &Connection,
        id: &str,
        data: &UpdateFluidProductRequest,
        updated_by: &str,
    ) -> Result<FluidProduct, AppError> {
        let now = chrono::Utc::now().to_rfc3339();

        conn.execute(
            "UPDATE fluid_product_catalog SET
                code       = COALESCE(?1, code),
                name       = COALESCE(?2, name),
                ge         = COALESCE(?3, ge),
                package    = COALESCE(?4, package),
                weight_lbs = COALESCE(?5, weight_lbs),
                vol_gal    = COALESCE(?6, vol_gal),
                active     = COALESCE(?7, active),
                updated_by = ?8,
                updated_at = ?9
             WHERE id = ?10",
            params![
                &data.code, &data.name, &data.ge, &data.package,
                &data.weight_lbs, &data.vol_gal,
                data.active.map(|b| b as i32),
                updated_by, &now, id
            ],
        )?;

        Self::get_by_id(conn, id)
    }

    /// Soft-delete: desactiva el producto.
    pub fn deactivate(conn: &Connection, id: &str, updated_by: &str) -> Result<(), AppError> {
        let now = chrono::Utc::now().to_rfc3339();
        conn.execute(
            "UPDATE fluid_product_catalog SET active=0, updated_by=?1, updated_at=?2 WHERE id=?3",
            params![updated_by, &now, id],
        )?;
        Ok(())
    }
}
