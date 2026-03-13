CREATE TABLE IF NOT EXISTS audit_log (
    id          TEXT PRIMARY KEY,
    actor_id    TEXT NOT NULL,
    actor_name  TEXT NOT NULL,
    action      TEXT NOT NULL,
    target_type TEXT,
    target_id   TEXT,
    target_name TEXT,
    detail      TEXT,
    created_at  TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_audit_log_actor    ON audit_log(actor_id);
CREATE INDEX IF NOT EXISTS idx_audit_log_action   ON audit_log(action);
CREATE INDEX IF NOT EXISTS idx_audit_log_created  ON audit_log(created_at);
