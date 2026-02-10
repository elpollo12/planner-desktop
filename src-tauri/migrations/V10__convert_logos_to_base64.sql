-- Clear existing logo_path values (file paths) to prepare for base64 storage
-- Users will need to re-upload their logos, which will now be stored as base64
-- and will sync properly across all PCs

UPDATE operators SET logo_path = NULL WHERE logo_path IS NOT NULL;
