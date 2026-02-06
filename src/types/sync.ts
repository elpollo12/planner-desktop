export interface SyncStatus {
  configured: boolean;
  enabled: boolean;
  tursoUrl: string | null;
  lastSyncAt: string | null;
  lastPushAt: string | null;
  lastPullAt: string | null;
  syncIntervalMinutes: number;
}

export interface SyncConfigInput {
  tursoUrl: string;
  authToken: string;
  syncIntervalMinutes?: number;
}

export interface SyncResult {
  success: boolean;
  tablesSynced: number;
  recordsPushed: number;
  recordsPulled: number;
  errors: string[];
  timestamp: string;
}
