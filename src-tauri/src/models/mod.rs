pub mod user;
pub mod report;
pub mod drill_string;
pub mod crew;
pub mod operation_code;
pub mod time_distribution;
pub mod bit_record;
pub mod mud;
pub mod drilling_params;
pub mod deviation;
pub mod operations_log;
pub mod area;
pub mod rig;
pub mod user_preferences;
pub mod company;
pub mod app_settings;
pub mod rig_personnel;
pub mod rig_contractor;
pub mod logistics;
pub mod incident;
pub mod incident_type;
pub mod crew_position;
pub mod last_report_snapshot;
pub mod report_review;
pub mod notification;
pub mod admin_stats;
pub mod module_permission;
pub mod update_preferences;
pub mod audit_log;
pub mod fluid_product_catalog;
pub mod fluid_report;
pub mod fluid_props;
pub mod fluid_inventory;
pub mod fluid_tanks;
pub mod fluid_activity;

// Re-export commonly used types
#[allow(unused_imports)]
pub use user::*;
#[allow(unused_imports)]
pub use report::*;
#[allow(unused_imports)]
pub use operation_code::*;
#[allow(unused_imports)]
pub use drill_string::*;
#[allow(unused_imports)]
pub use crew::*;
#[allow(unused_imports)]
pub use time_distribution::*;
#[allow(unused_imports)]
pub use bit_record::*;
#[allow(unused_imports)]
pub use mud::*;
#[allow(unused_imports)]
pub use drilling_params::*;
#[allow(unused_imports)]
pub use deviation::*;
#[allow(unused_imports)]
pub use operations_log::*;
#[allow(unused_imports)]
pub use area::*;
#[allow(unused_imports)]
pub use rig::*;
#[allow(unused_imports)]
pub use user_preferences::*;
#[allow(unused_imports)]
pub use company::*;
#[allow(unused_imports)]
pub use app_settings::*;
#[allow(unused_imports)]
pub use rig_personnel::*;
#[allow(unused_imports)]
pub use rig_contractor::*;
#[allow(unused_imports)]
pub use logistics::*;
#[allow(unused_imports)]
pub use incident::*;
#[allow(unused_imports)]
pub use incident_type::*;
#[allow(unused_imports)]
pub use crew_position::*;
#[allow(unused_imports)]
pub use last_report_snapshot::*;
#[allow(unused_imports)]
pub use report_review::*;
#[allow(unused_imports)]
pub use notification::*;
#[allow(unused_imports)]
pub use admin_stats::*;
#[allow(unused_imports)]
pub use module_permission::*;
#[allow(unused_imports)]
pub use update_preferences::*;
#[allow(unused_imports)]
pub use fluid_product_catalog::*;
#[allow(unused_imports)]
pub use fluid_report::*;
#[allow(unused_imports)]
pub use fluid_props::*;
#[allow(unused_imports)]
pub use fluid_inventory::*;
#[allow(unused_imports)]
pub use fluid_tanks::*;
#[allow(unused_imports)]
pub use fluid_activity::*;