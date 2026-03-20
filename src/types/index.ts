import type { ModulePermissions } from './user';

// User types
export interface User {
  id: string;
  username: string;
  fullName: string;
  ci?: string;
  role: 'operator' | 'supervisor' | 'admin';
  position?: string;
  active: boolean;
  hasAllRigs: boolean;
  lastLogin?: string;
  createdAt: string;
  updatedAt: string;
  /** Resolved module permissions (role defaults + overrides). Loaded after login. */
  modulePermissions?: ModulePermissions;
}

export interface UserWithRigs extends User {
  assignedRigIds: string[];
}

// Re-export rig and area types
export * from './rig';
export * from './preferences';
export * from './sync';
export * from './appSettings';
export { type UserRole, type CreateUserInput, type UpdateUserInput, type AppModule, type ModulePermissions, APP_MODULES, MODULE_LABELS, MODULE_DEFAULTS, PERMISSION_MODULES } from './user';
export * from './logistics';
export * from './incident';
export * from './notification';
export * from './updates';
export * from './fluid';

export interface LoginResponse {
  sessionToken: string;
  user: User;
}

export interface CreateUserRequest {
  username: string;
  password: string;
  fullName: string;
  ci?: string;
  role: string;
  position?: string;
  hasAllRigs?: boolean;
  assignedRigIds?: string[];
}

// Report types
export interface Report {
  id: string;
  report_number: number;
  report_date: string;
  well_number?: string;
  api_number?: string;
  contract?: string;
  contractor?: string;
  operator?: string;
  field_district?: string;
  municipality?: string;
  rig_number?: string;
  supervisor_24h?: string;
  status: 'draft' | 'submitted' | 'approved' | 'rejected';
  created_by?: string;
  approved_by?: string;
  submitted_at?: string;
  approved_at?: string;
  rejected_at?: string;
  rejection_reason?: string;
  created_at: string;
  updated_at: string;
  synced: boolean;
}

export interface CreateReportRequest {
  report_number: number;
  report_date: string;
  well_number?: string;
  api_number?: string;
  contract?: string;
  contractor?: string;
  operator?: string;
  field_district?: string;
  municipality?: string;
  rig_number?: string;
  supervisor_24h?: string;
}

// Last report snapshot (pre-fill template per rig)
export interface LastReportSnapshot {
  id: string;
  rigId: string;
  reportNumber: number;
  wellNumber?: string;
  apiNumber?: string;
  contract?: string;
  contractor?: string;
  operator?: string;
  fieldDistrict?: string;
  municipality?: string;
  rigNumber?: string;
  company?: string;
  supervisor24h?: string;
  crewData?: string;            // JSON string
  timeDistributionData?: string; // JSON string
  bitRecordsData?: string;       // JSON string
  mudRecordsData?: string;       // JSON string
  mudAdditivesData?: string;     // JSON string
  drillingParamsData?: string;   // JSON string
  deviationData?: string;        // JSON string
  operationsLogData?: string;    // JSON string
  drillStringData?: string;      // JSON string
  sourceReportId?: string;
  updatedBy?: string;
  updatedAt: string;
}
