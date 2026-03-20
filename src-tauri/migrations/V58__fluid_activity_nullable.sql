-- V58: Make fluid_activity hour columns nullable (allow clearing values)
CREATE TABLE fluid_activity_new (
    id TEXT PRIMARY KEY,
    fluid_report_id TEXT NOT NULL REFERENCES fluid_reports(id),
    hours_moving REAL,
    hours_circulating REAL,
    hours_drilling REAL,
    hours_tripping REAL,
    hours_cleaning REAL,
    hours_backreaming REAL,
    hours_cementing REAL,
    hours_running_csg REAL,
    hours_other REAL,
    hours_total REAL,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
);

INSERT INTO fluid_activity_new
SELECT * FROM fluid_activity;

DROP TABLE fluid_activity;
ALTER TABLE fluid_activity_new RENAME TO fluid_activity;
