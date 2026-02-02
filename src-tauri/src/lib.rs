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
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
