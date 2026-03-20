// ============================================================================
// ADMIN STATISTICS TYPES
// ============================================================================

/** Single data point for daily activity charts */
export interface DailyCount {
  day: string;   // "2026-02-24"
  count: number;
}

/** Count grouped by a named category (status, type, etc.) */
export interface CategoryCount {
  category: string;
  count: number;
}

/** Count grouped by rig name */
export interface RigCount {
  rigName: string;
  count: number;
}

/** Incident type count with color info */
export interface IncidentTypeCount {
  typeId: string;
  typeName: string;
  color: string;
  count: number;
}

// ============================================================================
// RESPONSE TYPES
// ============================================================================

export interface ActivityStats {
  dailyReports: DailyCount[];
  totalPeriod: number;
}

export interface LogisticsAdminStats {
  byStatus: CategoryCount[];
  byType: CategoryCount[];
  dailyRequests: DailyCount[];
  topRigs: RigCount[];
  totalRequests: number;
  pendingCount: number;
}

export interface IncidentsAdminStats {
  byType: IncidentTypeCount[];
  dailyIncidents: DailyCount[];
  topRigs: RigCount[];
  totalIncidents: number;
}
