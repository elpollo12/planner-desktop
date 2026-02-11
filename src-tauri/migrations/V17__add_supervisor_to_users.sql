-- Add supervisor_id to users table
-- When a user is an operator, this field references the supervisor who approves their reports
ALTER TABLE users ADD COLUMN supervisor_id TEXT;
