import { invoke } from '@tauri-apps/api/core';
import type { LastReportSnapshot } from '../../types';
import type {
  Report,
  CreateReportInput,
  ReportFilters,
  ReportReview,
  DrillStringComponent,
  CrewShift,
  BitRecord,
  MudRecord,
  MudAdditive,
  TimeDistribution,
  DrillingParameters,
  DeviationHistory,
  OperationsLog,
} from '../../types/report';

export interface PaginatedReportsResponse {
  reports: Report[];
  total: number;
  page: number;
  page_size: number;
  total_pages: number;
}

// ============================================================================
// Report Commands
// ============================================================================

export const reportsApi = {
  create: (sessionToken: string, reportData: CreateReportInput) =>
    invoke<Report>('create_report', { sessionToken, reportData }),

  list: (
    sessionToken: string,
    filters: ReportFilters,
    page?: number,
    pageSize?: number,
  ) =>
    invoke<PaginatedReportsResponse>('list_reports', { sessionToken, filters, page, pageSize }),

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
// Mud Commands
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
// Time Distribution Commands
// ============================================================================

export const timeDistributionApi = {
  saveBulk: async (sessionToken: string, reportId: string, data: Array<{ operationCodeId: string; hoursShift1: number; hoursShift2: number; hoursShift3: number }>) => {
    const transformedData = data.map(distribution => ({
      operation_code_id: distribution.operationCodeId,
      hours_shift1: distribution.hoursShift1,
      hours_shift2: distribution.hoursShift2,
      hours_shift3: distribution.hoursShift3,
    }));
    return invoke<TimeDistribution[]>('save_time_distributions', { sessionToken, reportId, data: transformedData });
  },

  list: (sessionToken: string, reportId: string) =>
    invoke<TimeDistribution[]>('list_time_distributions', { sessionToken, reportId }),

  deleteAll: (sessionToken: string, reportId: string) =>
    invoke<void>('delete_all_time_distributions', { sessionToken, reportId }),
};

// ============================================================================
// Drilling Parameters Commands
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
// Deviation Commands
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
// Operations Log Commands
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
