use crate::sync::turso_client::TursoValue;
use crate::sync::sync_client::{CellValue, SyncClient, TablePayload};
use rusqlite::Connection;
use serde::{Deserialize, Serialize};
use std::collections::HashSet;

/// Tables to sync, in dependency order (parents first)
const SYNC_TABLES: &[TableDef] = &[
    TableDef {
        name: "app_settings",
        columns: &[
            "id", "primary_color", "secondary_color", "logo_path",
            "notification_retention_days", "created_at", "updated_at",
        ],
        id_col: "id",
        has_updated_at: true,
        parent_col: None,
        skip_cleanup: false,
    },
    TableDef {
        name: "users",
        columns: &[
            "id", "username", "password_hash", "full_name", "ci", "role",
            "position", "active", "has_all_rigs", "supervisor_id", "last_login", "created_by", "updated_by",
            "created_at", "updated_at", "is_deleted",
        ],
        id_col: "id",
        has_updated_at: true,
        parent_col: None,
        skip_cleanup: false,
    },
    TableDef {
        name: "operation_codes",
        columns: &[
            "id", "code", "name", "category", "sort_order", "active",
            "created_by", "updated_by", "created_at", "updated_at", "is_deleted",
        ],
        id_col: "id", has_updated_at: true, parent_col: None, skip_cleanup: false,
    },
    TableDef {
        name: "areas",
        columns: &[
            "id", "name", "country", "state", "active", "created_by",
            "updated_by", "created_at", "updated_at", "is_deleted",
        ],
        id_col: "id", has_updated_at: true, parent_col: None, skip_cleanup: false,
    },
    TableDef {
        name: "operators",
        columns: &["id", "name", "logo_path", "active", "created_at", "updated_at", "is_deleted"],
        id_col: "id", has_updated_at: true, parent_col: None, skip_cleanup: false,
    },
    TableDef {
        name: "rigs",
        columns: &[
            "id", "name", "operator", "power", "area_id", "active",
            "created_by", "updated_by", "created_at", "updated_at", "is_deleted",
        ],
        id_col: "id", has_updated_at: true, parent_col: None, skip_cleanup: false,
    },
    TableDef {
        name: "rig_personnel",
        columns: &["id", "rig_id", "name", "ci", "default_position", "active", "is_deleted", "created_at", "updated_at"],
        // skip_cleanup: true because rig_personnel has soft-delete. Deletions are
        // propagated via is_deleted=1 UPSERT; cleanup+incremental would wipe
        // unmodified personnel that weren't included in the delta batch.
        id_col: "id", has_updated_at: true, parent_col: Some("rig_id"), skip_cleanup: true,
    },
    TableDef {
        name: "user_rigs",
        columns: &["id", "user_id", "rig_id", "assigned_by", "assigned_at", "created_at", "updated_at"],
        id_col: "id", has_updated_at: true, parent_col: None, skip_cleanup: false,
    },
    TableDef {
        name: "user_module_permissions",
        columns: &["id", "user_id", "module", "granted", "assigned_by", "created_at", "updated_at"],
        id_col: "id", has_updated_at: true, parent_col: None, skip_cleanup: false,
    },
    TableDef {
        name: "reports",
        columns: &[
            "id", "report_number", "report_date", "well_number", "api_number",
            "contract", "contractor", "operator", "field_district", "municipality",
            "rig_number", "company", "supervisor_24h", "status", "created_by",
            "approved_by", "submitted_at", "approved_at", "rejected_at",
            "rejection_reason", "created_at", "updated_at", "synced", "is_deleted",
        ],
        id_col: "id", has_updated_at: true, parent_col: None, skip_cleanup: false,
    },
    TableDef {
        name: "drill_string_components",
        columns: &["id", "report_id", "entry_number", "piece_name", "length", "created_at", "updated_at"],
        id_col: "id", has_updated_at: true, parent_col: Some("report_id"), skip_cleanup: false,
    },
    TableDef {
        name: "crew_shifts",
        columns: &["id", "report_id", "shift", "shift_start", "shift_end", "created_at", "updated_at"],
        id_col: "id", has_updated_at: true, parent_col: Some("report_id"), skip_cleanup: false,
    },
    TableDef {
        name: "crew_members",
        columns: &["id", "crew_shift_id", "personnel_id", "position", "ci", "name", "hours", "created_at", "updated_at"],
        id_col: "id", has_updated_at: true, parent_col: Some("crew_shift_id"), skip_cleanup: false,
    },
    TableDef {
        name: "time_distribution",
        columns: &["id", "report_id", "operation_code_id", "hours_shift1", "hours_shift2", "hours_shift3", "created_at", "updated_at"],
        id_col: "id", has_updated_at: true, parent_col: Some("report_id"), skip_cleanup: false,
    },
    TableDef {
        name: "bit_records",
        columns: &["id", "report_id", "shift", "size", "manufacturer_code", "brand", "bit_type", "serial_number", "jets", "tfa", "depth_out", "depth_in", "footage", "hours_total", "dp_tubos", "kelly", "created_at", "updated_at"],
        id_col: "id", has_updated_at: true, parent_col: Some("report_id"), skip_cleanup: false,
    },
    TableDef {
        name: "mud_records",
        columns: &["id", "report_id", "shift", "hour", "weight", "viscosity", "pvp", "gels", "filtrate", "ph", "solids", "created_at", "updated_at"],
        id_col: "id", has_updated_at: true, parent_col: Some("report_id"), skip_cleanup: false,
    },
    TableDef {
        name: "mud_additives",
        columns: &["id", "report_id", "shift", "additive_type", "quantity", "created_at", "updated_at"],
        id_col: "id", has_updated_at: true, parent_col: Some("report_id"), skip_cleanup: false,
    },
    TableDef {
        name: "drilling_parameters",
        columns: &["id", "report_id", "shift", "depth_from", "depth_to", "core_number", "rotary_rpm", "bit_weight", "pump_pressure", "pump_number", "pump_liner", "pump_spm", "total_gpm", "method_used", "lithology_notes", "created_at", "updated_at"],
        id_col: "id", has_updated_at: true, parent_col: Some("report_id"), skip_cleanup: false,
    },
    TableDef {
        name: "deviation_history",
        columns: &["id", "report_id", "depth", "deviation", "direction", "tvo", "horizontal_displacement", "created_at", "updated_at"],
        id_col: "id", has_updated_at: true, parent_col: Some("report_id"), skip_cleanup: false,
    },
    TableDef {
        name: "operations_log",
        columns: &["id", "report_id", "shift", "time_from", "time_to", "duration", "operation_code", "details", "created_at", "updated_at"],
        id_col: "id", has_updated_at: true, parent_col: Some("report_id"), skip_cleanup: false,
    },
    TableDef {
        name: "report_reviews",
        columns: &["id", "report_id", "reviewer_id", "action", "comment", "previous_status", "new_status", "created_at", "updated_at", "is_deleted"],
        id_col: "id", has_updated_at: true, parent_col: Some("report_id"), skip_cleanup: true,
    },
    TableDef {
        name: "user_preferences",
        columns: &["id", "user_id", "theme_mode", "created_at", "updated_at"],
        id_col: "id", has_updated_at: true, parent_col: None, skip_cleanup: false,
    },
    // Logistics
    TableDef {
        name: "logistics_materials",
        columns: &["id", "name", "unit", "description", "active", "created_by", "created_at", "updated_at", "is_deleted"],
        id_col: "id", has_updated_at: true, parent_col: None, skip_cleanup: false,
    },
    TableDef {
        name: "logistics_water_bottles_movements",
        columns: &["id", "rig_id", "movement_type", "quantity", "notes", "created_by", "created_at", "updated_at", "is_deleted"],
        id_col: "id", has_updated_at: true, parent_col: None, skip_cleanup: false,
    },
    TableDef {
        name: "logistics_fuel_movements",
        columns: &["id", "rig_id", "movement_type", "amount", "notes", "created_by", "created_at", "updated_at", "is_deleted"],
        id_col: "id", has_updated_at: true, parent_col: None, skip_cleanup: false,
    },
    TableDef {
        name: "logistics_vacuum_actions",
        columns: &["id", "rig_id", "action_name", "notes", "created_by", "created_at", "updated_at", "is_deleted"],
        id_col: "id", has_updated_at: true, parent_col: None, skip_cleanup: false,
    },
    TableDef {
        name: "logistics_materials_movements",
        columns: &["id", "rig_id", "material_id", "movement_type", "quantity", "notes", "created_by", "created_at", "updated_at", "is_deleted"],
        // skip_cleanup: true — same reason as rig_personnel (has soft-delete, append-only movements)
        id_col: "id", has_updated_at: true, parent_col: Some("material_id"), skip_cleanup: true,
    },
    TableDef {
        name: "logistics_requests",
        columns: &["id", "rig_id", "request_type", "quantity", "action_requested", "material_id", "status", "notes", "requested_by", "status_changed_by", "requested_at", "status_changed_at", "created_at", "updated_at", "is_deleted"],
        id_col: "id", has_updated_at: true, parent_col: None, skip_cleanup: false,
    },
    // Incidents
    TableDef {
        name: "incident_types",
        columns: &["id", "name", "color", "sort_order", "created_by", "created_at", "updated_at", "is_deleted"],
        id_col: "id", has_updated_at: true, parent_col: None, skip_cleanup: false,
    },
    TableDef {
        name: "incidents",
        columns: &["id", "rig_id", "incident_type", "description", "created_by", "created_at", "updated_at", "is_deleted"],
        id_col: "id", has_updated_at: true, parent_col: None, skip_cleanup: false,
    },
    TableDef {
        name: "incident_personnel",
        columns: &["id", "incident_id", "personnel_id", "created_at", "updated_at"],
        id_col: "id", has_updated_at: true, parent_col: Some("incident_id"), skip_cleanup: false,
    },
    // Snapshots + Notifications
    TableDef {
        name: "last_report_snapshot",
        columns: &["id", "rig_id", "report_number", "well_number", "api_number", "contract", "contractor", "operator", "field_district", "municipality", "rig_number", "company", "supervisor_24h", "crew_data", "time_distribution_data", "bit_records_data", "mud_records_data", "mud_additives_data", "drilling_params_data", "deviation_data", "operations_log_data", "drill_string_data", "source_report_id", "updated_by", "updated_at"],
        id_col: "id", has_updated_at: true, parent_col: None, skip_cleanup: false,
    },
    TableDef {
        name: "notifications",
        columns: &["id", "recipient_id", "actor_id", "actor_name", "category", "action_type", "title", "message", "reference_id", "reference_type", "rig_id", "rig_name", "is_read", "read_at", "created_at", "updated_at", "is_deleted"],
        id_col: "id", has_updated_at: true, parent_col: None, skip_cleanup: false,
    },
];

struct TableDef {
    name: &'static str,
    columns: &'static [&'static str],
    id_col: &'static str,
    has_updated_at: bool,
    parent_col: Option<&'static str>,
    skip_cleanup: bool,
}

/// Data extracted from a single table for sync
pub struct TableData {
    pub table_index: usize,
    pub rows: Vec<Vec<TursoValue>>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SyncResult {
    pub success: bool,
    pub tables_synced: u32,
    pub records_pushed: u32,
    pub records_pulled: u32,
    pub errors: Vec<String>,
    pub timestamp: String,
}

// =============================================================================
// HELPERS: Parent ID collection + child cleanup (local SQLite)
// =============================================================================

fn collect_parent_ids_from_indexed(table_results: &[(usize, Vec<Vec<TursoValue>>)]) -> std::collections::HashMap<&'static str, HashSet<String>> {
    let mut parent_map: std::collections::HashMap<&'static str, HashSet<String>> = std::collections::HashMap::new();
    for (idx, rows) in table_results {
        let table_def = &SYNC_TABLES[*idx];
        if let Some(parent_col) = table_def.parent_col {
            if let Some(col_idx) = table_def.columns.iter().position(|c| *c == parent_col) {
                for row in rows {
                    if let Some(TursoValue::Text(val)) = row.get(col_idx) {
                        parent_map.entry(parent_col).or_default().insert(val.clone());
                    }
                }
            }
        }
    }
    parent_map
}

fn cleanup_local_child_rows(
    conn: &Connection,
    parent_map: &std::collections::HashMap<&str, HashSet<String>>,
    tables_in_batch: &HashSet<&str>,
) -> Result<(), String> {
    for (parent_col, parent_ids) in parent_map {
        if parent_ids.is_empty() { continue; }

        let placeholders: String = parent_ids.iter().enumerate()
            .map(|(i, _)| format!("?{}", i + 1)).collect::<Vec<_>>().join(", ");
        let ids: Vec<&str> = parent_ids.iter().map(|s| s.as_str()).collect();

        // crew_members grandchild
        if *parent_col == "report_id" && tables_in_batch.contains("crew_shifts") {
            let sql = format!(
                "DELETE FROM crew_members WHERE crew_shift_id IN (SELECT id FROM crew_shifts WHERE report_id IN ({}))",
                placeholders
            );
            conn.execute(&sql, rusqlite::params_from_iter(ids.iter()))
                .map_err(|e| format!("Failed to cleanup crew_members: {}", e))?;
        }

        for table_def in SYNC_TABLES.iter() {
            if table_def.parent_col == Some(parent_col) && tables_in_batch.contains(table_def.name) && !table_def.skip_cleanup {
                let sql = format!("DELETE FROM {} WHERE {} IN ({})", table_def.name, parent_col, placeholders);
                conn.execute(&sql, rusqlite::params_from_iter(ids.iter()))
                    .map_err(|e| format!("Failed to cleanup {}: {}", table_def.name, e))?;
            }
        }
    }
    Ok(())
}

// =============================================================================
// SYNCHRONOUS: Read/Write local SQLite
// =============================================================================

/// Read all table data from local SQLite for push
pub fn read_all_local_data(
    conn: &Connection,
    last_sync_at: Option<&str>,
) -> Result<Vec<TableData>, String> {
    let mut all_data = Vec::new();
    for (idx, table_def) in SYNC_TABLES.iter().enumerate() {
        let rows = read_local_table(conn, table_def, last_sync_at)
            .map_err(|e| format!("Error reading '{}': {}", table_def.name, e))?;
        all_data.push(TableData { table_index: idx, rows });
    }
    Ok(all_data)
}

fn read_local_table(
    conn: &Connection,
    table_def: &TableDef,
    last_sync_at: Option<&str>,
) -> Result<Vec<Vec<TursoValue>>, String> {
    let columns_str = table_def.columns.join(", ");
    let col_count = table_def.columns.len();

    let query = match last_sync_at {
        Some(_) if table_def.has_updated_at => format!("SELECT {} FROM {} WHERE updated_at > ?1", columns_str, table_def.name),
        Some(_) => format!("SELECT {} FROM {} WHERE created_at > ?1", columns_str, table_def.name),
        None => format!("SELECT {} FROM {}", columns_str, table_def.name),
    };

    let read_row = |row: &rusqlite::Row| -> Result<Vec<TursoValue>, rusqlite::Error> {
        let mut values = Vec::with_capacity(col_count);
        for i in 0..col_count {
            let val: rusqlite::Result<Option<String>> = row.get(i);
            match val {
                Ok(Some(s)) => values.push(TursoValue::Text(s)),
                Ok(None) => values.push(TursoValue::Null),
                Err(_) => {
                    let int_val: rusqlite::Result<Option<i64>> = row.get(i);
                    match int_val {
                        Ok(Some(i)) => values.push(TursoValue::Integer(i.to_string())),
                        Ok(None) => values.push(TursoValue::Null),
                        Err(_) => {
                            let float_val: rusqlite::Result<Option<f64>> = row.get(i);
                            match float_val {
                                Ok(Some(f)) => values.push(TursoValue::Float(f)),
                                _ => values.push(TursoValue::Null),
                            }
                        }
                    }
                }
            }
        }
        Ok(values)
    };

    let mut stmt = conn.prepare(&query).map_err(|e| format!("Prepare failed: {}", e))?;
    let rows = if let Some(since) = last_sync_at {
        stmt.query_map(rusqlite::params![since], read_row)
    } else {
        stmt.query_map([], read_row)
    }.map_err(|e| format!("Query failed: {}", e))?
     .collect::<Result<Vec<_>, _>>()
     .map_err(|e| format!("Row read failed: {}", e))?;

    Ok(rows)
}

/// Mark all reports as synced
pub fn mark_reports_synced(conn: &Connection) {
    let _ = conn.execute("UPDATE reports SET synced = 1 WHERE synced = 0", []);
}

/// Write pulled data to local SQLite
pub fn write_pulled_data(
    conn: &Connection,
    table_results: &[(usize, Vec<Vec<TursoValue>>)],
) -> Result<u32, String> {
    conn.execute("PRAGMA foreign_keys = OFF", [])
        .map_err(|e| format!("Failed to disable foreign keys: {}", e))?;

    let parent_map = collect_parent_ids_from_indexed(table_results);
    let tables_in_batch: HashSet<&str> = table_results.iter()
        .filter(|(_, rows)| !rows.is_empty())
        .map(|(idx, _)| SYNC_TABLES[*idx].name)
        .collect();
    cleanup_local_child_rows(conn, &parent_map, &tables_in_batch)?;

    let mut total: u32 = 0;

    for (idx, rows) in table_results {
        let table_def = &SYNC_TABLES[*idx];
        if rows.is_empty() { continue; }

        let columns_str = table_def.columns.join(", ");
        let placeholders: String = (1..=table_def.columns.len()).map(|i| format!("?{}", i)).collect::<Vec<_>>().join(", ");

        let update_cols: Vec<String> = table_def.columns.iter()
            .filter(|c| **c != table_def.id_col)
            .map(|c| {
                if *c == "is_deleted" {
                    format!("is_deleted = MAX(COALESCE({}.is_deleted, 0), COALESCE(excluded.is_deleted, 0))", table_def.name)
                } else {
                    format!("{} = excluded.{}", c, c)
                }
            }).collect();

        let upsert_sql = format!(
            "INSERT INTO {} ({}) VALUES ({}) ON CONFLICT ({}) DO UPDATE SET {}",
            table_def.name, columns_str, placeholders, table_def.id_col, update_cols.join(", ")
        );

        for row in rows {
            let params = turso_row_to_rusqlite_params(row);
            let params_refs: Vec<&dyn rusqlite::ToSql> = params.iter().map(|p| p.as_ref()).collect();

            // UNIQUE conflict handling
            if table_def.name == "users" {
                if let Some(username_param) = params.get(1) {
                    let _ = conn.execute("DELETE FROM users WHERE username = ?1 AND id != ?2", rusqlite::params![username_param, params.get(0)]);
                }
            } else if table_def.name == "user_rigs" && params.len() >= 3 {
                let _ = conn.execute("DELETE FROM user_rigs WHERE user_id = ?1 AND rig_id = ?2 AND id != ?3", rusqlite::params![params.get(1), params.get(2), params.get(0)]);
            } else if table_def.name == "user_module_permissions" && params.len() >= 3 {
                let _ = conn.execute("DELETE FROM user_module_permissions WHERE user_id = ?1 AND module = ?2 AND id != ?3", rusqlite::params![params.get(1), params.get(2), params.get(0)]);
            } else if table_def.name == "last_report_snapshot" && params.len() >= 2 {
                let _ = conn.execute("DELETE FROM last_report_snapshot WHERE rig_id = ?1 AND id != ?2", rusqlite::params![params.get(1), params.get(0)]);
            }

            conn.execute(&upsert_sql, params_refs.as_slice())
                .map_err(|e| format!("Failed to upsert into '{}': {}", table_def.name, e))?;
            total += 1;
        }
    }

    conn.execute("PRAGMA foreign_keys = ON", [])
        .map_err(|e| format!("Failed to re-enable foreign keys: {}", e))?;
    Ok(total)
}

// =============================================================================
// UTILITY: TursoValue -> rusqlite params
// =============================================================================


fn turso_row_to_rusqlite_params(row: &[TursoValue]) -> Vec<Box<dyn rusqlite::ToSql>> {
    row.iter()
        .map(|val| -> Box<dyn rusqlite::ToSql> {
            match val {
                TursoValue::Text(s) => Box::new(s.clone()),
                TursoValue::Integer(s) => {
                    if let Ok(i) = s.parse::<i64>() {
                        Box::new(i)
                    } else {
                        Box::new(s.clone())
                    }
                }
                TursoValue::Float(f) => Box::new(*f),
                TursoValue::Null => Box::new(None::<String>),
            }
        })
        .collect()
}

/// Recalculate logistics_stock cache from movement tables (idempotent).
pub fn recalculate_logistics_stock(conn: &Connection) -> Result<(), String> {
    conn.execute("DELETE FROM logistics_stock", [])
        .map_err(|e| format!("Failed to clear logistics_stock: {}", e))?;

    conn.execute(
        "INSERT INTO logistics_stock (rig_id, category, quantity, updated_at)
         SELECT rig_id, 'water_bottles',
                SUM(CASE WHEN movement_type = 'entry' THEN quantity ELSE -quantity END),
                datetime('now')
         FROM logistics_water_bottles_movements
         WHERE rig_id IS NOT NULL AND is_deleted = 0
         GROUP BY rig_id", [],
    ).map_err(|e| format!("Failed to recalculate water_bottles stock: {}", e))?;

    conn.execute(
        "INSERT INTO logistics_stock (rig_id, category, quantity, updated_at)
         SELECT rig_id, 'fuel',
                SUM(CASE WHEN movement_type = 'entry' THEN amount ELSE -amount END),
                datetime('now')
         FROM logistics_fuel_movements
         WHERE rig_id IS NOT NULL AND is_deleted = 0
         GROUP BY rig_id", [],
    ).map_err(|e| format!("Failed to recalculate fuel stock: {}", e))?;

    conn.execute(
        "INSERT INTO logistics_stock (rig_id, category, quantity, updated_at)
         SELECT rig_id, 'material:' || material_id,
                SUM(CASE WHEN movement_type = 'entry' THEN quantity ELSE -quantity END),
                datetime('now')
         FROM logistics_materials_movements
         WHERE rig_id IS NOT NULL AND is_deleted = 0
         GROUP BY rig_id, material_id", [],
    ).map_err(|e| format!("Failed to recalculate materials stock: {}", e))?;

    println!("[Sync] Logistics stock cache recalculated");
    Ok(())
}

/// Reconcile: remove local records not in remote (full sync only).
pub fn reconcile_local_with_remote(
    conn: &Connection,
    pulled_data: &[(usize, Vec<Vec<TursoValue>>)],
) -> Result<u32, String> {
    conn.execute("PRAGMA foreign_keys = OFF", [])
        .map_err(|e| format!("Failed to disable FK: {}", e))?;

    let mut total_deleted: u32 = 0;

    for (idx, rows) in pulled_data {
        let table_def = &SYNC_TABLES[*idx];
        let id_col_idx = table_def.columns.iter().position(|c| *c == table_def.id_col).unwrap_or(0);

        let pulled_ids: Vec<String> = rows.iter()
            .filter_map(|row| match row.get(id_col_idx) {
                Some(TursoValue::Text(id)) => Some(id.clone()),
                Some(TursoValue::Integer(id)) => Some(id.clone()),
                _ => None,
            }).collect();

        if pulled_ids.is_empty() { continue; }

        let placeholders: String = (1..=pulled_ids.len()).map(|i| format!("?{}", i)).collect::<Vec<_>>().join(", ");
        let sql = format!("DELETE FROM {} WHERE {} NOT IN ({})", table_def.name, table_def.id_col, placeholders);
        let params: Vec<Box<dyn rusqlite::ToSql>> = pulled_ids.iter().map(|id| Box::new(id.clone()) as Box<dyn rusqlite::ToSql>).collect();
        let param_refs: Vec<&dyn rusqlite::ToSql> = params.iter().map(|p| p.as_ref()).collect();

        match conn.execute(&sql, param_refs.as_slice()) {
            Ok(count) if count > 0 => {
                println!("[Sync] Reconciled '{}': removed {} stale local records", table_def.name, count);
                total_deleted += count as u32;
            }
            Err(e) => println!("[Sync] Warning: reconcile '{}' failed: {}", table_def.name, e),
            _ => {}
        }
    }

    conn.execute("PRAGMA foreign_keys = ON", []).map_err(|e| format!("Failed to re-enable FK: {}", e))?;
    Ok(total_deleted)
}

/// Purge soft-deleted records from local SQLite older than retention_days.
pub fn purge_local_soft_deleted(conn: &Connection, retention_days: i64) -> Result<u32, String> {
    let threshold = chrono::Utc::now() - chrono::Duration::days(retention_days);
    let threshold_str = threshold.to_rfc3339();

    conn.execute("PRAGMA foreign_keys = OFF", []).map_err(|e| format!("Failed to disable FK: {}", e))?;
    let mut total_purged: u32 = 0;

    // Helper: collect IDs of soft-deleted rows older than threshold
    let collect_ids = |table: &str| -> Result<Vec<String>, String> {
        let sql = format!("SELECT id FROM {} WHERE is_deleted = 1 AND updated_at < ?1", table);
        let mut stmt = conn.prepare(&sql).map_err(|e| format!("{e}"))?;
        let rows = stmt.query_map(rusqlite::params![&threshold_str], |row| row.get(0))
            .map_err(|e| format!("{e}"))?;
        let ids: Vec<String> = rows.collect::<Result<Vec<_>, _>>().map_err(|e| format!("{e}"))?;
        Ok(ids)
    };

    // Helper: delete by IDs
    let delete_by_ids = |sql_template: &str, ids: &[String]| -> u32 {
        if ids.is_empty() { return 0; }
        let ph: String = ids.iter().enumerate().map(|(i, _)| format!("?{}", i + 1)).collect::<Vec<_>>().join(", ");
        let sql = sql_template.replace("{PH}", &ph);
        let params: Vec<&dyn rusqlite::ToSql> = ids.iter().map(|id| id as &dyn rusqlite::ToSql).collect();
        conn.execute(&sql, params.as_slice()).unwrap_or(0) as u32
    };

    // 1. Reports cascade
    let report_ids = collect_ids("reports")?;
    if !report_ids.is_empty() {
        total_purged += delete_by_ids("DELETE FROM crew_members WHERE crew_shift_id IN (SELECT id FROM crew_shifts WHERE report_id IN ({PH}))", &report_ids);
        for child in &["drill_string_components","crew_shifts","time_distribution","bit_records","mud_records","mud_additives","drilling_parameters","deviation_history","operations_log","report_reviews"] {
            total_purged += delete_by_ids(&format!("DELETE FROM {} WHERE report_id IN ({{PH}})", child), &report_ids);
        }
        total_purged += delete_by_ids("DELETE FROM reports WHERE id IN ({PH})", &report_ids);
    }

    // 2. Users cascade
    let user_ids = collect_ids("users")?;
    if !user_ids.is_empty() {
        for child in &["user_rigs", "user_module_permissions", "user_preferences"] {
            delete_by_ids(&format!("DELETE FROM {} WHERE user_id IN ({{PH}})", child), &user_ids);
        }
        total_purged += delete_by_ids("DELETE FROM users WHERE id IN ({PH})", &user_ids);
    }

    // 3. Rigs cascade
    let rig_ids = collect_ids("rigs")?;
    if !rig_ids.is_empty() {
        for child in &["user_rigs", "rig_personnel"] {
            delete_by_ids(&format!("DELETE FROM {} WHERE rig_id IN ({{PH}})", child), &rig_ids);
        }
        total_purged += delete_by_ids("DELETE FROM rigs WHERE id IN ({PH})", &rig_ids);
    }

    // 4. Incidents cascade
    let incident_ids = collect_ids("incidents")?;
    if !incident_ids.is_empty() {
        delete_by_ids("DELETE FROM incident_personnel WHERE incident_id IN ({PH})", &incident_ids);
        total_purged += delete_by_ids("DELETE FROM incidents WHERE id IN ({PH})", &incident_ids);
    }

    // 5. Simple tables with soft-delete
    for table in &["areas", "operators", "rig_personnel", "operation_codes", "incident_types",
                    "logistics_materials_movements", "logistics_materials",
                    "logistics_water_bottles_movements", "logistics_fuel_movements",
                    "logistics_vacuum_actions", "logistics_requests", "notifications"] {
        let sql = format!("DELETE FROM {} WHERE is_deleted = 1 AND updated_at < ?1", table);
        if let Ok(c) = conn.execute(&sql, rusqlite::params![&threshold_str]) { total_purged += c as u32; }
    }

    conn.execute("PRAGMA foreign_keys = ON", []).map_err(|e| format!("Failed to re-enable FK: {}", e))?;
    if total_purged > 0 { println!("[Sync] Local purge: {} records removed", total_purged); }
    Ok(total_purged)
}

// =============================================================================
// ASYNC: Push/Pull via planner-sync REST API
// =============================================================================

/// Convert local TableData to TablePayload for sync_client push.
fn table_data_to_payloads(table_data: Vec<TableData>) -> Vec<TablePayload> {
    table_data.into_iter()
        .filter(|d| !d.rows.is_empty())
        .map(|d| {
            let table_def = &SYNC_TABLES[d.table_index];
            TablePayload {
                name: table_def.name.to_string(),
                columns: table_def.columns.iter().map(|c| c.to_string()).collect(),
                rows: d.rows.iter().map(|row| row.iter().map(CellValue::from).collect()).collect(),
            }
        }).collect()
}

/// Push pre-read data to planner-sync server.
pub async fn push_data_to_server(
    client: &SyncClient,
    table_data: Vec<TableData>,
) -> Result<SyncResult, String> {
    let now = chrono::Utc::now().to_rfc3339();
    let payloads = table_data_to_payloads(table_data);

    if payloads.is_empty() {
        return Ok(SyncResult {
            success: true, tables_synced: 0, records_pushed: 0, records_pulled: 0,
            errors: vec![], timestamp: now,
        });
    }

    let result = client.push(payloads).await?;

    Ok(SyncResult {
        success: result.success,
        tables_synced: result.tables_synced,
        records_pushed: result.records_pushed,
        records_pulled: 0,
        errors: result.errors,
        timestamp: result.timestamp,
    })
}

/// Pull data from planner-sync server, returns data to be written locally.
pub async fn pull_data_from_server(
    client: &SyncClient,
    last_sync_at: Option<&str>,
) -> Result<(Vec<(usize, Vec<Vec<TursoValue>>)>, SyncResult), String> {
    let pull_resp = client.pull(last_sync_at).await?;

    let mut pulled_data: Vec<(usize, Vec<Vec<TursoValue>>)> = Vec::new();

    for table_payload in &pull_resp.tables {
        // Find matching table index in SYNC_TABLES
        if let Some(idx) = SYNC_TABLES.iter().position(|t| t.name == table_payload.name) {
            let rows: Vec<Vec<TursoValue>> = table_payload.rows.iter()
                .map(|row| row.iter().map(TursoValue::from).collect())
                .collect();
            if !rows.is_empty() {
                println!("[Sync] Pulled {} records for '{}'", rows.len(), table_payload.name);
                pulled_data.push((idx, rows));
            }
        } else {
            println!("[Sync] Warning: server returned unknown table '{}'", table_payload.name);
        }
    }

    let result = SyncResult {
        success: true,
        tables_synced: pulled_data.len() as u32,
        records_pushed: 0,
        records_pulled: pull_resp.records_pulled,
        errors: vec![],
        timestamp: pull_resp.timestamp,
    };

    Ok((pulled_data, result))
}
