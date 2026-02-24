import type { Report } from '../types/report';
import type { User } from '../types';

// ============================================================================
// Report Permission Functions
// ============================================================================
// Single source of truth for all report-related permission checks.
// Must stay in sync with backend (src-tauri/src/models/report.rs).
// ============================================================================

/**
 * Can the user edit this report?
 * - Admin: any report, any status
 * - Supervisor: draft or rejected
 * - Operator: own draft, rejected, or submitted
 */
export function canEditReport(user: User | null, report: Report | null): boolean {
  if (!user || !report) return false;
  if (user.role === 'admin') return true;
  if (user.role === 'supervisor' && (report.status === 'draft' || report.status === 'rejected')) return true;
  if (report.createdBy === user.id && (report.status === 'draft' || report.status === 'rejected' || report.status === 'submitted')) return true;
  return false;
}

/**
 * Can the user delete this report?
 * - Admin / Supervisor: always
 * - Operator: own draft or submitted
 */
export function canDeleteReport(user: User | null, report: Report | null): boolean {
  if (!user || !report) return false;
  if (user.role === 'admin' || user.role === 'supervisor') return true;
  if (report.createdBy === user.id && (report.status === 'draft' || report.status === 'submitted')) return true;
  return false;
}

/**
 * Can the user submit (or resubmit) this report?
 * - Admin: any non-submitted status (including approved)
 * - Supervisor: draft or rejected
 * - Operator: own draft or rejected
 */
export function canSubmitReport(user: User | null, report: Report | null): boolean {
  if (!user || !report) return false;
  if (user.role === 'admin' && report.status !== 'submitted') return true;
  if (user.role === 'supervisor' && (report.status === 'draft' || report.status === 'rejected')) return true;
  if ((report.status === 'draft' || report.status === 'rejected') && report.createdBy === user.id) return true;
  return false;
}

/**
 * Can the user approve or reject this report?
 * - Only supervisor or admin, and only when status is 'submitted'
 */
export function canApproveReport(user: User | null, report: Report | null): boolean {
  if (!user || !report) return false;
  if (report.status !== 'submitted') return false;
  return user.role === 'supervisor' || user.role === 'admin';
}
