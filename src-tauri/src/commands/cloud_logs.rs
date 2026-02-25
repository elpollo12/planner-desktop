use crate::auth::get_session;
use crate::models::user::User;
use crate::state::AppState;
use crate::sync::config::TursoCredentials;
use crate::sync::turso_client::{TursoClient, TursoValue};
use serde::{Deserialize, Serialize};
use tauri::State;

#[derive(Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct DailyReport {
    pub id: i64,
    pub taladro: String,
    pub fecha: Option<String>,
    pub rop: Option<f64>,
    pub wob: Option<f64>,
    pub rpm: Option<f64>,
    pub profundidad: Option<f64>,
    pub npt_horas: Option<f64>,
    pub npt_causa: Option<String>,
    pub actividad: Option<String>,
    pub observaciones: Option<String>,
    pub message_id: Option<i64>,
    pub created_at: Option<String>,
}

#[derive(Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct DailyReportsPage {
    pub reports: Vec<DailyReport>,
    pub total: u32,
    pub page: u32,
    pub page_size: u32,
}

#[derive(Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct MessageDetail {
    pub id: i64,
    pub from_number: Option<String>,
    pub group_name: Option<String>,
    pub message: Option<String>,
    pub message_type: Option<String>,
    pub raw_data: Option<String>,
    pub created_at: Option<String>,
}

fn get_opt_float(row: &[TursoValue], idx: usize) -> Option<f64> {
    match row.get(idx)? {
        TursoValue::Float(f) => Some(*f),
        TursoValue::Integer(s) => s.parse().ok(),
        TursoValue::Null | TursoValue::Text(_) => None,
    }
}

fn get_opt_int(row: &[TursoValue], idx: usize) -> Option<i64> {
    match row.get(idx)? {
        TursoValue::Integer(s) => s.parse().ok(),
        TursoValue::Float(f) => Some(*f as i64),
        TursoValue::Null | TursoValue::Text(_) => None,
    }
}

fn get_opt_str(row: &[TursoValue], idx: usize) -> Option<String> {
    match row.get(idx)? {
        TursoValue::Text(s) => Some(s.clone()),
        TursoValue::Null => None,
        _ => None,
    }
}

/// Lista los registros diarios de Turso filtrados por taladro y rango de fechas.
/// Acceso restringido: solo taladros asignados al usuario (o todos si has_all_rigs).
#[tauri::command]
pub async fn list_daily_reports(
    session_token: String,
    taladro: String,
    date_from: Option<String>,
    date_to: Option<String>,
    page: Option<u32>,
    page_size: Option<u32>,
    state: State<'_, AppState>,
) -> Result<DailyReportsPage, String> {
    let session = get_session(&session_token, &state).map_err(|e| e.to_string())?;

    let page = page.unwrap_or(1).max(1);
    let page_size = page_size.unwrap_or(10).clamp(1, 100);
    let offset = (page - 1) * page_size;

    // Verificar acceso al taladro consultando la DB local
    {
        let conn = state.db.lock().map_err(|e| format!("DB lock error: {}", e))?;
        let rig_ids = User::get_accessible_rig_ids(&conn, &session.user_id)
            .map_err(|e| e.to_string())?;

        // Some(ids) = acceso restringido, None = acceso total (admin / has_all_rigs)
        if let Some(rig_ids) = rig_ids {
            if rig_ids.is_empty() {
                return Err("No tienes acceso a este taladro".to_string());
            }
            let rig_names = User::get_rig_names_by_ids(&conn, &rig_ids)
                .map_err(|e| e.to_string())?;
            let has_access = rig_names
                .iter()
                .any(|n| n.to_lowercase() == taladro.to_lowercase());
            if !has_access {
                return Err("No tienes acceso a este taladro".to_string());
            }
        }
    }

    let creds = TursoCredentials::from_env()?;
    let client = TursoClient::new(&creds.database_url, &creds.auth_token);

    let args = vec![
        TursoValue::text(&taladro),
        date_from.as_deref().map(TursoValue::text).unwrap_or(TursoValue::null()),
        date_to.as_deref().map(TursoValue::text).unwrap_or(TursoValue::null()),
        TursoValue::integer(page_size as i64),
        TursoValue::integer(offset as i64),
    ];

    let count_args = vec![
        TursoValue::text(&taladro),
        date_from.as_deref().map(TursoValue::text).unwrap_or(TursoValue::null()),
        date_to.as_deref().map(TursoValue::text).unwrap_or(TursoValue::null()),
    ];

    let data_sql = "SELECT id, taladro, fecha, rop, wob, rpm, profundidad, \
                    npt_horas, npt_causa, actividad, observaciones, message_id, created_at \
                    FROM daily_reports \
                    WHERE taladro = ?1 \
                      AND (?2 IS NULL OR fecha >= ?2) \
                      AND (?3 IS NULL OR fecha <= ?3) \
                    ORDER BY created_at DESC \
                    LIMIT ?4 OFFSET ?5";

    let count_sql = "SELECT COUNT(*) FROM daily_reports \
                     WHERE taladro = ?1 \
                       AND (?2 IS NULL OR fecha >= ?2) \
                       AND (?3 IS NULL OR fecha <= ?3)";

    let data_result = client.execute(data_sql, args).await?;
    let count_result = client.execute(count_sql, count_args).await?;

    let total: u32 = count_result
        .rows
        .first()
        .and_then(|row| get_opt_int(row, 0))
        .unwrap_or(0) as u32;

    let reports = data_result
        .rows
        .into_iter()
        .map(|row| DailyReport {
            id: get_opt_int(&row, 0).unwrap_or(0),
            taladro: get_opt_str(&row, 1).unwrap_or_default(),
            fecha: get_opt_str(&row, 2),
            rop: get_opt_float(&row, 3),
            wob: get_opt_float(&row, 4),
            rpm: get_opt_float(&row, 5),
            profundidad: get_opt_float(&row, 6),
            npt_horas: get_opt_float(&row, 7),
            npt_causa: get_opt_str(&row, 8),
            actividad: get_opt_str(&row, 9),
            observaciones: get_opt_str(&row, 10),
            message_id: get_opt_int(&row, 11),
            created_at: get_opt_str(&row, 12),
        })
        .collect();

    Ok(DailyReportsPage { reports, total, page, page_size })
}

/// Obtiene el detalle del mensaje de Turso asociado a un registro diario.
#[tauri::command]
pub async fn get_message_detail(
    session_token: String,
    message_id: i64,
    state: State<'_, AppState>,
) -> Result<MessageDetail, String> {
    get_session(&session_token, &state).map_err(|e| e.to_string())?;

    let creds = TursoCredentials::from_env()?;
    let client = TursoClient::new(&creds.database_url, &creds.auth_token);

    let result = client
        .execute(
            "SELECT id, from_number, group_name, message, type, raw_data, created_at \
             FROM messages WHERE id = ?1",
            vec![TursoValue::integer(message_id)],
        )
        .await?;

    let row = result
        .rows
        .into_iter()
        .next()
        .ok_or_else(|| format!("Mensaje {} no encontrado", message_id))?;

    Ok(MessageDetail {
        id: get_opt_int(&row, 0).unwrap_or(message_id),
        from_number: get_opt_str(&row, 1),
        group_name: get_opt_str(&row, 2),
        message: get_opt_str(&row, 3),
        message_type: get_opt_str(&row, 4),
        raw_data: get_opt_str(&row, 5),
        created_at: get_opt_str(&row, 6),
    })
}
