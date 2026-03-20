import { invoke } from '@tauri-apps/api/core';

// ============================================================================
// Audit Log Types
// ============================================================================

export interface AuditEntry {
  id: string;
  actorId: string;
  actorName: string;
  action: string;
  targetType: string | null;
  targetId: string | null;
  targetName: string | null;
  detail: string | null;
  createdAt: string;
}

export interface AuditLogPage {
  entries: AuditEntry[];
  total: number;
  page: number;
  pages: number;
}

export const AUDIT_ACTIONS = [
  'LOGIN_SUCCESS',
  'LOGOUT',
  'CREATE_USER',
  'UPDATE_USER',
  'DELETE_USER',
  'CHANGE_PASSWORD',
  'UPDATE_APP_SETTINGS',
  'UPLOAD_LOGO',
  'REMOVE_LOGO',
  'ACTIVATE_LICENSE',
  'CONNECT_SYNC',
  'DISCONNECT_SYNC',
] as const;

export type AuditAction = (typeof AUDIT_ACTIONS)[number];

// ============================================================================
// Audit Log API
// ============================================================================

export const auditLogApi = {
  list: (
    sessionToken: string,
    page: number = 0,
    pageSize: number = 50,
    actionFilter?: string,
  ) =>
    invoke<AuditLogPage>('list_audit_log', {
      sessionToken,
      page,
      pageSize,
      actionFilter: actionFilter ?? null,
    }),
};
