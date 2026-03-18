#![allow(dead_code)]

use crate::error::AppError;
use rusqlite::{params, Connection, Row};
use serde::{Deserialize, Serialize};
use std::collections::HashMap;

// ============================================================================
// Module Permission Model
// ============================================================================
// Granular per-user overrides on top of role-based defaults.
// If no override exists for (user_id, module), the role default applies.
// Admin users always have full access — this table is ignored for them.
// ============================================================================

/// Valid application modules (flat — no sub-modules).
/// MUST stay in sync with `APP_MODULES` in src/types/user.ts.
const VALID_MODULES: &[&str] = &[
    "dashboard",
    "reports",
    "approvals",
    "logistics",
    "incidents",
    "admin",
    "cloud-logs",
    "fluids",
];

/// A single override row from `user_module_permissions`
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ModulePermission {
    pub id: String,
    pub user_id: String,
    pub module: String,
    pub granted: bool,
    pub assigned_by: Option<String>,
    pub created_at: String,
    pub updated_at: String,
}

impl ModulePermission {
    fn from_row(row: &Row) -> Result<Self, rusqlite::Error> {
        Ok(ModulePermission {
            id: row.get(0)?,
            user_id: row.get(1)?,
            module: row.get(2)?,
            granted: row.get::<_, i32>(3)? == 1,
            assigned_by: row.get(4)?,
            created_at: row.get(5)?,
            updated_at: row.get(6)?,
        })
    }

    // ========================================================================
    // Role Defaults
    // ========================================================================

    /// Returns the default module access map for a given role.
    /// Admin always gets all-true (enforced at a higher level too).
    ///
    /// MUST stay in sync with `MODULE_DEFAULTS` in src/types/user.ts (frontend fallback).
    /// The backend is the authoritative source at runtime — the frontend value is only
    /// used as a loading-state fallback before `modulePermissions` is populated.
    pub fn role_defaults(role: &str) -> HashMap<String, bool> {
        match role {
            "operator" => HashMap::from([
                ("dashboard".into(), true),
                ("reports".into(), true),
                ("approvals".into(), false),
                ("logistics".into(), true),
                ("incidents".into(), true),
                ("admin".into(), false),
                ("cloud-logs".into(), true),
                ("fluids".into(), true),
            ]),
            "supervisor" => HashMap::from([
                ("dashboard".into(), true),
                ("reports".into(), true),
                ("approvals".into(), true),
                ("logistics".into(), true),
                ("incidents".into(), true),
                ("admin".into(), false),
                ("cloud-logs".into(), true),
                ("fluids".into(), true),
            ]),
            "admin" => HashMap::from([
                ("dashboard".into(), true),
                ("reports".into(), true),
                ("approvals".into(), true),
                ("logistics".into(), true),
                ("incidents".into(), true),
                ("admin".into(), true),
                ("cloud-logs".into(), true),
                ("fluids".into(), true),
            ]),
            _ => HashMap::new(),
        }
    }

    // ========================================================================
    // Queries
    // ========================================================================

    /// Get all overrides for a user (raw rows from DB).
    pub fn get_overrides(
        conn: &Connection,
        user_id: &str,
    ) -> Result<Vec<ModulePermission>, AppError> {
        let mut stmt = conn.prepare(
            "SELECT id, user_id, module, granted, assigned_by, created_at, updated_at
             FROM user_module_permissions WHERE user_id = ?1",
        )?;

        let perms = stmt
            .query_map(params![user_id], ModulePermission::from_row)?
            .collect::<Result<Vec<_>, _>>()?;

        Ok(perms)
    }

    /// Get the **resolved** permissions for a user: role defaults merged with
    /// any per-user overrides. Returns a map of module → granted.
    ///
    /// For admin users, always returns all-true (overrides are ignored).
    pub fn get_resolved(
        conn: &Connection,
        user_id: &str,
        role: &str,
    ) -> Result<HashMap<String, bool>, AppError> {
        // Admin always has full access
        if role == "admin" {
            return Ok(Self::role_defaults("admin"));
        }

        // Start with role defaults
        let mut resolved = Self::role_defaults(role);

        // Apply overrides from DB
        let overrides = Self::get_overrides(conn, user_id)?;
        for perm in overrides {
            resolved.insert(perm.module, perm.granted);
        }

        Ok(resolved)
    }

    // ========================================================================
    // Mutations
    // ========================================================================

    /// Set a single module permission override for a user.
    /// Uses INSERT OR REPLACE (UPSERT) on the UNIQUE(user_id, module) constraint.
    pub fn set_permission(
        conn: &Connection,
        user_id: &str,
        module: &str,
        granted: bool,
        assigned_by: Option<&str>,
    ) -> Result<(), AppError> {
        // Validate module name
        if !VALID_MODULES.contains(&module) {
            return Err(AppError::ValidationError(format!(
                "Invalid module: '{}'. Valid modules: {:?}",
                module, VALID_MODULES
            )));
        }

        let now = chrono::Utc::now().to_rfc3339();
        let id = uuid::Uuid::new_v4().to_string();

        // UPSERT: if (user_id, module) exists, update granted + updated_at.
        // Otherwise insert a new row.
        conn.execute(
            "INSERT INTO user_module_permissions (id, user_id, module, granted, assigned_by, created_at, updated_at)
             VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7)
             ON CONFLICT(user_id, module) DO UPDATE SET
                granted = excluded.granted,
                assigned_by = excluded.assigned_by,
                updated_at = excluded.updated_at",
            params![
                &id,
                user_id,
                module,
                if granted { 1 } else { 0 },
                assigned_by,
                &now,
                &now,
            ],
        )?;

        Ok(())
    }

    /// Remove a single override, reverting to the role default.
    pub fn delete_permission(
        conn: &Connection,
        user_id: &str,
        module: &str,
    ) -> Result<(), AppError> {
        conn.execute(
            "DELETE FROM user_module_permissions WHERE user_id = ?1 AND module = ?2",
            params![user_id, module],
        )?;
        Ok(())
    }

    /// Remove ALL overrides for a user (e.g. when changing roles).
    pub fn delete_all_for_user(
        conn: &Connection,
        user_id: &str,
    ) -> Result<(), AppError> {
        conn.execute(
            "DELETE FROM user_module_permissions WHERE user_id = ?1",
            params![user_id],
        )?;
        Ok(())
    }

    /// Bulk-save permissions for a user. Compares each value against the role
    /// default: if it matches the default → delete any override (keep table clean).
    /// If it differs → upsert the override.
    ///
    /// This is the primary method called from the admin UI.
    pub fn save_bulk(
        conn: &Connection,
        user_id: &str,
        role: &str,
        permissions: &HashMap<String, bool>,
        assigned_by: Option<&str>,
    ) -> Result<(), AppError> {
        let defaults = Self::role_defaults(role);

        for (module, &granted) in permissions {
            // Validate module
            if !VALID_MODULES.contains(&module.as_str()) {
                continue; // Skip unknown modules silently
            }

            let default_value = defaults.get(module.as_str()).copied().unwrap_or(false);

            if granted == default_value {
                // Matches role default → remove any override to keep table clean
                Self::delete_permission(conn, user_id, module)?;
            } else {
                // Differs from default → upsert override
                Self::set_permission(conn, user_id, module, granted, assigned_by)?;
            }
        }

        Ok(())
    }
}
