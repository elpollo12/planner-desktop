// ============================================================================
// TIPOS DE INCIDENCIA (dinámicos desde la tabla incident_types)
// ============================================================================

/** Tipo de incidencia dinámico (viene de la tabla incident_types) */
export interface IncidentTypeRecord {
  id: string;
  name: string;
  color: string;
  sortOrder: number;
  createdBy?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateIncidentTypeInput {
  name: string;
  color?: string;
  sortOrder?: number;
}

/** Colores válidos para badges */
export const INCIDENT_TYPE_BADGE_COLORS = [
  'red', 'orange', 'blue', 'green', 'purple', 'gray', 'yellow',
] as const;

export const INCIDENT_TYPE_COLOR_LABELS: Record<string, string> = {
  red: 'Rojo',
  orange: 'Naranja',
  blue: 'Azul',
  green: 'Verde',
  purple: 'Morado',
  gray: 'Gris',
  yellow: 'Amarillo',
};

// --- Incidencia base (listado) ---

export interface Incident {
  id: string;
  rigId: string;
  incidentType: string;
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
  incidentType: string;
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
