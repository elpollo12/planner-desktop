import { invoke } from '@tauri-apps/api/core';

// ============================================================================
// Cloud Logs Types
// ============================================================================

export interface DailyReport {
  id: number;
  taladro: string;
  fecha: string | null;
  rop: number | null;
  wob: number | null;
  rpm: number | null;
  profundidad: number | null;
  nptHoras: number | null;
  nptCausa: string | null;
  actividad: string | null;
  observaciones: string | null;
  messageId: number | null;
  createdAt: string | null;
}

export interface DailyReportsPage {
  reports: DailyReport[];
  total: number;
  page: number;
  pageSize: number;
}

export interface MessageDetail {
  id: number;
  fromNumber: string | null;
  groupName: string | null;
  message: string | null;
  messageType: string | null;
  rawData: string | null;
  createdAt: string | null;
}

// ============================================================================
// Cloud Logs Commands
// ============================================================================

export const cloudLogsApi = {
  list: (
    sessionToken: string,
    taladro: string,
    dateFrom?: string,
    dateTo?: string,
    page?: number,
    pageSize?: number,
  ) =>
    invoke<DailyReportsPage>('list_daily_reports', {
      sessionToken,
      taladro,
      dateFrom: dateFrom ?? null,
      dateTo: dateTo ?? null,
      page,
      pageSize,
    }),

  getMessage: (sessionToken: string, messageId: number) =>
    invoke<MessageDetail>('get_message_detail', { sessionToken, messageId }),
};
