import { invoke } from '@tauri-apps/api/core';
import type { SyncStatus, SyncResult } from '../../types/sync';

// ============================================================================
// Sync Commands (planner-sync server)
// ============================================================================

export const syncApi = {
  getStatus: (sessionToken: string) =>
    invoke<SyncStatus>('get_sync_status', { sessionToken }),

  /** Lightweight ping to check if sync server is reachable (any user) */
  ping: (sessionToken: string) =>
    invoke<boolean>('ping_sync_server', { sessionToken }),

  enable: (sessionToken: string) =>
    invoke<SyncStatus>('enable_sync', { sessionToken }),

  setInterval: (sessionToken: string, intervalMinutes: number) =>
    invoke<SyncStatus>('set_sync_interval', { sessionToken, intervalMinutes }),

  testConnection: (sessionToken: string) =>
    invoke<string>('test_sync_connection', { sessionToken }),

  syncLogin: (sessionToken: string, username: string, password: string) =>
    invoke<string>('sync_login', { sessionToken, username, password }),

  push: (sessionToken: string) =>
    invoke<SyncResult>('sync_push', { sessionToken }),

  pull: (sessionToken: string) =>
    invoke<SyncResult>('sync_pull', { sessionToken }),

  fullSync: (sessionToken: string) =>
    invoke<SyncResult>('sync_full', { sessionToken }),

  incrementalSync: (sessionToken: string) =>
    invoke<SyncResult>('sync_incremental', { sessionToken }),

  disable: (sessionToken: string) =>
    invoke<void>('disable_sync', { sessionToken }),

  connect: (sessionToken: string, url: string, username: string, password: string) =>
    invoke<SyncStatus>('connect_sync_server', { sessionToken, url, username, password }),

  setServerUrl: (sessionToken: string, url: string) =>
    invoke<SyncStatus>('set_sync_server_url', { sessionToken, url }),

  getServerUrl: (sessionToken: string) =>
    invoke<string | null>('get_sync_server_url', { sessionToken }),
};
