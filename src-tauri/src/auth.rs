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
    let session = get_session(session_token, state)?;

    // Parse the user's role
    let user_role = UserRole::from_str(&session.role)?;

    // Check if user has required permission
    if !user_role.has_permission(&required_role) {
        return Err(AppError::PermissionDenied(format!(
            "Required role: {:?}, user role: {:?}",
            required_role, user_role
        )));
    }

    Ok(session)
}

/// Get session info without checking permissions.
/// Returns InvalidSession if the token is missing or expired.
pub fn get_session(session_token: &str, state: &AppState) -> Result<SessionInfo, AppError> {
    let session = {
        let sessions = state
            .sessions
            .lock()
            .map_err(|e| AppError::Internal(format!("Failed to lock sessions: {}", e)))?;

        sessions
            .get(session_token)
            .cloned()
            .ok_or(AppError::InvalidSession)?
    };

    // Check expiry
    let expires_at = chrono::DateTime::parse_from_rfc3339(&session.expires_at)
        .map_err(|_| AppError::Internal("Invalid session expiry format".to_string()))?;

    if chrono::Utc::now() >= expires_at {
        // Remove expired session from memory
        let mut sessions_mut = state
            .sessions
            .lock()
            .map_err(|e| AppError::Internal(format!("Failed to lock sessions: {}", e)))?;
        sessions_mut.remove(session_token);
        return Err(AppError::InvalidSession);
    }

    Ok(session)
}
