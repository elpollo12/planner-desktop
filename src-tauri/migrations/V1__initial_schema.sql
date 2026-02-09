-- Enable foreign key constraints
PRAGMA foreign_keys = ON;

-- ============================================================================
-- Table 1: users
-- ============================================================================
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  username TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  full_name TEXT NOT NULL,
  ci TEXT,
  role TEXT CHECK(role IN ('operator', 'supervisor', 'admin')) NOT NULL,
  position TEXT,
  active INTEGER DEFAULT 1,
  last_login TEXT,
  created_by TEXT,
  updated_by TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE INDEX idx_users_username ON users(username);
CREATE INDEX idx_users_role ON users(role);

-- ============================================================================
-- Table 2: reports
-- ============================================================================
CREATE TABLE IF NOT EXISTS reports (
  id TEXT PRIMARY KEY,
  report_number INTEGER NOT NULL,
  report_date TEXT NOT NULL,
  well_number TEXT,
  api_number TEXT,
  contract TEXT,
  contractor TEXT,
  operator TEXT,
  field_district TEXT,
  municipality TEXT,
  rig_number TEXT,
  supervisor_24h TEXT,
  status TEXT CHECK(status IN ('draft', 'submitted', 'approved', 'rejected')) DEFAULT 'draft',
  created_by TEXT REFERENCES users(id) ON DELETE SET NULL,
  approved_by TEXT REFERENCES users(id) ON DELETE SET NULL,
  submitted_at TEXT,
  approved_at TEXT,
  rejected_at TEXT,
  rejection_reason TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  synced INTEGER DEFAULT 0
);

CREATE INDEX idx_reports_created_by ON reports(created_by);
CREATE INDEX idx_reports_report_date ON reports(report_date);
CREATE INDEX idx_reports_status ON reports(status);
CREATE INDEX idx_reports_well_number ON reports(well_number);

-- ============================================================================
-- Table 3: drill_string
-- ============================================================================
CREATE TABLE IF NOT EXISTS drill_string (
  id TEXT PRIMARY KEY,
  report_id TEXT REFERENCES reports(id) ON DELETE CASCADE,
  size TEXT,
  weight TEXT,
  grade TEXT,
  connection_type TEXT,
  string_number TEXT,
  pump_brand TEXT,
  pump_type TEXT,
  header_length TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE INDEX idx_drill_string_report_id ON drill_string(report_id);

-- ============================================================================
-- Table 4: crew_shifts
-- ============================================================================
CREATE TABLE IF NOT EXISTS crew_shifts (
  id TEXT PRIMARY KEY,
  report_id TEXT REFERENCES reports(id) ON DELETE CASCADE,
  shift TEXT CHECK(shift IN ('morning', 'afternoon', 'night')) NOT NULL,
  shift_start TEXT,
  shift_end TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE INDEX idx_crew_shifts_report_id ON crew_shifts(report_id);
CREATE INDEX idx_crew_shifts_shift ON crew_shifts(shift);

-- ============================================================================
-- Table 5: crew_members
-- ============================================================================
CREATE TABLE IF NOT EXISTS crew_members (
  id TEXT PRIMARY KEY,
  crew_shift_id TEXT REFERENCES crew_shifts(id) ON DELETE CASCADE,
  position TEXT NOT NULL,
  ci TEXT,
  name TEXT,
  hours REAL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE INDEX idx_crew_members_crew_shift_id ON crew_members(crew_shift_id);

-- ============================================================================
-- Table 6: operation_codes
-- ============================================================================
CREATE TABLE IF NOT EXISTS operation_codes (
  id TEXT PRIMARY KEY,
  code TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  category TEXT,
  sort_order INTEGER DEFAULT 0,
  active INTEGER DEFAULT 1,
  created_by TEXT,
  updated_by TEXT,
  created_at TEXT NOT NULL
);

CREATE INDEX idx_operation_codes_code ON operation_codes(code);
CREATE INDEX idx_operation_codes_category ON operation_codes(category);
CREATE INDEX idx_operation_codes_active ON operation_codes(active);

-- ============================================================================
-- Table 7: time_distribution
-- ============================================================================
CREATE TABLE IF NOT EXISTS time_distribution (
  id TEXT PRIMARY KEY,
  report_id TEXT REFERENCES reports(id) ON DELETE CASCADE,
  operation_code_id TEXT REFERENCES operation_codes(id) ON DELETE CASCADE,
  hours_shift1 REAL DEFAULT 0,
  hours_shift2 REAL DEFAULT 0,
  hours_shift3 REAL DEFAULT 0,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE INDEX idx_time_distribution_report_id ON time_distribution(report_id);
CREATE INDEX idx_time_distribution_operation_code_id ON time_distribution(operation_code_id);

-- ============================================================================
-- Table 8: bit_records
-- ============================================================================
CREATE TABLE IF NOT EXISTS bit_records (
  id TEXT PRIMARY KEY,
  report_id TEXT REFERENCES reports(id) ON DELETE CASCADE,
  shift TEXT,
  size TEXT,
  manufacturer_code TEXT,
  brand TEXT,
  bit_type TEXT,
  serial_number TEXT,
  jets TEXT,
  tfa TEXT,
  depth_out TEXT,
  depth_in TEXT,
  footage TEXT,
  hours_total REAL,
  dp_tubos TEXT,
  kelly TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE INDEX idx_bit_records_report_id ON bit_records(report_id);
CREATE INDEX idx_bit_records_shift ON bit_records(shift);

-- ============================================================================
-- Table 9: mud_records
-- ============================================================================
CREATE TABLE IF NOT EXISTS mud_records (
  id TEXT PRIMARY KEY,
  report_id TEXT REFERENCES reports(id) ON DELETE CASCADE,
  shift TEXT,
  hour TEXT,
  weight TEXT,
  viscosity TEXT,
  pvp TEXT,
  gels TEXT,
  filtrate TEXT,
  ph TEXT,
  solids TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE INDEX idx_mud_records_report_id ON mud_records(report_id);
CREATE INDEX idx_mud_records_shift ON mud_records(shift);

-- ============================================================================
-- Table 10: mud_additives
-- ============================================================================
CREATE TABLE IF NOT EXISTS mud_additives (
  id TEXT PRIMARY KEY,
  report_id TEXT REFERENCES reports(id) ON DELETE CASCADE,
  shift TEXT,
  additive_type TEXT,
  quantity TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE INDEX idx_mud_additives_report_id ON mud_additives(report_id);
CREATE INDEX idx_mud_additives_shift ON mud_additives(shift);

-- ============================================================================
-- Table 11: drilling_parameters
-- ============================================================================
CREATE TABLE IF NOT EXISTS drilling_parameters (
  id TEXT PRIMARY KEY,
  report_id TEXT REFERENCES reports(id) ON DELETE CASCADE,
  shift TEXT,
  depth_from TEXT,
  depth_to TEXT,
  core_number TEXT,
  rotary_rpm TEXT,
  bit_weight TEXT,
  pump_pressure TEXT,
  pump_number TEXT,
  pump_liner TEXT,
  pump_spm TEXT,
  total_gpm TEXT,
  method_used TEXT,
  lithology_notes TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE INDEX idx_drilling_parameters_report_id ON drilling_parameters(report_id);
CREATE INDEX idx_drilling_parameters_shift ON drilling_parameters(shift);

-- ============================================================================
-- Table 12: deviation_history
-- ============================================================================
CREATE TABLE IF NOT EXISTS deviation_history (
  id TEXT PRIMARY KEY,
  report_id TEXT REFERENCES reports(id) ON DELETE CASCADE,
  depth TEXT,
  deviation TEXT,
  direction TEXT,
  tvo TEXT,
  horizontal_displacement TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE INDEX idx_deviation_history_report_id ON deviation_history(report_id);

-- ============================================================================
-- Table 13: operations_log
-- ============================================================================
CREATE TABLE IF NOT EXISTS operations_log (
  id TEXT PRIMARY KEY,
  report_id TEXT REFERENCES reports(id) ON DELETE CASCADE,
  shift TEXT,
  time_from TEXT,
  time_to TEXT,
  duration TEXT,
  operation_code TEXT,
  details TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE INDEX idx_operations_log_report_id ON operations_log(report_id);
CREATE INDEX idx_operations_log_shift ON operations_log(shift);
