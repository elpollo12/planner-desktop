// Module declarations
mod error;
mod state;
mod auth;
mod db;
mod models;
mod commands;

use state::AppState;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    // Initialize database
    println!("Initializing database...");
    let mut db_conn = db::initialize_database().expect("Failed to initialize database");

    // Run migrations
    println!("Running migrations...");
    db::run_migrations(&mut db_conn).expect("Failed to run migrations");

    // Create default admin user if it doesn't exist
    println!("Checking for default admin user...");
    db::create_default_admin_user(&db_conn).expect("Failed to create default admin user");

    // Create application state
    let app_state = AppState::new(db_conn);

    println!("Starting Tauri application...");

    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .manage(app_state)
        .invoke_handler(tauri::generate_handler![
            // Authentication commands
            commands::auth::login,
            commands::auth::logout,
            commands::auth::get_current_user,

            // User management commands (admin only)
            commands::users::create_user,
            commands::users::list_users,
            commands::users::get_user,
            commands::users::update_user,
            commands::users::delete_user,

            // Report commands
            commands::reports::create_report,
            commands::reports::list_reports,
            commands::reports::get_report,
            commands::reports::update_report,
            commands::reports::delete_report,
            commands::reports::submit_report,
            commands::reports::approve_report,
            commands::reports::reject_report,

            // Drill string commands
            commands::drill_string::save_drill_string,
            commands::drill_string::get_drill_string,

            // Crew commands
            commands::crew::create_crew_shift,
            commands::crew::list_crew_shifts,
            commands::crew::delete_crew_shift,

            // Bit records commands
            commands::bit_records::create_bit_record,
            commands::bit_records::list_bit_records,
            commands::bit_records::update_bit_record,
            commands::bit_records::delete_bit_record,

            // Operation codes commands (admin)
            commands::operation_codes::create_operation_code,
            commands::operation_codes::list_operation_codes,
            commands::operation_codes::get_operation_code,
            commands::operation_codes::update_operation_code,
            commands::operation_codes::delete_operation_code,

            // Mud commands
            commands::mud::create_mud_record,
            commands::mud::list_mud_records,
            commands::mud::create_mud_additive,
            commands::mud::list_mud_additives,

            // Time distribution commands
            commands::time_distribution::save_time_distributions,
            commands::time_distribution::list_time_distributions,

            // Drilling parameters commands
            commands::drilling_params::create_drilling_parameter,
            commands::drilling_params::list_drilling_parameters,

            // Deviation commands
            commands::deviation::create_deviation_record,
            commands::deviation::list_deviation_records,

            // Operations log commands
            commands::operations_log::create_operation_log,
            commands::operations_log::list_operation_logs,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
