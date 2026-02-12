// ============================================================================
// TIPOS DE LOGÍSTICA
// ============================================================================

// --- Tipos comunes ---

export type MovementType = 'entry' | 'exit';
export type RequestType = 'water_bottles' | 'fuel' | 'material' | 'vacuum';
export type RequestStatus = 'requested' | 'pending' | 'approved' | 'rejected';

export const MOVEMENT_LABELS: Record<MovementType, string> = {
  entry: 'Entrada',
  exit: 'Salida',
};

export const REQUEST_TYPE_LABELS: Record<RequestType, string> = {
  water_bottles: 'Botellones de Agua',
  fuel: 'Combustible',
  material: 'Material',
  vacuum: 'Vacuum/Cisterna',
};

export const REQUEST_STATUS_LABELS: Record<RequestStatus, string> = {
  requested: 'Solicitado',
  pending: 'En Espera',
  approved: 'Aprobado',
  rejected: 'Rechazado',
};

export const REQUEST_STATUS_COLORS: Record<RequestStatus, string> = {
  requested: 'blue',
  pending: 'yellow',
  approved: 'green',
  rejected: 'red',
};

// --- Botellones de Agua ---

export interface WaterBottlesMovement {
  id: string;
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

// --- Respuesta Paginada ---

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}
