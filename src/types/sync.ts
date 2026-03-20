export interface SyncStatus {
  /** Whether sync server URL is configured via environment variable */
  configured: boolean;
  /** Whether sync is enabled by admin */
  enabled: boolean;
  /** Last full sync timestamp */
  lastSyncAt: string | null;
  /** Last push timestamp */
  lastPushAt: string | null;
  /** Last pull timestamp */
  lastPullAt: string | null;
  /** Auto-sync interval in minutes */
  syncIntervalMinutes: number;
  /** Error message if server URL is not configured */
  configError: string | null;
}

export interface SyncResult {
  success: boolean;
  tablesSynced: number;
  recordsPushed: number;
  recordsPulled: number;
  errors: string[];
  timestamp: string;
}
