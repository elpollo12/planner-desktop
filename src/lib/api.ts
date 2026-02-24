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
import type { LastReportSnapshot } from '../types';
import type {
  Report,
  CreateReportInput,
  ReportFilters,
  ReportReview,
  DrillStringComponent,
  CrewShift,
  BitRecord,
  OperationCode,
  MudRecord,
  MudAdditive,
  TimeDistribution,
  DrillingParameters,
  DeviationHistory,
  OperationsLog,
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
import type {
  WaterBottlesMovement,
  CreateWaterBottlesMovement,
  FuelMovement,
  CreateFuelMovement,
  VacuumAction,
  CreateVacuumAction,
  UpdateVacuumAction,
  Material,
  CreateMaterial,
  UpdateMaterial,
  MaterialMovement,
  CreateMaterialMovement,
  LogisticsRequest,
  CreateLogisticsRequest,
  UpdateRequestStatus,
  LogisticsReport,
  PaginatedResponse,
} from '../types/logistics';
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

  approve: (sessionToken: string, reportId: string, comment?: string) =>
    invoke<Report>('approve_report', { sessionToken, reportId, comment: comment || null }),

  reject: (sessionToken: string, reportId: string, reason: string) =>
    invoke<Report>('reject_report', { sessionToken, reportId, reason }),

  reopen: (sessionToken: string, reportId: string) =>
    invoke<Report>('reopen_report', { sessionToken, reportId }),

  // Last report snapshot (pre-fill template per rig)
  getLastSnapshot: (sessionToken: string, rigId: string) =>
    invoke<LastReportSnapshot | null>('get_last_report_snapshot', { sessionToken, rigId }),

  updateSnapshot: (sessionToken: string, reportId: string) =>
    invoke<void>('update_report_snapshot', { sessionToken, reportId }),
};

// ============================================================================
// Report Reviews Commands (Approval Audit Trail)
// ============================================================================

export const reportReviewsApi = {
  create: (sessionToken: string, reportId: string, action: string, comment?: string) =>
    invoke<ReportReview>('create_report_review', { sessionToken, reportId, action, comment }),

  list: (sessionToken: string, reportId: string) =>
    invoke<ReportReview[]>('list_report_reviews', { sessionToken, reportId }),
};

// ============================================================================
// Drill String Commands
// ============================================================================

export const drillStringApi = {
  saveBulk: (sessionToken: string, reportId: string, data: Array<{ pieceName: string; length?: number }>) =>
    invoke<DrillStringComponent[]>('save_drill_string_components', { sessionToken, reportId, data }),

  create: (sessionToken: string, reportId: string, data: { pieceName: string; length?: number }) =>
    invoke<DrillStringComponent>('create_drill_string_component', { sessionToken, reportId, data }),

  list: (sessionToken: string, reportId: string) =>
    invoke<DrillStringComponent[]>('list_drill_string_components', { sessionToken, reportId }),

  deleteAll: (sessionToken: string, reportId: string) =>
    invoke<void>('delete_all_drill_string_components', { sessionToken, reportId }),
};

// ============================================================================
// Crew Commands
// ============================================================================

export const crewApi = {
  saveBulk: (sessionToken: string, reportId: string, data: Array<{ shift: string; shiftStart?: string; shiftEnd?: string; members: Array<{ personnelId?: string; position: string; hours?: number }> }>) =>
    invoke<CrewShift[]>('save_crew_shifts', { sessionToken, reportId, data }),

  createShift: (sessionToken: string, reportId: string, data: { shift: string; shiftStart?: string; shiftEnd?: string; members: Array<{ personnelId?: string; position: string; ci?: string; name?: string; hours?: number }> }) =>
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
  saveBulk: (sessionToken: string, reportId: string, data: Array<Partial<BitRecord>>) =>
    invoke<BitRecord[]>('save_bit_records', { sessionToken, reportId, data }),

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
  saveBulk: (sessionToken: string, reportId: string, data: { records: Array<Partial<MudRecord>>; additives: Array<Partial<MudAdditive>> }) =>
    invoke<{ records: MudRecord[]; additives: MudAdditive[] }>('save_mud_data', { sessionToken, reportId, data }),

  createRecord: (sessionToken: string, reportId: string, data: Partial<MudRecord>) =>
    invoke<MudRecord>('create_mud_record', { sessionToken, reportId, data }),

  listRecords: (sessionToken: string, reportId: string) =>
    invoke<MudRecord[]>('list_mud_records', { sessionToken, reportId }),

  createAdditive: (sessionToken: string, reportId: string, data: Partial<MudAdditive>) =>
    invoke<MudAdditive>('create_mud_additive', { sessionToken, reportId, data }),

  listAdditives: (sessionToken: string, reportId: string) =>
    invoke<MudAdditive[]>('list_mud_additives', { sessionToken, reportId }),

  deleteAllRecords: (sessionToken: string, reportId: string) =>
    invoke<void>('delete_all_mud_records', { sessionToken, reportId }),

  deleteAllAdditives: (sessionToken: string, reportId: string) =>
    invoke<void>('delete_all_mud_additives', { sessionToken, reportId }),
};

// ============================================================================
// TIME DISTRIBUTION COMMANDS
// ============================================================================

export const timeDistributionApi = {
  saveBulk: async (sessionToken: string, reportId: string, data: Array<{ operationCodeId: string; hoursShift1: number; hoursShift2: number; hoursShift3: number }>) => {
    const transformedData = data.map(distribution => ({
      operation_code_id: distribution.operationCodeId,
      hours_shift1: distribution.hoursShift1,
      hours_shift2: distribution.hoursShift2,
      hours_shift3: distribution.hoursShift3,
    }));

    return invoke<TimeDistribution[]>('save_time_distributions', {
      sessionToken,
      reportId,
      data: transformedData
    });
  },

  list: (sessionToken: string, reportId: string) =>
    invoke<TimeDistribution[]>('list_time_distributions', { sessionToken, reportId }),

  deleteAll: (sessionToken: string, reportId: string) =>
    invoke<void>('delete_all_time_distributions', { sessionToken, reportId }),
};

// ============================================================================
// DRILLING PARAMETERS COMMANDS
// ============================================================================

export const drillingParamsApi = {
  saveBulk: (sessionToken: string, reportId: string, data: Array<Partial<DrillingParameters>>) =>
    invoke<DrillingParameters[]>('save_drilling_parameters', { sessionToken, reportId, data }),

  create: (sessionToken: string, reportId: string, data: Partial<DrillingParameters>) =>
    invoke<DrillingParameters>('create_drilling_parameter', { sessionToken, reportId, data }),

  list: (sessionToken: string, reportId: string) =>
    invoke<DrillingParameters[]>('list_drilling_parameters', { sessionToken, reportId }),

  deleteAll: (sessionToken: string, reportId: string) =>
    invoke<void>('delete_all_drilling_parameters', { sessionToken, reportId }),
};

// ============================================================================
// DEVIATION COMMANDS
// ============================================================================

export const deviationApi = {
  saveBulk: (sessionToken: string, reportId: string, data: Array<Partial<DeviationHistory>>) =>
    invoke<DeviationHistory[]>('save_deviation_records', { sessionToken, reportId, data }),

  create: (sessionToken: string, reportId: string, data: Partial<DeviationHistory>) =>
    invoke<DeviationHistory>('create_deviation_record', { sessionToken, reportId, data }),

  list: (sessionToken: string, reportId: string) =>
    invoke<DeviationHistory[]>('list_deviation_records', { sessionToken, reportId }),

  deleteAll: (sessionToken: string, reportId: string) =>
    invoke<void>('delete_all_deviation_records', { sessionToken, reportId }),
};

// ============================================================================
// OPERATIONS LOG COMMANDS
// ============================================================================

export const operationsLogApi = {
  saveBulk: (sessionToken: string, reportId: string, data: Array<Partial<OperationsLog>>) =>
    invoke<OperationsLog[]>('save_operation_logs', { sessionToken, reportId, data }),

  create: (sessionToken: string, reportId: string, data: Partial<OperationsLog>) =>
    invoke<OperationsLog>('create_operation_log', { sessionToken, reportId, data }),

  list: (sessionToken: string, reportId: string) =>
    invoke<OperationsLog[]>('list_operation_logs', { sessionToken, reportId }),

  deleteAll: (sessionToken: string, reportId: string) =>
    invoke<void>('delete_all_operation_logs', { sessionToken, reportId }),
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
   * Listar taladros accesibles por el usuario actual (basado en permisos)
   * @param sessionToken - Token de sesión del usuario
   * @param includeInactive - Si se deben incluir taladros inactivos
   */
  listAccessible: (sessionToken: string, includeInactive: boolean = false) =>
    invoke<RigWithArea[]>('list_accessible_rigs', { sessionToken, includeInactive }),

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
// Rig Personnel Commands
// ============================================================================

export const rigPersonnelApi = {
  create: (rigId: string, input: import('../types/rig').CreateRigPersonnelInput) =>
    invoke<import('../types/rig').RigPersonnel>('create_rig_personnel', { rigId, input }),

  list: (rigId: string, includeInactive: boolean = false) =>
    invoke<import('../types/rig').RigPersonnel[]>('list_rig_personnel', { rigId, includeInactive }),

  update: (id: string, input: import('../types/rig').UpdateRigPersonnelInput) =>
    invoke<import('../types/rig').RigPersonnel>('update_rig_personnel', { id, input }),

  delete: (id: string) =>
    invoke<void>('delete_rig_personnel', { id }),
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

  incrementalSync: (sessionToken: string) =>
    invoke<import('../types/sync').SyncResult>('sync_incremental', { sessionToken }),

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

// ============================================================================
// Logistics - Water Bottles
// ============================================================================

export const waterBottlesApi = {
  createMovement: (sessionToken: string, rigId: string, movement: CreateWaterBottlesMovement) =>
    invoke<WaterBottlesMovement>('create_water_bottles_movement', { sessionToken, rigId, movement }),

  getMovements: (sessionToken: string, rigId: string, page?: number, pageSize?: number) =>
    invoke<PaginatedResponse<WaterBottlesMovement>>('get_water_bottles_movements', { sessionToken, rigId, page, pageSize }),

  deleteMovement: (sessionToken: string, movementId: string) =>
    invoke<void>('delete_water_bottles_movement', { sessionToken, movementId }),

  getStock: (sessionToken: string, rigId: string) =>
    invoke<number>('get_water_bottles_stock', { sessionToken, rigId }),
};

// ============================================================================
// Logistics - Fuel
// ============================================================================

export const fuelApi = {
  createMovement: (sessionToken: string, rigId: string, movement: CreateFuelMovement) =>
    invoke<FuelMovement>('create_fuel_movement', { sessionToken, rigId, movement }),

  getMovements: (sessionToken: string, rigId: string, page?: number, pageSize?: number) =>
    invoke<PaginatedResponse<FuelMovement>>('get_fuel_movements', { sessionToken, rigId, page, pageSize }),

  deleteMovement: (sessionToken: string, movementId: string) =>
    invoke<void>('delete_fuel_movement', { sessionToken, movementId }),

  getStock: (sessionToken: string, rigId: string) =>
    invoke<number>('get_fuel_stock', { sessionToken, rigId }),
};

// ============================================================================
// Logistics - Vacuum / Cisterna
// ============================================================================

export const vacuumApi = {
  createAction: (sessionToken: string, rigId: string, input: CreateVacuumAction) =>
    invoke<VacuumAction>('create_vacuum_action', { sessionToken, rigId, input }),

  getActions: (sessionToken: string, rigId: string, page?: number, pageSize?: number) =>
    invoke<PaginatedResponse<VacuumAction>>('get_vacuum_actions', { sessionToken, rigId, page, pageSize }),

  updateAction: (sessionToken: string, actionId: string, input: UpdateVacuumAction) =>
    invoke<VacuumAction>('update_vacuum_action', { sessionToken, actionId, input }),

  deleteAction: (sessionToken: string, actionId: string) =>
    invoke<void>('delete_vacuum_action', { sessionToken, actionId }),
};

// ============================================================================
// Logistics - Materials (Catalog + Movements)
// ============================================================================

export const materialsApi = {
  // Catálogo (global — sin rigId)
  create: (sessionToken: string, input: CreateMaterial) =>
    invoke<Material>('create_material', { sessionToken, input }),

  list: (sessionToken: string, activeOnly?: boolean) =>
    invoke<Material[]>('list_materials', { sessionToken, activeOnly }),

  update: (sessionToken: string, materialId: string, input: UpdateMaterial) =>
    invoke<Material>('update_material', { sessionToken, materialId, input }),

  delete: (sessionToken: string, materialId: string) =>
    invoke<void>('delete_material', { sessionToken, materialId }),

  // Movimientos (con rigId)
  createMovement: (sessionToken: string, rigId: string, movement: CreateMaterialMovement) =>
    invoke<MaterialMovement>('create_material_movement', { sessionToken, rigId, movement }),

  getMovements: (sessionToken: string, rigId: string, materialId?: string, page?: number, pageSize?: number) =>
    invoke<PaginatedResponse<MaterialMovement>>('get_material_movements', { sessionToken, rigId, materialId, page, pageSize }),

  deleteMovement: (sessionToken: string, movementId: string) =>
    invoke<void>('delete_material_movement', { sessionToken, movementId }),

  getStock: (sessionToken: string, rigId: string, materialId: string) =>
    invoke<number>('get_material_stock', { sessionToken, rigId, materialId }),
};

// ============================================================================
// Logistics - Requests
// ============================================================================

export const logisticsRequestsApi = {
  create: (sessionToken: string, rigId: string, input: CreateLogisticsRequest) =>
    invoke<LogisticsRequest>('create_logistics_request', { sessionToken, rigId, input }),

  list: (sessionToken: string, rigId: string, requestType?: string, status?: string, page?: number, pageSize?: number) =>
    invoke<PaginatedResponse<LogisticsRequest>>('list_logistics_requests', { sessionToken, rigId, requestType, status, page, pageSize }),

  updateStatus: (sessionToken: string, requestId: string, input: UpdateRequestStatus) =>
    invoke<LogisticsRequest>('update_logistics_request_status', { sessionToken, requestId, input }),

  delete: (sessionToken: string, requestId: string) =>
    invoke<void>('delete_logistics_request', { sessionToken, requestId }),

  getPendingCount: (sessionToken: string, rigId: string) =>
    invoke<number>('get_pending_requests_count', { sessionToken, rigId }),
};

// ============================================================================
// Logistics - Reports
// ============================================================================

export const logisticsReportsApi = {
  getReport: (sessionToken: string, rigId: string, periodStart: string, periodEnd: string) =>
    invoke<LogisticsReport>('get_logistics_report', { sessionToken, rigId, periodStart, periodEnd }),

  getDetailedReport: (sessionToken: string, rigId: string, section: string, periodStart: string, periodEnd: string, materialId?: string) =>
    invoke<import('../types/logistics').DetailedLogisticsReport>('get_detailed_logistics_report', { sessionToken, rigId, section, periodStart, periodEnd, materialId }),
};

// ============================================================================
// License Commands
// ============================================================================

export const licenseApi = {
  getStatus: () =>
    invoke<import('../store/licenseStore').LicenseInfo | null>('get_license_status'),

  activate: (licenseKey: string) =>
    invoke<import('../store/licenseStore').LicenseInfo>('activate_license', { licenseKey }),

  deactivate: () =>
    invoke<void>('deactivate_license'),
};

// ============================================================================
// Incidents Commands
// ============================================================================

export const incidentsApi = {
  create: (sessionToken: string, rigId: string, input: import('../types/incident').CreateIncidentInput) =>
    invoke<import('../types/incident').IncidentWithPersonnel>('create_incident', { sessionToken, rigId, input }),

  list: (sessionToken: string, rigId: string, incidentType?: string, page?: number, pageSize?: number) =>
    invoke<import('../types/incident').PaginatedIncidents>('list_incidents', { sessionToken, rigId, incidentType, page, pageSize }),

  get: (sessionToken: string, incidentId: string) =>
    invoke<import('../types/incident').IncidentWithPersonnel>('get_incident', { sessionToken, incidentId }),

  delete: (sessionToken: string, incidentId: string) =>
    invoke<void>('delete_incident', { sessionToken, incidentId }),
};

// ============================================================================
// Incident Types Commands
// ============================================================================

export const incidentTypesApi = {
  list: (sessionToken: string) =>
    invoke<import('../types/incident').IncidentTypeRecord[]>('list_incident_types', { sessionToken }),

  create: (sessionToken: string, input: import('../types/incident').CreateIncidentTypeInput) =>
    invoke<import('../types/incident').IncidentTypeRecord>('create_incident_type', { sessionToken, input }),

  delete: (sessionToken: string, typeId: string) =>
    invoke<void>('delete_incident_type', { sessionToken, typeId }),
};

// ============================================================================
// Notifications Commands
// ============================================================================

export const notificationsApi = {
  list: (
    sessionToken: string,
    category?: string,
    isRead?: boolean,
    page?: number,
    pageSize?: number,
  ) =>
    invoke<import('../types/notification').PaginatedNotifications>('list_notifications', {
      sessionToken,
      category: category || null,
      isRead: isRead ?? null,
      page,
      pageSize,
    }),

  getUnreadCount: (sessionToken: string) =>
    invoke<number>('get_unread_count', { sessionToken }),

  markRead: (sessionToken: string, notificationId: string) =>
    invoke<void>('mark_notification_read', { sessionToken, notificationId }),

  markAllRead: (sessionToken: string) =>
    invoke<void>('mark_all_notifications_read', { sessionToken }),

  delete: (sessionToken: string, notificationId: string) =>
    invoke<void>('delete_notification', { sessionToken, notificationId }),

  getRetentionDays: (sessionToken: string) =>
    invoke<number>('get_notification_retention_days', { sessionToken }),

  setRetentionDays: (sessionToken: string, days: number) =>
    invoke<void>('set_notification_retention_days', { sessionToken, days }),
};

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
