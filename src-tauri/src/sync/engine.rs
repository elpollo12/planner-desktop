use crate::sync::turso_client::{TursoClient, TursoValue};
use rusqlite::Connection;
use serde::{Deserialize, Serialize};

/// Tables to sync, in dependency order (parents first)
const SYNC_TABLES: &[TableDef] = &[
    TableDef {
        name: "users",
        columns: &[
            "id", "username", "password_hash", "full_name", "ci", "role",
            "position", "active", "last_login", "created_by", "updated_by",
            "created_at", "updated_at",
        ],
        id_col: "id",
        has_updated_at: true,
    },
    TableDef {
        name: "operation_codes",
        columns: &[
            "id", "code", "name", "category", "sort_order", "active",
            "created_by", "updated_by", "created_at",
        ],
        id_col: "id",
        has_updated_at: false,
    },
    TableDef {
        name: "areas",
        columns: &[
            "id", "name", "country", "state", "active", "created_by",
            "updated_by", "created_at", "updated_at",
        ],
        id_col: "id",
        has_updated_at: true,
    },
    TableDef {
        name: "operators",
        columns: &[
            "id", "name", "logo_path", "active", "created_at", "updated_at",
        ],
        id_col: "id",
        has_updated_at: true,
    },
    TableDef {
        name: "rigs",
        columns: &[
            "id", "name", "operator", "power", "area_id", "active",
            "created_by", "updated_by", "created_at", "updated_at",
        ],
        id_col: "id",
        has_updated_at: true,
    },
    TableDef {
        name: "reports",
        columns: &[
            "id", "report_number", "report_date", "well_number", "api_number",
            "contract", "contractor", "operator", "field_district", "municipality",
            "rig_number", "supervisor_24h", "status", "created_by",
            "approved_by", "submitted_at", "approved_at", "rejected_at",
            "rejection_reason", "created_at", "updated_at", "synced",
        ],
        id_col: "id",
        has_updated_at: true,
    },
    TableDef {
        name: "drill_string",
        columns: &[
            "id", "report_id", "size", "weight", "grade", "connection_type",
            "string_number", "pump_brand", "pump_type", "header_length",
            "created_at", "updated_at",
        ],
        id_col: "id",
        has_updated_at: true,
    },
    TableDef {
        name: "crew_shifts",
        columns: &[
            "id", "report_id", "shift", "shift_start", "shift_end",
            "created_at", "updated_at",
        ],
        id_col: "id",
        has_updated_at: true,
    },
    TableDef {
        name: "crew_members",
        columns: &[
            "id", "crew_shift_id", "position", "ci", "name", "hours",
            "created_at", "updated_at",
        ],
        id_col: "id",
        has_updated_at: true,
    },
    TableDef {
        name: "time_distribution",
        columns: &[
            "id", "report_id", "operation_code_id", "hours_shift1",
            "hours_shift2", "hours_shift3", "created_at", "updated_at",
        ],
        id_col: "id",
        has_updated_at: true,
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
    },
    TableDef {
        name: "mud_records",
        columns: &[
            "id", "report_id", "shift", "hour", "weight", "viscosity", "pvp",
            "gels", "filtrate", "ph", "solids", "created_at", "updated_at",
        ],
        id_col: "id",
        has_updated_at: true,
    },
    TableDef {
        name: "mud_additives",
        columns: &[
            "id", "report_id", "shift", "additive_type", "quantity",
            "created_at", "updated_at",
        ],
        id_col: "id",
        has_updated_at: true,
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
    },
    TableDef {
        name: "deviation_history",
        columns: &[
            "id", "report_id", "depth", "deviation", "direction", "tvo",
            "horizontal_displacement", "created_at", "updated_at",
        ],
        id_col: "id",
        has_updated_at: true,
    },
    TableDef {
        name: "operations_log",
        columns: &[
            "id", "report_id", "shift", "time_from", "time_to", "duration",
            "operation_code", "details", "created_at", "updated_at",
        ],
        id_col: "id",
        has_updated_at: true,
    },
    TableDef {
        name: "user_preferences",
        columns: &[
            "id", "user_id", "primary_color", "secondary_color", "theme_mode",
            "logo_path", "created_at", "updated_at",
        ],
        id_col: "id",
        has_updated_at: true,
    },
];

struct TableDef {
    name: &'static str,
    columns: &'static [&'static str],
    id_col: &'static str,
    has_updated_at: bool,
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

/// SQL to create all tables on Turso (matching local schema)
const REMOTE_SCHEMA: &str = r#"
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  username TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  full_name TEXT NOT NULL,
  ci TEXT,
  role TEXT NOT NULL,
  position TEXT,
  active INTEGER DEFAULT 1,
  last_login TEXT,
  created_by TEXT,
  updated_by TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
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
  created_at TEXT NOT NULL
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
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS operators (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  logo_path TEXT,
  active INTEGER DEFAULT 1,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
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
  updated_at TEXT NOT NULL
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
  synced INTEGER DEFAULT 0
);

CREATE TABLE IF NOT EXISTS drill_string (
  id TEXT PRIMARY KEY,
  report_id TEXT,
  size TEXT,
  weight TEXT,
  grade TEXT,
  connection_type TEXT,
  string_number TEXT,
  pump_brand TEXT,
  pump_type TEXT,
  header_length TEXT,
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
  primary_color TEXT DEFAULT '#1e3a5f',
  secondary_color TEXT DEFAULT '#f97316',
  theme_mode TEXT DEFAULT 'light',
  logo_path TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
)
"#;

/// Initialize the remote Turso database with the same schema
pub async fn initialize_remote_db(client: &TursoClient) -> Result<String, String> {
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

    Ok(format!(
        "Base de datos remota inicializada ({} tablas creadas)",
        table_count
    ))
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
            .map(|c| format!("{} = excluded.{}", c, c))
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
        .map(|c| format!("{} = excluded.{}", c, c))
        .collect();
    let update_str = update_cols.join(", ");

    let upsert_sql = format!(
        "INSERT INTO {} ({}) VALUES ({}) ON CONFLICT ({}) DO UPDATE SET {}",
        table_def.name, columns_str, placeholders_str, table_def.id_col, update_str
    );

    let batch_size = 20;
    let mut count: u32 = 0;

    for chunk in rows.chunks(batch_size) {
        let batch: Vec<(String, Vec<TursoValue>)> = chunk
            .iter()
            .map(|row| (upsert_sql.clone(), row.clone()))
            .collect();

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
