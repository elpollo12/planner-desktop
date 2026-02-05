use serde::{Deserialize, Serialize};

/// Turso HTTP API client using the Pipeline endpoint
/// Reference: https://docs.turso.tech/sdk/http/reference

#[derive(Debug, Clone)]
pub struct TursoClient {
    url: String,
    auth_token: String,
    client: reqwest::Client,
}

// --- Request types ---

#[derive(Debug, Serialize)]
pub struct PipelineRequest {
    pub requests: Vec<StreamRequest>,
}

#[derive(Debug, Serialize)]
#[serde(tag = "type")]
pub enum StreamRequest {
    #[serde(rename = "execute")]
    Execute { stmt: Statement },
    #[serde(rename = "close")]
    Close,
}

#[derive(Debug, Serialize)]
pub struct Statement {
    pub sql: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub args: Option<Vec<TursoValue>>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(tag = "type", content = "value")]
pub enum TursoValue {
    #[serde(rename = "null")]
    Null,
    #[serde(rename = "integer")]
    Integer(String),
    #[serde(rename = "float")]
    Float(f64),
    #[serde(rename = "text")]
    Text(String),
}

// --- Response types ---

#[derive(Debug, Deserialize)]
pub struct PipelineResponse {
    pub results: Vec<StreamResult>,
}

#[derive(Debug, Deserialize)]
#[serde(tag = "type")]
pub enum StreamResult {
    #[serde(rename = "ok")]
    Ok { response: StreamResponse },
    #[serde(rename = "error")]
    Error { error: TursoError },
}

#[derive(Debug, Deserialize)]
#[serde(tag = "type")]
pub enum StreamResponse {
    #[serde(rename = "execute")]
    Execute { result: ExecuteResult },
    #[serde(rename = "close")]
    Close,
}

#[derive(Debug, Deserialize)]
pub struct ExecuteResult {
    pub cols: Vec<Column>,
    pub rows: Vec<Vec<TursoValue>>,
    pub affected_row_count: u64,
}

#[derive(Debug, Deserialize)]
pub struct Column {
    pub name: String,
    #[serde(default)]
    pub decltype: Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct TursoError {
    pub message: String,
    #[serde(default)]
    pub code: Option<String>,
}

impl TursoClient {
    pub fn new(url: &str, auth_token: &str) -> Self {
        // Normalize URL: ensure it's HTTPS and has no trailing slash
        let url = url.trim().trim_end_matches('/').to_string();
        let url = if url.starts_with("libsql://") {
            url.replace("libsql://", "https://")
        } else if !url.starts_with("https://") && !url.starts_with("http://") {
            format!("https://{}", url)
        } else {
            url
        };

        let client = reqwest::Client::new();

        Self {
            url,
            auth_token: auth_token.trim().to_string(),
            client,
        }
    }

    /// Execute a single SQL statement on Turso
    pub async fn execute(
        &self,
        sql: &str,
        args: Vec<TursoValue>,
    ) -> Result<ExecuteResult, String> {
        let request = PipelineRequest {
            requests: vec![
                StreamRequest::Execute {
                    stmt: Statement {
                        sql: sql.to_string(),
                        args: if args.is_empty() { None } else { Some(args) },
                    },
                },
                StreamRequest::Close,
            ],
        };

        let response = self
            .client
            .post(format!("{}/v2/pipeline", self.url))
            .header("Authorization", format!("Bearer {}", self.auth_token))
            .json(&request)
            .send()
            .await
            .map_err(|e| format!("HTTP request failed: {}", e))?;

        if !response.status().is_success() {
            let status = response.status();
            let body = response.text().await.unwrap_or_default();
            return Err(format!("Turso API error ({}): {}", status, body));
        }

        let pipeline_response: PipelineResponse = response
            .json()
            .await
            .map_err(|e| format!("Failed to parse Turso response: {}", e))?;

        // Get the first result (our execute statement)
        match pipeline_response.results.into_iter().next() {
            Some(StreamResult::Ok { response }) => match response {
                StreamResponse::Execute { result } => Ok(result),
                StreamResponse::Close => Err("Unexpected close response".to_string()),
            },
            Some(StreamResult::Error { error }) => {
                Err(format!("Turso SQL error: {}", error.message))
            }
            None => Err("No results in Turso response".to_string()),
        }
    }

    /// Execute multiple SQL statements in a single pipeline request
    pub async fn execute_batch(
        &self,
        statements: Vec<(String, Vec<TursoValue>)>,
    ) -> Result<Vec<ExecuteResult>, String> {
        if statements.is_empty() {
            return Ok(vec![]);
        }

        let mut requests: Vec<StreamRequest> = statements
            .into_iter()
            .map(|(sql, args)| StreamRequest::Execute {
                stmt: Statement {
                    sql,
                    args: if args.is_empty() { None } else { Some(args) },
                },
            })
            .collect();

        requests.push(StreamRequest::Close);

        let request = PipelineRequest { requests };

        let response = self
            .client
            .post(format!("{}/v2/pipeline", self.url))
            .header("Authorization", format!("Bearer {}", self.auth_token))
            .json(&request)
            .send()
            .await
            .map_err(|e| format!("HTTP request failed: {}", e))?;

        if !response.status().is_success() {
            let status = response.status();
            let body = response.text().await.unwrap_or_default();
            return Err(format!("Turso API error ({}): {}", status, body));
        }

        let pipeline_response: PipelineResponse = response
            .json()
            .await
            .map_err(|e| format!("Failed to parse Turso response: {}", e))?;

        let mut results = Vec::new();
        for stream_result in pipeline_response.results {
            match stream_result {
                StreamResult::Ok { response } => match response {
                    StreamResponse::Execute { result } => results.push(result),
                    StreamResponse::Close => {} // skip close
                },
                StreamResult::Error { error } => {
                    return Err(format!("Turso SQL error: {}", error.message));
                }
            }
        }

        Ok(results)
    }

    /// Test the connection to Turso
    pub async fn test_connection(&self) -> Result<String, String> {
        let result = self.execute("SELECT 'connected' as status", vec![]).await?;
        if let Some(row) = result.rows.first() {
            if let Some(TursoValue::Text(val)) = row.first() {
                return Ok(val.clone());
            }
        }
        Ok("connected".to_string())
    }
}

// Helper to convert rusqlite values to TursoValue
impl TursoValue {
    pub fn text(s: &str) -> Self {
        TursoValue::Text(s.to_string())
    }

    pub fn integer(i: i64) -> Self {
        TursoValue::Integer(i.to_string())
    }

    pub fn null() -> Self {
        TursoValue::Null
    }

    pub fn as_text(&self) -> Option<&str> {
        match self {
            TursoValue::Text(s) => Some(s),
            _ => None,
        }
    }

    pub fn as_integer(&self) -> Option<i64> {
        match self {
            TursoValue::Integer(s) => s.parse().ok(),
            _ => None,
        }
    }

    pub fn as_optional_text(&self) -> Option<String> {
        match self {
            TursoValue::Text(s) => Some(s.clone()),
            TursoValue::Null => None,
            _ => None,
        }
    }
}
