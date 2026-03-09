pub mod auth;
pub mod users;
pub mod reports;
pub mod drill_string;
pub mod crew;
pub mod bit_records;
pub mod operation_codes;
pub mod mud;
pub mod time_distribution;
pub mod drilling_params;
pub mod deviation;
pub mod operations_log;
pub mod areas;
pub mod rigs;
pub mod preferences;
pub mod sync;
pub mod companies;
pub mod app_settings;
pub mod rig_personnel;
pub mod rig_contractors;
pub mod logistics_water;
pub mod logistics_fuel;
pub mod logistics_vacuum;
pub mod logistics_materials;
pub mod logistics_requests;
pub mod incidents;
pub mod incident_types;
pub mod crew_positions;
pub mod license;
pub mod last_report_snapshot;
pub mod report_reviews;
pub mod notifications;
pub mod admin_stats;
pub mod module_permissions;
pub mod cloud_logs;
pub mod updates;
pub mod backup;

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
#[allow(unused_imports)]
pub use mud::*;
#[allow(unused_imports)]
pub use time_distribution::*;
#[allow(unused_imports)]
pub use drilling_params::*;
#[allow(unused_imports)]
pub use deviation::*;
#[allow(unused_imports)]
pub use operations_log::*;
#[allow(unused_imports)]
pub use areas::*;
#[allow(unused_imports)]
pub use rigs::*;
#[allow(unused_imports)]
pub use preferences::*;
#[allow(unused_imports)]
pub use companies::*;
#[allow(unused_imports)]
pub use app_settings::*;
#[allow(unused_imports)]
pub use rig_personnel::*;
#[allow(unused_imports)]
pub use rig_contractors::*;
#[allow(unused_imports)]
pub use logistics_water::*;
#[allow(unused_imports)]
pub use logistics_fuel::*;
#[allow(unused_imports)]
pub use logistics_vacuum::*;
#[allow(unused_imports)]
pub use logistics_materials::*;
#[allow(unused_imports)]
pub use logistics_requests::*;
#[allow(unused_imports)]
pub use incidents::*;
#[allow(unused_imports)]
pub use incident_types::*;
#[allow(unused_imports)]
pub use crew_positions::*;
#[allow(unused_imports)]
pub use license::*;
#[allow(unused_imports)]
pub use last_report_snapshot::*;
#[allow(unused_imports)]
pub use report_reviews::*;
#[allow(unused_imports)]
pub use notifications::*;
#[allow(unused_imports)]
pub use admin_stats::*;
#[allow(unused_imports)]
pub use module_permissions::*;
#[allow(unused_imports)]
pub use cloud_logs::*;
#[allow(unused_imports)]
pub use updates::*;
#[allow(unused_imports)]
pub use backup::*;
