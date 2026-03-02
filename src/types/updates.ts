// Update preferences types

export interface UpdatePreferences {
  id: string;
  userId: string;
  autoUpdate: boolean;
  channel: 'stable';
  checkIntervalHours: number;
  lastCheckAt: string | null;
  postponedVersion: string | null;
  postponeCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface SaveUpdatePreferencesInput {
  autoUpdate?: boolean;
  channel?: 'stable';
  checkIntervalHours?: number;
}

export interface PostponeUpdateInput {
  version: string;
}

export interface UpdateInfo {
  version: string;
  channel: string;
  pubDate: string;
  notes: string;
  breakingChanges: boolean;
  downloadUrl: string;
  signature: string;
  size?: number;
}

export interface ApiRelease {
  version: string;
  channel: string;
  pubDate: string;
  notes: string;
  breakingChanges: boolean;
  minVersion?: string;
  asset?: ApiAsset;
}

export interface ApiAsset {
  url: string;
  signature: string;
  checksum?: string;
  size?: number;
}

export interface CheckUpdateResponse {
  updateAvailable: boolean;
  release?: ApiRelease;
  latestVersion: string;
  currentVersion: string;
}

export interface UpdateCheckStatus {
  preferences: UpdatePreferences | null;
  currentVersion: string;
  lastCheckAt: string | null;
  canPostpone: boolean;
  maxPostpones: number;
}

// Update state for UI
export type UpdateState =
  | { status: 'idle' }
  | { status: 'checking' }
  | { status: 'available'; release: ApiRelease; canPostpone: boolean }
  | { status: 'downloading'; progress: number }
  | { status: 'ready' }
  | { status: 'error'; message: string };
