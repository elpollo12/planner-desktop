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
}

export interface UserWithRigs extends User {
  assignedRigIds: string[];
}

// Re-export rig and area types
export * from './rig';
export * from './preferences';
export * from './sync';
export * from './operator';
export { type UserRole, type CreateUserInput, type UpdateUserInput } from './user';

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
  company?: string;
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
  company?: string;
  supervisor_24h?: string;
}

export interface ReportFilters {
  date_from?: string;
  date_to?: string;
  status?: string;
  created_by?: string;
  well_number?: string;
}
