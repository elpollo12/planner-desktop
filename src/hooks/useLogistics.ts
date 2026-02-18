import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuthStore } from '../store/authStore';
import {
  waterBottlesApi,
  fuelApi,
  vacuumApi,
  materialsApi,
  logisticsRequestsApi,
  logisticsReportsApi,
} from '../lib/api';
import type {
  CreateWaterBottlesMovement,
  CreateFuelMovement,
  CreateVacuumAction,
  CreateMaterialMovement,
  CreateLogisticsRequest,
  RequestStatus,
} from '../types/logistics';

// ============================================================================
// QUERY KEY FACTORY
// ============================================================================
// Hierarchical keys enable granular invalidation:
//   invalidateQueries({ queryKey: ['logistics', rigId, 'water'] })
//   → invalidates both movements and stock for water bottles on that rig.
// ============================================================================

export const logisticsKeys = {
  // Root
  all: (rigId: string) => ['logistics', rigId] as const,

  // ── Water Bottles ──
  water: (rigId: string) => ['logistics', rigId, 'water'] as const,
  waterMovements: (rigId: string, page: number, pageSize: number) =>
    ['logistics', rigId, 'water', 'movements', { page, pageSize }] as const,
  waterStock: (rigId: string) =>
    ['logistics', rigId, 'water', 'stock'] as const,

  // ── Fuel ──
  fuel: (rigId: string) => ['logistics', rigId, 'fuel'] as const,
  fuelMovements: (rigId: string, page: number, pageSize: number) =>
    ['logistics', rigId, 'fuel', 'movements', { page, pageSize }] as const,
  fuelStock: (rigId: string) =>
    ['logistics', rigId, 'fuel', 'stock'] as const,

  // ── Vacuum ──
  vacuum: (rigId: string) => ['logistics', rigId, 'vacuum'] as const,
  vacuumActions: (rigId: string, page: number, pageSize: number) =>
    ['logistics', rigId, 'vacuum', 'actions', { page, pageSize }] as const,

  // ── Materials ──
  materialsCatalog: () => ['logistics', 'materials', 'catalog'] as const,
  materials: (rigId: string) => ['logistics', rigId, 'materials'] as const,
  materialMovements: (
    rigId: string,
    materialId: string | undefined,
    page: number,
    pageSize: number,
  ) =>
    ['logistics', rigId, 'materials', 'movements', { materialId, page, pageSize }] as const,
  materialStock: (rigId: string, materialId: string) =>
    ['logistics', rigId, 'materials', 'stock', materialId] as const,

  // ── Requests ──
  requests: (rigId: string) => ['logistics', rigId, 'requests'] as const,
  requestsList: (
    rigId: string,
    type: string,
    status: string,
    page: number,
    pageSize: number,
  ) =>
    ['logistics', rigId, 'requests', 'list', { type, status, page, pageSize }] as const,
  pendingCount: (rigId: string) =>
    ['logistics', rigId, 'requests', 'pendingCount'] as const,

  // ── Reports ──
  report: (rigId: string, periodStart: string, periodEnd: string) =>
    ['logistics', rigId, 'report', { periodStart, periodEnd }] as const,
};

// ============================================================================
// WATER BOTTLES
// ============================================================================

export function useWaterBottlesMovements(rigId: string, page: number, pageSize: number) {
  const { sessionToken } = useAuthStore();
  return useQuery({
    queryKey: logisticsKeys.waterMovements(rigId, page, pageSize),
    queryFn: () => waterBottlesApi.getMovements(sessionToken!, rigId, page, pageSize),
    enabled: !!sessionToken && !!rigId,
  });
}

export function useWaterBottlesStock(rigId: string) {
  const { sessionToken } = useAuthStore();
  return useQuery({
    queryKey: logisticsKeys.waterStock(rigId),
    queryFn: () => waterBottlesApi.getStock(sessionToken!, rigId),
    enabled: !!sessionToken && !!rigId,
  });
}

export function useCreateWaterBottlesMovement(rigId: string) {
  const { sessionToken } = useAuthStore();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (movement: CreateWaterBottlesMovement) =>
      waterBottlesApi.createMovement(sessionToken!, rigId, movement),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: logisticsKeys.water(rigId) });
      qc.invalidateQueries({ queryKey: logisticsKeys.pendingCount(rigId) });
    },
  });
}

export function useDeleteWaterBottlesMovement(rigId: string) {
  const { sessionToken } = useAuthStore();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (movementId: string) =>
      waterBottlesApi.deleteMovement(sessionToken!, movementId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: logisticsKeys.water(rigId) });
    },
  });
}

// ============================================================================
// FUEL
// ============================================================================

export function useFuelMovements(rigId: string, page: number, pageSize: number) {
  const { sessionToken } = useAuthStore();
  return useQuery({
    queryKey: logisticsKeys.fuelMovements(rigId, page, pageSize),
    queryFn: () => fuelApi.getMovements(sessionToken!, rigId, page, pageSize),
    enabled: !!sessionToken && !!rigId,
  });
}

export function useFuelStock(rigId: string) {
  const { sessionToken } = useAuthStore();
  return useQuery({
    queryKey: logisticsKeys.fuelStock(rigId),
    queryFn: () => fuelApi.getStock(sessionToken!, rigId),
    enabled: !!sessionToken && !!rigId,
  });
}

export function useCreateFuelMovement(rigId: string) {
  const { sessionToken } = useAuthStore();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (movement: CreateFuelMovement) =>
      fuelApi.createMovement(sessionToken!, rigId, movement),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: logisticsKeys.fuel(rigId) });
      qc.invalidateQueries({ queryKey: logisticsKeys.pendingCount(rigId) });
    },
  });
}

export function useDeleteFuelMovement(rigId: string) {
  const { sessionToken } = useAuthStore();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (movementId: string) =>
      fuelApi.deleteMovement(sessionToken!, movementId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: logisticsKeys.fuel(rigId) });
    },
  });
}

// ============================================================================
// VACUUM
// ============================================================================

export function useVacuumActions(rigId: string, page: number, pageSize: number) {
  const { sessionToken } = useAuthStore();
  return useQuery({
    queryKey: logisticsKeys.vacuumActions(rigId, page, pageSize),
    queryFn: () => vacuumApi.getActions(sessionToken!, rigId, page, pageSize),
    enabled: !!sessionToken && !!rigId,
  });
}

export function useCreateVacuumAction(rigId: string) {
  const { sessionToken } = useAuthStore();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateVacuumAction) =>
      vacuumApi.createAction(sessionToken!, rigId, input),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: logisticsKeys.vacuum(rigId) });
      qc.invalidateQueries({ queryKey: logisticsKeys.pendingCount(rigId) });
    },
  });
}

export function useDeleteVacuumAction(rigId: string) {
  const { sessionToken } = useAuthStore();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (actionId: string) =>
      vacuumApi.deleteAction(sessionToken!, actionId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: logisticsKeys.vacuum(rigId) });
    },
  });
}

// ============================================================================
// MATERIALS — Catalog (global, no rigId)
// ============================================================================

export function useMaterialsCatalog(activeOnly: boolean = true) {
  const { sessionToken } = useAuthStore();
  return useQuery({
    queryKey: logisticsKeys.materialsCatalog(),
    queryFn: () => materialsApi.list(sessionToken!, activeOnly),
    enabled: !!sessionToken,
    staleTime: 1000 * 60 * 10, // 10 min — catalog changes infrequently
  });
}

// ============================================================================
// MATERIALS — Movements & Stock (per rig)
// ============================================================================

export function useMaterialMovements(
  rigId: string,
  materialId: string | undefined,
  page: number,
  pageSize: number,
) {
  const { sessionToken } = useAuthStore();
  return useQuery({
    queryKey: logisticsKeys.materialMovements(rigId, materialId, page, pageSize),
    queryFn: () =>
      materialsApi.getMovements(sessionToken!, rigId, materialId, page, pageSize),
    enabled: !!sessionToken && !!rigId,
  });
}

export function useMaterialStock(rigId: string, materialId: string) {
  const { sessionToken } = useAuthStore();
  return useQuery({
    queryKey: logisticsKeys.materialStock(rigId, materialId),
    queryFn: () => materialsApi.getStock(sessionToken!, rigId, materialId),
    enabled: !!sessionToken && !!rigId && !!materialId,
  });
}

export function useCreateMaterialMovement(rigId: string) {
  const { sessionToken } = useAuthStore();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (movement: CreateMaterialMovement) =>
      materialsApi.createMovement(sessionToken!, rigId, movement),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: logisticsKeys.materials(rigId) });
      qc.invalidateQueries({ queryKey: logisticsKeys.pendingCount(rigId) });
    },
  });
}

export function useDeleteMaterialMovement(rigId: string) {
  const { sessionToken } = useAuthStore();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (movementId: string) =>
      materialsApi.deleteMovement(sessionToken!, movementId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: logisticsKeys.materials(rigId) });
    },
  });
}

// ============================================================================
// REQUESTS
// ============================================================================

export function useLogisticsRequests(
  rigId: string,
  type: string,
  status: string,
  page: number,
  pageSize: number,
) {
  const { sessionToken } = useAuthStore();
  return useQuery({
    queryKey: logisticsKeys.requestsList(rigId, type, status, page, pageSize),
    queryFn: () =>
      logisticsRequestsApi.list(
        sessionToken!,
        rigId,
        type || undefined,
        status || undefined,
        page,
        pageSize,
      ),
    enabled: !!sessionToken && !!rigId,
  });
}

export function usePendingRequestsCount(rigId: string) {
  const { sessionToken } = useAuthStore();
  return useQuery({
    queryKey: logisticsKeys.pendingCount(rigId),
    queryFn: () => logisticsRequestsApi.getPendingCount(sessionToken!, rigId),
    enabled: !!sessionToken && !!rigId,
  });
}

export function useCreateLogisticsRequest(rigId: string) {
  const { sessionToken } = useAuthStore();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateLogisticsRequest) =>
      logisticsRequestsApi.create(sessionToken!, rigId, input),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: logisticsKeys.requests(rigId) });
    },
  });
}

export function useUpdateRequestStatus(rigId: string) {
  const { sessionToken } = useAuthStore();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ requestId, status }: { requestId: string; status: RequestStatus }) =>
      logisticsRequestsApi.updateStatus(sessionToken!, requestId, { status }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: logisticsKeys.requests(rigId) });
    },
  });
}

export function useDeleteLogisticsRequest(rigId: string) {
  const { sessionToken } = useAuthStore();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (requestId: string) =>
      logisticsRequestsApi.delete(sessionToken!, requestId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: logisticsKeys.requests(rigId) });
    },
  });
}

// ============================================================================
// REPORTS
// ============================================================================

export function useLogisticsReport(
  rigId: string,
  periodStart: string,
  periodEnd: string,
  enabled: boolean = true,
) {
  const { sessionToken } = useAuthStore();
  return useQuery({
    queryKey: logisticsKeys.report(rigId, periodStart, periodEnd),
    queryFn: () =>
      logisticsReportsApi.getReport(sessionToken!, rigId, periodStart, periodEnd),
    enabled: !!sessionToken && !!rigId && enabled,
  });
}
