// Module declarations
mod error;
mod state;
mod auth;
mod db;
mod models;
mod commands;
mod sync;

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

    // Load persisted sessions from SQLite
    println!("Loading persisted sessions...");
    let sessions = state::load_sessions_from_db(&db_conn);

    // Create application state with restored sessions
    let app_state = AppState::new(db_conn);
    *app_state.sessions.lock().unwrap() = sessions;

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

            // Areas commands (admin)
            commands::areas::create_area,
            commands::areas::list_areas,
            commands::areas::get_area,
            commands::areas::update_area,
            commands::areas::delete_area,

            // Rigs commands (admin)
            commands::rigs::create_rig,
            commands::rigs::list_rigs,
            commands::rigs::get_rig,
            commands::rigs::update_rig,
            commands::rigs::delete_rig,

            // User preferences commands
            commands::preferences::get_user_preferences,
            commands::preferences::save_user_preferences,
            commands::preferences::upload_logo,
            commands::preferences::remove_logo,
            commands::preferences::get_logo_data,

            // Sync commands (Turso cloud)
            commands::sync::get_sync_status,
            commands::sync::save_sync_config,
            commands::sync::set_sync_interval,
            commands::sync::test_turso_connection,
            commands::sync::initialize_remote_database,
            commands::sync::sync_push,
            commands::sync::sync_pull,
            commands::sync::sync_full,
            commands::sync::disable_sync,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
