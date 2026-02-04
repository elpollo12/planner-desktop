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

  list: (sessionToken: string, filters: ReportFilters) =>
    invoke<Report[]>('list_reports', { sessionToken, filters }),

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
};

// ============================================================================
// TIME DISTRIBUTION COMMANDS
// ============================================================================

export const timeDistributionApi = {
  saveBulk: (sessionToken: string, reportId: string, data: any[]) =>
    invoke('save_time_distributions', { sessionToken, reportId, data }),

  list: (sessionToken: string, reportId: string) =>
    invoke('list_time_distributions', { sessionToken, reportId }),
};

// ============================================================================
// DRILLING PARAMETERS COMMANDS
// ============================================================================

export const drillingParamsApi = {
  create: (sessionToken: string, reportId: string, data: any) =>
    invoke('create_drilling_parameter', { sessionToken, reportId, data }),

  list: (sessionToken: string, reportId: string) =>
    invoke('list_drilling_parameters', { sessionToken, reportId }),
};

// ============================================================================
// DEVIATION COMMANDS
// ============================================================================

export const deviationApi = {
  create: (sessionToken: string, reportId: string, data: any) =>
    invoke('create_deviation_record', { sessionToken, reportId, data }),

  list: (sessionToken: string, reportId: string) =>
    invoke('list_deviation_records', { sessionToken, reportId }),
};

// ============================================================================
// OPERATIONS LOG COMMANDS
// ============================================================================

export const operationsLogApi = {
  create: (sessionToken: string, reportId: string, data: any) =>
    invoke('create_operation_log', { sessionToken, reportId, data }),

  list: (sessionToken: string, reportId: string) =>
    invoke('list_operation_logs', { sessionToken, reportId }),
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
