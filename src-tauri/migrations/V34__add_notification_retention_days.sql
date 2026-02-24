-- Add notification retention days to app_settings (0 = indefinite)
ALTER TABLE app_settings ADD COLUMN notification_retention_days INTEGER NOT NULL DEFAULT 5;