#![allow(dead_code)]

use crate::error::AppError;
use rusqlite::{params, Connection, Row};
use serde::{Deserialize, Serialize};

// ============================================================================
// Structs — fluid_tanks
// ============================================================================

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct FluidTank {
    pub id: String,
    pub fluid_report_id: String,
    pub name: String,
    pub system_status: String,
    pub volume_bls: Option<f64>,
    pub lpg: Option<f64>,
    pub fluid_type: Option<String>,
    pub sort_order: i32,
    pub created_at: String,
    pub updated_at: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SaveFluidTankItem {
    pub name: String,
    pub system_status: String,
    pub volume_bls: Option<f64>,
    pub lpg: Option<f64>,
    pub fluid_type: Option<String>,
    pub sort_order: Option<i32>,
}

// ============================================================================
// Structs — fluid_vol_stats
// ============================================================================

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct FluidVolStats {
    pub id: String,
    pub fluid_report_id: String,

    // Volúmenes del pozo
    pub vol_cap_sarta: Option<f64>,
    pub vol_desp_sarta: Option<f64>,
    pub vol_revestidor: Option<f64>,
    pub vol_hoyo_desnudo: Option<f64>,
    pub vol_pozo_sin_tuberia: Option<f64>,
    pub vol_pozo_con_tuberia: Option<f64>,
    pub vol_sistema_activo: Option<f64>,
    pub vol_sistema_reserva: Option<f64>,
    pub vol_sistema_contingencia: Option<f64>,
    pub vol_hoyo_abandonado: Option<f64>,

    // Estadística hoy / acumulado
    pub vol_agua_agregado_hoy: Option<f64>,
    pub vol_agua_agregado_acum: Option<f64>,
    pub vol_productos_hoy: Option<f64>,
    pub vol_productos_acum: Option<f64>,
    pub vol_aceite_acum: Option<f64>,
    pub vol_recibido_hoy: Option<f64>,
    pub vol_recibido_acum: Option<f64>,
    pub vol_procesado_hoy: Option<f64>,
    pub vol_procesado_acum: Option<f64>,
    pub vol_manejado_hoy: Option<f64>,
    pub vol_total_agregado_hoy: Option<f64>,
    pub vol_total_agregado_acum: Option<f64>,
    pub vol_transferido_fuera: Option<f64>,

    // Pérdidas
    pub vol_perdido_ecs: Option<f64>,
    pub vol_perdido_ecs_acum: Option<f64>,
    pub vol_perdido_humectacion: Option<f64>,
    pub vol_perdido_humectacion_acum: Option<f64>,
    pub vol_perdido_formacion_hoy: Option<f64>,
    pub vol_perdido_formacion_acum: Option<f64>,
    pub vol_perdido_permeabilidad: Option<f64>,
    pub vol_perdido_permeabilidad_acum: Option<f64>,
    pub vol_descartado: Option<f64>,
    pub vol_entrampado: Option<f64>,
    pub vol_perdido_superficie: Option<f64>,
    pub vol_perdido_superficie_acum: Option<f64>,
    pub vol_otras_perdidas: Option<f64>,
    pub vol_total_perdido_hoy: Option<f64>,
    pub vol_total_perdido_acum: Option<f64>,

    // Balance
    pub vol_inicial_diario: Option<f64>,
    pub vol_final_diario: Option<f64>,

    pub created_at: String,
    pub updated_at: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SaveFluidVolStatsRequest {
    pub vol_cap_sarta: Option<f64>,
    pub vol_desp_sarta: Option<f64>,
    pub vol_revestidor: Option<f64>,
    pub vol_hoyo_desnudo: Option<f64>,
    pub vol_pozo_sin_tuberia: Option<f64>,
    pub vol_pozo_con_tuberia: Option<f64>,
    pub vol_sistema_activo: Option<f64>,
    pub vol_sistema_reserva: Option<f64>,
    pub vol_sistema_contingencia: Option<f64>,
    pub vol_hoyo_abandonado: Option<f64>,
    pub vol_agua_agregado_hoy: Option<f64>,
    pub vol_agua_agregado_acum: Option<f64>,
    pub vol_productos_hoy: Option<f64>,
    pub vol_productos_acum: Option<f64>,
    pub vol_aceite_acum: Option<f64>,
    pub vol_recibido_hoy: Option<f64>,
    pub vol_recibido_acum: Option<f64>,
    pub vol_procesado_hoy: Option<f64>,
    pub vol_procesado_acum: Option<f64>,
    pub vol_manejado_hoy: Option<f64>,
    pub vol_total_agregado_hoy: Option<f64>,
    pub vol_total_agregado_acum: Option<f64>,
    pub vol_transferido_fuera: Option<f64>,
    pub vol_perdido_ecs: Option<f64>,
    pub vol_perdido_ecs_acum: Option<f64>,
    pub vol_perdido_humectacion: Option<f64>,
    pub vol_perdido_humectacion_acum: Option<f64>,
    pub vol_perdido_formacion_hoy: Option<f64>,
    pub vol_perdido_formacion_acum: Option<f64>,
    pub vol_perdido_permeabilidad: Option<f64>,
    pub vol_perdido_permeabilidad_acum: Option<f64>,
    pub vol_descartado: Option<f64>,
    pub vol_entrampado: Option<f64>,
    pub vol_perdido_superficie: Option<f64>,
    pub vol_perdido_superficie_acum: Option<f64>,
    pub vol_otras_perdidas: Option<f64>,
    pub vol_total_perdido_hoy: Option<f64>,
    pub vol_total_perdido_acum: Option<f64>,
    pub vol_inicial_diario: Option<f64>,
    pub vol_final_diario: Option<f64>,
}

// ============================================================================
// DB impl — FluidTank
// ============================================================================

impl FluidTank {
    fn from_row(row: &Row) -> Result<Self, rusqlite::Error> {
        Ok(FluidTank {
            id: row.get(0)?,
            fluid_report_id: row.get(1)?,
            name: row.get(2)?,
            system_status: row.get(3)?,
            volume_bls: row.get(4)?,
            lpg: row.get(5)?,
            fluid_type: row.get(6)?,
            sort_order: row.get(7)?,
            created_at: row.get(8)?,
            updated_at: row.get(9)?,
        })
    }

    pub fn list_by_fluid_report(
        conn: &Connection,
        fluid_report_id: &str,
    ) -> Result<Vec<FluidTank>, AppError> {
        let mut stmt = conn.prepare(
            "SELECT id,fluid_report_id,name,system_status,volume_bls,lpg,fluid_type,sort_order,created_at,updated_at
             FROM fluid_tanks WHERE fluid_report_id=?1 ORDER BY sort_order ASC, rowid ASC",
        )?;
        let rows = stmt
            .query_map(params![fluid_report_id], Self::from_row)?
            .collect::<Result<Vec<_>, _>>()?;
        Ok(rows)
    }

    pub fn save_bulk(
        conn: &Connection,
        fluid_report_id: &str,
        items: &[SaveFluidTankItem],
    ) -> Result<Vec<FluidTank>, AppError> {
        let now = chrono::Utc::now().to_rfc3339();

        conn.execute(
            "DELETE FROM fluid_tanks WHERE fluid_report_id=?1",
            params![fluid_report_id],
        )?;

        for (i, item) in items.iter().enumerate() {
            let id = uuid::Uuid::new_v4().to_string();
            let order = item.sort_order.unwrap_or(i as i32);
            conn.execute(
                "INSERT INTO fluid_tanks
                    (id,fluid_report_id,name,system_status,volume_bls,lpg,fluid_type,sort_order,created_at,updated_at)
                 VALUES (?1,?2,?3,?4,?5,?6,?7,?8,?9,?9)",
                params![
                    &id, fluid_report_id, &item.name, &item.system_status,
                    &item.volume_bls, &item.lpg, &item.fluid_type, &order, &now
                ],
            )?;
        }

        Self::list_by_fluid_report(conn, fluid_report_id)
    }
}

// ============================================================================
// DB impl — FluidVolStats
// ============================================================================

impl FluidVolStats {
    fn from_row(row: &Row) -> Result<Self, rusqlite::Error> {
        Ok(FluidVolStats {
            id: row.get(0)?,
            fluid_report_id: row.get(1)?,
            vol_cap_sarta: row.get(2)?,
            vol_desp_sarta: row.get(3)?,
            vol_revestidor: row.get(4)?,
            vol_hoyo_desnudo: row.get(5)?,
            vol_pozo_sin_tuberia: row.get(6)?,
            vol_pozo_con_tuberia: row.get(7)?,
            vol_sistema_activo: row.get(8)?,
            vol_sistema_reserva: row.get(9)?,
            vol_sistema_contingencia: row.get(10)?,
            vol_hoyo_abandonado: row.get(11)?,
            vol_agua_agregado_hoy: row.get(12)?,
            vol_agua_agregado_acum: row.get(13)?,
            vol_productos_hoy: row.get(14)?,
            vol_productos_acum: row.get(15)?,
            vol_aceite_acum: row.get(16)?,
            vol_recibido_hoy: row.get(17)?,
            vol_recibido_acum: row.get(18)?,
            vol_procesado_hoy: row.get(19)?,
            vol_procesado_acum: row.get(20)?,
            vol_manejado_hoy: row.get(21)?,
            vol_total_agregado_hoy: row.get(22)?,
            vol_total_agregado_acum: row.get(23)?,
            vol_transferido_fuera: row.get(24)?,
            vol_perdido_ecs: row.get(25)?,
            vol_perdido_ecs_acum: row.get(26)?,
            vol_perdido_humectacion: row.get(27)?,
            vol_perdido_humectacion_acum: row.get(28)?,
            vol_perdido_formacion_hoy: row.get(29)?,
            vol_perdido_formacion_acum: row.get(30)?,
            vol_perdido_permeabilidad: row.get(31)?,
            vol_perdido_permeabilidad_acum: row.get(32)?,
            vol_descartado: row.get(33)?,
            vol_entrampado: row.get(34)?,
            vol_perdido_superficie: row.get(35)?,
            vol_perdido_superficie_acum: row.get(36)?,
            vol_otras_perdidas: row.get(37)?,
            vol_total_perdido_hoy: row.get(38)?,
            vol_total_perdido_acum: row.get(39)?,
            vol_inicial_diario: row.get(40)?,
            vol_final_diario: row.get(41)?,
            created_at: row.get(42)?,
            updated_at: row.get(43)?,
        })
    }

    const SELECT: &'static str =
        "SELECT id,fluid_report_id,
                vol_cap_sarta,vol_desp_sarta,vol_revestidor,vol_hoyo_desnudo,
                vol_pozo_sin_tuberia,vol_pozo_con_tuberia,
                vol_sistema_activo,vol_sistema_reserva,vol_sistema_contingencia,vol_hoyo_abandonado,
                vol_agua_agregado_hoy,vol_agua_agregado_acum,
                vol_productos_hoy,vol_productos_acum,vol_aceite_acum,
                vol_recibido_hoy,vol_recibido_acum,vol_procesado_hoy,vol_procesado_acum,
                vol_manejado_hoy,vol_total_agregado_hoy,vol_total_agregado_acum,vol_transferido_fuera,
                vol_perdido_ecs,vol_perdido_ecs_acum,
                vol_perdido_humectacion,vol_perdido_humectacion_acum,
                vol_perdido_formacion_hoy,vol_perdido_formacion_acum,
                vol_perdido_permeabilidad,vol_perdido_permeabilidad_acum,
                vol_descartado,vol_entrampado,
                vol_perdido_superficie,vol_perdido_superficie_acum,
                vol_otras_perdidas,vol_total_perdido_hoy,vol_total_perdido_acum,
                vol_inicial_diario,vol_final_diario,
                created_at,updated_at
         FROM fluid_vol_stats";

    pub fn get_by_fluid_report(
        conn: &Connection,
        fluid_report_id: &str,
    ) -> Result<Option<FluidVolStats>, AppError> {
        let sql = format!("{} WHERE fluid_report_id=?1", Self::SELECT);
        match conn.query_row(&sql, params![fluid_report_id], Self::from_row) {
            Ok(r) => Ok(Some(r)),
            Err(rusqlite::Error::QueryReturnedNoRows) => Ok(None),
            Err(e) => Err(AppError::from(e)),
        }
    }

    /// Upsert: inserta si no existe, actualiza si ya existe.
    pub fn upsert(
        conn: &Connection,
        fluid_report_id: &str,
        data: &SaveFluidVolStatsRequest,
    ) -> Result<Option<FluidVolStats>, AppError> {
        let now = chrono::Utc::now().to_rfc3339();

        let exists: i32 = conn.query_row(
            "SELECT COUNT(*) FROM fluid_vol_stats WHERE fluid_report_id=?1",
            params![fluid_report_id],
            |r| r.get(0),
        )?;

        if exists == 0 {
            let id = uuid::Uuid::new_v4().to_string();
            conn.execute(
                "INSERT INTO fluid_vol_stats
                    (id,fluid_report_id,
                     vol_cap_sarta,vol_desp_sarta,vol_revestidor,vol_hoyo_desnudo,
                     vol_pozo_sin_tuberia,vol_pozo_con_tuberia,
                     vol_sistema_activo,vol_sistema_reserva,vol_sistema_contingencia,vol_hoyo_abandonado,
                     vol_agua_agregado_hoy,vol_agua_agregado_acum,
                     vol_productos_hoy,vol_productos_acum,vol_aceite_acum,
                     vol_recibido_hoy,vol_recibido_acum,vol_procesado_hoy,vol_procesado_acum,
                     vol_manejado_hoy,vol_total_agregado_hoy,vol_total_agregado_acum,vol_transferido_fuera,
                     vol_perdido_ecs,vol_perdido_ecs_acum,
                     vol_perdido_humectacion,vol_perdido_humectacion_acum,
                     vol_perdido_formacion_hoy,vol_perdido_formacion_acum,
                     vol_perdido_permeabilidad,vol_perdido_permeabilidad_acum,
                     vol_descartado,vol_entrampado,
                     vol_perdido_superficie,vol_perdido_superficie_acum,
                     vol_otras_perdidas,vol_total_perdido_hoy,vol_total_perdido_acum,
                     vol_inicial_diario,vol_final_diario,created_at,updated_at)
                 VALUES
                    (?1,?2,?3,?4,?5,?6,?7,?8,?9,?10,?11,?12,?13,?14,?15,?16,?17,
                     ?18,?19,?20,?21,?22,?23,?24,?25,?26,?27,?28,?29,?30,?31,?32,
                     ?33,?34,?35,?36,?37,?38,?39,?40,?41,?42,?43,?43)",
                params![
                    &id, fluid_report_id,
                    &data.vol_cap_sarta, &data.vol_desp_sarta, &data.vol_revestidor,
                    &data.vol_hoyo_desnudo, &data.vol_pozo_sin_tuberia, &data.vol_pozo_con_tuberia,
                    &data.vol_sistema_activo, &data.vol_sistema_reserva, &data.vol_sistema_contingencia,
                    &data.vol_hoyo_abandonado,
                    &data.vol_agua_agregado_hoy, &data.vol_agua_agregado_acum,
                    &data.vol_productos_hoy, &data.vol_productos_acum, &data.vol_aceite_acum,
                    &data.vol_recibido_hoy, &data.vol_recibido_acum,
                    &data.vol_procesado_hoy, &data.vol_procesado_acum,
                    &data.vol_manejado_hoy, &data.vol_total_agregado_hoy, &data.vol_total_agregado_acum,
                    &data.vol_transferido_fuera,
                    &data.vol_perdido_ecs, &data.vol_perdido_ecs_acum,
                    &data.vol_perdido_humectacion, &data.vol_perdido_humectacion_acum,
                    &data.vol_perdido_formacion_hoy, &data.vol_perdido_formacion_acum,
                    &data.vol_perdido_permeabilidad, &data.vol_perdido_permeabilidad_acum,
                    &data.vol_descartado, &data.vol_entrampado,
                    &data.vol_perdido_superficie, &data.vol_perdido_superficie_acum,
                    &data.vol_otras_perdidas, &data.vol_total_perdido_hoy, &data.vol_total_perdido_acum,
                    &data.vol_inicial_diario, &data.vol_final_diario,
                    &now
                ],
            )?;
        } else {
            conn.execute(
                "UPDATE fluid_vol_stats SET
                    vol_cap_sarta=?1, vol_desp_sarta=?2, vol_revestidor=?3,
                    vol_hoyo_desnudo=?4, vol_pozo_sin_tuberia=?5, vol_pozo_con_tuberia=?6,
                    vol_sistema_activo=?7, vol_sistema_reserva=?8, vol_sistema_contingencia=?9,
                    vol_hoyo_abandonado=?10,
                    vol_agua_agregado_hoy=?11, vol_agua_agregado_acum=?12,
                    vol_productos_hoy=?13, vol_productos_acum=?14, vol_aceite_acum=?15,
                    vol_recibido_hoy=?16, vol_recibido_acum=?17,
                    vol_procesado_hoy=?18, vol_procesado_acum=?19,
                    vol_manejado_hoy=?20, vol_total_agregado_hoy=?21, vol_total_agregado_acum=?22,
                    vol_transferido_fuera=?23,
                    vol_perdido_ecs=?24, vol_perdido_ecs_acum=?25,
                    vol_perdido_humectacion=?26, vol_perdido_humectacion_acum=?27,
                    vol_perdido_formacion_hoy=?28, vol_perdido_formacion_acum=?29,
                    vol_perdido_permeabilidad=?30, vol_perdido_permeabilidad_acum=?31,
                    vol_descartado=?32, vol_entrampado=?33,
                    vol_perdido_superficie=?34, vol_perdido_superficie_acum=?35,
                    vol_otras_perdidas=?36, vol_total_perdido_hoy=?37, vol_total_perdido_acum=?38,
                    vol_inicial_diario=?39, vol_final_diario=?40,
                    updated_at=?41
                 WHERE fluid_report_id=?42",
                params![
                    &data.vol_cap_sarta, &data.vol_desp_sarta, &data.vol_revestidor,
                    &data.vol_hoyo_desnudo, &data.vol_pozo_sin_tuberia, &data.vol_pozo_con_tuberia,
                    &data.vol_sistema_activo, &data.vol_sistema_reserva, &data.vol_sistema_contingencia,
                    &data.vol_hoyo_abandonado,
                    &data.vol_agua_agregado_hoy, &data.vol_agua_agregado_acum,
                    &data.vol_productos_hoy, &data.vol_productos_acum, &data.vol_aceite_acum,
                    &data.vol_recibido_hoy, &data.vol_recibido_acum,
                    &data.vol_procesado_hoy, &data.vol_procesado_acum,
                    &data.vol_manejado_hoy, &data.vol_total_agregado_hoy, &data.vol_total_agregado_acum,
                    &data.vol_transferido_fuera,
                    &data.vol_perdido_ecs, &data.vol_perdido_ecs_acum,
                    &data.vol_perdido_humectacion, &data.vol_perdido_humectacion_acum,
                    &data.vol_perdido_formacion_hoy, &data.vol_perdido_formacion_acum,
                    &data.vol_perdido_permeabilidad, &data.vol_perdido_permeabilidad_acum,
                    &data.vol_descartado, &data.vol_entrampado,
                    &data.vol_perdido_superficie, &data.vol_perdido_superficie_acum,
                    &data.vol_otras_perdidas, &data.vol_total_perdido_hoy, &data.vol_total_perdido_acum,
                    &data.vol_inicial_diario, &data.vol_final_diario,
                    &now, fluid_report_id
                ],
            )?;
        }

        Self::get_by_fluid_report(conn, fluid_report_id)
    }
}
