pub mod auth;
pub mod users;
pub mod reports;
pub mod drill_string;
pub mod crew;
pub mod bit_records;
pub mod operation_codes;

// Re-export all command handlers for Tauri
// Allow unused imports as these are registered in main.rs
#[allow(unused_imports)]
pub use auth::*;
#[allow(unused_imports)]
pub use users::*;
#[allow(unused_imports)]
pub use reports::*;
#[allow(unused_imports)]
pub use drill_string::*;
#[allow(unused_imports)]
pub use crew::*;
#[allow(unused_imports)]
pub use bit_records::*;
#[allow(unused_imports)]
pub use operation_codes::*;