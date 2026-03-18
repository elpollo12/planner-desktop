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

/// Extract a display name from a row using the key field, or fall back to index.
fn row_display_name(row: &JsonValue, key_field: &str, index: usize) -> String {
    row.as_object()
        .and_then(|obj| obj.get(key_field))
        .and_then(|v| v.as_str())
        .filter(|s| !s.is_empty())
        .map(|s| s.to_string())
        .unwrap_or_else(|| format!("#{}", index + 1))
}

/// Check if a row has any meaningful (non-null, non-empty) data.
fn row_has_data(row: &JsonValue) -> bool {
    row.as_object()
        .map(|obj| {
            obj.values().any(|v| {
                !v.is_null() && v.as_str().map(|s| !s.is_empty()).unwrap_or(true)
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
        if old_rows[i] != new_rows[i] {
            let name = if !key_field.is_empty() {
                // Use new name if available, fallback to old
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
            modified_items.push(JsonValue::String(name));
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
        let name = if !key_field.is_empty() {
            row_display_name(&old_rows[i], key_field, i)
        } else {
            format!("#{}", i + 1)
        };
        removed_items.push(JsonValue::String(name));
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
