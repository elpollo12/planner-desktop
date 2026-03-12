// ============================================================================
// TIPOS DE LOGÍSTICA
// ============================================================================

// --- Tipos comunes ---

export type MovementType = 'entry' | 'exit';
export type RequestType = 'water_bottles' | 'fuel' | 'material' | 'vacuum';
export type RequestStatus = 'requested' | 'pending' | 'approved' | 'rejected';

/** Iterable list of request types (for dropdowns / filters) */
export const REQUEST_TYPES: readonly RequestType[] = ['water_bottles', 'fuel', 'material', 'vacuum'] as const;

/** Iterable list of request statuses (for dropdowns / filters) */
export const REQUEST_STATUSES: readonly RequestStatus[] = ['requested', 'pending', 'approved', 'rejected'] as const;

export const REQUEST_STATUS_COLORS: Record<RequestStatus, string> = {
  requested: 'blue',
  pending: 'yellow',
  approved: 'green',
  rejected: 'red',
};

// --- Botellones de Agua ---

export interface WaterBottlesMovement {
  id: string;
  rigId?: string;
  movementType: MovementType;
  quantity: number;
  notes?: string;
  createdBy?: string;
  createdAt: string;
}

export interface CreateWaterBottlesMovement {
  movementType: MovementType;
  quantity: number;
  notes?: string;
}

// --- Combustible ---

export interface FuelMovement {
  id: string;
  rigId?: string;
  movementType: MovementType;
  amount: number;
  notes?: string;
  createdBy?: string;
  createdAt: string;
}

export interface CreateFuelMovement {
  movementType: MovementType;
  amount: number;
  notes?: string;
}

// --- Vacuum / Cisterna ---

export interface VacuumAction {
  id: string;
  rigId?: string;
  actionName: string;
  notes?: string;
  createdBy?: string;
  createdAt: string;
}

export interface CreateVacuumAction {
  actionName: string;
  notes?: string;
}

export interface UpdateVacuumAction {
  actionName?: string;
  notes?: string;
}

// --- Materiales (Catálogo) ---

export interface Material {
  id: string;
  name: string;
  unit: string;
  description?: string;
  active: boolean;
  createdBy?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateMaterial {
  name: string;
  unit: string;
  description?: string;
}

export interface UpdateMaterial {
  name?: string;
  unit?: string;
  description?: string;
  active?: boolean;
}

// --- Materiales (Movimientos) ---

export interface MaterialMovement {
  id: string;
  rigId?: string;
  materialId: string;
  movementType: MovementType;
  quantity: number;
  notes?: string;
  createdBy?: string;
  createdAt: string;
}

export interface CreateMaterialMovement {
  materialId: string;
  movementType: MovementType;
  quantity: number;
  notes?: string;
}

// --- Solicitudes ---

export interface LogisticsRequest {
  id: string;
  rigId?: string;
  requestType: RequestType;
  quantity?: number;
  actionRequested?: string;
  materialId?: string;
  status: RequestStatus;
  notes?: string;
  requestedBy?: string;
  statusChangedBy?: string;
  requestedAt: string;
  statusChangedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateLogisticsRequest {
  requestType: RequestType;
  quantity?: number;
  actionRequested?: string;
  materialId?: string;
  notes?: string;
}

export interface UpdateRequestStatus {
  status: RequestStatus;
}

// --- Reportes ---

export interface LogisticsReport {
  periodStart: string;
  periodEnd: string;
  waterBottlesSummary: WaterBottlesSummary;
  fuelSummary: FuelSummary;
  vacuumSummary: VacuumSummary;
  materialsSummary: MaterialSummary[];
  requestsSummary: RequestsSummary;
}

export interface WaterBottlesSummary {
  totalEntries: number;
  totalExits: number;
  net: number;
}

export interface FuelSummary {
  totalEntries: number;
  totalExits: number;
  net: number;
}

export interface VacuumSummary {
  totalActions: number;
}

export interface MaterialSummary {
  materialId: string;
  materialName: string;
  unit: string;
  totalEntries: number;
  totalExits: number;
  net: number;
}

export interface RequestsSummary {
  total: number;
  requested: number;
  pending: number;
  approved: number;
  rejected: number;
}

// --- Reportes Detallados ---

export interface DetailedMovement {
  id: string;
  movementType?: string;
  quantity?: number;
  actionName?: string;
  materialName?: string;
  materialUnit?: string;
  notes?: string;
  createdByName: string;
  createdAt: string;
}

export interface DetailedRequest {
  id: string;
  requestType: string;
  quantity?: number;
  actionRequested?: string;
  materialName?: string;
  status: string;
  notes?: string;
  requestedByName: string;
  statusChangedByName?: string;
  requestedAt: string;
  statusChangedAt?: string;
}

export type DetailedLogisticsReport =
  | { section: 'water_bottles'; movements: DetailedMovement[] }
  | { section: 'fuel'; movements: DetailedMovement[] }
  | { section: 'vacuum'; movements: DetailedMovement[] }
  | { section: 'materials'; movements: DetailedMovement[] }
  | { section: 'requests'; requests: DetailedRequest[] };

// --- Respuesta Paginada ---

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}
