/**
 * API Client for Tauri Commands
 * 
 * This file provides typed wrappers for all Tauri backend commands.
 * Uses @tauri-apps/api/core for invoking Rust commands.
 */

import { invoke } from '@tauri-apps/api/core';
import type {
  User,
  CreateUserInput,
  UpdateUserInput,
  LoginResponse,
} from '../types/user';
import type {
  Report,
  CreateReportInput,
  ReportFilters,
  DrillString,
  CrewShift,
  BitRecord,
  OperationCode,
} from '../types/report';
import type {
  Area,
  CreateAreaInput,
  UpdateAreaInput,
  Rig,
  RigWithArea,
  CreateRigInput,
  UpdateRigInput,
} from '../types/rig';

export interface PaginatedReportsResponse {
  reports: Report[];
  total: number;
  page: number;
  page_size: number;
  total_pages: number;
}

// ============================================================================
// Authentication Commands
// ============================================================================

export const authApi = {
  login: (username: string, password: string) =>
    invoke<LoginResponse>('login', { username, password }),

  logout: (sessionToken: string) =>
    invoke<void>('logout', { sessionToken }),

  getCurrentUser: (sessionToken: string) =>
    invoke<User>('get_current_user', { sessionToken }),
};

// ============================================================================
// User Management Commands (Admin Only)
// ============================================================================

export const usersApi = {
  create: (sessionToken: string, userData: CreateUserInput) =>
    invoke<User>('create_user', { sessionToken, userData }),

  list: (sessionToken: string) =>
    invoke<User[]>('list_users', { sessionToken }),

  get: (sessionToken: string, userId: string) =>
    invoke<User>('get_user', { sessionToken, userId }),

  update: (sessionToken: string, userId: string, userData: UpdateUserInput) =>
    invoke<User>('update_user', { sessionToken, userId, userData }),

  delete: (sessionToken: string, userId: string) =>
    invoke<void>('delete_user', { sessionToken, userId }),
};

// ============================================================================
// Report Commands
// ============================================================================

export const reportsApi = {
  create: (sessionToken: string, reportData: CreateReportInput) =>
    invoke<Report>('create_report', { sessionToken, reportData }),

  list: (
    sessionToken: string,
    filters: ReportFilters,
    page?: number,      // ← NUEVO
    pageSize?: number   // ← NUEVO
  ) =>
    invoke<PaginatedReportsResponse>('list_reports', {
      sessionToken,
      filters,
      page,      // ← NUEVO
      pageSize   // ← NUEVO
    }),


  get: (sessionToken: string, reportId: string) =>
    invoke<Report>('get_report', { sessionToken, reportId }),

  update: (sessionToken: string, reportId: string, reportData: Partial<CreateReportInput>) =>
    invoke<Report>('update_report', { sessionToken, reportId, reportData }),

  delete: (sessionToken: string, reportId: string) =>
    invoke<void>('delete_report', { sessionToken, reportId }),

  submit: (sessionToken: string, reportId: string) =>
    invoke<Report>('submit_report', { sessionToken, reportId }),

  approve: (sessionToken: string, reportId: string) =>
    invoke<Report>('approve_report', { sessionToken, reportId }),

  reject: (sessionToken: string, reportId: string, reason: string) =>
    invoke<Report>('reject_report', { sessionToken, reportId, reason }),
};

// ============================================================================
// Drill String Commands
// ============================================================================

export const drillStringApi = {
  save: (sessionToken: string, reportId: string, data: Partial<DrillString>) =>
    invoke<DrillString>('save_drill_string', { sessionToken, reportId, data }),

  get: (sessionToken: string, reportId: string) =>
    invoke<DrillString>('get_drill_string', { sessionToken, reportId }),
};

// ============================================================================
// Crew Commands
// ============================================================================

export const crewApi = {
  createShift: (sessionToken: string, reportId: string, data: any) =>
    invoke<CrewShift>('create_crew_shift', { sessionToken, reportId, data }),

  listShifts: (sessionToken: string, reportId: string) =>
    invoke<CrewShift[]>('list_crew_shifts', { sessionToken, reportId }),

  deleteShift: (sessionToken: string, shiftId: string) =>
    invoke<void>('delete_crew_shift', { sessionToken, shiftId }),

  deleteAllShifts: (sessionToken: string, reportId: string) =>
    invoke<void>('delete_all_crew_shifts', { sessionToken, reportId }),
};

// ============================================================================
// Bit Records Commands
// ============================================================================

export const bitRecordsApi = {
  create: (sessionToken: string, reportId: string, data: Partial<BitRecord>) =>
    invoke<BitRecord>('create_bit_record', { sessionToken, reportId, data }),

  list: (sessionToken: string, reportId: string) =>
    invoke<BitRecord[]>('list_bit_records', { sessionToken, reportId }),

  update: (sessionToken: string, recordId: string, data: Partial<BitRecord>) =>
    invoke<BitRecord>('update_bit_record', { sessionToken, recordId, data }),

  delete: (sessionToken: string, recordId: string) =>
    invoke<void>('delete_bit_record', { sessionToken, recordId }),

  deleteAll: (sessionToken: string, reportId: string) =>
    invoke<void>('delete_all_bit_records', { sessionToken, reportId }),
};

// ============================================================================
// Operation Codes Commands (Admin)
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
// MUD RECORDS COMMANDS
// ============================================================================

export const mudApi = {
  createRecord: (sessionToken: string, reportId: string, data: any) =>
    invoke('create_mud_record', { sessionToken, reportId, data }),

  listRecords: (sessionToken: string, reportId: string) =>
    invoke('list_mud_records', { sessionToken, reportId }),

  createAdditive: (sessionToken: string, reportId: string, data: any) =>
    invoke('create_mud_additive', { sessionToken, reportId, data }),

  listAdditives: (sessionToken: string, reportId: string) =>
    invoke('list_mud_additives', { sessionToken, reportId }),

  deleteAllRecords: (sessionToken: string, reportId: string) =>
    invoke('delete_all_mud_records', { sessionToken, reportId }),

  deleteAllAdditives: (sessionToken: string, reportId: string) =>
    invoke('delete_all_mud_additives', { sessionToken, reportId }),
};

// ============================================================================
// TIME DISTRIBUTION COMMANDS
// ============================================================================

export const timeDistributionApi = {
  saveBulk: (sessionToken: string, reportId: string, data: any[]) => {
    // Transform camelCase to snake_case for Rust backend
    const transformedData = data.map(distribution => ({
      operation_code_id: distribution.operationCodeId,
      hours_shift1: distribution.hoursShift1,
      hours_shift2: distribution.hoursShift2,
      hours_shift3: distribution.hoursShift3,
    }));

    return invoke('save_time_distributions', {
      sessionToken,
      reportId,
      data: transformedData
    });
  },

  list: (sessionToken: string, reportId: string) =>
    invoke('list_time_distributions', { sessionToken, reportId }),

  deleteAll: (sessionToken: string, reportId: string) =>
    invoke('delete_all_time_distributions', { sessionToken, reportId }),
};

// ============================================================================
// DRILLING PARAMETERS COMMANDS
// ============================================================================

export const drillingParamsApi = {
  create: (sessionToken: string, reportId: string, data: any) =>
    invoke('create_drilling_parameter', { sessionToken, reportId, data }),

  list: (sessionToken: string, reportId: string) =>
    invoke('list_drilling_parameters', { sessionToken, reportId }),

  deleteAll: (sessionToken: string, reportId: string) =>
    invoke('delete_all_drilling_parameters', { sessionToken, reportId }),
};

// ============================================================================
// DEVIATION COMMANDS
// ============================================================================

export const deviationApi = {
  create: (sessionToken: string, reportId: string, data: any) =>
    invoke('create_deviation_record', { sessionToken, reportId, data }),

  list: (sessionToken: string, reportId: string) =>
    invoke('list_deviation_records', { sessionToken, reportId }),

  deleteAll: (sessionToken: string, reportId: string) =>
    invoke('delete_all_deviation_records', { sessionToken, reportId }),
};

// ============================================================================
// OPERATIONS LOG COMMANDS
// ============================================================================

export const operationsLogApi = {
  create: (sessionToken: string, reportId: string, data: any) =>
    invoke('create_operation_log', { sessionToken, reportId, data }),

  list: (sessionToken: string, reportId: string) =>
    invoke('list_operation_logs', { sessionToken, reportId }),

  deleteAll: (sessionToken: string, reportId: string) =>
    invoke('delete_all_operation_logs', { sessionToken, reportId }),
};

// ============================================================================
// Areas Commands (Admin Only)
// ============================================================================

export const areasApi = {
  /**
   * Crear una nueva área
   */
  create: (userId: string, input: CreateAreaInput) =>
    invoke<Area>('create_area', { input, userId }),

  /**
   * Listar todas las áreas
   * @param includeInactive - Si se deben incluir áreas inactivas
   */
  list: (includeInactive: boolean = false) =>
    invoke<Area[]>('list_areas', { includeInactive }),

  /**
   * Obtener un área por ID
   */
  get: (id: string) =>
    invoke<Area>('get_area', { id }),

  /**
   * Actualizar un área existente
   */
  update: (id: string, userId: string, input: UpdateAreaInput) =>
    invoke<Area>('update_area', { id, input, userId }),

  /**
   * Eliminar un área
   */
  delete: (id: string) =>
    invoke<void>('delete_area', { id }),
};

// ============================================================================
// Rigs Commands (Admin Only)
// ============================================================================

export const rigsApi = {
  /**
   * Crear un nuevo taladro
   */
  create: (userId: string, input: CreateRigInput) =>
    invoke<Rig>('create_rig', { input, userId }),

  /**
   * Listar todos los taladros
   * @param includeInactive - Si se deben incluir taladros inactivos
   */
  list: (includeInactive: boolean = false) =>
    invoke<RigWithArea[]>('list_rigs', { includeInactive }),

  /**
   * Obtener un taladro por ID con información del área
   */
  get: (id: string) =>
    invoke<RigWithArea>('get_rig', { id }),

  /**
   * Actualizar un taladro existente
   */
  update: (id: string, userId: string, input: UpdateRigInput) =>
    invoke<RigWithArea>('update_rig', { id, input, userId }),

  /**
   * Eliminar un taladro
   */
  delete: (id: string) =>
    invoke<void>('delete_rig', { id }),
};

// ============================================================================
// User Preferences Commands
// ============================================================================

export const preferencesApi = {
  get: (sessionToken: string) =>
    invoke<import('../types/preferences').UserPreferences | null>('get_user_preferences', { sessionToken }),

  save: (sessionToken: string, input: import('../types/preferences').SavePreferencesInput) =>
    invoke<import('../types/preferences').UserPreferences>('save_user_preferences', { sessionToken, input }),

  uploadLogo: (sessionToken: string, fileData: number[], fileName: string) =>
    invoke<string>('upload_logo', { sessionToken, fileData, fileName }),

  removeLogo: (sessionToken: string) =>
    invoke<void>('remove_logo', { sessionToken }),

  getLogoData: (sessionToken: string) =>
    invoke<string | null>('get_logo_data', { sessionToken }),

  getPublicLogoData: () =>
    invoke<string | null>('get_public_logo_data'),
};

// ============================================================================
// Sync Commands (Turso Cloud)
// ============================================================================

export const syncApi = {
  getStatus: (sessionToken: string) =>
    invoke<import('../types/sync').SyncStatus>('get_sync_status', { sessionToken }),

  enable: (sessionToken: string) =>
    invoke<import('../types/sync').SyncStatus>('enable_sync', { sessionToken }),

  setInterval: (sessionToken: string, intervalMinutes: number) =>
    invoke<import('../types/sync').SyncStatus>('set_sync_interval', { sessionToken, intervalMinutes }),

  testConnection: (sessionToken: string) =>
    invoke<string>('test_turso_connection', { sessionToken }),

  initializeRemote: (sessionToken: string) =>
    invoke<string>('initialize_remote_database', { sessionToken }),

  push: (sessionToken: string) =>
    invoke<import('../types/sync').SyncResult>('sync_push', { sessionToken }),

  pull: (sessionToken: string) =>
    invoke<import('../types/sync').SyncResult>('sync_pull', { sessionToken }),

  fullSync: (sessionToken: string) =>
    invoke<import('../types/sync').SyncResult>('sync_full', { sessionToken }),

  disable: (sessionToken: string) =>
    invoke<void>('disable_sync', { sessionToken }),
};

// ============================================================================
// Operators Commands
// ============================================================================

export const operatorsApi = {
  list: (sessionToken: string, onlyActive: boolean = true) =>
    invoke<import('../types/operator').Operator[]>('list_operators', { sessionToken, onlyActive }),

  get: (sessionToken: string, operatorId: string) =>
    invoke<import('../types/operator').Operator | null>('get_operator', { sessionToken, operatorId }),

  create: (sessionToken: string, input: import('../types/operator').CreateOperatorInput) =>
    invoke<import('../types/operator').Operator>('create_operator', { sessionToken, input }),

  update: (sessionToken: string, operatorId: string, input: import('../types/operator').UpdateOperatorInput) =>
    invoke<import('../types/operator').Operator>('update_operator', { sessionToken, operatorId, input }),

  delete: (sessionToken: string, operatorId: string) =>
    invoke<boolean>('delete_operator', { sessionToken, operatorId }),

  uploadLogo: (sessionToken: string, operatorId: string, fileData: number[], fileName: string) =>
    invoke<import('../types/operator').Operator>('upload_operator_logo', { sessionToken, operatorId, fileData, fileName }),

  removeLogo: (sessionToken: string, operatorId: string) =>
    invoke<import('../types/operator').Operator>('remove_operator_logo', { sessionToken, operatorId }),

  getLogoData: (sessionToken: string, operatorId: string) =>
    invoke<string | null>('get_operator_logo_data', { sessionToken, operatorId }),
};
