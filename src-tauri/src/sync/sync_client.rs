//! HTTP client para planner-sync REST API.
//! Replaces turso_client.rs — communicates via JSON instead of Turso Pipeline API.

use serde::{Deserialize, Serialize};

/// Error de autenticación detectado en la respuesta HTTP del servidor.
/// Se distingue de errores de red para que el frontend pueda mostrar
/// un mensaje específico pidiendo reconectar sync, no un genérico "sin conexión".
pub const SYNC_AUTH_ERROR_PREFIX: &str = "SYNC_TOKEN_EXPIRED:";

#[derive(Debug, Clone)]
pub struct SyncClient {
    base_url: String,
    token: Option<String>,
    client: reqwest::Client,
}

// ─── Request/Response types (match planner-sync types.rs) ────────────────────

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct PushRequest {
    pub tables: Vec<TablePayload>,
    pub client_id: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TablePayload {
    pub name: String,
    pub columns: Vec<String>,
    pub rows: Vec<Vec<CellValue>>,
}

/// Flexible cell value — maps JSON primitives to SQLite types.
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(untagged)]
pub enum CellValue {
    Null,
    Bool(bool),
    Integer(i64),
    Float(f64),
    Text(String),
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SyncResult {
    pub success: bool,
    pub tables_synced: u32,
    pub records_pushed: u32,
    pub errors: Vec<String>,
    pub timestamp: String,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct PullResponse {
    pub tables: Vec<TablePayload>,
    pub records_pulled: u32,
    pub timestamp: String,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct LoginResponse {
    pub token: String,
    #[allow(dead_code)]
    pub expires_at: String,
    pub user: LoginUser,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct LoginUser {
    #[allow(dead_code)]
    pub id: String,
    #[allow(dead_code)]
    pub username: String,
    pub full_name: String,
    pub role: String,
}

// ─── Conversion: TursoValue <-> CellValue ────────────────────────────────────

use crate::sync::turso_client::TursoValue;

impl From<&TursoValue> for CellValue {
    fn from(tv: &TursoValue) -> Self {
        match tv {
            TursoValue::Null => CellValue::Null,
            TursoValue::Integer(s) => {
                if let Ok(i) = s.parse::<i64>() {
                    CellValue::Integer(i)
                } else {
                    CellValue::Text(s.clone())
                }
            }
            TursoValue::Float(f) => CellValue::Float(*f),
            TursoValue::Text(s) => CellValue::Text(s.clone()),
        }
    }
}

impl From<&CellValue> for TursoValue {
    fn from(cv: &CellValue) -> Self {
        match cv {
            CellValue::Null => TursoValue::Null,
            CellValue::Bool(b) => TursoValue::Integer(if *b { "1".to_string() } else { "0".to_string() }),
            CellValue::Integer(i) => TursoValue::Integer(i.to_string()),
            CellValue::Float(f) => TursoValue::Float(*f),
            CellValue::Text(s) => TursoValue::Text(s.clone()),
        }
    }
}

// ─── HTTP client helper ──────────────────────────────────────────────────────

/// Construye un reqwest::Client configurado para la URL dada.
/// Si el host es una IPv4 literal, desactiva la verificación TLS
/// (el servidor puede estar en HTTP o HTTPS sin certificado válido).
/// Para dominios de texto siempre se exige TLS válido.
pub fn build_http_client(url: &str) -> reqwest::Client {
    let host_is_ip = {
        let without_scheme = url
            .trim_start_matches("https://")
            .trim_start_matches("http://");
        let host_and_port = without_scheme.split('/').next().unwrap_or("");
        let host = if let Some(pos) = host_and_port.rfind(':') {
            &host_and_port[..pos]
        } else {
            host_and_port
        };
        let parts: Vec<&str> = host.split('.').collect();
        parts.len() == 4 && parts.iter().all(|p| p.parse::<u8>().is_ok())
    };

    reqwest::Client::builder()
        .timeout(std::time::Duration::from_secs(120))
        .danger_accept_invalid_certs(host_is_ip)
        .build()
        .unwrap_or_default()
}

// ─── Client implementation ───────────────────────────────────────────────────

impl SyncClient {
    pub fn new(base_url: &str) -> Self {
        let base_url = base_url.trim().trim_end_matches('/').to_string();
        let client = build_http_client(&base_url);
        Self {
            base_url,
            token: None,
            client,
        }
    }

    pub fn set_token(&mut self, token: String) {
        self.token = Some(token);
    }

    fn auth_header(&self) -> Result<String, String> {
        match &self.token {
            Some(t) => Ok(format!("Bearer {t}")),
            None => Err("No hay token de autenticación. Inicie sesión primero.".to_string()),
        }
    }

    /// Test connection to planner-sync server.
    pub async fn test_connection(&self) -> Result<String, String> {
        let resp = self.client
            .get(format!("{}/api/v1/health", self.base_url))
            .send()
            .await
            .map_err(|e| format!("Error de conexión: {e}"))?;

        if !resp.status().is_success() {
            return Err(format!("Servidor respondió con status {}", resp.status()));
        }

        Ok("Conexión exitosa con el servidor de sincronización".to_string())
    }

    /// Login to planner-sync and get JWT token.
    pub async fn login(&mut self, username: &str, password: &str) -> Result<LoginResponse, String> {
        let body = serde_json::json!({
            "username": username,
            "password": password,
        });

        let resp = self.client
            .post(format!("{}/api/v1/auth/login", self.base_url))
            .json(&body)
            .send()
            .await
            .map_err(|e| format!("Error de conexión al login: {e}"))?;

        if !resp.status().is_success() {
            let status = resp.status();
            let body = resp.text().await.unwrap_or_default();
            return Err(format!("Login fallido ({}): {}", status, body));
        }

        let login: LoginResponse = resp.json().await
            .map_err(|e| format!("Error parseando respuesta de login: {e}"))?;

        self.token = Some(login.token.clone());
        Ok(login)
    }

    /// Push tables to planner-sync.
    pub async fn push(&self, tables: Vec<TablePayload>) -> Result<SyncResult, String> {
        let auth = self.auth_header()?;
        let request = PushRequest {
            tables,
            client_id: None,
        };

        let resp = self.client
            .post(format!("{}/api/v1/sync/push", self.base_url))
            .header("Authorization", &auth)
            .header("X-App-Version", env!("CARGO_PKG_VERSION"))
            .json(&request)
            .send()
            .await
            .map_err(|e| format!("Error de conexión al push: {e}"))?;

        if !resp.status().is_success() {
            let status = resp.status();
            let body = resp.text().await.unwrap_or_default();
            if status == reqwest::StatusCode::UNAUTHORIZED {
                return Err(format!("{}Token de sincronización expirado. Reconecte sync desde el Panel de Administración.", SYNC_AUTH_ERROR_PREFIX));
            }
            return Err(format!("Push fallido ({}): {}", status, body));
        }

        resp.json::<SyncResult>().await
            .map_err(|e| format!("Error parseando respuesta de push: {e}"))
    }

    /// Pull tables from planner-sync (incremental or full).
    pub async fn pull(&self, since: Option<&str>) -> Result<PullResponse, String> {
        let auth = self.auth_header()?;
        let url = match since {
            Some(ts) => format!("{}/api/v1/sync/pull?since={}", self.base_url, urlencoding::encode(ts)),
            None => format!("{}/api/v1/sync/pull", self.base_url),
        };

        let resp = self.client
            .get(&url)
            .header("Authorization", &auth)
            .header("X-App-Version", env!("CARGO_PKG_VERSION"))
            .send()
            .await
            .map_err(|e| format!("Error de conexión al pull: {e}"))?;

        if !resp.status().is_success() {
            let status = resp.status();
            let body = resp.text().await.unwrap_or_default();
            if status == reqwest::StatusCode::UNAUTHORIZED {
                return Err(format!("{}Token de sincronización expirado. Reconecte sync desde el Panel de Administración.", SYNC_AUTH_ERROR_PREFIX));
            }
            return Err(format!("Pull fallido ({}): {}", status, body));
        }

        resp.json::<PullResponse>().await
            .map_err(|e| format!("Error parseando respuesta de pull: {e}"))
    }
}
