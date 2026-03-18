#![allow(dead_code)]

use crate::error::AppError;
use rusqlite::{params, Connection, Row};
use serde::{Deserialize, Serialize};

// ============================================================================
// Structs — fluid_props
// ============================================================================

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct FluidProps {
    pub id: String,
    pub fluid_report_id: String,
    pub sample_hour: Option<String>,
    pub sample_source: Option<String>,
    pub temperature_f: Option<f64>,
    pub depth_md: Option<f64>,
    pub depth_tvd: Option<f64>,
    // Reológicas
    pub density: Option<f64>,
    pub marsh_viscosity: Option<f64>,
    pub rpm_600: Option<f64>,
    pub rpm_300: Option<f64>,
    pub rpm_200: Option<f64>,
    pub rpm_100: Option<f64>,
    pub rpm_6: Option<f64>,
    pub rpm_3: Option<f64>,
    pub pv: Option<f64>,
    pub yp: Option<f64>,
    pub gel_10s: Option<f64>,
    pub gel_10m: Option<f64>,
    pub gel_30m: Option<f64>,
    // Filtración
    pub api_filtrate: Option<f64>,
    pub filter_cake: Option<f64>,
    // Retorta
    pub sand_content: Option<f64>,
    pub solids_retort: Option<f64>,
    pub oil_retort: Option<f64>,
    pub water_retort: Option<f64>,
    // Química
    pub ph: Option<f64>,
    pub alkalinity_pm: Option<f64>,
    pub alkalinity_pf: Option<f64>,
    pub alkalinity_mf: Option<f64>,
    pub calcium_ppm: Option<f64>,
    pub chlorides_ppm: Option<f64>,
    pub mbt: Option<f64>,
    pub brookfield_visc: Option<f64>,
    pub lubricity_coef: Option<f64>,
    pub created_at: String,
    pub updated_at: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SaveFluidPropsItem {
    pub sample_hour: Option<String>,
    pub sample_source: Option<String>,
    pub temperature_f: Option<f64>,
    pub depth_md: Option<f64>,
    pub depth_tvd: Option<f64>,
    pub density: Option<f64>,
    pub marsh_viscosity: Option<f64>,
    pub rpm_600: Option<f64>,
    pub rpm_300: Option<f64>,
    pub rpm_200: Option<f64>,
    pub rpm_100: Option<f64>,
    pub rpm_6: Option<f64>,
    pub rpm_3: Option<f64>,
    pub pv: Option<f64>,
    pub yp: Option<f64>,
    pub gel_10s: Option<f64>,
    pub gel_10m: Option<f64>,
    pub gel_30m: Option<f64>,
    pub api_filtrate: Option<f64>,
    pub filter_cake: Option<f64>,
    pub sand_content: Option<f64>,
    pub solids_retort: Option<f64>,
    pub oil_retort: Option<f64>,
    pub water_retort: Option<f64>,
    pub ph: Option<f64>,
    pub alkalinity_pm: Option<f64>,
    pub alkalinity_pf: Option<f64>,
    pub alkalinity_mf: Option<f64>,
    pub calcium_ppm: Option<f64>,
    pub chlorides_ppm: Option<f64>,
    pub mbt: Option<f64>,
    pub brookfield_visc: Option<f64>,
    pub lubricity_coef: Option<f64>,
}

// ============================================================================
// Structs — fluid_solids_control
// ============================================================================

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct FluidSolidsControl {
    pub id: String,
    pub fluid_report_id: String,
    pub equipment: String,
    pub design_mesh: Option<String>,
    pub hours_today: Option<f64>,
    pub hours_accumulated: Option<f64>,
    pub created_at: String,
    pub updated_at: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SaveFluidSolidsControlItem {
    pub equipment: String,
    pub design_mesh: Option<String>,
    pub hours_today: Option<f64>,
    pub hours_accumulated: Option<f64>,
}

// ============================================================================
// DB impl — FluidProps
// ============================================================================

impl FluidProps {
    fn from_row(row: &Row) -> Result<Self, rusqlite::Error> {
        Ok(FluidProps {
            id: row.get(0)?,
            fluid_report_id: row.get(1)?,
            sample_hour: row.get(2)?,
            sample_source: row.get(3)?,
            temperature_f: row.get(4)?,
            depth_md: row.get(5)?,
            depth_tvd: row.get(6)?,
            density: row.get(7)?,
            marsh_viscosity: row.get(8)?,
            rpm_600: row.get(9)?,
            rpm_300: row.get(10)?,
            rpm_200: row.get(11)?,
            rpm_100: row.get(12)?,
            rpm_6: row.get(13)?,
            rpm_3: row.get(14)?,
            pv: row.get(15)?,
            yp: row.get(16)?,
            gel_10s: row.get(17)?,
            gel_10m: row.get(18)?,
            gel_30m: row.get(19)?,
            api_filtrate: row.get(20)?,
            filter_cake: row.get(21)?,
            sand_content: row.get(22)?,
            solids_retort: row.get(23)?,
            oil_retort: row.get(24)?,
            water_retort: row.get(25)?,
            ph: row.get(26)?,
            alkalinity_pm: row.get(27)?,
            alkalinity_pf: row.get(28)?,
            alkalinity_mf: row.get(29)?,
            calcium_ppm: row.get(30)?,
            chlorides_ppm: row.get(31)?,
            mbt: row.get(32)?,
            brookfield_visc: row.get(33)?,
            lubricity_coef: row.get(34)?,
            created_at: row.get(35)?,
            updated_at: row.get(36)?,
        })
    }

    const SELECT: &'static str =
        "SELECT id,fluid_report_id,sample_hour,sample_source,temperature_f,depth_md,depth_tvd,
                density,marsh_viscosity,rpm_600,rpm_300,rpm_200,rpm_100,rpm_6,rpm_3,
                pv,yp,gel_10s,gel_10m,gel_30m,api_filtrate,filter_cake,
                sand_content,solids_retort,oil_retort,water_retort,
                ph,alkalinity_pm,alkalinity_pf,alkalinity_mf,calcium_ppm,chlorides_ppm,
                mbt,brookfield_visc,lubricity_coef,created_at,updated_at
         FROM fluid_props";

    pub fn list_by_fluid_report(
        conn: &Connection,
        fluid_report_id: &str,
    ) -> Result<Vec<FluidProps>, AppError> {
        let sql = format!(
            "{} WHERE fluid_report_id=?1 ORDER BY sample_hour ASC",
            Self::SELECT
        );
        let mut stmt = conn.prepare(&sql)?;
        let rows = stmt
            .query_map(params![fluid_report_id], Self::from_row)?
            .collect::<Result<Vec<_>, _>>()?;
        Ok(rows)
    }

    /// Reemplaza todas las lecturas del fluid_report en una operación atómica.
    pub fn save_bulk(
        conn: &Connection,
        fluid_report_id: &str,
        items: &[SaveFluidPropsItem],
    ) -> Result<Vec<FluidProps>, AppError> {
        let now = chrono::Utc::now().to_rfc3339();

        conn.execute(
            "DELETE FROM fluid_props WHERE fluid_report_id=?1",
            params![fluid_report_id],
        )?;

        for item in items {
            let id = uuid::Uuid::new_v4().to_string();
            conn.execute(
                "INSERT INTO fluid_props
                    (id,fluid_report_id,sample_hour,sample_source,temperature_f,depth_md,depth_tvd,
                     density,marsh_viscosity,rpm_600,rpm_300,rpm_200,rpm_100,rpm_6,rpm_3,
                     pv,yp,gel_10s,gel_10m,gel_30m,api_filtrate,filter_cake,
                     sand_content,solids_retort,oil_retort,water_retort,
                     ph,alkalinity_pm,alkalinity_pf,alkalinity_mf,calcium_ppm,chlorides_ppm,
                     mbt,brookfield_visc,lubricity_coef,created_at,updated_at)
                 VALUES
                    (?1,?2,?3,?4,?5,?6,?7,?8,?9,?10,?11,?12,?13,?14,?15,?16,?17,
                     ?18,?19,?20,?21,?22,?23,?24,?25,?26,?27,?28,?29,?30,?31,?32,?33,?34,?35,?36,?36)",
                params![
                    &id, fluid_report_id,
                    &item.sample_hour, &item.sample_source,
                    &item.temperature_f, &item.depth_md, &item.depth_tvd,
                    &item.density, &item.marsh_viscosity,
                    &item.rpm_600, &item.rpm_300, &item.rpm_200,
                    &item.rpm_100, &item.rpm_6, &item.rpm_3,
                    &item.pv, &item.yp,
                    &item.gel_10s, &item.gel_10m, &item.gel_30m,
                    &item.api_filtrate, &item.filter_cake,
                    &item.sand_content, &item.solids_retort,
                    &item.oil_retort, &item.water_retort,
                    &item.ph, &item.alkalinity_pm, &item.alkalinity_pf,
                    &item.alkalinity_mf, &item.calcium_ppm, &item.chlorides_ppm,
                    &item.mbt, &item.brookfield_visc, &item.lubricity_coef,
                    &now
                ],
            )?;
        }

        Self::list_by_fluid_report(conn, fluid_report_id)
    }
}

// ============================================================================
// DB impl — FluidSolidsControl
// ============================================================================

impl FluidSolidsControl {
    fn from_row(row: &Row) -> Result<Self, rusqlite::Error> {
        Ok(FluidSolidsControl {
            id: row.get(0)?,
            fluid_report_id: row.get(1)?,
            equipment: row.get(2)?,
            design_mesh: row.get(3)?,
            hours_today: row.get(4)?,
            hours_accumulated: row.get(5)?,
            created_at: row.get(6)?,
            updated_at: row.get(7)?,
        })
    }

    pub fn list_by_fluid_report(
        conn: &Connection,
        fluid_report_id: &str,
    ) -> Result<Vec<FluidSolidsControl>, AppError> {
        let mut stmt = conn.prepare(
            "SELECT id,fluid_report_id,equipment,design_mesh,hours_today,hours_accumulated,created_at,updated_at
             FROM fluid_solids_control WHERE fluid_report_id=?1 ORDER BY rowid ASC",
        )?;
        let rows = stmt
            .query_map(params![fluid_report_id], Self::from_row)?
            .collect::<Result<Vec<_>, _>>()?;
        Ok(rows)
    }

    pub fn save_bulk(
        conn: &Connection,
        fluid_report_id: &str,
        items: &[SaveFluidSolidsControlItem],
    ) -> Result<Vec<FluidSolidsControl>, AppError> {
        let now = chrono::Utc::now().to_rfc3339();

        conn.execute(
            "DELETE FROM fluid_solids_control WHERE fluid_report_id=?1",
            params![fluid_report_id],
        )?;

        for item in items {
            let id = uuid::Uuid::new_v4().to_string();
            conn.execute(
                "INSERT INTO fluid_solids_control
                    (id,fluid_report_id,equipment,design_mesh,hours_today,hours_accumulated,created_at,updated_at)
                 VALUES (?1,?2,?3,?4,?5,?6,?7,?7)",
                params![
                    &id, fluid_report_id,
                    &item.equipment, &item.design_mesh,
                    &item.hours_today, &item.hours_accumulated,
                    &now
                ],
            )?;
        }

        Self::list_by_fluid_report(conn, fluid_report_id)
    }
}
