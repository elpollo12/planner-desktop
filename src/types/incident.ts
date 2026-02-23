// ============================================================================
// TIPOS DE INCIDENCIAS
// ============================================================================

export type IncidentType = 'safety' | 'mechanical' | 'operational' | 'environmental' | 'hse' | 'other';

export const INCIDENT_TYPE_LABELS: Record<IncidentType, string> = {
  safety: 'Seguridad',
  mechanical: 'Mecánica',
  operational: 'Operacional',
  environmental: 'Ambiental',
  hse: 'HSE',
  other: 'Otro',
};

export const INCIDENT_TYPE_COLORS: Record<IncidentType, string> = {
  safety: 'red',
  mechanical: 'orange',
  operational: 'blue',
  environmental: 'green',
  hse: 'purple',
  other: 'gray',
};

// --- Incidencia base (listado) ---

export interface Incident {
  id: string;
  rigId: string;
  incidentType: IncidentType;
  description: string;
  createdBy: string;
  createdByName?: string;
  createdAt: string;
  updatedAt: string;
}

// --- Personal involucrado ---

export interface IncidentPersonnelInfo {
  id: string;
  personnelId: string;
  name: string;
  ci?: string;
  position: string;
}

// --- Incidencia con personal (detalle) ---

export interface IncidentWithPersonnel extends Incident {
  personnel: IncidentPersonnelInfo[];
}

// --- Input para crear ---

export interface CreateIncidentInput {
  incidentType: IncidentType;
  description: string;
  personnelIds: string[];
}

// --- Respuesta paginada ---

export interface PaginatedIncidents {
  data: Incident[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}
