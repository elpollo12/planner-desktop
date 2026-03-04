use crate::auth::get_session;
use crate::error::{AppError, Result};
use crate::models::rig_contractor::RigContractor;
use crate::models::user::{User, UserRole};
use crate::models::{
    CreateRigInput, RigContractorEntry, RigFull, RigWithArea,
    UpdateRigInput,
};
use crate::state::AppState;
use chrono::Utc;
use rusqlite::params;
use tauri::State;
use uuid::Uuid;

// ============================================================================
// Helpers
// ============================================================================

/// Build a RigWithArea from the DB row (columns 0-11)
fn row_to_rig_with_area(row: &rusqlite::Row) -> rusqlite::Result<RigWithArea> {
    Ok(RigWithArea {
        id: row.get(0)?,
        name: row.get(1)?,
        operator: row.get(2)?,
        operator_id: row.get(3)?,
        operator_name: row.get(4)?,
        power: row.get(5)?,
        area_id: row.get(6)?,
        area_name: row.get(7)?,
        area_country: row.get(8)?,
        area_state: row.get(9)?,
        active: row.get::<_, i32>(10)? == 1,
        created_at: row.get(11)?,
        updated_at: row.get(12)?,
    })
}

const RIG_SELECT: &str = "
    SELECT r.id, r.name, r.operator, r.operator_id, op.name,
           r.power, r.area_id, a.name, a.country, a.state,
           r.active, r.created_at, r.updated_at
    FROM rigs r
    LEFT JOIN areas a  ON a.id  = r.area_id
    LEFT JOIN companies op ON op.id = r.operator_id
";

/// Fetch contractors for a rig and attach them to a RigFull
fn attach_contractors(
    conn: &rusqlite::Connection,
    rig: RigWithArea,
) -> Result<RigFull> {
    let contractors = RigContractor::list_for_rig(conn, &rig.id)?
        .into_iter()
        .map(|rc| RigContractorEntry {
            rig_contractor_id: rc.id,
            company_id: rc.company_id,
            company_name: rc.company_name,
        })
        .collect();

    Ok(RigFull {
        id: rig.id,
        name: rig.name,
        operator: rig.operator,
        operator_id: rig.operator_id,
        operator_name: rig.operator_name,
        power: rig.power,
        area_id: rig.area_id,
        area_name: rig.area_name,
        area_country: rig.area_country,
        area_state: rig.area_state,
        active: rig.active,
        created_at: rig.created_at,
        updated_at: rig.updated_at,
        contractors,
    })
}

// ============================================================================
// Commands
// ============================================================================

/// Create a rig with its required area, operator and contractors.
/// contractor_ids must contain at least one entry.
#[tauri::command]
pub async fn create_rig(
    state: State<'_, AppState>,
    input: CreateRigInput,
    user_id: String,
) -> Result<RigFull> {
    // Validate required FK fields
    let area_id = input
        .area_id
        .as_deref()
        .filter(|s| !s.is_empty())
        .ok_or_else(|| AppError::ValidationError("El área es requerida".into()))?;

    let operator_id = input
        .operator_id
        .as_deref()
        .filter(|s| !s.is_empty())
        .ok_or_else(|| AppError::ValidationError("El operador es requerido".into()))?;

    let contractor_ids = input.contractor_ids.as_deref().unwrap_or(&[]);
    if contractor_ids.is_empty() {
        return Err(AppError::ValidationError(
            "Se requiere al menos un contratista".into(),
        ));
    }

    let conn = state.db.lock().unwrap();
    let id = Uuid::new_v4().to_string();
    let now = Utc::now().to_rfc3339();

    // Insert rig
    conn.execute(
        "INSERT INTO rigs (id, name, operator, operator_id, power, area_id, active, created_by, created_at, updated_at)
         VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10)",
        params![
            &id,
            &input.name,
            &input.operator,   // legacy text field
            operator_id,
            &input.power,
            area_id,
            input.active.unwrap_or(true) as i32,
            &user_id,
            &now,
            &now,
        ],
    )?;

    // Insert rig_contractors
    for company_id in contractor_ids {
        RigContractor::add(&conn, &id, company_id)?;
    }

    // Return full rig
    let rig = conn.query_row(
        &format!("{} WHERE r.id = ?1", RIG_SELECT),
        params![&id],
        row_to_rig_with_area,
    )?;

    attach_contractors(&conn, rig)
}

#[tauri::command]
pub async fn list_rigs(
    state: State<'_, AppState>,
    include_inactive: bool,
) -> Result<Vec<RigWithArea>> {
    let conn = state.db.lock().unwrap();

    let filter = if include_inactive {
        "WHERE (r.is_deleted IS NULL OR r.is_deleted = 0)"
    } else {
        "WHERE r.active = 1 AND (r.is_deleted IS NULL OR r.is_deleted = 0)"
    };

    let query = format!("{} {} ORDER BY r.name ASC", RIG_SELECT, filter);
    let mut stmt = conn.prepare(&query)?;
    let rigs = stmt
        .query_map([], row_to_rig_with_area)?
        .collect::<std::result::Result<Vec<_>, _>>()?;

    Ok(rigs)
}

/// Get a single rig with area + operator + contractors
#[tauri::command]
pub async fn get_rig(state: State<'_, AppState>, id: String) -> Result<RigFull> {
    let conn = state.db.lock().unwrap();

    let rig = conn.query_row(
        &format!(
            "{} WHERE r.id = ?1 AND (r.is_deleted IS NULL OR r.is_deleted = 0)",
            RIG_SELECT
        ),
        params![&id],
        row_to_rig_with_area,
    )?;

    attach_contractors(&conn, rig)
}

#[tauri::command]
pub async fn update_rig(
    state: State<'_, AppState>,
    id: String,
    input: UpdateRigInput,
    user_id: String,
) -> Result<RigFull> {
    // Execute the UPDATE inside a plain block so that Vec<rusqlite::types::Value>
    // (which is Send) is fully dropped before the .await below.
    let no_changes = {
        use rusqlite::types::Value;

        let conn = state.db.lock().unwrap();
        let now = Utc::now().to_rfc3339();

        // Build SET clauses and positional Value params in lockstep.
        let mut sets: Vec<String> = Vec::new();
        let mut vals: Vec<Value> = Vec::new();

        macro_rules! push {
            ($col:expr, $val:expr) => {{
                sets.push(format!("{} = ?{}", $col, sets.len() + 1));
                vals.push($val);
            }};
        }

        if let Some(ref v) = input.name        { push!("name",        Value::Text(v.clone())); }
        if let Some(ref v) = input.operator    { push!("operator",    Value::Text(v.clone())); }
        if let Some(ref v) = input.operator_id { push!("operator_id", Value::Text(v.clone())); }
        if let Some(ref v) = input.power       { push!("power",       Value::Text(v.clone())); }
        if let Some(ref v) = input.area_id     { push!("area_id",     Value::Text(v.clone())); }
        if let Some(active) = input.active     { push!("active",      Value::Integer(if active { 1 } else { 0 })); }

        if sets.is_empty() {
            true // no-op
        } else {
            let ub_pos = sets.len() + 1;
            let ua_pos = ub_pos + 1;
            let id_pos = ua_pos + 1;
            sets.push(format!("updated_by = ?{}", ub_pos));
            sets.push(format!("updated_at = ?{}", ua_pos));
            vals.push(Value::Text(user_id));
            vals.push(Value::Text(now));
            vals.push(Value::Text(id.clone()));

            let query = format!("UPDATE rigs SET {} WHERE id = ?{}", sets.join(", "), id_pos);
            let params_refs: Vec<&dyn rusqlite::ToSql> = vals.iter().map(|v| v as &dyn rusqlite::ToSql).collect();
            conn.execute(&query, params_refs.as_slice())?;
            false
        }
    }; // conn + vals dropped here — safe to .await

    if no_changes {
        return get_rig(state, id).await;
    }
    get_rig(state, id).await
}

#[tauri::command]
pub async fn delete_rig(state: State<'_, AppState>, id: String) -> Result<()> {
    let conn = state.db.lock().unwrap();
    let now = Utc::now().to_rfc3339();

    conn.execute(
        "UPDATE rigs SET is_deleted = 1, active = 0, updated_at = ?1 WHERE id = ?2",
        params![&now, &id],
    )?;

    Ok(())
}

/// Get rigs accessible by the current user based on their permissions.
/// Returns RigWithArea (without contractors) for list views.
#[tauri::command]
pub async fn list_accessible_rigs(
    session_token: String,
    state: State<'_, AppState>,
    include_inactive: bool,
) -> Result<Vec<RigWithArea>> {
    let session = get_session(&session_token, &state)?;
    let user_role = UserRole::from_str(&session.role)?;

    let accessible_rig_names = {
        let conn = state.db.lock().unwrap();
        if user_role == UserRole::Admin {
            None
        } else {
            let user = User::get_by_id(&conn, &session.user_id)?;
            if user.has_all_rigs {
                None
            } else {
                User::get_accessible_rig_names(&conn, &session.user_id)?
            }
        }
    };

    if accessible_rig_names.is_none() {
        return list_rigs(state, include_inactive).await;
    }

    let rig_names = accessible_rig_names.unwrap();
    let conn = state.db.lock().unwrap();

    let placeholders = rig_names
        .iter()
        .map(|_| "?")
        .collect::<Vec<_>>()
        .join(",");

    let active_filter = if include_inactive { "" } else { "AND r.active = 1" };

    let query = format!(
        "{} WHERE (r.is_deleted IS NULL OR r.is_deleted = 0) {} AND r.name IN ({}) ORDER BY r.name ASC",
        RIG_SELECT, active_filter, placeholders
    );

    let mut stmt = conn.prepare(&query)?;
    let params_refs: Vec<&dyn rusqlite::ToSql> = rig_names
        .iter()
        .map(|n| n as &dyn rusqlite::ToSql)
        .collect();

    let rigs = stmt
        .query_map(params_refs.as_slice(), row_to_rig_with_area)?
        .collect::<std::result::Result<Vec<_>, _>>()?;

    Ok(rigs)
}

/// Get full rig data including contractors — used by the wizard edit flow
#[tauri::command]
pub async fn get_rig_full(state: State<'_, AppState>, id: String) -> Result<RigFull> {
    get_rig(state, id).await
}
