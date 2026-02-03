use crate::error::AppError;
use refinery::embed_migrations;
use rusqlite::Connection;

// Embed the migration files at compile time
embed_migrations!("migrations");

pub fn run_migrations(conn: &mut Connection) -> Result<(), AppError> {
    let mut runner = migrations::runner();

    // In debug mode, don't abort on divergent migrations (when migration files change)
    // This makes development easier when iterating on migrations
    #[cfg(debug_assertions)]
    {
        runner = runner.set_abort_divergent(false);
        runner = runner.set_abort_missing(false);
    }

    runner
        .run(conn)
        .map_err(|e| AppError::MigrationError(format!("Migration failed: {}", e)))?;

    println!("Migrations completed successfully");
    Ok(())
}
