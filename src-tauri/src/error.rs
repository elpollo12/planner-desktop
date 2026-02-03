use thiserror::Error;

#[derive(Error, Debug)]
#[allow(dead_code)]
pub enum AppError {
    #[error("Database error: {0}")]
    Database(#[from] rusqlite::Error),

    #[error("Authentication failed: {0}")]
    AuthenticationFailed(String),

    #[error("Permission denied: {0}")]
    PermissionDenied(String),

    #[error("Not found: {0}")]
    NotFound(String),

    #[error("Validation error: {0}")]
    ValidationError(String),

    #[error("Invalid session")]
    InvalidSession,

    #[error("Password hashing error: {0}")]
    PasswordHashError(#[from] bcrypt::BcryptError),

    #[error("Migration error: {0}")]
    MigrationError(String),

    #[error("Internal error: {0}")]
    Internal(String),
}

// Implement Serialize for Tauri compatibility
impl serde::Serialize for AppError {
    fn serialize<S>(&self, serializer: S) -> Result<S::Ok, S::Error>
    where
        S: serde::Serializer,
    {
        serializer.serialize_str(&self.to_string())
    }
}
