use crate::error::AppError;
use refinery::embed_migrations;
use rusqlite::Connection;

// Embed the migration files at compile time
// Force recompile when migration files change
embed_migrations!("migrations");

pub fn run_migrations(conn: &mut Connection) -> Result<(), AppError> {
    let mut runner = migrations::runner();

    // Nunca abortar por migraciones divergentes o faltantes.
    // Las DBs de usuarios pueden haber sido creadas en builds de debug o versiones
    // anteriores — ser estrictos aquí causaría que la app no arranque tras actualizar.
    // La integridad real la garantizan los IF NOT EXISTS en cada migración.
    runner = runner.set_abort_divergent(false);
    runner = runner.set_abort_missing(false);

    runner
        .run(conn)
        .map_err(|e| AppError::MigrationError(format!("Migration failed: {}", e)))?;

    println!("Migrations completed successfully");
    Ok(())
}
