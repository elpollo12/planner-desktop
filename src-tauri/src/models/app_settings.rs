use rusqlite::{Connection, Row};
use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct AppSettings {
    pub id: i32,
    pub primary_color: String,
    pub secondary_color: String,
    pub logo_path: Option<String>,
    pub notification_retention_days: i32,
    pub created_at: String,
    pub updated_at: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SaveAppSettingsInput {
    pub primary_color: Option<String>,
    pub secondary_color: Option<String>,
}

impl AppSettings {
    pub fn from_row(row: &Row) -> rusqlite::Result<Self> {
        Ok(Self {
            id: row.get(0)?,
            primary_color: row.get(1)?,
            secondary_color: row.get(2)?,
            logo_path: row.get(3)?,
            notification_retention_days: row.get(4)?,
            created_at: row.get(5)?,
            updated_at: row.get(6)?,
        })
    }

    /// Get app settings (singleton - always returns the single row)
    pub fn get(conn: &Connection) -> rusqlite::Result<Self> {
        conn.query_row(
            "SELECT id, primary_color, secondary_color, logo_path, notification_retention_days, created_at, updated_at
             FROM app_settings WHERE id = 1",
            [],
            Self::from_row,
        )
    }

    /// Update app settings (admin only)
    pub fn update(
        conn: &Connection,
        input: &SaveAppSettingsInput,
    ) -> rusqlite::Result<Self> {
        let now = chrono::Utc::now().to_rfc3339();

        // Build dynamic update query
        let mut updates = Vec::new();
        let mut params: Vec<Box<dyn rusqlite::ToSql>> = Vec::new();

        if let Some(ref primary_color) = input.primary_color {
            updates.push("primary_color = ?");
            params.push(Box::new(primary_color.clone()));
        }

        if let Some(ref secondary_color) = input.secondary_color {
            updates.push("secondary_color = ?");
            params.push(Box::new(secondary_color.clone()));
        }

        if !updates.is_empty() {
            updates.push("updated_at = ?");
            params.push(Box::new(now));

            let query = format!("UPDATE app_settings SET {} WHERE id = 1", updates.join(", "));
            let params_refs: Vec<&dyn rusqlite::ToSql> =
                params.iter().map(|p| p.as_ref()).collect();

            conn.execute(&query, params_refs.as_slice())?;
        }

        Self::get(conn)
    }

    /// Update logo path
    pub fn update_logo(conn: &Connection, logo_path: Option<&str>) -> rusqlite::Result<()> {
        let now = chrono::Utc::now().to_rfc3339();
        conn.execute(
            "UPDATE app_settings SET logo_path = ?, updated_at = ? WHERE id = 1",
            rusqlite::params![logo_path, &now],
        )?;
        Ok(())
    }
}
