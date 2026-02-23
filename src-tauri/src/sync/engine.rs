use crate::sync::turso_client::{TursoClient, TursoValue};
use rusqlite::Connection;
use serde::{Deserialize, Serialize};
use std::collections::HashSet;
use std::sync::atomic::{AtomicBool, Ordering};
use tokio::sync::Mutex as TokioMutex;

/// Whether initialization completed successfully (fast check, no lock needed)
static REMOTE_DB_INITIALIZED: AtomicBool = AtomicBool::new(false);

/// Mutex to serialize concurrent initialization attempts.
/// Only one task runs initialize_remote_db at a time; others wait.
static REMOTE_DB_INIT_LOCK: TokioMutex<()> = TokioMutex::const_new(());

/// Tables to sync, in dependency order (parents first)
const SYNC_TABLES: &[TableDef] = &[
    TableDef {
        name: "app_settings",
        columns: &[
            "id", "primary_color", "secondary_color", "logo_path",
            "created_at", "updated_at",
        ],
        id_col: "id",
        has_updated_at: true,
        parent_col: None,
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
    },
    TableDef {
        name: "operation_codes",
        columns: &[
            "id", "code", "name", "category", "sort_order", "active",
            "created_by", "updated_by", "created_at", "updated_at", "is_deleted",
        ],
        id_col: "id",
        has_updated_at: true,
        parent_col: None,
    },
    TableDef {
        name: "areas",
        columns: &[
            "id", "name", "country", "state", "active", "created_by",
            "updated_by", "created_at", "updated_at", "is_deleted",
        ],
        id_col: "id",
        has_updated_at: true,
        parent_col: None,
    },
    TableDef {
        name: "operators",
        columns: &[
            "id", "name", "logo_path", "active", "created_at", "updated_at", "is_deleted",
        ],
        id_col: "id",
        has_updated_at: true,
        parent_col: None,
    },
    TableDef {
        name: "rigs",
        columns: &[
            "id", "name", "operator", "power", "area_id", "active",
            "created_by", "updated_by", "created_at", "updated_at", "is_deleted",
        ],
        id_col: "id",
        has_updated_at: true,
        parent_col: None,
    },
    TableDef {
        name: "rig_personnel",
        columns: &[
            "id", "rig_id", "name", "ci", "default_position", "active",
            "is_deleted", "created_at", "updated_at",
        ],
        id_col: "id",
        has_updated_at: true,
        parent_col: Some("rig_id"),
    },
    TableDef {
        name: "user_rigs",
        columns: &[
            "id", "user_id", "rig_id", "assigned_by", "assigned_at",
            "created_at", "updated_at",
        ],
        id_col: "id",
        has_updated_at: true,
        parent_col: None,
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
        id_col: "id",
        has_updated_at: true,
        parent_col: None,
    },
    TableDef {
        name: "drill_string_components",
        columns: &[
            "id", "report_id", "entry_number", "piece_name", "length",
            "created_at", "updated_at",
        ],
        id_col: "id",
        has_updated_at: true,
        parent_col: Some("report_id"),
    },
    TableDef {
        name: "crew_shifts",
        columns: &[
            "id", "report_id", "shift", "shift_start", "shift_end",
            "created_at", "updated_at",
        ],
        id_col: "id",
        has_updated_at: true,
        parent_col: Some("report_id"),
    },
    TableDef {
        name: "crew_members",
        columns: &[
            "id", "crew_shift_id", "personnel_id", "position", "ci", "name", "hours",
            "created_at", "updated_at",
        ],
        id_col: "id",
        has_updated_at: true,
        parent_col: Some("crew_shift_id"),
    },
    TableDef {
        name: "time_distribution",
        columns: &[
            "id", "report_id", "operation_code_id", "hours_shift1",
            "hours_shift2", "hours_shift3", "created_at", "updated_at",
        ],
        id_col: "id",
        has_updated_at: true,
        parent_col: Some("report_id"),
    },
    TableDef {
        name: "bit_records",
        columns: &[
            "id", "report_id", "shift", "size", "manufacturer_code", "brand",
            "bit_type", "serial_number", "jets", "tfa", "depth_out", "depth_in",
            "footage", "hours_total", "dp_tubos", "kelly", "created_at", "updated_at",
        ],
        id_col: "id",
        has_updated_at: true,
        parent_col: Some("report_id"),
    },
    TableDef {
        name: "mud_records",
        columns: &[
            "id", "report_id", "shift", "hour", "weight", "viscosity", "pvp",
            "gels", "filtrate", "ph", "solids", "created_at", "updated_at",
        ],
        id_col: "id",
        has_updated_at: true,
        parent_col: Some("report_id"),
    },
    TableDef {
        name: "mud_additives",
        columns: &[
            "id", "report_id", "shift", "additive_type", "quantity",
            "created_at", "updated_at",
        ],
        id_col: "id",
        has_updated_at: true,
        parent_col: Some("report_id"),
    },
    TableDef {
        name: "drilling_parameters",
        columns: &[
            "id", "report_id", "shift", "depth_from", "depth_to", "core_number",
            "rotary_rpm", "bit_weight", "pump_pressure", "pump_number",
            "pump_liner", "pump_spm", "total_gpm", "method_used",
            "lithology_notes", "created_at", "updated_at",
        ],
        id_col: "id",
        has_updated_at: true,
        parent_col: Some("report_id"),
    },
    TableDef {
        name: "deviation_history",
        columns: &[
            "id", "report_id", "depth", "deviation", "direction", "tvo",
            "horizontal_displacement", "created_at", "updated_at",
        ],
        id_col: "id",
        has_updated_at: true,
        parent_col: Some("report_id"),
    },
    TableDef {
        name: "operations_log",
        columns: &[
            "id", "report_id", "shift", "time_from", "time_to", "duration",
            "operation_code", "details", "created_at", "updated_at",
        ],
        id_col: "id",
        has_updated_at: true,
        parent_col: Some("report_id"),
    },
    TableDef {
        name: "report_reviews",
        columns: &[
            "id", "report_id", "reviewer_id", "action", "comment",
            "previous_status", "new_status", "created_at", "updated_at",
            "is_deleted",
        ],
        id_col: "id",
        has_updated_at: true,
        parent_col: Some("report_id"),
    },
    TableDef {
        name: "user_preferences",
        columns: &[
            "id", "user_id", "theme_mode", "created_at", "updated_at",
        ],
        id_col: "id",
        has_updated_at: true,
        parent_col: None,
    },
    // =========================================================================
    // LOGISTICS MODULE
    // =========================================================================
    TableDef {
        name: "logistics_materials",
        columns: &[
            "id", "name", "unit", "description", "active",
            "created_by", "created_at", "updated_at", "is_deleted",
        ],
        id_col: "id",
        has_updated_at: true,
        parent_col: None,
    },
    TableDef {
        name: "logistics_water_bottles_movements",
        columns: &[
            "id", "rig_id", "movement_type", "quantity", "notes",
            "created_by", "created_at", "updated_at", "is_deleted",
        ],
        id_col: "id",
        has_updated_at: true,
        parent_col: None,
    },
    TableDef {
        name: "logistics_fuel_movements",
        columns: &[
            "id", "rig_id", "movement_type", "amount", "notes",
            "created_by", "created_at", "updated_at", "is_deleted",
        ],
        id_col: "id",
        has_updated_at: true,
        parent_col: None,
    },
    TableDef {
        name: "logistics_vacuum_actions",
        columns: &[
            "id", "rig_id", "action_name", "notes",
            "created_by", "created_at", "updated_at", "is_deleted",
        ],
        id_col: "id",
        has_updated_at: true,
        parent_col: None,
    },
    TableDef {
        name: "logistics_materials_movements",
        columns: &[
            "id", "rig_id", "material_id", "movement_type", "quantity", "notes",
            "created_by", "created_at", "updated_at", "is_deleted",
        ],
        id_col: "id",
        has_updated_at: true,
        parent_col: Some("material_id"),
    },
    TableDef {
        name: "logistics_requests",
        columns: &[
            "id", "rig_id", "request_type", "quantity", "action_requested",
            "material_id", "status", "notes", "requested_by", "status_changed_by",
            "requested_at", "status_changed_at", "created_at", "updated_at", "is_deleted",
        ],
        id_col: "id",
        has_updated_at: true,
        parent_col: None,
    },
    // =========================================================================
    // INCIDENTS MODULE
    // =========================================================================
    TableDef {
        name: "incident_types",
        columns: &[
            "id", "name", "color", "sort_order",
            "created_by", "created_at", "updated_at", "is_deleted",
        ],
        id_col: "id",
        has_updated_at: true,
        parent_col: None,
    },
    TableDef {
        name: "incidents",
        columns: &[
            "id", "rig_id", "incident_type", "description",
            "created_by", "created_at", "updated_at", "is_deleted",
        ],
        id_col: "id",
        has_updated_at: true,
        parent_col: None,
    },
    TableDef {
        name: "incident_personnel",
        columns: &[
            "id", "incident_id", "personnel_id",
            "created_at", "updated_at",
        ],
        id_col: "id",
        has_updated_at: true,
        parent_col: Some("incident_id"),
    },
    // =========================================================================
    // SNAPSHOTS
    // =========================================================================
    TableDef {
        name: "last_report_snapshot",
        columns: &[
            "id", "rig_id", "report_number", "well_number", "api_number",
            "contract", "contractor", "operator", "field_district", "municipality",
            "rig_number", "company", "supervisor_24h",
            "crew_data", "time_distribution_data", "bit_records_data",
            "mud_records_data", "mud_additives_data", "drilling_params_data",
            "deviation_data", "operations_log_data", "drill_string_data",
            "source_report_id", "updated_by", "updated_at",
        ],
        id_col: "id",
        has_updated_at: true,
        parent_col: None,
    },
];

struct TableDef {
    name: &'static str,
    columns: &'static [&'static str],
    id_col: &'static str,
    has_updated_at: bool,
    /// For child tables: column that links to parent (e.g. "report_id").
    /// Used to clean up stale rows before sync write.
    parent_col: Option<&'static str>,
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

/// Collect distinct parent IDs from sync data, grouped by parent_col.
/// Returns a map: parent_col -> set of parent IDs.
/// E.g. { "report_id" => {"r1", "r2"}, "rig_id" => {"rig1"}, "material_id" => {"m1"} }
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

fn collect_parent_ids_from_table_data(table_data: &[TableData]) -> std::collections::HashMap<&'static str, HashSet<String>> {
    let mut parent_map: std::collections::HashMap<&'static str, HashSet<String>> = std::collections::HashMap::new();
    for data in table_data {
        let table_def = &SYNC_TABLES[data.table_index];
        if let Some(parent_col) = table_def.parent_col {
            if let Some(col_idx) = table_def.columns.iter().position(|c| *c == parent_col) {
                for row in &data.rows {
                    if let Some(TursoValue::Text(val)) = row.get(col_idx) {
                        parent_map.entry(parent_col).or_default().insert(val.clone());
                    }
                }
            }
        }
    }
    parent_map
}

/// Delete stale child rows from local DB for all parent relationships in the batch.
/// Must be called BEFORE writing new data.
/// Only deletes child rows for tables that are actually present in the batch,
/// to avoid wiping sibling tables that share the same parent_col.
fn cleanup_local_child_rows(
    conn: &Connection,
    parent_map: &std::collections::HashMap<&str, HashSet<String>>,
    tables_in_batch: &HashSet<&str>,
) -> Result<(), String> {
    for (parent_col, parent_ids) in parent_map {
        if parent_ids.is_empty() {
            continue;
        }

        let placeholders: String = parent_ids.iter().enumerate()
            .map(|(i, _)| format!("?{}", i + 1))
            .collect::<Vec<_>>()
            .join(", ");
        let ids: Vec<&str> = parent_ids.iter().map(|s| s.as_str()).collect();

        // Special case: crew_members is a grandchild of report_id via crew_shifts
        if *parent_col == "report_id" && tables_in_batch.contains("crew_shifts") {
            let crew_members_sql = format!(
                "DELETE FROM crew_members WHERE crew_shift_id IN (SELECT id FROM crew_shifts WHERE report_id IN ({}))",
                placeholders
            );
            conn.execute(&crew_members_sql, rusqlite::params_from_iter(ids.iter()))
                .map_err(|e| format!("Failed to cleanup crew_members: {}", e))?;
        }

        // Only delete from child tables that are actually in the current batch
        for table_def in SYNC_TABLES.iter() {
            if table_def.parent_col == Some(parent_col) && tables_in_batch.contains(table_def.name) {
                let sql = format!(
                    "DELETE FROM {} WHERE {} IN ({})",
                    table_def.name, parent_col, placeholders
                );
                conn.execute(&sql, rusqlite::params_from_iter(ids.iter()))
                    .map_err(|e| format!("Failed to cleanup {}: {}", table_def.name, e))?;
            }
        }

        println!("[Sync] Cleaned up local child rows for {} {}(s) (tables: {:?})", parent_ids.len(), parent_col, tables_in_batch);
    }
    Ok(())
}

/// Delete stale child rows from Turso for all parent relationships in the batch.
/// Must be called BEFORE pushing new data.
async fn cleanup_turso_child_rows(
    client: &TursoClient,
    parent_map: &std::collections::HashMap<&str, HashSet<String>>,
    tables_in_batch: &HashSet<&str>,
) -> Result<(), String> {
    let mut batch: Vec<(String, Vec<TursoValue>)> = Vec::new();

    for (parent_col, parent_ids) in parent_map {
        if parent_ids.is_empty() {
            continue;
        }

        let placeholders: String = parent_ids.iter().enumerate()
            .map(|(i, _)| format!("?{}", i + 1))
            .collect::<Vec<_>>()
            .join(", ");
        let params: Vec<TursoValue> = parent_ids.iter()
            .map(|id| TursoValue::Text(id.clone()))
            .collect();

        // Special case: crew_members grandchild
        if *parent_col == "report_id" && tables_in_batch.contains("crew_shifts") {
            batch.push((
                format!(
                    "DELETE FROM crew_members WHERE crew_shift_id IN (SELECT id FROM crew_shifts WHERE report_id IN ({}))",
                    placeholders
                ),
                params.clone(),
            ));
        }

        // Only delete from child tables that are actually in the current batch
        for table_def in SYNC_TABLES.iter() {
            if table_def.parent_col == Some(parent_col) && tables_in_batch.contains(table_def.name) {
                batch.push((
                    format!("DELETE FROM {} WHERE {} IN ({})", table_def.name, parent_col, placeholders),
                    params.clone(),
                ));
            }
        }

        println!("[Sync] Cleaned up Turso child rows for {} {}(s) (tables: {:?})", parent_ids.len(), parent_col, tables_in_batch);
    }

    if !batch.is_empty() {
        client.execute_batch(batch).await?;
    }
    Ok(())
}

/// SQL to create all tables on Turso (matching local schema)
const REMOTE_SCHEMA: &str = r#"
CREATE TABLE IF NOT EXISTS app_settings (
  id INTEGER PRIMARY KEY CHECK (id = 1),
  primary_color TEXT NOT NULL DEFAULT '#1e3a5f',
  secondary_color TEXT NOT NULL DEFAULT '#f97316',
  logo_path TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  username TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  full_name TEXT NOT NULL,
  ci TEXT,
  role TEXT NOT NULL,
  position TEXT,
  active INTEGER DEFAULT 1,
  has_all_rigs INTEGER DEFAULT 0,
  supervisor_id TEXT,
  last_login TEXT,
  created_by TEXT,
  updated_by TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  is_deleted INTEGER DEFAULT 0
);

CREATE TABLE IF NOT EXISTS operation_codes (
  id TEXT PRIMARY KEY,
  code TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  category TEXT,
  sort_order INTEGER DEFAULT 0,
  active INTEGER DEFAULT 1,
  created_by TEXT,
  updated_by TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT,
  is_deleted INTEGER DEFAULT 0
);

CREATE TABLE IF NOT EXISTS areas (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  country TEXT NOT NULL,
  state TEXT NOT NULL,
  active INTEGER DEFAULT 1,
  created_by TEXT,
  updated_by TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  is_deleted INTEGER DEFAULT 0
);

CREATE TABLE IF NOT EXISTS operators (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  logo_path TEXT,
  active INTEGER DEFAULT 1,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  is_deleted INTEGER DEFAULT 0
);

CREATE TABLE IF NOT EXISTS rigs (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  operator TEXT NOT NULL,
  power TEXT NOT NULL,
  area_id TEXT,
  active INTEGER DEFAULT 1,
  created_by TEXT,
  updated_by TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  is_deleted INTEGER DEFAULT 0
);

CREATE TABLE IF NOT EXISTS rig_personnel (
  id TEXT PRIMARY KEY,
  rig_id TEXT NOT NULL,
  name TEXT NOT NULL,
  ci TEXT,
  default_position TEXT NOT NULL,
  active INTEGER DEFAULT 1,
  is_deleted INTEGER DEFAULT 0,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS user_rigs (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  rig_id TEXT NOT NULL,
  assigned_by TEXT,
  assigned_at TEXT NOT NULL,
  created_at TEXT,
  updated_at TEXT,
  UNIQUE(user_id, rig_id)
);

CREATE TABLE IF NOT EXISTS reports (
  id TEXT PRIMARY KEY,
  report_number INTEGER NOT NULL,
  report_date TEXT NOT NULL,
  well_number TEXT,
  api_number TEXT,
  contract TEXT,
  contractor TEXT,
  operator TEXT,
  field_district TEXT,
  municipality TEXT,
  rig_number TEXT,
  company TEXT,
  supervisor_24h TEXT,
  status TEXT DEFAULT 'draft',
  created_by TEXT,
  approved_by TEXT,
  submitted_at TEXT,
  approved_at TEXT,
  rejected_at TEXT,
  rejection_reason TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  synced INTEGER DEFAULT 0,
  is_deleted INTEGER DEFAULT 0
);

CREATE TABLE IF NOT EXISTS drill_string_components (
  id TEXT PRIMARY KEY,
  report_id TEXT,
  entry_number INTEGER NOT NULL DEFAULT 0,
  piece_name TEXT,
  length REAL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS crew_shifts (
  id TEXT PRIMARY KEY,
  report_id TEXT,
  shift TEXT NOT NULL,
  shift_start TEXT,
  shift_end TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS crew_members (
  id TEXT PRIMARY KEY,
  crew_shift_id TEXT,
  personnel_id TEXT,
  position TEXT NOT NULL,
  ci TEXT,
  name TEXT,
  hours REAL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS time_distribution (
  id TEXT PRIMARY KEY,
  report_id TEXT,
  operation_code_id TEXT,
  hours_shift1 REAL DEFAULT 0,
  hours_shift2 REAL DEFAULT 0,
  hours_shift3 REAL DEFAULT 0,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS bit_records (
  id TEXT PRIMARY KEY,
  report_id TEXT,
  shift TEXT,
  size TEXT,
  manufacturer_code TEXT,
  brand TEXT,
  bit_type TEXT,
  serial_number TEXT,
  jets TEXT,
  tfa TEXT,
  depth_out TEXT,
  depth_in TEXT,
  footage TEXT,
  hours_total REAL,
  dp_tubos TEXT,
  kelly TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS mud_records (
  id TEXT PRIMARY KEY,
  report_id TEXT,
  shift TEXT,
  hour TEXT,
  weight TEXT,
  viscosity TEXT,
  pvp TEXT,
  gels TEXT,
  filtrate TEXT,
  ph TEXT,
  solids TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS mud_additives (
  id TEXT PRIMARY KEY,
  report_id TEXT,
  shift TEXT,
  additive_type TEXT,
  quantity TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS drilling_parameters (
  id TEXT PRIMARY KEY,
  report_id TEXT,
  shift TEXT,
  depth_from TEXT,
  depth_to TEXT,
  core_number TEXT,
  rotary_rpm TEXT,
  bit_weight TEXT,
  pump_pressure TEXT,
  pump_number TEXT,
  pump_liner TEXT,
  pump_spm TEXT,
  total_gpm TEXT,
  method_used TEXT,
  lithology_notes TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS deviation_history (
  id TEXT PRIMARY KEY,
  report_id TEXT,
  depth TEXT,
  deviation TEXT,
  direction TEXT,
  tvo TEXT,
  horizontal_displacement TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS operations_log (
  id TEXT PRIMARY KEY,
  report_id TEXT,
  shift TEXT,
  time_from TEXT,
  time_to TEXT,
  duration TEXT,
  operation_code TEXT,
  details TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS user_preferences (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL UNIQUE,
  theme_mode TEXT NOT NULL DEFAULT 'light' CHECK(theme_mode IN ('light', 'dark')),
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS logistics_materials (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  unit TEXT NOT NULL,
  description TEXT,
  active INTEGER DEFAULT 1,
  created_by TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  is_deleted INTEGER DEFAULT 0
);

CREATE TABLE IF NOT EXISTS logistics_water_bottles_movements (
  id TEXT PRIMARY KEY,
  rig_id TEXT,
  movement_type TEXT NOT NULL,
  quantity INTEGER NOT NULL,
  notes TEXT,
  created_by TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT,
  is_deleted INTEGER DEFAULT 0
);

CREATE TABLE IF NOT EXISTS logistics_fuel_movements (
  id TEXT PRIMARY KEY,
  rig_id TEXT,
  movement_type TEXT NOT NULL,
  amount REAL NOT NULL,
  notes TEXT,
  created_by TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT,
  is_deleted INTEGER DEFAULT 0
);

CREATE TABLE IF NOT EXISTS logistics_vacuum_actions (
  id TEXT PRIMARY KEY,
  rig_id TEXT,
  action_name TEXT NOT NULL,
  notes TEXT,
  created_by TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT,
  is_deleted INTEGER DEFAULT 0
);

CREATE TABLE IF NOT EXISTS logistics_materials_movements (
  id TEXT PRIMARY KEY,
  rig_id TEXT,
  material_id TEXT NOT NULL,
  movement_type TEXT NOT NULL,
  quantity REAL NOT NULL,
  notes TEXT,
  created_by TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT,
  is_deleted INTEGER DEFAULT 0
);

CREATE TABLE IF NOT EXISTS last_report_snapshot (
  id TEXT PRIMARY KEY,
  rig_id TEXT NOT NULL,
  report_number INTEGER NOT NULL,
  well_number TEXT,
  api_number TEXT,
  contract TEXT,
  contractor TEXT,
  operator TEXT,
  field_district TEXT,
  municipality TEXT,
  rig_number TEXT,
  company TEXT,
  supervisor_24h TEXT,
  crew_data TEXT,
  time_distribution_data TEXT,
  bit_records_data TEXT,
  mud_records_data TEXT,
  mud_additives_data TEXT,
  drilling_params_data TEXT,
  deviation_data TEXT,
  operations_log_data TEXT,
  drill_string_data TEXT,
  source_report_id TEXT,
  updated_by TEXT,
  updated_at TEXT NOT NULL,
  UNIQUE(rig_id)
);

CREATE TABLE IF NOT EXISTS logistics_requests (
  id TEXT PRIMARY KEY,
  rig_id TEXT,
  request_type TEXT NOT NULL,
  quantity REAL,
  action_requested TEXT,
  material_id TEXT,
  status TEXT DEFAULT 'requested' NOT NULL,
  notes TEXT,
  requested_by TEXT,
  status_changed_by TEXT,
  requested_at TEXT NOT NULL,
  status_changed_at TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  is_deleted INTEGER DEFAULT 0
);

CREATE TABLE IF NOT EXISTS report_reviews (
  id TEXT PRIMARY KEY,
  report_id TEXT NOT NULL,
  reviewer_id TEXT NOT NULL,
  action TEXT NOT NULL,
  comment TEXT,
  previous_status TEXT,
  new_status TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  is_deleted INTEGER DEFAULT 0
);
"#;

/// Migrations to apply to existing Turso databases (add missing columns/tables)
/// These run individually and errors are ignored (column/table may already exist)
const REMOTE_MIGRATIONS: &[&str] = &[
    // V8: users.has_all_rigs
    "ALTER TABLE users ADD COLUMN has_all_rigs INTEGER DEFAULT 0",
    // V8: user_rigs table
    "CREATE TABLE IF NOT EXISTS user_rigs (id TEXT PRIMARY KEY, user_id TEXT NOT NULL, rig_id TEXT NOT NULL, assigned_by TEXT, assigned_at TEXT NOT NULL, created_at TEXT, updated_at TEXT, UNIQUE(user_id, rig_id))",
    // V12: app_settings table (global appearance)
    "CREATE TABLE IF NOT EXISTS app_settings (id INTEGER PRIMARY KEY CHECK (id = 1), primary_color TEXT NOT NULL DEFAULT '#1e3a5f', secondary_color TEXT NOT NULL DEFAULT '#f97316', logo_path TEXT, created_at TEXT NOT NULL DEFAULT '', updated_at TEXT NOT NULL DEFAULT '')",
    // V13: user_preferences with simplified schema (only theme_mode)
    // NOTE: DROP was removed — it already ran on all existing DBs and would cause
    // data loss if initialize_remote_db is called again (e.g. admin manual init).
    "CREATE TABLE IF NOT EXISTS user_preferences (id TEXT PRIMARY KEY, user_id TEXT NOT NULL UNIQUE, theme_mode TEXT NOT NULL DEFAULT 'light', created_at TEXT NOT NULL DEFAULT '', updated_at TEXT NOT NULL DEFAULT '')",
    // V14: reports.company
    "ALTER TABLE reports ADD COLUMN company TEXT",
    // V17: users.supervisor_id
    "ALTER TABLE users ADD COLUMN supervisor_id TEXT",
    // V18: reports.is_deleted (soft delete)
    "ALTER TABLE reports ADD COLUMN is_deleted INTEGER DEFAULT 0",
    // V19: is_deleted for management tables (soft delete for sync)
    "ALTER TABLE users ADD COLUMN is_deleted INTEGER DEFAULT 0",
    "ALTER TABLE areas ADD COLUMN is_deleted INTEGER DEFAULT 0",
    "ALTER TABLE rigs ADD COLUMN is_deleted INTEGER DEFAULT 0",
    "ALTER TABLE operators ADD COLUMN is_deleted INTEGER DEFAULT 0",
    "ALTER TABLE operation_codes ADD COLUMN is_deleted INTEGER DEFAULT 0",
    // V20: rig_personnel table + crew_members.personnel_id
    "CREATE TABLE IF NOT EXISTS rig_personnel (id TEXT PRIMARY KEY, rig_id TEXT NOT NULL, name TEXT NOT NULL, ci TEXT, default_position TEXT NOT NULL, active INTEGER DEFAULT 1, is_deleted INTEGER DEFAULT 0, created_at TEXT NOT NULL, updated_at TEXT NOT NULL)",
    "ALTER TABLE crew_members ADD COLUMN personnel_id TEXT",
    // V25: Logistics module tables
    "CREATE TABLE IF NOT EXISTS logistics_materials (id TEXT PRIMARY KEY, name TEXT NOT NULL, unit TEXT NOT NULL, description TEXT, active INTEGER DEFAULT 1, created_by TEXT, created_at TEXT NOT NULL, updated_at TEXT NOT NULL, is_deleted INTEGER DEFAULT 0)",
    "CREATE TABLE IF NOT EXISTS logistics_water_bottles_movements (id TEXT PRIMARY KEY, rig_id TEXT, movement_type TEXT NOT NULL, quantity INTEGER NOT NULL, notes TEXT, created_by TEXT, created_at TEXT NOT NULL, updated_at TEXT, is_deleted INTEGER DEFAULT 0)",
    "CREATE TABLE IF NOT EXISTS logistics_fuel_movements (id TEXT PRIMARY KEY, rig_id TEXT, movement_type TEXT NOT NULL, amount REAL NOT NULL, notes TEXT, created_by TEXT, created_at TEXT NOT NULL, updated_at TEXT, is_deleted INTEGER DEFAULT 0)",
    "CREATE TABLE IF NOT EXISTS logistics_vacuum_actions (id TEXT PRIMARY KEY, rig_id TEXT, action_name TEXT NOT NULL, notes TEXT, created_by TEXT, created_at TEXT NOT NULL, updated_at TEXT, is_deleted INTEGER DEFAULT 0)",
    "CREATE TABLE IF NOT EXISTS logistics_materials_movements (id TEXT PRIMARY KEY, rig_id TEXT, material_id TEXT NOT NULL, movement_type TEXT NOT NULL, quantity REAL NOT NULL, notes TEXT, created_by TEXT, created_at TEXT NOT NULL, updated_at TEXT, is_deleted INTEGER DEFAULT 0)",
    "CREATE TABLE IF NOT EXISTS logistics_requests (id TEXT PRIMARY KEY, rig_id TEXT, request_type TEXT NOT NULL, quantity REAL, action_requested TEXT, material_id TEXT, status TEXT DEFAULT 'requested' NOT NULL, notes TEXT, requested_by TEXT, status_changed_by TEXT, requested_at TEXT NOT NULL, status_changed_at TEXT, created_at TEXT NOT NULL, updated_at TEXT NOT NULL, is_deleted INTEGER DEFAULT 0)",
    // V25: Add sync columns to existing logistics tables (for DBs that already had V22-V24 without sync columns)
    "ALTER TABLE logistics_water_bottles_movements ADD COLUMN updated_at TEXT",
    "ALTER TABLE logistics_water_bottles_movements ADD COLUMN is_deleted INTEGER DEFAULT 0",
    "ALTER TABLE logistics_fuel_movements ADD COLUMN updated_at TEXT",
    "ALTER TABLE logistics_fuel_movements ADD COLUMN is_deleted INTEGER DEFAULT 0",
    "ALTER TABLE logistics_vacuum_actions ADD COLUMN updated_at TEXT",
    "ALTER TABLE logistics_vacuum_actions ADD COLUMN is_deleted INTEGER DEFAULT 0",
    "ALTER TABLE logistics_materials ADD COLUMN is_deleted INTEGER DEFAULT 0",
    "ALTER TABLE logistics_materials_movements ADD COLUMN updated_at TEXT",
    "ALTER TABLE logistics_materials_movements ADD COLUMN is_deleted INTEGER DEFAULT 0",
    "ALTER TABLE logistics_requests ADD COLUMN is_deleted INTEGER DEFAULT 0",
    // V26: operation_codes.updated_at (enables incremental sync for edits)
    "ALTER TABLE operation_codes ADD COLUMN updated_at TEXT",
    // V27: last_report_snapshot table
    "CREATE TABLE IF NOT EXISTS last_report_snapshot (id TEXT PRIMARY KEY, rig_id TEXT NOT NULL, report_number INTEGER NOT NULL, well_number TEXT, api_number TEXT, contract TEXT, contractor TEXT, operator TEXT, field_district TEXT, municipality TEXT, rig_number TEXT, company TEXT, supervisor_24h TEXT, crew_data TEXT, time_distribution_data TEXT, bit_records_data TEXT, mud_records_data TEXT, mud_additives_data TEXT, drilling_params_data TEXT, deviation_data TEXT, operations_log_data TEXT, drill_string_data TEXT, source_report_id TEXT, updated_by TEXT, updated_at TEXT NOT NULL, UNIQUE(rig_id))",
    // V28: drill_string_components replaces drill_string
    "CREATE TABLE IF NOT EXISTS drill_string_components (id TEXT PRIMARY KEY, report_id TEXT, entry_number INTEGER NOT NULL DEFAULT 0, piece_name TEXT, length REAL, created_at TEXT NOT NULL, updated_at TEXT NOT NULL)",
    // V30: report_reviews table + reports approval columns
    "CREATE TABLE IF NOT EXISTS report_reviews (id TEXT PRIMARY KEY, report_id TEXT NOT NULL, reviewer_id TEXT NOT NULL, action TEXT NOT NULL, comment TEXT, previous_status TEXT, new_status TEXT, created_at TEXT NOT NULL, updated_at TEXT NOT NULL, is_deleted INTEGER DEFAULT 0)",
    "ALTER TABLE reports ADD COLUMN submitted_at TEXT",
    "ALTER TABLE reports ADD COLUMN approved_at TEXT",
    "ALTER TABLE reports ADD COLUMN rejected_at TEXT",
    "ALTER TABLE reports ADD COLUMN rejection_reason TEXT",
];

/// Initialize the remote Turso database with the same schema
pub async fn initialize_remote_db(client: &TursoClient) -> Result<String, String> {
    // 1. Create tables that don't exist yet
    let statements: Vec<String> = REMOTE_SCHEMA
        .split(';')
        .map(|s| s.trim().to_string())
        .filter(|s| !s.is_empty())
        .collect();

    let batch: Vec<(String, Vec<TursoValue>)> = statements
        .into_iter()
        .map(|sql| (format!("{};", sql), vec![]))
        .collect();

    let table_count = batch.len();
    client.execute_batch(batch).await?;

    // 2. Apply migrations to existing tables (ignore errors for already-applied migrations)
    let mut migrations_applied = 0;
    for migration in REMOTE_MIGRATIONS {
        match client.execute(&format!("{};", migration), vec![]).await {
            Ok(_) => {
                migrations_applied += 1;
                println!("[Sync] Migration applied: {}", migration);
            }
            Err(e) => {
                // Ignore errors like "duplicate column name" - means migration was already applied
                println!("[Sync] Migration skipped (already applied): {} - {}", migration, e);
            }
        }
    }

    Ok(format!(
        "Base de datos remota inicializada ({} tablas, {} migraciones aplicadas)",
        table_count, migrations_applied
    ))
}

/// Initialize remote DB only once per app session.
/// Uses a tokio::Mutex to ensure only one task runs the initialization
/// while concurrent callers await. If it fails, retries on the next call.
pub async fn ensure_remote_db_initialized(client: &TursoClient) -> Result<(), String> {
    // Fast path: already initialized, no lock needed
    if REMOTE_DB_INITIALIZED.load(Ordering::Acquire) {
        return Ok(());
    }

    // Serialize concurrent callers — only one runs initialize_remote_db
    let _guard = REMOTE_DB_INIT_LOCK.lock().await;

    // Double-check after acquiring lock (another task may have completed it)
    if REMOTE_DB_INITIALIZED.load(Ordering::Acquire) {
        return Ok(());
    }

    match initialize_remote_db(client).await {
        Ok(msg) => {
            println!("[Sync] {}", msg);
            REMOTE_DB_INITIALIZED.store(true, Ordering::Release);
            Ok(())
        }
        Err(e) => {
            // Do NOT mark as initialized — will retry on next sync operation
            println!("[Sync] Remote DB initialization failed (will retry): {}", e);
            Err(e)
        }
    }
}

// =============================================================================
// SYNCHRONOUS: Read data from local SQLite (called with mutex locked)
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

        all_data.push(TableData {
            table_index: idx,
            rows,
        });
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

    let query = if last_sync_at.is_some() {
        if table_def.has_updated_at {
            format!(
                "SELECT {} FROM {} WHERE updated_at > ?1",
                columns_str, table_def.name
            )
        } else {
            format!(
                "SELECT {} FROM {} WHERE created_at > ?1",
                columns_str, table_def.name
            )
        }
    } else {
        format!("SELECT {} FROM {}", columns_str, table_def.name)
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

    let mut stmt = conn
        .prepare(&query)
        .map_err(|e| format!("Prepare failed: {}", e))?;

    let rows = if let Some(since) = last_sync_at {
        stmt.query_map(rusqlite::params![since], read_row)
            .map_err(|e| format!("Query failed: {}", e))?
            .collect::<Result<Vec<_>, _>>()
            .map_err(|e| format!("Row read failed: {}", e))?
    } else {
        stmt.query_map([], read_row)
            .map_err(|e| format!("Query failed: {}", e))?
            .collect::<Result<Vec<_>, _>>()
            .map_err(|e| format!("Row read failed: {}", e))?
    };

    Ok(rows)
}

/// Mark all reports as synced (synchronous)
pub fn mark_reports_synced(conn: &Connection) {
    let _ = conn.execute("UPDATE reports SET synced = 1 WHERE synced = 0", []);
}

/// Write pulled data to local SQLite (synchronous)
pub fn write_pulled_data(
    conn: &Connection,
    table_results: &[(usize, Vec<Vec<TursoValue>>)],
) -> Result<u32, String> {
    // Disable foreign key constraints temporarily to allow syncing without reference errors
    conn.execute("PRAGMA foreign_keys = OFF", [])
        .map_err(|e| format!("Failed to disable foreign keys: {}", e))?;

    // Clean up stale child rows before writing to prevent duplicates
    // Only clean tables that are actually in this batch to avoid wiping unrelated sibling data
    let parent_map = collect_parent_ids_from_indexed(table_results);
    let tables_in_batch: HashSet<&str> = table_results.iter()
        .filter(|(_, rows)| !rows.is_empty())
        .map(|(idx, _)| SYNC_TABLES[*idx].name)
        .collect();
    cleanup_local_child_rows(conn, &parent_map, &tables_in_batch)?;

    let mut total: u32 = 0;

    for (idx, rows) in table_results {
        let table_def = &SYNC_TABLES[*idx];

        if rows.is_empty() {
            continue;
        }

        let columns_str = table_def.columns.join(", ");
        let placeholders: Vec<String> = (1..=table_def.columns.len())
            .map(|i| format!("?{}", i))
            .collect();
        let placeholders_str = placeholders.join(", ");

        let update_cols: Vec<String> = table_def
            .columns
            .iter()
            .filter(|c| **c != table_def.id_col)
            .map(|c| {
                // Preserve soft deletes: once deleted on any side, stay deleted
                if *c == "is_deleted" {
                    format!("is_deleted = MAX(COALESCE({}.is_deleted, 0), COALESCE(excluded.is_deleted, 0))", table_def.name)
                } else {
                    format!("{} = excluded.{}", c, c)
                }
            })
            .collect();
        let update_str = update_cols.join(", ");

        let upsert_sql = format!(
            "INSERT INTO {} ({}) VALUES ({}) ON CONFLICT ({}) DO UPDATE SET {}",
            table_def.name, columns_str, placeholders_str, table_def.id_col, update_str
        );

        for row in rows {
            let params = turso_row_to_rusqlite_params(row);
            let params_refs: Vec<&dyn rusqlite::ToSql> =
                params.iter().map(|p| p.as_ref()).collect();

            // Special handling for users table due to multiple UNIQUE constraints
            if table_def.name == "users" {
                // Try to delete existing user with same username but different id
                // Username is at index 1 in the columns
                if let Some(username_param) = params.get(1) {
                    let _ = conn.execute(
                        "DELETE FROM users WHERE username = ?1 AND id != ?2",
                        rusqlite::params![username_param, params.get(0)],
                    );
                }
            }

            // Special handling for user_rigs due to UNIQUE(user_id, rig_id) constraint
            if table_def.name == "user_rigs" {
                // Delete existing assignment with same user_id+rig_id but different id
                // user_id is at index 1, rig_id is at index 2
                if params.len() >= 3 {
                    let _ = conn.execute(
                        "DELETE FROM user_rigs WHERE user_id = ?1 AND rig_id = ?2 AND id != ?3",
                        rusqlite::params![params.get(1), params.get(2), params.get(0)],
                    );
                }
            }

            // Special handling for last_report_snapshot due to UNIQUE(rig_id) constraint
            if table_def.name == "last_report_snapshot" {
                // Delete existing snapshot with same rig_id but different id
                // rig_id is at index 1
                if params.len() >= 2 {
                    let _ = conn.execute(
                        "DELETE FROM last_report_snapshot WHERE rig_id = ?1 AND id != ?2",
                        rusqlite::params![params.get(1), params.get(0)],
                    );
                }
            }

            conn.execute(&upsert_sql, params_refs.as_slice())
                .map_err(|e| {
                    format!("Failed to upsert into '{}': {}", table_def.name, e)
                })?;

            total += 1;
        }
    }

    // Re-enable foreign key constraints
    conn.execute("PRAGMA foreign_keys = ON", [])
        .map_err(|e| format!("Failed to re-enable foreign keys: {}", e))?;

    Ok(total)
}

/// Recalculate the logistics_stock cache from movement tables.
/// Must be called AFTER writing pulled data that includes logistics tables.
pub fn recalculate_logistics_stock(conn: &Connection) -> Result<(), String> {
    // Check if any logistics movement table was affected by looking at table existence
    // Always safe to recalculate — it's idempotent

    conn.execute("DELETE FROM logistics_stock", [])
        .map_err(|e| format!("Failed to clear logistics_stock: {}", e))?;

    // Water bottles
    conn.execute(
        "INSERT INTO logistics_stock (rig_id, category, quantity, updated_at)
         SELECT rig_id, 'water_bottles',
                SUM(CASE WHEN movement_type = 'entry' THEN quantity ELSE -quantity END),
                datetime('now')
         FROM logistics_water_bottles_movements
         WHERE rig_id IS NOT NULL AND is_deleted = 0
         GROUP BY rig_id",
        [],
    ).map_err(|e| format!("Failed to recalculate water_bottles stock: {}", e))?;

    // Fuel
    conn.execute(
        "INSERT INTO logistics_stock (rig_id, category, quantity, updated_at)
         SELECT rig_id, 'fuel',
                SUM(CASE WHEN movement_type = 'entry' THEN amount ELSE -amount END),
                datetime('now')
         FROM logistics_fuel_movements
         WHERE rig_id IS NOT NULL AND is_deleted = 0
         GROUP BY rig_id",
        [],
    ).map_err(|e| format!("Failed to recalculate fuel stock: {}", e))?;

    // Materials (one row per rig + material combination)
    conn.execute(
        "INSERT INTO logistics_stock (rig_id, category, quantity, updated_at)
         SELECT rig_id, 'material:' || material_id,
                SUM(CASE WHEN movement_type = 'entry' THEN quantity ELSE -quantity END),
                datetime('now')
         FROM logistics_materials_movements
         WHERE rig_id IS NOT NULL AND is_deleted = 0
         GROUP BY rig_id, material_id",
        [],
    ).map_err(|e| format!("Failed to recalculate materials stock: {}", e))?;

    println!("[Sync] Logistics stock cache recalculated");
    Ok(())
}

/// During full sync, remove local records that don't exist in Turso.
/// Only reconciles tables that had rows pulled (tables empty in Turso are left alone).
/// Must be called AFTER push succeeded and pulled data has been written.
pub fn reconcile_local_with_remote(
    conn: &Connection,
    pulled_data: &[(usize, Vec<Vec<TursoValue>>)],
) -> Result<u32, String> {
    conn.execute("PRAGMA foreign_keys = OFF", [])
        .map_err(|e| format!("Failed to disable FK: {}", e))?;

    let mut total_deleted: u32 = 0;

    for (idx, rows) in pulled_data {
        let table_def = &SYNC_TABLES[*idx];
        let id_col_idx = table_def
            .columns
            .iter()
            .position(|c| *c == table_def.id_col)
            .unwrap_or(0);

        // Collect all IDs from pulled data
        let pulled_ids: Vec<String> = rows
            .iter()
            .filter_map(|row| match row.get(id_col_idx) {
                Some(TursoValue::Text(id)) => Some(id.clone()),
                Some(TursoValue::Integer(id)) => Some(id.clone()),
                _ => None,
            })
            .collect();

        if pulled_ids.is_empty() {
            continue;
        }

        // Delete local records whose IDs are NOT in the pulled set
        let placeholders: String = (1..=pulled_ids.len())
            .map(|i| format!("?{}", i))
            .collect::<Vec<_>>()
            .join(", ");

        let sql = format!(
            "DELETE FROM {} WHERE {} NOT IN ({})",
            table_def.name, table_def.id_col, placeholders
        );

        let params: Vec<Box<dyn rusqlite::ToSql>> = pulled_ids
            .iter()
            .map(|id| Box::new(id.clone()) as Box<dyn rusqlite::ToSql>)
            .collect();
        let param_refs: Vec<&dyn rusqlite::ToSql> =
            params.iter().map(|p| p.as_ref()).collect();

        match conn.execute(&sql, param_refs.as_slice()) {
            Ok(count) => {
                if count > 0 {
                    println!(
                        "[Sync] Reconciled '{}': removed {} stale local records",
                        table_def.name, count
                    );
                    total_deleted += count as u32;
                }
            }
            Err(e) => {
                println!(
                    "[Sync] Warning: reconcile '{}' failed: {}",
                    table_def.name, e
                );
            }
        }
    }

    conn.execute("PRAGMA foreign_keys = ON", [])
        .map_err(|e| format!("Failed to re-enable FK: {}", e))?;

    if total_deleted > 0 {
        println!(
            "[Sync] Reconciliation complete: {} stale records removed",
            total_deleted
        );
    }

    Ok(total_deleted)
}

// =============================================================================
// ASYNC: Push/Pull data to/from Turso (no Connection references)
// =============================================================================

/// Push pre-read data to Turso (async, no Connection needed)
pub async fn push_data_to_turso(
    client: &TursoClient,
    table_data: Vec<TableData>,
) -> Result<SyncResult, String> {
    let now = chrono::Utc::now().to_rfc3339();
    let mut total_pushed: u32 = 0;
    let mut tables_synced: u32 = 0;
    let mut errors: Vec<String> = Vec::new();

    // Disable foreign key constraints to avoid reference errors during push
    let _ = client.execute("PRAGMA foreign_keys = OFF;", vec![]).await;

    // Clean up stale child rows in Turso before pushing to prevent duplicates
    let parent_map = collect_parent_ids_from_table_data(&table_data);
    let tables_in_push: HashSet<&str> = table_data.iter()
        .filter(|d| !d.rows.is_empty())
        .map(|d| SYNC_TABLES[d.table_index].name)
        .collect();
    if let Err(e) = cleanup_turso_child_rows(client, &parent_map, &tables_in_push).await {
        println!("[Sync] Warning: cleanup_turso_child_rows failed: {}", e);
        errors.push(format!("Cleanup warning: {}", e));
    }

    for data in table_data {
        let table_def = &SYNC_TABLES[data.table_index];

        if data.rows.is_empty() {
            continue;
        }

        match push_rows_to_turso(client, table_def, &data.rows).await {
            Ok(count) => {
                tables_synced += 1;
                total_pushed += count;
                println!("[Sync] Pushed {} records to '{}'", count, table_def.name);
            }
            Err(e) => {
                let msg = format!("Error pushing '{}': {}", table_def.name, e);
                println!("[Sync] {}", msg);
                errors.push(msg);
            }
        }
    }

    // Re-enable foreign key constraints
    let _ = client.execute("PRAGMA foreign_keys = ON;", vec![]).await;

    Ok(SyncResult {
        success: errors.is_empty(),
        tables_synced,
        records_pushed: total_pushed,
        records_pulled: 0,
        errors,
        timestamp: now,
    })
}

async fn push_rows_to_turso(
    client: &TursoClient,
    table_def: &TableDef,
    rows: &[Vec<TursoValue>],
) -> Result<u32, String> {
    let columns_str = table_def.columns.join(", ");
    let placeholders: Vec<String> = (0..table_def.columns.len())
        .map(|i| format!("?{}", i + 1))
        .collect();
    let placeholders_str = placeholders.join(", ");

    let update_cols: Vec<String> = table_def
        .columns
        .iter()
        .filter(|c| **c != table_def.id_col)
        .map(|c| {
            // Preserve soft deletes: once deleted on any side, stay deleted
            if *c == "is_deleted" {
                format!("is_deleted = MAX(COALESCE({}.is_deleted, 0), COALESCE(excluded.is_deleted, 0))", table_def.name)
            } else {
                format!("{} = excluded.{}", c, c)
            }
        })
        .collect();
    let update_str = update_cols.join(", ");

    let upsert_sql = format!(
        "INSERT INTO {} ({}) VALUES ({}) ON CONFLICT ({}) DO UPDATE SET {}",
        table_def.name, columns_str, placeholders_str, table_def.id_col, update_str
    );

    let batch_size = 20;
    let mut count: u32 = 0;

    for chunk in rows.chunks(batch_size) {
        let mut batch: Vec<(String, Vec<TursoValue>)> = Vec::new();

        // Special handling for users table due to multiple UNIQUE constraints
        if table_def.name == "users" {
            for row in chunk {
                // Add DELETE statement for conflicting username
                if row.len() >= 2 {
                    let delete_sql = "DELETE FROM users WHERE username = ?1 AND id != ?2".to_string();
                    let delete_params = vec![row[1].clone(), row[0].clone()];
                    batch.push((delete_sql, delete_params));
                }
                // Add UPSERT statement
                batch.push((upsert_sql.clone(), row.clone()));
            }
        } else if table_def.name == "user_rigs" {
            for row in chunk {
                // Delete existing assignment with same user_id+rig_id but different id
                // user_id is at index 1, rig_id is at index 2
                if row.len() >= 3 {
                    let delete_sql = "DELETE FROM user_rigs WHERE user_id = ?1 AND rig_id = ?2 AND id != ?3".to_string();
                    let delete_params = vec![row[1].clone(), row[2].clone(), row[0].clone()];
                    batch.push((delete_sql, delete_params));
                }
                // Add UPSERT statement
                batch.push((upsert_sql.clone(), row.clone()));
            }
        } else if table_def.name == "last_report_snapshot" {
            for row in chunk {
                // Delete existing snapshot with same rig_id but different id
                // rig_id is at index 1
                if row.len() >= 2 {
                    let delete_sql = "DELETE FROM last_report_snapshot WHERE rig_id = ?1 AND id != ?2".to_string();
                    let delete_params = vec![row[1].clone(), row[0].clone()];
                    batch.push((delete_sql, delete_params));
                }
                batch.push((upsert_sql.clone(), row.clone()));
            }
        } else {
            for row in chunk {
                batch.push((upsert_sql.clone(), row.clone()));
            }
        }

        client.execute_batch(batch).await?;
        count += chunk.len() as u32;
    }

    Ok(count)
}

/// Pull data from Turso (async, returns data to be written locally later)
pub async fn pull_data_from_turso(
    client: &TursoClient,
    last_sync_at: Option<&str>,
) -> Result<(Vec<(usize, Vec<Vec<TursoValue>>)>, SyncResult), String> {
    let now = chrono::Utc::now().to_rfc3339();
    let mut pulled_data: Vec<(usize, Vec<Vec<TursoValue>>)> = Vec::new();
    let mut total_pulled: u32 = 0;
    let mut tables_synced: u32 = 0;
    let mut errors: Vec<String> = Vec::new();

    for (idx, table_def) in SYNC_TABLES.iter().enumerate() {
        match pull_table_from_turso(client, table_def, last_sync_at).await {
            Ok(rows) => {
                if !rows.is_empty() {
                    tables_synced += 1;
                    total_pulled += rows.len() as u32;
                    println!(
                        "[Sync] Pulled {} records for '{}'",
                        rows.len(),
                        table_def.name
                    );
                    pulled_data.push((idx, rows));
                }
            }
            Err(e) => {
                let msg = format!("Error pulling '{}': {}", table_def.name, e);
                println!("[Sync] {}", msg);
                errors.push(msg);
            }
        }
    }

    let result = SyncResult {
        success: errors.is_empty(),
        tables_synced,
        records_pushed: 0,
        records_pulled: total_pulled,
        errors,
        timestamp: now,
    };

    Ok((pulled_data, result))
}

async fn pull_table_from_turso(
    client: &TursoClient,
    table_def: &TableDef,
    last_sync_at: Option<&str>,
) -> Result<Vec<Vec<TursoValue>>, String> {
    let columns_str = table_def.columns.join(", ");

    let (query, args) = if let Some(since) = last_sync_at {
        if table_def.has_updated_at {
            (
                format!(
                    "SELECT {} FROM {} WHERE updated_at > ?1",
                    columns_str, table_def.name
                ),
                vec![TursoValue::text(since)],
            )
        } else {
            (
                format!(
                    "SELECT {} FROM {} WHERE created_at > ?1",
                    columns_str, table_def.name
                ),
                vec![TursoValue::text(since)],
            )
        }
    } else {
        (
            format!("SELECT {} FROM {}", columns_str, table_def.name),
            vec![],
        )
    };

    let result = client.execute(&query, args).await?;
    Ok(result.rows)
}

/// Convert TursoValue row to rusqlite-compatible params
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

// =============================================================================
// PURGE: Hard-delete soft-deleted records older than retention period
// =============================================================================

/// Purge soft-deleted records from local SQLite that are older than `retention_days`.
/// Handles cascade deletion for child tables (report children, user_rigs).
pub fn purge_local_soft_deleted(conn: &Connection, retention_days: i64) -> Result<u32, String> {
    let threshold = chrono::Utc::now() - chrono::Duration::days(retention_days);
    let threshold_str = threshold.to_rfc3339();

    conn.execute("PRAGMA foreign_keys = OFF", [])
        .map_err(|e| format!("Failed to disable FK: {}", e))?;

    let mut total_purged: u32 = 0;

    // 1. Purge deleted reports and their children
    let report_ids: Vec<String> = {
        let mut stmt = conn.prepare(
            "SELECT id FROM reports WHERE is_deleted = 1 AND updated_at < ?1"
        ).map_err(|e| format!("Prepare failed: {}", e))?;
        let ids = stmt.query_map(rusqlite::params![&threshold_str], |row| row.get(0))
            .map_err(|e| format!("Query failed: {}", e))?
            .collect::<Result<Vec<_>, _>>()
            .map_err(|e| format!("Row read failed: {}", e))?;
        ids
    };

    if !report_ids.is_empty() {
        let placeholders: String = report_ids.iter().enumerate()
            .map(|(i, _)| format!("?{}", i + 1))
            .collect::<Vec<_>>().join(", ");
        let params: Vec<&dyn rusqlite::ToSql> = report_ids.iter()
            .map(|id| id as &dyn rusqlite::ToSql).collect();

        // Grandchild first: crew_members via crew_shifts
        let sql = format!(
            "DELETE FROM crew_members WHERE crew_shift_id IN (SELECT id FROM crew_shifts WHERE report_id IN ({}))",
            placeholders
        );
        if let Ok(count) = conn.execute(&sql, params.as_slice()) {
            total_purged += count as u32;
        }

        // All direct child tables with parent_col = "report_id"
        for table_def in SYNC_TABLES.iter() {
            if table_def.parent_col == Some("report_id") {
                let sql = format!("DELETE FROM {} WHERE report_id IN ({})", table_def.name, placeholders);
                if let Ok(count) = conn.execute(&sql, params.as_slice()) {
                    total_purged += count as u32;
                }
            }
        }

        // The reports themselves
        let sql = format!("DELETE FROM reports WHERE id IN ({})", placeholders);
        if let Ok(count) = conn.execute(&sql, params.as_slice()) {
            total_purged += count as u32;
        }

        println!("[Sync] Purged {} deleted report(s) and their children", report_ids.len());
    }

    // 2. Purge deleted users and their user_rigs
    let user_ids: Vec<String> = {
        let mut stmt = conn.prepare(
            "SELECT id FROM users WHERE is_deleted = 1 AND updated_at < ?1"
        ).map_err(|e| format!("Prepare failed: {}", e))?;
        let ids = stmt.query_map(rusqlite::params![&threshold_str], |row| row.get(0))
            .map_err(|e| format!("Query failed: {}", e))?
            .collect::<Result<Vec<_>, _>>()
            .map_err(|e| format!("Row read failed: {}", e))?;
        ids
    };

    if !user_ids.is_empty() {
        let placeholders: String = user_ids.iter().enumerate()
            .map(|(i, _)| format!("?{}", i + 1))
            .collect::<Vec<_>>().join(", ");
        let params: Vec<&dyn rusqlite::ToSql> = user_ids.iter()
            .map(|id| id as &dyn rusqlite::ToSql).collect();

        let sql = format!("DELETE FROM user_rigs WHERE user_id IN ({})", placeholders);
        let _ = conn.execute(&sql, params.as_slice());

        let sql = format!("DELETE FROM users WHERE id IN ({})", placeholders);
        if let Ok(count) = conn.execute(&sql, params.as_slice()) {
            total_purged += count as u32;
        }

        println!("[Sync] Purged {} deleted user(s)", user_ids.len());
    }

    // 3. Purge deleted rigs and their user_rigs
    let rig_ids: Vec<String> = {
        let mut stmt = conn.prepare(
            "SELECT id FROM rigs WHERE is_deleted = 1 AND updated_at < ?1"
        ).map_err(|e| format!("Prepare failed: {}", e))?;
        let ids = stmt.query_map(rusqlite::params![&threshold_str], |row| row.get(0))
            .map_err(|e| format!("Query failed: {}", e))?
            .collect::<Result<Vec<_>, _>>()
            .map_err(|e| format!("Row read failed: {}", e))?;
        ids
    };

    if !rig_ids.is_empty() {
        let placeholders: String = rig_ids.iter().enumerate()
            .map(|(i, _)| format!("?{}", i + 1))
            .collect::<Vec<_>>().join(", ");
        let params: Vec<&dyn rusqlite::ToSql> = rig_ids.iter()
            .map(|id| id as &dyn rusqlite::ToSql).collect();

        let sql = format!("DELETE FROM user_rigs WHERE rig_id IN ({})", placeholders);
        let _ = conn.execute(&sql, params.as_slice());

        let sql = format!("DELETE FROM rig_personnel WHERE rig_id IN ({})", placeholders);
        let _ = conn.execute(&sql, params.as_slice());

        let sql = format!("DELETE FROM rigs WHERE id IN ({})", placeholders);
        if let Ok(count) = conn.execute(&sql, params.as_slice()) {
            total_purged += count as u32;
        }

        println!("[Sync] Purged {} deleted rig(s)", rig_ids.len());
    }

    // 4. Purge simple tables (areas, operators, rig_personnel) - no children to worry about
    for table_name in &["areas", "operators", "rig_personnel"] {
        let sql = format!("DELETE FROM {} WHERE is_deleted = 1 AND updated_at < ?1", table_name);
        if let Ok(count) = conn.execute(&sql, rusqlite::params![&threshold_str]) {
            if count > 0 {
                total_purged += count as u32;
                println!("[Sync] Purged {} deleted record(s) from '{}'", count, table_name);
            }
        }
    }

    // 5. Purge operation_codes (now has updated_at, use threshold)
    if let Ok(count) = conn.execute(
        "DELETE FROM operation_codes WHERE is_deleted = 1 AND updated_at < ?1",
        rusqlite::params![&threshold_str],
    ) {
        if count > 0 {
            total_purged += count as u32;
            println!("[Sync] Purged {} deleted operation_code(s)", count);
        }
    }

    // 6. Purge logistics tables
    // First: logistics_materials_movements (child of logistics_materials)
    // Hard-delete movements whose parent material is soft-deleted
    if let Ok(count) = conn.execute(
        "DELETE FROM logistics_materials_movements WHERE is_deleted = 1 AND updated_at < ?1",
        rusqlite::params![&threshold_str],
    ) {
        if count > 0 {
            total_purged += count as u32;
            println!("[Sync] Purged {} deleted logistics_materials_movements", count);
        }
    }
    // Then: logistics_materials catalog
    if let Ok(count) = conn.execute(
        "DELETE FROM logistics_materials WHERE is_deleted = 1 AND updated_at < ?1",
        rusqlite::params![&threshold_str],
    ) {
        if count > 0 {
            total_purged += count as u32;
            println!("[Sync] Purged {} deleted logistics_materials", count);
        }
    }
    // Simple logistics tables (no children)
    for table_name in &[
        "logistics_water_bottles_movements",
        "logistics_fuel_movements",
        "logistics_vacuum_actions",
        "logistics_requests",
    ] {
        let sql = format!("DELETE FROM {} WHERE is_deleted = 1 AND updated_at < ?1", table_name);
        if let Ok(count) = conn.execute(&sql, rusqlite::params![&threshold_str]) {
            if count > 0 {
                total_purged += count as u32;
                println!("[Sync] Purged {} deleted record(s) from '{}'", count, table_name);
            }
        }
    }

    conn.execute("PRAGMA foreign_keys = ON", [])
        .map_err(|e| format!("Failed to re-enable FK: {}", e))?;

    if total_purged > 0 {
        println!("[Sync] Local purge complete: {} records permanently deleted", total_purged);
    }

    Ok(total_purged)
}

/// Purge soft-deleted records from Turso that are older than `retention_days`.
/// Uses subqueries to cascade delete children of reports, users, and rigs.
pub async fn purge_turso_soft_deleted(client: &TursoClient, retention_days: i64) -> Result<(), String> {
    let threshold = chrono::Utc::now() - chrono::Duration::days(retention_days);
    let threshold_str = threshold.to_rfc3339();

    let _ = client.execute("PRAGMA foreign_keys = OFF;", vec![]).await;

    let mut batch: Vec<(String, Vec<TursoValue>)> = Vec::new();

    // 1. Report children (grandchild first)
    batch.push((
        "DELETE FROM crew_members WHERE crew_shift_id IN (SELECT id FROM crew_shifts WHERE report_id IN (SELECT id FROM reports WHERE is_deleted = 1 AND updated_at < ?1))".to_string(),
        vec![TursoValue::Text(threshold_str.clone())],
    ));

    for table_def in SYNC_TABLES.iter() {
        if table_def.parent_col == Some("report_id") {
            batch.push((
                format!(
                    "DELETE FROM {} WHERE report_id IN (SELECT id FROM reports WHERE is_deleted = 1 AND updated_at < ?1)",
                    table_def.name
                ),
                vec![TursoValue::Text(threshold_str.clone())],
            ));
        }
    }

    // Reports themselves
    batch.push((
        "DELETE FROM reports WHERE is_deleted = 1 AND updated_at < ?1".to_string(),
        vec![TursoValue::Text(threshold_str.clone())],
    ));

    // 2. User children (user_rigs) + users
    batch.push((
        "DELETE FROM user_rigs WHERE user_id IN (SELECT id FROM users WHERE is_deleted = 1 AND updated_at < ?1)".to_string(),
        vec![TursoValue::Text(threshold_str.clone())],
    ));
    batch.push((
        "DELETE FROM users WHERE is_deleted = 1 AND updated_at < ?1".to_string(),
        vec![TursoValue::Text(threshold_str.clone())],
    ));

    // 3. Rig children (user_rigs, rig_personnel) + rigs
    batch.push((
        "DELETE FROM user_rigs WHERE rig_id IN (SELECT id FROM rigs WHERE is_deleted = 1 AND updated_at < ?1)".to_string(),
        vec![TursoValue::Text(threshold_str.clone())],
    ));
    batch.push((
        "DELETE FROM rig_personnel WHERE rig_id IN (SELECT id FROM rigs WHERE is_deleted = 1 AND updated_at < ?1)".to_string(),
        vec![TursoValue::Text(threshold_str.clone())],
    ));
    batch.push((
        "DELETE FROM rigs WHERE is_deleted = 1 AND updated_at < ?1".to_string(),
        vec![TursoValue::Text(threshold_str.clone())],
    ));

    // 4. Simple tables
    batch.push((
        "DELETE FROM areas WHERE is_deleted = 1 AND updated_at < ?1".to_string(),
        vec![TursoValue::Text(threshold_str.clone())],
    ));
    batch.push((
        "DELETE FROM operators WHERE is_deleted = 1 AND updated_at < ?1".to_string(),
        vec![TursoValue::Text(threshold_str.clone())],
    ));
    batch.push((
        "DELETE FROM rig_personnel WHERE is_deleted = 1 AND updated_at < ?1".to_string(),
        vec![TursoValue::Text(threshold_str.clone())],
    ));

    // 5. operation_codes (now has updated_at, use threshold)
    batch.push((
        "DELETE FROM operation_codes WHERE is_deleted = 1 AND updated_at < ?1".to_string(),
        vec![TursoValue::Text(threshold_str.clone())],
    ));

    // 6. Logistics tables
    // Child first: logistics_materials_movements
    batch.push((
        "DELETE FROM logistics_materials_movements WHERE is_deleted = 1 AND updated_at < ?1".to_string(),
        vec![TursoValue::Text(threshold_str.clone())],
    ));
    // Parent: logistics_materials catalog
    batch.push((
        "DELETE FROM logistics_materials WHERE is_deleted = 1 AND updated_at < ?1".to_string(),
        vec![TursoValue::Text(threshold_str.clone())],
    ));
    // Simple logistics tables
    for table_name in &[
        "logistics_water_bottles_movements",
        "logistics_fuel_movements",
        "logistics_vacuum_actions",
        "logistics_requests",
    ] {
        batch.push((
            format!("DELETE FROM {} WHERE is_deleted = 1 AND updated_at < ?1", table_name),
            vec![TursoValue::Text(threshold_str.clone())],
        ));
    }

    client.execute_batch(batch).await?;

    let _ = client.execute("PRAGMA foreign_keys = ON;", vec![]).await;

    println!("[Sync] Turso purge complete (deleted records older than {} days removed)", retention_days);
    Ok(())
}
