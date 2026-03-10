// Module declarations
mod error;
mod state;
mod auth;
mod db;
mod models;
mod commands;
mod sync;
mod license;
pub mod notification_helper;

use state::AppState;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    match dotenvy::dotenv() {
        Ok(path) => println!("Loaded environment from: {:?}", path),
        Err(_) => println!("No .env file found, using system environment variables"),
    }

    println!("Initializing database...");
    let mut db_conn = db::initialize_database().expect("Failed to initialize database");

    println!("Running migrations...");
    db::run_migrations(&mut db_conn).expect("Failed to run migrations");

    println!("Checking for default admin user...");
    db::create_default_admin_user(&db_conn).expect("Failed to create default admin user");

    println!("Loading persisted sessions...");
    let sessions = state::load_sessions_from_db(&db_conn);

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
            commands::auth::login,
            commands::auth::logout,
            commands::auth::get_current_user,
            commands::users::create_user,
            commands::users::list_users,
            commands::users::get_user,
            commands::users::update_user,
            commands::users::delete_user,
            commands::users::admin_change_password,
            commands::users::verify_own_password,
            commands::users::change_own_password,
            commands::reports::create_report,
            commands::reports::list_reports,
            commands::reports::get_report,
            commands::reports::update_report,
            commands::reports::delete_report,
            commands::reports::submit_report,
            commands::reports::approve_report,
            commands::reports::reject_report,
            commands::reports::reopen_report,
            commands::drill_string::save_drill_string_components,
            commands::drill_string::create_drill_string_component,
            commands::drill_string::list_drill_string_components,
            commands::drill_string::delete_all_drill_string_components,
            commands::crew::save_crew_shifts,
            commands::crew::create_crew_shift,
            commands::crew::list_crew_shifts,
            commands::crew::delete_crew_shift,
            commands::crew::delete_all_crew_shifts,
            commands::bit_records::save_bit_records,
            commands::bit_records::create_bit_record,
            commands::bit_records::list_bit_records,
            commands::bit_records::update_bit_record,
            commands::bit_records::delete_bit_record,
            commands::bit_records::delete_all_bit_records,
            commands::operation_codes::create_operation_code,
            commands::operation_codes::list_operation_codes,
            commands::operation_codes::get_operation_code,
            commands::operation_codes::update_operation_code,
            commands::operation_codes::delete_operation_code,
            commands::mud::save_mud_data,
            commands::mud::create_mud_record,
            commands::mud::list_mud_records,
            commands::mud::create_mud_additive,
            commands::mud::list_mud_additives,
            commands::mud::delete_all_mud_records,
            commands::mud::delete_all_mud_additives,
            commands::time_distribution::save_time_distributions,
            commands::time_distribution::list_time_distributions,
            commands::time_distribution::delete_all_time_distributions,
            commands::drilling_params::save_drilling_parameters,
            commands::drilling_params::create_drilling_parameter,
            commands::drilling_params::list_drilling_parameters,
            commands::drilling_params::delete_all_drilling_parameters,
            commands::deviation::save_deviation_records,
            commands::deviation::create_deviation_record,
            commands::deviation::list_deviation_records,
            commands::deviation::delete_all_deviation_records,
            commands::operations_log::save_operation_logs,
            commands::operations_log::create_operation_log,
            commands::operations_log::list_operation_logs,
            commands::operations_log::delete_all_operation_logs,
            commands::areas::create_area,
            commands::areas::list_areas,
            commands::areas::get_area,
            commands::areas::update_area,
            commands::areas::delete_area,
            commands::rigs::create_rig,
            commands::rigs::list_rigs,
            commands::rigs::get_rig,
            commands::rigs::get_rig_full,
            commands::rigs::update_rig,
            commands::rigs::delete_rig,
            commands::rigs::list_accessible_rigs,
            commands::rig_contractors::list_rig_contractors,
            commands::rig_contractors::add_rig_contractor,
            commands::rig_contractors::remove_rig_contractor,
            commands::rig_contractors::replace_rig_contractors,
            commands::rig_personnel::create_rig_personnel,
            commands::rig_personnel::list_rig_personnel,
            commands::rig_personnel::update_rig_personnel,
            commands::rig_personnel::delete_rig_personnel,
            commands::preferences::get_user_preferences,
            commands::preferences::save_user_preferences,
            commands::app_settings::get_app_settings,
            commands::app_settings::save_app_settings,
            commands::app_settings::upload_company_logo,
            commands::app_settings::remove_company_logo,
            commands::app_settings::get_company_logo_data,
            commands::sync::get_sync_status,
            commands::sync::enable_sync,
            commands::sync::set_sync_interval,
            commands::sync::test_sync_connection,
            commands::sync::ping_sync_server,
            commands::sync::sync_login,
            commands::sync::sync_push,
            commands::sync::sync_pull,
            commands::sync::sync_full,
            commands::sync::sync_incremental,
            commands::sync::disable_sync,
            commands::sync::set_sync_server_url,
            commands::sync::get_sync_server_url,
            commands::sync::connect_sync_server,
            commands::sync::sync_handshake,
            commands::companies::list_companies,
            commands::companies::get_company,
            commands::companies::create_company,
            commands::companies::update_company,
            commands::companies::delete_company,
            commands::companies::upload_company_brand_logo,
            commands::companies::remove_company_brand_logo,
            commands::companies::get_company_brand_logo,
            commands::logistics_water::create_water_bottles_movement,
            commands::logistics_water::get_water_bottles_movements,
            commands::logistics_water::delete_water_bottles_movement,
            commands::logistics_water::get_water_bottles_stock,
            commands::logistics_fuel::create_fuel_movement,
            commands::logistics_fuel::get_fuel_movements,
            commands::logistics_fuel::delete_fuel_movement,
            commands::logistics_fuel::get_fuel_stock,
            commands::logistics_vacuum::create_vacuum_action,
            commands::logistics_vacuum::get_vacuum_actions,
            commands::logistics_vacuum::update_vacuum_action,
            commands::logistics_vacuum::delete_vacuum_action,
            commands::logistics_materials::create_material,
            commands::logistics_materials::list_materials,
            commands::logistics_materials::update_material,
            commands::logistics_materials::delete_material,
            commands::logistics_materials::create_material_movement,
            commands::logistics_materials::get_material_movements,
            commands::logistics_materials::delete_material_movement,
            commands::logistics_materials::get_material_stock,
            commands::logistics_requests::create_logistics_request,
            commands::logistics_requests::list_logistics_requests,
            commands::logistics_requests::update_logistics_request_status,
            commands::logistics_requests::delete_logistics_request,
            commands::logistics_requests::get_pending_requests_count,
            commands::logistics_requests::get_logistics_report,
            commands::logistics_requests::get_detailed_logistics_report,
            commands::incidents::create_incident,
            commands::incidents::list_incidents,
            commands::incidents::get_incident,
            commands::incidents::delete_incident,
            commands::incident_types::list_incident_types,
            commands::incident_types::create_incident_type,
            commands::incident_types::delete_incident_type,
            commands::crew_positions::list_crew_positions,
            commands::crew_positions::create_crew_position,
            commands::crew_positions::update_crew_position,
            commands::crew_positions::delete_crew_position,
            commands::license::activate_license,
            commands::license::get_license_status,
            commands::license::deactivate_license,
            commands::last_report_snapshot::get_last_report_snapshot,
            commands::last_report_snapshot::update_report_snapshot,
            commands::report_reviews::create_report_review,
            commands::report_reviews::list_report_reviews,
            commands::notifications::list_notifications,
            commands::notifications::get_unread_count,
            commands::notifications::mark_notification_read,
            commands::notifications::mark_all_notifications_read,
            commands::notifications::delete_notification,
            commands::notifications::get_notification_retention_days,
            commands::notifications::set_notification_retention_days,
            commands::admin_stats::get_admin_activity_stats,
            commands::admin_stats::get_admin_logistics_stats,
            commands::admin_stats::get_admin_incidents_stats,
            commands::module_permissions::get_my_module_permissions,
            commands::module_permissions::get_user_module_permissions,
            commands::module_permissions::save_user_module_permissions,
            commands::module_permissions::get_my_permission_modifier,
            commands::cloud_logs::list_daily_reports,
            commands::cloud_logs::get_message_detail,
            commands::updates::get_update_preferences,
            commands::updates::save_update_preferences,
            commands::updates::record_update_check,
            commands::updates::postpone_update,
            commands::updates::clear_postpone,
            commands::updates::get_update_status,
            commands::updates::check_for_update_from_api,
            commands::updates::record_download_to_api,
            // Backup (pre-update safety net — accessible to all authenticated users)
            commands::backup::backup_database,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
