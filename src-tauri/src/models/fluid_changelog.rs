#![allow(dead_code)]

use crate::error::AppError;
use rusqlite::{params, Connection, Row};
use serde::{Deserialize, Serialize};
use serde_json::Value as JsonValue;

// ============================================================================
// Structs
// ============================================================================

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct FluidChangelogEntry {
    pub id: String,
    pub fluid_report_id: String,
    pub tab: String,
    pub changed_by: String,
    pub changed_by_name: Option<String>,
    pub changed_at: String,
    pub note: Option<String>,
    pub changes_json: JsonValue,
    pub created_at: String,
}

// ============================================================================
// Diff helpers
// ============================================================================

/// Compare two optional values; returns Some((old, new)) if they differ.
fn diff_opt<T: PartialEq + ToString>(old: &Option<T>, new: &Option<T>) -> Option<(String, String)> {
    let old_str = old.as_ref().map(|v| v.to_string()).unwrap_or_default();
    let new_str = new.as_ref().map(|v| v.to_string()).unwrap_or_default();
    if old_str != new_str {
        Some((old_str, new_str))
    } else {
        None
    }
}

fn diff_str(old: &Option<String>, new: &Option<String>) -> Option<(String, String)> {
    let o = old.as_deref().unwrap_or("");
    let n = new.as_deref().unwrap_or("");
    if o != n {
        Some((o.to_string(), n.to_string()))
    } else {
        None
    }
}

/// Build a diff JSON for fluid report header fields.
/// old/new are serde_json::Value objects representing the UpdateFluidHeaderRequest.
pub fn compute_header_diff(
    old: &serde_json::Map<String, JsonValue>,
    new: &serde_json::Map<String, JsonValue>,
) -> serde_json::Map<String, JsonValue> {
    let mut diff = serde_json::Map::new();

    for (key, new_val) in new {
        let old_val = old.get(key).unwrap_or(&JsonValue::Null);
        // Skip metadata fields
        if matches!(
            key.as_str(),
            "id" | "reportId"
                | "rigId"
                | "isDeleted"
                | "createdBy"
                | "updatedBy"
                | "createdAt"
                | "updatedAt"
                | "synced"
                | "reportNumber"
        ) {
            continue;
        }
        if old_val != new_val {
            let mut entry = serde_json::Map::new();
            entry.insert("old".to_string(), old_val.clone());
            entry.insert("new".to_string(), new_val.clone());
            diff.insert(key.clone(), JsonValue::Object(entry));
        }
    }

    diff
}

/// Strip metadata fields from a row for clean comparison.
fn strip_metadata(row: &JsonValue) -> JsonValue {
    match row.as_object() {
        Some(obj) => {
            let cleaned: serde_json::Map<String, JsonValue> = obj
                .iter()
                .filter(|(k, _)| !METADATA_FIELDS.contains(&k.as_str()))
                .map(|(k, v)| (k.clone(), v.clone()))
                .collect();
            JsonValue::Object(cleaned)
        }
        None => row.clone(),
    }
}

/// Normalize a value for comparison: treat null and empty string as equivalent.
fn normalize_value(v: &JsonValue) -> JsonValue {
    match v {
        JsonValue::Null => JsonValue::Null,
        JsonValue::String(s) if s.is_empty() => JsonValue::Null,
        other => other.clone(),
    }
}

/// Compare two rows ignoring metadata and treating null/empty/""/0 as equivalent.
fn rows_differ(old: &JsonValue, new: &JsonValue) -> bool {
    let old_clean = strip_metadata(old);
    let new_clean = strip_metadata(new);

    match (old_clean.as_object(), new_clean.as_object()) {
        (Some(old_map), Some(new_map)) => {
            // Collect all keys from both
            let mut all_keys: std::collections::HashSet<&String> = old_map.keys().collect();
            all_keys.extend(new_map.keys());

            for key in all_keys {
                let ov = old_map.get(key.as_str()).unwrap_or(&JsonValue::Null);
                let nv = new_map.get(key.as_str()).unwrap_or(&JsonValue::Null);
                if normalize_value(ov) != normalize_value(nv) {
                    return true;
                }
            }
            false
        }
        _ => old_clean != new_clean,
    }
}

/// Compare two rows and return a list of field-level diffs: ["field: old → new", ...]
fn row_field_diffs(old: &JsonValue, new: &JsonValue) -> Vec<String> {
    let old_clean = strip_metadata(old);
    let new_clean = strip_metadata(new);
    let mut diffs = Vec::new();

    if let (Some(old_map), Some(new_map)) = (old_clean.as_object(), new_clean.as_object()) {
        let mut all_keys: Vec<&String> = {
            let mut ks: std::collections::HashSet<&String> = old_map.keys().collect();
            ks.extend(new_map.keys());
            let mut sorted: Vec<&String> = ks.into_iter().collect();
            sorted.sort();
            sorted
        };
        // Filter out metadata — we only want data fields
        all_keys.retain(|k| !METADATA_FIELDS.contains(&k.as_str()));

        for key in all_keys {
            let ov = old_map.get(key.as_str()).unwrap_or(&JsonValue::Null);
            let nv = new_map.get(key.as_str()).unwrap_or(&JsonValue::Null);
            let ov_norm = normalize_value(ov);
            let nv_norm = normalize_value(nv);
            if ov_norm != nv_norm {
                let old_display = format_value_short(&ov_norm);
                let new_display = format_value_short(&nv_norm);
                diffs.push(format!("{}: {} → {}", key, old_display, new_display));
            }
        }
    }
    diffs
}

/// Format a JSON value for short display in diffs.
fn format_value_short(v: &JsonValue) -> String {
    match v {
        JsonValue::Null => "—".to_string(),
        JsonValue::String(s) if s.is_empty() => "—".to_string(),
        JsonValue::String(s) => s.clone(),
        JsonValue::Number(n) => {
            // Show clean numbers (9.2 not 9.200000)
            if let Some(f) = n.as_f64() {
                let rounded = (f * 1000.0).round() / 1000.0;
                if rounded == rounded.trunc() {
                    format!("{}", rounded as i64)
                } else {
                    format!("{}", rounded)
                }
            } else {
                n.to_string()
            }
        }
        JsonValue::Bool(b) => b.to_string(),
        other => other.to_string(),
    }
}

/// Extract a display name from a row using the key field, or fall back to index.
fn row_display_name(row: &JsonValue, key_field: &str, index: usize) -> String {
    row.as_object()
        .and_then(|obj| obj.get(key_field))
        .and_then(|v| v.as_str())
        .filter(|s| !s.is_empty())
        .map(|s| s.to_string())
        .unwrap_or_else(|| format!("#{}", index + 1))
}

/// Fields to ignore when checking if a row has meaningful data.
const METADATA_FIELDS: &[&str] = &[
    "id", "fluidReportId", "fluid_report_id", "createdAt", "created_at",
    "updatedAt", "updated_at", "sortOrder", "sort_order",
    "synced", "isDeleted", "is_deleted", "createdBy", "created_by",
    "updatedBy", "updated_by", "reportNumber", "report_number",
    "rigId", "rig_id",
];

/// Check if a row has any meaningful (non-null, non-empty, non-zero) data,
/// ignoring metadata fields like id, timestamps, etc.
fn row_has_data(row: &JsonValue) -> bool {
    row.as_object()
        .map(|obj| {
            obj.iter().any(|(k, v)| {
                if METADATA_FIELDS.contains(&k.as_str()) {
                    return false;
                }
                match v {
                    JsonValue::Null => false,
                    JsonValue::String(s) => !s.is_empty(),
                    _ => true,
                }
            })
        })
        .unwrap_or(false)
}

/// Build a detailed diff for a sub-table (props, solids, inventory, etc.)
/// `key_field`: the field used to identify/name each row (e.g. "equipment", "serviceName", "name").
/// For positional tables (props by shift), pass an empty string and rows are identified by index.
pub fn compute_subtable_diff(
    old_rows: &[JsonValue],
    new_rows: &[JsonValue],
    label: &str,
    key_field: &str,
) -> Option<JsonValue> {
    let old_count = old_rows.len();
    let new_non_empty: Vec<&JsonValue> = new_rows.iter().filter(|r| row_has_data(r)).collect();

    if old_count == 0 && new_non_empty.is_empty() {
        return None;
    }

    let mut added_items: Vec<JsonValue> = Vec::new();
    let mut removed_items: Vec<JsonValue> = Vec::new();
    let mut modified_items: Vec<JsonValue> = Vec::new();

    // Compare rows that exist in both (by position)
    let common = old_count.min(new_rows.len());
    for i in 0..common {
        let old_has = row_has_data(&old_rows[i]);
        let new_has = row_has_data(&new_rows[i]);

        if old_has && !new_has {
            // Had data, now empty → removed
            let name = if !key_field.is_empty() {
                row_display_name(&old_rows[i], key_field, i)
            } else {
                format!("#{}", i + 1)
            };
            removed_items.push(JsonValue::String(name));
        } else if !old_has && new_has {
            // Was empty, now has data → added
            let name = if !key_field.is_empty() {
                row_display_name(&new_rows[i], key_field, i)
            } else {
                format!("#{}", i + 1)
            };
            added_items.push(JsonValue::String(name));
        } else if old_has && new_has && rows_differ(&old_rows[i], &new_rows[i]) {
            // Both have data but differ → modified with field details
            let name = if !key_field.is_empty() {
                let new_name = row_display_name(&new_rows[i], key_field, i);
                let old_name = row_display_name(&old_rows[i], key_field, i);
                if new_name != old_name && old_name != format!("#{}", i + 1) {
                    format!("{} → {}", old_name, new_name)
                } else {
                    new_name
                }
            } else {
                format!("#{}", i + 1)
            };
            let field_diffs = row_field_diffs(&old_rows[i], &new_rows[i]);
            if field_diffs.is_empty() {
                modified_items.push(JsonValue::String(name));
            } else {
                let mut obj = serde_json::Map::new();
                obj.insert("name".to_string(), JsonValue::String(name));
                obj.insert("fields".to_string(), JsonValue::Array(
                    field_diffs.into_iter().map(JsonValue::String).collect()
                ));
                modified_items.push(JsonValue::Object(obj));
            }
        }
    }

    // Rows added (new has more)
    for i in common..new_rows.len() {
        if row_has_data(&new_rows[i]) {
            let name = if !key_field.is_empty() {
                row_display_name(&new_rows[i], key_field, i)
            } else {
                format!("#{}", i + 1)
            };
            added_items.push(JsonValue::String(name));
        }
    }

    // Rows removed (old had more)
    for i in common..old_count {
        if row_has_data(&old_rows[i]) {
            let name = if !key_field.is_empty() {
                row_display_name(&old_rows[i], key_field, i)
            } else {
                format!("#{}", i + 1)
            };
            removed_items.push(JsonValue::String(name));
        }
    }

    if added_items.is_empty() && removed_items.is_empty() && modified_items.is_empty() {
        return None;
    }

    let mut entry = serde_json::Map::new();
    entry.insert("label".to_string(), JsonValue::String(label.to_string()));

    if !added_items.is_empty() {
        entry.insert("added".to_string(), JsonValue::Array(added_items));
    }
    if !removed_items.is_empty() {
        entry.insert("removed".to_string(), JsonValue::Array(removed_items));
    }
    if !modified_items.is_empty() {
        entry.insert("modified".to_string(), JsonValue::Array(modified_items));
    }

    Some(JsonValue::Object(entry))
}

// ============================================================================
// DB impl
// ============================================================================

impl FluidChangelogEntry {
    fn from_row(row: &Row) -> Result<Self, rusqlite::Error> {
        let changes_str: String = row.get(7)?;
        let changes_json: JsonValue =
            serde_json::from_str(&changes_str).unwrap_or(JsonValue::Object(serde_json::Map::new()));

        Ok(FluidChangelogEntry {
            id: row.get(0)?,
            fluid_report_id: row.get(1)?,
            tab: row.get(2)?,
            changed_by: row.get(3)?,
            changed_by_name: row.get(4)?,
            changed_at: row.get(5)?,
            note: row.get(6)?,
            changes_json,
            created_at: row.get(8)?,
        })
    }

    /// Insert a new changelog entry.
    pub fn insert(
        conn: &Connection,
        fluid_report_id: &str,
        tab: &str,
        changed_by: &str,
        note: Option<&str>,
        changes_json: &JsonValue,
    ) -> Result<(), AppError> {
        // Don't insert if the diff is empty
        if let Some(obj) = changes_json.as_object() {
            if obj.is_empty() {
                return Ok(());
            }
        }

        let id = uuid::Uuid::new_v4().to_string();
        let now = chrono::Utc::now().to_rfc3339();
        let json_str = serde_json::to_string(changes_json).unwrap_or_else(|_| "{}".to_string());

        conn.execute(
            "INSERT INTO fluid_report_changelog
                (id, fluid_report_id, tab, changed_by, changed_at, note, changes_json, created_at, updated_at)
             VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9)",
            params![id, fluid_report_id, tab, changed_by, &now, note, json_str, &now, &now],
        )?;

        Ok(())
    }

    /// List changelog entries for a report, most recent first.
    pub fn list_for_report(
        conn: &Connection,
        fluid_report_id: &str,
    ) -> Result<Vec<FluidChangelogEntry>, AppError> {
        let sql = "SELECT c.id, c.fluid_report_id, c.tab, c.changed_by,
                          u.full_name, c.changed_at, c.note, c.changes_json, c.created_at
                   FROM fluid_report_changelog c
                   LEFT JOIN users u ON c.changed_by = u.id
                   WHERE c.fluid_report_id = ?1
                   ORDER BY c.changed_at DESC";

        let mut stmt = conn.prepare(sql)?;
        let rows = stmt
            .query_map(params![fluid_report_id], Self::from_row)?
            .collect::<Result<Vec<_>, _>>()?;

        Ok(rows)
    }
}
