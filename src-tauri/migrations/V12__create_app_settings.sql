-- Create app_settings table for company-wide branding
-- Only one row will exist (singleton pattern)
-- Admin controls these settings, applies to all users

CREATE TABLE IF NOT EXISTS app_settings (
    id INTEGER PRIMARY KEY CHECK (id = 1), -- Enforce singleton
    primary_color TEXT NOT NULL DEFAULT '#1e3a5f',
    secondary_color TEXT NOT NULL DEFAULT '#f97316',
    logo_path TEXT, -- Base64 data URL or file path
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Insert default settings
INSERT INTO app_settings (id, primary_color, secondary_color, logo_path)
VALUES (1, '#1e3a5f', '#f97316', NULL);
