import { invoke } from '@tauri-apps/api/core';
import type {
  WaterBottlesMovement,
  CreateWaterBottlesMovement,
  FuelMovement,
  CreateFuelMovement,
  VacuumAction,
  CreateVacuumAction,
  UpdateVacuumAction,
  Material,
  CreateMaterial,
  UpdateMaterial,
  MaterialMovement,
  CreateMaterialMovement,
  LogisticsRequest,
  CreateLogisticsRequest,
  UpdateRequestStatus,
  LogisticsReport,
  DetailedLogisticsReport,
  PaginatedResponse,
} from '../../types/logistics';

// ============================================================================
// Logistics - Water Bottles
// ============================================================================

export const waterBottlesApi = {
  createMovement: (sessionToken: string, rigId: string, movement: CreateWaterBottlesMovement) =>
    invoke<WaterBottlesMovement>('create_water_bottles_movement', { sessionToken, rigId, movement }),

  getMovements: (sessionToken: string, rigId: string, page?: number, pageSize?: number) =>
    invoke<PaginatedResponse<WaterBottlesMovement>>('get_water_bottles_movements', { sessionToken, rigId, page, pageSize }),

  deleteMovement: (sessionToken: string, movementId: string) =>
    invoke<void>('delete_water_bottles_movement', { sessionToken, movementId }),

  getStock: (sessionToken: string, rigId: string) =>
    invoke<number>('get_water_bottles_stock', { sessionToken, rigId }),
};

// ============================================================================
// Logistics - Fuel
// ============================================================================

export const fuelApi = {
  createMovement: (sessionToken: string, rigId: string, movement: CreateFuelMovement) =>
    invoke<FuelMovement>('create_fuel_movement', { sessionToken, rigId, movement }),

  getMovements: (sessionToken: string, rigId: string, page?: number, pageSize?: number) =>
    invoke<PaginatedResponse<FuelMovement>>('get_fuel_movements', { sessionToken, rigId, page, pageSize }),

  deleteMovement: (sessionToken: string, movementId: string) =>
    invoke<void>('delete_fuel_movement', { sessionToken, movementId }),

  getStock: (sessionToken: string, rigId: string) =>
    invoke<number>('get_fuel_stock', { sessionToken, rigId }),
};

// ============================================================================
// Logistics - Vacuum / Cisterna
// ============================================================================

export const vacuumApi = {
  createAction: (sessionToken: string, rigId: string, input: CreateVacuumAction) =>
    invoke<VacuumAction>('create_vacuum_action', { sessionToken, rigId, input }),

  getActions: (sessionToken: string, rigId: string, page?: number, pageSize?: number) =>
    invoke<PaginatedResponse<VacuumAction>>('get_vacuum_actions', { sessionToken, rigId, page, pageSize }),

  updateAction: (sessionToken: string, actionId: string, input: UpdateVacuumAction) =>
    invoke<VacuumAction>('update_vacuum_action', { sessionToken, actionId, input }),

  deleteAction: (sessionToken: string, actionId: string) =>
    invoke<void>('delete_vacuum_action', { sessionToken, actionId }),
};

// ============================================================================
// Logistics - Materials (Catalog + Movements)
// ============================================================================

export const materialsApi = {
  // Catálogo (global — sin rigId)
  create: (sessionToken: string, input: CreateMaterial) =>
    invoke<Material>('create_material', { sessionToken, input }),

  list: (sessionToken: string, activeOnly?: boolean) =>
    invoke<Material[]>('list_materials', { sessionToken, activeOnly }),

  update: (sessionToken: string, materialId: string, input: UpdateMaterial) =>
    invoke<Material>('update_material', { sessionToken, materialId, input }),

  delete: (sessionToken: string, materialId: string) =>
    invoke<void>('delete_material', { sessionToken, materialId }),

  // Movimientos (con rigId)
  createMovement: (sessionToken: string, rigId: string, movement: CreateMaterialMovement) =>
    invoke<MaterialMovement>('create_material_movement', { sessionToken, rigId, movement }),

  getMovements: (sessionToken: string, rigId: string, materialId?: string, page?: number, pageSize?: number) =>
    invoke<PaginatedResponse<MaterialMovement>>('get_material_movements', { sessionToken, rigId, materialId, page, pageSize }),

  deleteMovement: (sessionToken: string, movementId: string) =>
    invoke<void>('delete_material_movement', { sessionToken, movementId }),

  getStock: (sessionToken: string, rigId: string, materialId: string) =>
    invoke<number>('get_material_stock', { sessionToken, rigId, materialId }),
};

// ============================================================================
// Logistics - Requests
// ============================================================================

export const logisticsRequestsApi = {
  create: (sessionToken: string, rigId: string, input: CreateLogisticsRequest) =>
    invoke<LogisticsRequest>('create_logistics_request', { sessionToken, rigId, input }),

  list: (sessionToken: string, rigId: string, requestType?: string, status?: string, page?: number, pageSize?: number) =>
    invoke<PaginatedResponse<LogisticsRequest>>('list_logistics_requests', { sessionToken, rigId, requestType, status, page, pageSize }),

  updateStatus: (sessionToken: string, requestId: string, input: UpdateRequestStatus) =>
    invoke<LogisticsRequest>('update_logistics_request_status', { sessionToken, requestId, input }),

  delete: (sessionToken: string, requestId: string) =>
    invoke<void>('delete_logistics_request', { sessionToken, requestId }),

  getPendingCount: (sessionToken: string, rigId: string) =>
    invoke<number>('get_pending_requests_count', { sessionToken, rigId }),
};

// ============================================================================
// Logistics - Reports
// ============================================================================

export const logisticsReportsApi = {
  getReport: (sessionToken: string, rigId: string, periodStart: string, periodEnd: string) =>
    invoke<LogisticsReport>('get_logistics_report', { sessionToken, rigId, periodStart, periodEnd }),

  getDetailedReport: (sessionToken: string, rigId: string, section: string, periodStart: string, periodEnd: string, materialId?: string) =>
    invoke<DetailedLogisticsReport>('get_detailed_logistics_report', { sessionToken, rigId, section, periodStart, periodEnd, materialId }),
};
