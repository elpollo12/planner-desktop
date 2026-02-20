// Module declarations
mod error;
mod state;
mod auth;
mod db;
mod models;
mod commands;
mod sync;
mod license;

use state::AppState;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    // Load environment variables from .env file (if it exists)
    match dotenvy::dotenv() {
        Ok(path) => println!("Loaded environment from: {:?}", path),
        Err(_) => println!("No .env file found, using system environment variables"),
    }

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
        .plugin(tauri_plugin_updater::Builder::new().build())
        .plugin(tauri_plugin_process::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
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
            commands::reports::reopen_report,

            // Drill string commands
            commands::drill_string::create_drill_string_component,
            commands::drill_string::list_drill_string_components,
            commands::drill_string::delete_all_drill_string_components,

            // Crew commands
            commands::crew::create_crew_shift,
            commands::crew::list_crew_shifts,
            commands::crew::delete_crew_shift,
            commands::crew::delete_all_crew_shifts,

            // Bit records commands
            commands::bit_records::create_bit_record,
            commands::bit_records::list_bit_records,
            commands::bit_records::update_bit_record,
            commands::bit_records::delete_bit_record,
            commands::bit_records::delete_all_bit_records,

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
            commands::mud::delete_all_mud_records,
            commands::mud::delete_all_mud_additives,

            // Time distribution commands
            commands::time_distribution::save_time_distributions,
            commands::time_distribution::list_time_distributions,
            commands::time_distribution::delete_all_time_distributions,

            // Drilling parameters commands
            commands::drilling_params::create_drilling_parameter,
            commands::drilling_params::list_drilling_parameters,
            commands::drilling_params::delete_all_drilling_parameters,

            // Deviation commands
            commands::deviation::create_deviation_record,
            commands::deviation::list_deviation_records,
            commands::deviation::delete_all_deviation_records,

            // Operations log commands
            commands::operations_log::create_operation_log,
            commands::operations_log::list_operation_logs,
            commands::operations_log::delete_all_operation_logs,

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
            commands::rigs::list_accessible_rigs,

            // Rig personnel commands
            commands::rig_personnel::create_rig_personnel,
            commands::rig_personnel::list_rig_personnel,
            commands::rig_personnel::update_rig_personnel,
            commands::rig_personnel::delete_rig_personnel,

            // User preferences commands
            commands::preferences::get_user_preferences,
            commands::preferences::save_user_preferences,

            // App settings commands (company branding)
            commands::app_settings::get_app_settings,
            commands::app_settings::save_app_settings,
            commands::app_settings::upload_company_logo,
            commands::app_settings::remove_company_logo,
            commands::app_settings::get_company_logo_data,

            // Sync commands (Turso cloud - credentials via environment variables)
            commands::sync::get_sync_status,
            commands::sync::enable_sync,
            commands::sync::set_sync_interval,
            commands::sync::test_turso_connection,
            commands::sync::initialize_remote_database,
            commands::sync::sync_push,
            commands::sync::sync_pull,
            commands::sync::sync_full,
            commands::sync::sync_incremental,
            commands::sync::disable_sync,

            // Operators commands
            commands::operators::list_operators,
            commands::operators::get_operator,
            commands::operators::create_operator,
            commands::operators::update_operator,
            commands::operators::delete_operator,
            commands::operators::upload_operator_logo,
            commands::operators::remove_operator_logo,
            commands::operators::get_operator_logo_data,

            // Logistics - Water Bottles
            commands::logistics_water::create_water_bottles_movement,
            commands::logistics_water::get_water_bottles_movements,
            commands::logistics_water::delete_water_bottles_movement,
            commands::logistics_water::get_water_bottles_stock,

            // Logistics - Fuel
            commands::logistics_fuel::create_fuel_movement,
            commands::logistics_fuel::get_fuel_movements,
            commands::logistics_fuel::delete_fuel_movement,
            commands::logistics_fuel::get_fuel_stock,

            // Logistics - Vacuum/Cisterna
            commands::logistics_vacuum::create_vacuum_action,
            commands::logistics_vacuum::get_vacuum_actions,
            commands::logistics_vacuum::update_vacuum_action,
            commands::logistics_vacuum::delete_vacuum_action,

            // Logistics - Materials (catalog + movements)
            commands::logistics_materials::create_material,
            commands::logistics_materials::list_materials,
            commands::logistics_materials::update_material,
            commands::logistics_materials::delete_material,
            commands::logistics_materials::create_material_movement,
            commands::logistics_materials::get_material_movements,
            commands::logistics_materials::delete_material_movement,
            commands::logistics_materials::get_material_stock,

            // Logistics - Requests & Reports
            commands::logistics_requests::create_logistics_request,
            commands::logistics_requests::list_logistics_requests,
            commands::logistics_requests::update_logistics_request_status,
            commands::logistics_requests::delete_logistics_request,
            commands::logistics_requests::get_pending_requests_count,
            commands::logistics_requests::get_logistics_report,
            commands::logistics_requests::get_detailed_logistics_report,

            // License commands
            commands::license::activate_license,
            commands::license::get_license_status,
            commands::license::deactivate_license,

            // Last report snapshot commands
            commands::last_report_snapshot::get_last_report_snapshot,
            commands::last_report_snapshot::update_report_snapshot,

            // Report reviews commands (approval audit trail)
            commands::report_reviews::create_report_review,
            commands::report_reviews::list_report_reviews,

            // Debug commands
            commands::debug::debug_list_all_rigs,
            commands::debug::debug_get_sync_info,
            commands::debug::debug_query_turso_rigs,
            commands::debug::debug_sync_state,
            commands::debug::debug_test_sync_pull,
            commands::debug::debug_simulate_full_sync,
            commands::debug::debug_list_all_users,
            commands::debug::debug_delete_user_by_username,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
