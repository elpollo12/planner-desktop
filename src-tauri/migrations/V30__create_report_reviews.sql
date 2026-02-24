-- ============================================================================
-- Table: report_reviews
-- Stores the full audit trail of report approval workflow actions.
-- Each row is an immutable log entry (approve, reject, comment, resubmit).
-- ============================================================================
CREATE TABLE IF NOT EXISTS report_reviews (
    id TEXT PRIMARY KEY,
    report_id TEXT NOT NULL REFERENCES reports(id) ON DELETE CASCADE,
    reviewer_id TEXT NOT NULL REFERENCES users(id) ON DELETE SET NULL,
    action TEXT NOT NULL CHECK(action IN ('approved', 'rejected', 'revision_requested', 'comment', 'resubmitted')),
    comment TEXT,
    previous_status TEXT,
    new_status TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    is_deleted INTEGER DEFAULT 0
);

CREATE INDEX idx_report_reviews_report_id ON report_reviews(report_id);
CREATE INDEX idx_report_reviews_reviewer_id ON report_reviews(reviewer_id);
CREATE INDEX idx_report_reviews_action ON report_reviews(action);
CREATE INDEX idx_report_reviews_created_at ON report_reviews(created_at);
