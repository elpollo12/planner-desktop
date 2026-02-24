import type { Report } from '../types/report';
import type { User } from '../types';

// ============================================================================
// Report Permission Functions
// ============================================================================
// Single source of truth for all report-related permission checks.
// Must stay in sync with backend (src-tauri/src/models/report.rs).
//
// PERMISSION POLICY (agreed 2025):
//   Submit:  Only draft or rejected → submitted. Approved reports CANNOT
//            be re-submitted without an explicit admin reopen first.
//   Edit:    Admin always. Supervisor: draft/rejected. Operator: own draft/rejected/submitted.
//   Delete:  Admin/Supervisor always (soft-delete). Operator: own draft/submitted.
//   Approve: Only supervisor/admin when status is 'submitted'.
//   Reopen:  Admin: any non-draft. Supervisor: submitted/rejected (NOT approved).
//            Operator: own rejected only.
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
 * - Admin: draft or rejected (approved reports must NOT be re-submitted without explicit reopen)
 * - Supervisor: draft or rejected
 * - Operator: own draft or rejected
 */
export function canSubmitReport(user: User | null, report: Report | null): boolean {
  if (!user || !report) return false;
  const submittable = report.status === 'draft' || report.status === 'rejected';
  if (!submittable) return false;
  if (user.role === 'admin' || user.role === 'supervisor') return true;
  if (report.createdBy === user.id) return true;
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
