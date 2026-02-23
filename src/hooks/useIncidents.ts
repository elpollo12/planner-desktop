import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuthStore } from '../store/authStore';
import { incidentsApi, rigPersonnelApi } from '../lib/api';
import type { CreateIncidentInput } from '../types/incident';

// ============================================================================
// QUERY KEY FACTORY
// ============================================================================

export const incidentKeys = {
  all: (rigId: string) => ['incidents', rigId] as const,

  list: (rigId: string, incidentType: string, page: number, pageSize: number) =>
    ['incidents', rigId, 'list', { incidentType, page, pageSize }] as const,

  detail: (incidentId: string) =>
    ['incidents', 'detail', incidentId] as const,

  personnel: (rigId: string) =>
    ['incidents', rigId, 'personnel'] as const,
};

// ============================================================================
// LIST INCIDENTS (paginated, filterable)
// ============================================================================

export function useIncidentsList(
  rigId: string,
  incidentType: string,
  page: number,
  pageSize: number,
) {
  const { sessionToken } = useAuthStore();
  return useQuery({
    queryKey: incidentKeys.list(rigId, incidentType, page, pageSize),
    queryFn: () =>
      incidentsApi.list(
        sessionToken!,
        rigId,
        incidentType || undefined,
        page,
        pageSize,
      ),
    enabled: !!sessionToken && !!rigId,
  });
}

// ============================================================================
// GET INCIDENT DETAIL
// ============================================================================

export function useIncidentDetail(incidentId: string | null) {
  const { sessionToken } = useAuthStore();
  return useQuery({
    queryKey: incidentKeys.detail(incidentId ?? ''),
    queryFn: () => incidentsApi.get(sessionToken!, incidentId!),
    enabled: !!sessionToken && !!incidentId,
  });
}

// ============================================================================
// RIG PERSONNEL (for the multi-select in the form)
// ============================================================================

export function useRigPersonnel(rigId: string) {
  return useQuery({
    queryKey: incidentKeys.personnel(rigId),
    queryFn: () => rigPersonnelApi.list(rigId, false),
    enabled: !!rigId,
    staleTime: 1000 * 60 * 5, // 5 min — personnel changes infrequently
  });
}

// ============================================================================
// CREATE INCIDENT
// ============================================================================

export function useCreateIncident(rigId: string) {
  const { sessionToken } = useAuthStore();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateIncidentInput) =>
      incidentsApi.create(sessionToken!, rigId, input),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: incidentKeys.all(rigId) });
    },
  });
}

// ============================================================================
// DELETE INCIDENT
// ============================================================================

export function useDeleteIncident(rigId: string) {
  const { sessionToken } = useAuthStore();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (incidentId: string) =>
      incidentsApi.delete(sessionToken!, incidentId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: incidentKeys.all(rigId) });
    },
  });
}
