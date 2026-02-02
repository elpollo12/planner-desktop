use crate::error::AppError;
use refinery::embed_migrations;
use rusqlite::Connection;

// Embed the migration files at compile time
embed_migrations!("migrations");

pub fn run_migrations(conn: &mut Connection) -> Result<(), AppError> {
    migrations::runner()
        .run(conn)
        .map_err(|e| AppError::MigrationError(format!("Migration failed: {}", e)))?;

    println!("Migrations completed successfully");
    Ok(())
}
