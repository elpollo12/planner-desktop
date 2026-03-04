import { invoke } from '@tauri-apps/api/core';
import type { OperationCode } from '../../types/report';

// ============================================================================
// Admin - Operation Codes Commands
// ============================================================================

export const operationCodesApi = {
  create: (sessionToken: string, data: Partial<OperationCode>) =>
    invoke<OperationCode>('create_operation_code', { sessionToken, data }),

  list: (sessionToken: string, activeOnly: boolean = true) =>
    invoke<OperationCode[]>('list_operation_codes', { sessionToken, activeOnly }),

  get: (sessionToken: string, codeId: string) =>
    invoke<OperationCode>('get_operation_code', { sessionToken, codeId }),

  update: (sessionToken: string, codeId: string, data: Partial<OperationCode>) =>
    invoke<OperationCode>('update_operation_code', { sessionToken, codeId, data }),

  delete: (sessionToken: string, codeId: string) =>
    invoke<void>('delete_operation_code', { sessionToken, codeId }),
};

// ============================================================================
// Admin Statistics Types
// ============================================================================

export interface ActivityStats {
  totalPeriod: number;
  dailyReports: Array<{ day: string; count: number }>;
}

export interface LogisticsAdminStats {
  totalRequests: number;
  pendingCount: number;
  byStatus: Array<{ category: string; count: number }>;
  byType: Array<{ category: string; count: number }>;
  topRigs: Array<{ rigId: string; rigName: string; count: number }>;
  dailyRequests: Array<{ day: string; count: number }>;
}

export interface IncidentsAdminStats {
  totalIncidents: number;
  byType: Array<{ typeId: string; typeName: string; color: string; count: number }>;
  topRigs: Array<{ rigId: string; rigName: string; count: number }>;
  dailyIncidents: Array<{ day: string; count: number }>;
}

// ============================================================================
// Admin Statistics Commands
// ============================================================================

export const adminStatsApi = {
  getActivityStats: (sessionToken: string, days?: number) =>
    invoke<ActivityStats>('get_admin_activity_stats', { sessionToken, days: days ?? null }),

  getLogisticsStats: (sessionToken: string, days?: number) =>
    invoke<LogisticsAdminStats>('get_admin_logistics_stats', { sessionToken, days: days ?? null }),

  getIncidentsStats: (sessionToken: string, days?: number) =>
    invoke<IncidentsAdminStats>('get_admin_incidents_stats', { sessionToken, days: days ?? null }),
};

// ============================================================================
// Module Permissions Commands
// ============================================================================

export const modulePermissionsApi = {
  /** Get resolved permissions for the current user */
  getMine: (sessionToken: string) =>
    invoke<Record<string, boolean>>('get_my_module_permissions', { sessionToken }),

  /** Get resolved permissions for a specific user (admin only) */
  getForUser: (sessionToken: string, userId: string) =>
    invoke<Record<string, boolean>>('get_user_module_permissions', { sessionToken, userId }),

  /** Save permission overrides for a user (admin only) */
  save: (sessionToken: string, userId: string, permissions: Record<string, boolean>) =>
    invoke<void>('save_user_module_permissions', { sessionToken, userId, permissions }),

  /** Get who last modified the current user's permissions. Null if never customized. */
  getMyModifier: (sessionToken: string) =>
    invoke<{ modifiedBy: string; modifiedAt: string } | null>('get_my_permission_modifier', { sessionToken }),
};
