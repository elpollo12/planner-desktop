#![allow(dead_code)]

use crate::error::AppError;
use rusqlite::{params, Connection, Row};
use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct OperationCode {
    pub id: String,
    pub code: String,
    pub name: String,
    pub category: Option<String>,
    pub sort_order: i32,
    pub active: bool,
    pub created_by: Option<String>,
    pub updated_by: Option<String>,
    pub created_at: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CreateOperationCodeRequest {
    pub code: String,
    pub name: String,
    pub category: Option<String>,
    pub sort_order: Option<i32>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct UpdateOperationCodeRequest {
    pub code: Option<String>,
    pub name: Option<String>,
    pub category: Option<String>,
    pub sort_order: Option<i32>,
    pub active: Option<bool>,
}

impl OperationCode {
    fn from_row(row: &Row) -> Result<Self, rusqlite::Error> {
        Ok(OperationCode {
            id: row.get(0)?,
            code: row.get(1)?,
            name: row.get(2)?,
            category: row.get(3)?,
            sort_order: row.get(4)?,
            active: row.get::<_, i32>(5)? == 1,
            created_by: row.get(6)?,
            updated_by: row.get(7)?,
            created_at: row.get(8)?,
        })
    }

    pub fn create(
        conn: &Connection,
        request: &CreateOperationCodeRequest,
        created_by: Option<String>,
    ) -> Result<OperationCode, AppError> {
        let id = uuid::Uuid::new_v4().to_string();
        let now = chrono::Utc::now().to_rfc3339();

        conn.execute(
            "INSERT INTO operation_codes (id, code, name, category, sort_order, active, created_by, created_at)
             VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8)",
            params![
                &id,
                &request.code,
                &request.name,
                &request.category,
                request.sort_order.unwrap_or(0),
                1,
                &created_by,
                &now
            ],
        )?;

        OperationCode::get_by_id(conn, &id)
    }

    pub fn get_by_id(conn: &Connection, id: &str) -> Result<OperationCode, AppError> {
        let code = conn.query_row(
            "SELECT id, code, name, category, sort_order, active, created_by, updated_by, created_at
             FROM operation_codes WHERE id = ?1",
            params![id],
            OperationCode::from_row,
        )?;

        Ok(code)
    }

    pub fn list(conn: &Connection, active_only: bool) -> Result<Vec<OperationCode>, AppError> {
        let query = if active_only {
            "SELECT id, code, name, category, sort_order, active, created_by, updated_by, created_at
             FROM operation_codes WHERE active = 1 ORDER BY sort_order, code"
        } else {
            "SELECT id, code, name, category, sort_order, active, created_by, updated_by, created_at
             FROM operation_codes ORDER BY sort_order, code"
        };

        let mut stmt = conn.prepare(query)?;
        let codes = stmt
            .query_map([], OperationCode::from_row)?
            .collect::<Result<Vec<_>, _>>()?;

        Ok(codes)
    }

    pub fn update(
        conn: &Connection,
        id: &str,
        request: &UpdateOperationCodeRequest,
        updated_by: Option<String>,
    ) -> Result<OperationCode, AppError> {
        let mut updates = Vec::new();
        let mut params_vec: Vec<Box<dyn rusqlite::ToSql>> = Vec::new();

        if let Some(ref code) = request.code {
            updates.push("code = ?");
            params_vec.push(Box::new(code.clone()));
        }
        if let Some(ref name) = request.name {
            updates.push("name = ?");
            params_vec.push(Box::new(name.clone()));
        }
        if let Some(ref category) = request.category {
            updates.push("category = ?");
            params_vec.push(Box::new(category.clone()));
        }
        if let Some(sort_order) = request.sort_order {
            updates.push("sort_order = ?");
            params_vec.push(Box::new(sort_order));
        }
        if let Some(active) = request.active {
            updates.push("active = ?");
            params_vec.push(Box::new(if active { 1 } else { 0 }));
        }

        updates.push("updated_by = ?");
        params_vec.push(Box::new(updated_by.clone()));

        params_vec.push(Box::new(id.to_string()));

        let query = format!("UPDATE operation_codes SET {} WHERE id = ?", updates.join(", "));
        let params_refs: Vec<&dyn rusqlite::ToSql> = params_vec.iter().map(|p| p.as_ref()).collect();

        conn.execute(&query, params_refs.as_slice())?;

        OperationCode::get_by_id(conn, id)
    }

    pub fn delete(conn: &Connection, id: &str) -> Result<(), AppError> {
        conn.execute("DELETE FROM operation_codes WHERE id = ?1", params![id])?;
        Ok(())
    }
}
