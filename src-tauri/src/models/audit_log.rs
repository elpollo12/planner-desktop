use rusqlite::Connection;
use serde::{Deserialize, Serialize};

// ─── Constantes de acción ─────────────────────────────────────────────────────

pub const AUDIT_LOGIN_SUCCESS:       &str = "LOGIN_SUCCESS";
pub const AUDIT_LOGOUT:              &str = "LOGOUT";
pub const AUDIT_CREATE_USER:         &str = "CREATE_USER";
pub const AUDIT_UPDATE_USER:         &str = "UPDATE_USER";
pub const AUDIT_DELETE_USER:         &str = "DELETE_USER";
pub const AUDIT_CHANGE_PASSWORD:     &str = "CHANGE_PASSWORD";
pub const AUDIT_UPDATE_APP_SETTINGS: &str = "UPDATE_APP_SETTINGS";
pub const AUDIT_UPLOAD_LOGO:         &str = "UPLOAD_LOGO";
pub const AUDIT_REMOVE_LOGO:         &str = "REMOVE_LOGO";
pub const AUDIT_ACTIVATE_LICENSE:    &str = "ACTIVATE_LICENSE";
pub const AUDIT_CONNECT_SYNC:        &str = "CONNECT_SYNC";
pub const AUDIT_DISCONNECT_SYNC:     &str = "DISCONNECT_SYNC";

// ─── Tipos ────────────────────────────────────────────────────────────────────

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct AuditEntry {
    pub id:          String,
    pub actor_id:    String,
    pub actor_name:  String,
    pub action:      String,
    pub target_type: Option<String>,
    pub target_id:   Option<String>,
    pub target_name: Option<String>,
    pub detail:      Option<String>, // JSON serializado
    pub created_at:  String,
}

/// Datos para insertar una entrada nueva.
/// Sin `id` ni `created_at` — los genera el modelo.
pub struct NewAuditEntry<'a> {
    pub actor_id:    &'a str,
    pub actor_name:  &'a str,
    pub action:      &'a str,
    pub target_type: Option<&'a str>,
    pub target_id:   Option<&'a str>,
    pub target_name: Option<&'a str>,
    /// Detail ya serializado como JSON string, o None
    pub detail:      Option<String>,
}

// ─── Implementación ───────────────────────────────────────────────────────────

impl AuditEntry {
    /// Inserta una entrada en el audit_log.
    /// Silencioso: nunca hace panic ni retorna error al caller —
    /// un fallo de audit no debe interrumpir la operación principal.
    pub fn record(conn: &Connection, entry: NewAuditEntry<'_>) {
        let id = uuid::Uuid::new_v4().to_string();
        let now = chrono::Utc::now().to_rfc3339();

        let result = conn.execute(
            "INSERT INTO audit_log
             (id, actor_id, actor_name, action, target_type, target_id, target_name, detail, created_at)
             VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9)",
            rusqlite::params![
                id,
                entry.actor_id,
                entry.actor_name,
                entry.action,
                entry.target_type,
                entry.target_id,
                entry.target_name,
                entry.detail,
                now,
            ],
        );

        if let Err(e) = result {
            println!("[Audit] Error al registrar acción '{}': {}", entry.action, e);
        }
    }

    /// Lista entradas con paginación y filtro opcional por acción.
    pub fn list(
        conn: &Connection,
        page: u32,
        page_size: u32,
        action_filter: Option<&str>,
    ) -> Result<Vec<AuditEntry>, rusqlite::Error> {
        let offset = page * page_size;

        let entries = if let Some(action) = action_filter {
            let mut stmt = conn.prepare(
                "SELECT id, actor_id, actor_name, action, target_type, target_id, target_name, detail, created_at
                 FROM audit_log
                 WHERE action = ?1
                 ORDER BY created_at DESC
                 LIMIT ?2 OFFSET ?3",
            )?;
            let rows = stmt.query_map(
                rusqlite::params![action, page_size, offset],
                Self::row_to_entry,
            )?.collect::<Result<Vec<_>, _>>()?;
            rows
        } else {
            let mut stmt = conn.prepare(
                "SELECT id, actor_id, actor_name, action, target_type, target_id, target_name, detail, created_at
                 FROM audit_log
                 ORDER BY created_at DESC
                 LIMIT ?1 OFFSET ?2",
            )?;
            let rows = stmt.query_map(
                rusqlite::params![page_size, offset],
                Self::row_to_entry,
            )?.collect::<Result<Vec<_>, _>>()?;
            rows
        };

        Ok(entries)
    }

    /// Cuenta total de entradas (para paginación en el frontend).
    pub fn count(
        conn: &Connection,
        action_filter: Option<&str>,
    ) -> Result<u32, rusqlite::Error> {
        let count: u32 = if let Some(action) = action_filter {
            conn.query_row(
                "SELECT COUNT(*) FROM audit_log WHERE action = ?1",
                rusqlite::params![action],
                |row| row.get(0),
            )?
        } else {
            conn.query_row(
                "SELECT COUNT(*) FROM audit_log",
                [],
                |row| row.get(0),
            )?
        };
        Ok(count)
    }

    /// Elimina entradas más antiguas que `retention_days`.
    /// Llamado desde la tarea de limpieza de notificaciones o desde un cron.
    pub fn purge_old(conn: &Connection, retention_days: i64) {
        let threshold = (chrono::Utc::now() - chrono::Duration::days(retention_days)).to_rfc3339();
        let result = conn.execute(
            "DELETE FROM audit_log WHERE created_at < ?1",
            rusqlite::params![threshold],
        );
        match result {
            Ok(n) if n > 0 => println!("[Audit] Purge: {} entradas eliminadas (>{} días)", n, retention_days),
            Err(e)         => println!("[Audit] Error en purge: {}", e),
            _              => {}
        }
    }

    fn row_to_entry(row: &rusqlite::Row<'_>) -> rusqlite::Result<AuditEntry> {
        Ok(AuditEntry {
            id:          row.get(0)?,
            actor_id:    row.get(1)?,
            actor_name:  row.get(2)?,
            action:      row.get(3)?,
            target_type: row.get(4)?,
            target_id:   row.get(5)?,
            target_name: row.get(6)?,
            detail:      row.get(7)?,
            created_at:  row.get(8)?,
        })
    }
}
