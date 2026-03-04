import { invoke } from '@tauri-apps/api/core';
import type {
  IncidentWithPersonnel,
  PaginatedIncidents,
  CreateIncidentInput,
  IncidentTypeRecord,
  CreateIncidentTypeInput,
} from '../../types/incident';

// ============================================================================
// Incidents Commands
// ============================================================================

export const incidentsApi = {
  create: (sessionToken: string, rigId: string, input: CreateIncidentInput) =>
    invoke<IncidentWithPersonnel>('create_incident', { sessionToken, rigId, input }),

  list: (sessionToken: string, rigId: string, incidentType?: string, page?: number, pageSize?: number) =>
    invoke<PaginatedIncidents>('list_incidents', { sessionToken, rigId, incidentType, page, pageSize }),

  get: (sessionToken: string, incidentId: string) =>
    invoke<IncidentWithPersonnel>('get_incident', { sessionToken, incidentId }),

  delete: (sessionToken: string, incidentId: string) =>
    invoke<void>('delete_incident', { sessionToken, incidentId }),
};

// ============================================================================
// Incident Types Commands
// ============================================================================

export const incidentTypesApi = {
  list: (sessionToken: string) =>
    invoke<IncidentTypeRecord[]>('list_incident_types', { sessionToken }),

  create: (sessionToken: string, input: CreateIncidentTypeInput) =>
    invoke<IncidentTypeRecord>('create_incident_type', { sessionToken, input }),

  delete: (sessionToken: string, typeId: string) =>
    invoke<void>('delete_incident_type', { sessionToken, typeId }),
};
