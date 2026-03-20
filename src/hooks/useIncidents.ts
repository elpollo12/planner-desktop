import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuthStore } from '../store/authStore';
import { incidentsApi, incidentTypesApi, rigPersonnelApi } from '../lib/api';
import type { CreateIncidentInput, CreateIncidentTypeInput } from '../types/incident';

// ============================================================================
// QUERY KEY FACTORY
// ============================================================================

export const incidentKeys = {
  // Root key for a rig's incidents (for invalidation)
  all: (rigId: string) => ['incidents', rigId] as const,

  // List with filters (matches the root prefix for proper invalidation)
  list: (rigId: string, incidentType: string, page: number, pageSize: number) =>
    ['incidents', rigId, 'list', { incidentType, page, pageSize }] as const,

  // Single incident detail
  detail: (incidentId: string) =>
    ['incidents', 'detail', incidentId] as const,

  // Personnel for a rig (used in form)
  personnel: (rigId: string) =>
    ['incidents', rigId, 'personnel'] as const,

  // Incident types catalog
  types: () => ['incident-types'] as const,
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
      // Invalidate AND refetch all incident lists for this rig
      // Using refetchType: 'active' ensures mounted queries refetch immediately
      qc.invalidateQueries({
        queryKey: incidentKeys.all(rigId),
        refetchType: 'active',
      });
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
      qc.invalidateQueries({
        queryKey: incidentKeys.all(rigId),
        refetchType: 'active',
      });
    },
  });
}

// ============================================================================
// INCIDENT TYPES
// ============================================================================

export function useIncidentTypes() {
  const { sessionToken } = useAuthStore();
  return useQuery({
    queryKey: incidentKeys.types(),
    queryFn: () => incidentTypesApi.list(sessionToken!),
    enabled: !!sessionToken,
    staleTime: 1000 * 60 * 10, // 10 min
  });
}

export function useCreateIncidentType() {
  const { sessionToken } = useAuthStore();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateIncidentTypeInput) =>
      incidentTypesApi.create(sessionToken!, input),
    onSuccess: () => {
      qc.invalidateQueries({
        queryKey: incidentKeys.types(),
        refetchType: 'active',
      });
    },
  });
}

export function useDeleteIncidentType() {
  const { sessionToken } = useAuthStore();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (typeId: string) =>
      incidentTypesApi.delete(sessionToken!, typeId),
    onSuccess: () => {
      qc.invalidateQueries({
        queryKey: incidentKeys.types(),
        refetchType: 'active',
      });
    },
  });
}
