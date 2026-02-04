use crate::error::AppError;
use crate::models::user::UserRole;
use crate::state::{AppState, SessionInfo};

/// Hash a password using bcrypt with cost factor 12
pub fn hash_password(password: &str) -> Result<String, AppError> {
    bcrypt::hash(password, 12).map_err(|e| AppError::PasswordHashError(e))
}

/// Verify a password against a bcrypt hash
pub fn verify_password(password: &str, hash: &str) -> Result<bool, AppError> {
    bcrypt::verify(password, hash).map_err(|e| AppError::PasswordHashError(e))
}

/// Check if a session token is valid and has the required permission
pub fn check_permission(
    session_token: &str,
    required_role: UserRole,
    state: &AppState,
) -> Result<SessionInfo, AppError> {
    let sessions = state
        .sessions
        .lock()
        .map_err(|e| AppError::Internal(format!("Failed to lock sessions: {}", e)))?;

    let session = sessions
        .get(session_token)
        .ok_or(AppError::InvalidSession)?;

    // Parse the user's role
    let user_role = UserRole::from_str(&session.role)?;

    // Check if user has required permission
    if !user_role.has_permission(&required_role) {
        return Err(AppError::PermissionDenied(format!(
            "Required role: {:?}, user role: {:?}",
            required_role, user_role
        )));
    }

    Ok(session.clone())
}

/// Get session info without checking permissions
pub fn get_session(session_token: &str, state: &AppState) -> Result<SessionInfo, AppError> {
    let sessions = state
        .sessions
        .lock()
        .map_err(|e| AppError::Internal(format!("Failed to lock sessions: {}", e)))?;

    sessions
        .get(session_token)
        .cloned()
        .ok_or(AppError::InvalidSession)
}
