// ============================================================================
// Fluid Report Types
// ============================================================================

export interface FluidReportListItem {
  id: string;
  rigId: string | null;
  reportNumber: number | null;
  reportDate: string | null;
  wellNumber: string | null;
  rigNumber: string | null;
  fluidType: string | null;
  wellPhase: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface FluidReport {
  id: string;
  reportId: string | null; // legacy, nullable
  rigId: string | null;    // FK to rigs

  // Encabezado propio (independiente del DDR)
  reportNumber: number | null;
  reportDate: string | null;
  wellNumber: string | null;
  rigNumber: string | null;
  contract: string | null;
  contractor: string | null;
  operator: string | null;
  fieldDistrict: string | null;
  supervisor24h: string | null;

  fluidType: string | null;
  wellPhase: string | null;
  fluidCoordinator: string | null;
  techRep1: string | null;
  techRep2: string | null;
  trainee: string | null;
  opsSupervisor: string | null;
  bottomDownMin: number | null;
  bottomDownEmb: number | null;
  bottomUpMin: number | null;
  bottomUpEmb: number | null;
  wellCycleMin: number | null;
  wellCycleEmb: number | null;
  totalCycleMin: number | null;
  totalCycleEmb: number | null;
  volInicial: number | null;
  volPerdidoHoyo: number | null;
  volDescartado: number | null;
  volPreparado: number | null;
  volTransferido: number | null;
  volRecibido: number | null;
  volPerdidoSup: number | null;
  volFinal: number | null;
  esd: number | null;
  ecd: number | null;
  embNTuberia: number | null;
  embNAnular: number | null;
  embKTuberia: number | null;
  embKAnular: number | null;
  fluidComments: string | null;
  productComments: string | null;
  volComments: string | null;
  isDeleted: boolean;
  createdBy: string | null;
  updatedBy: string | null;
  createdAt: string;
  updatedAt: string;
  synced: boolean;
}

export interface FluidReportFull extends FluidReport {
  props: FluidProps[];
  solidsControl: FluidSolidsControl[];
  inventory: FluidInventoryItem[];
  services: FluidService[];
  activity: FluidActivity | null;
  tanks: FluidTank[];
  volStats: FluidVolStats | null;
}

export interface FluidProps {
  id: string;
  fluidReportId: string;
  sampleHour: string | null;
  sampleSource: string | null;
  temperatureF: number | null;
  depthMd: number | null;
  depthTvd: number | null;
  density: number | null;
  marshViscosity: number | null;
  rpm600: number | null;
  rpm300: number | null;
  rpm200: number | null;
  rpm100: number | null;
  rpm6: number | null;
  rpm3: number | null;
  pv: number | null;
  yp: number | null;
  gel10s: number | null;
  gel10m: number | null;
  gel30m: number | null;
  apiFiltrate: number | null;
  filterCake: number | null;
  sandContent: number | null;
  solidsRetort: number | null;
  oilRetort: number | null;
  waterRetort: number | null;
  ph: number | null;
  alkalinityPm: number | null;
  alkalinityPf: number | null;
  alkalinityMf: number | null;
  calciumPpm: number | null;
  chloridesPpm: number | null;
  mbt: number | null;
  brookfieldVisc: number | null;
  lubricityCoef: number | null;
  createdAt: string;
  updatedAt: string;
}

export interface FluidSolidsControl {
  id: string;
  fluidReportId: string;
  equipment: string | null;
  designMesh: string | null;
  hoursToday: number | null;
  hoursAccumulated: number | null;
  createdAt: string;
  updatedAt: string;
}

export interface FluidInventoryItem {
  id: string;
  fluidReportId: string;
  productId: string | null;
  productCode: string | null;
  productName: string | null;
  productGe: number | null;
  productPackage: string | null;
  productWeightLbs: number | null;
  productVolGal: number | null;
  invInicial: number | null;
  receivedToday: number | null;
  transferredToday: number | null;
  consumedToday: number | null;
  invFinal: number | null;
  receivedTotal: number | null;
  transferredTotal: number | null;
  consumedTotal: number | null;
  dailyCost: number | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface FluidService {
  id: string;
  fluidReportId: string;
  serviceName: string | null;
  hoursPerDay: number | null;
  quantity: number | null;
  daysToday: number | null;
  daysTotal: number | null;
  costBsf: number | null;
  costUsd: number | null;
  dailyCost: number | null;
  accumulatedCost: number | null;
  createdAt: string;
  updatedAt: string;
}

export interface FluidActivity {
  id: string;
  fluidReportId: string;
  hoursMoving: number | null;
  hoursCirculating: number | null;
  hoursDrilling: number | null;
  hoursTripping: number | null;
  hoursCleaning: number | null;
  hoursBackreaming: number | null;
  hoursCementing: number | null;
  hoursRunningCsg: number | null;
  hoursOther: number | null;
  hoursTotal: number | null;
  createdAt: string;
  updatedAt: string;
}

export interface FluidTank {
  id: string;
  fluidReportId: string;
  name: string | null;
  systemStatus: string | null;
  volumeBls: number | null;
  lpg: number | null;
  fluidType: string | null;
  sortOrder: number | null;
  createdAt: string;
  updatedAt: string;
}

export interface FluidVolStats {
  id: string;
  fluidReportId: string;
  [key: string]: string | number | null;
}

export interface FluidProduct {
  id: string;
  code: string;
  name: string;
  ge: number | null;
  package: string | null;
  weightLbs: number | null;
  volGal: number | null;
  active: boolean;
  createdBy: string | null;
  updatedBy: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface FluidReportFilters {
  page?: number;
  pageSize?: number;
  rigId?: string;
  rigNumber?: string;
  wellNumber?: string;
  dateFrom?: string;
  dateTo?: string;
}

export interface PaginatedFluidReportsResponse {
  data: FluidReportListItem[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export interface CreateFluidReportInput {
  rigId?: string;
  reportDate?: string;
  wellNumber?: string;
  rigNumber?: string;
  contract?: string;
  contractor?: string;
  operator?: string;
  fieldDistrict?: string;
  supervisor24h?: string;
  fluidType?: string;
  wellPhase?: string;
  fluidCoordinator?: string;
  techRep1?: string;
  techRep2?: string;
  trainee?: string;
  opsSupervisor?: string;
}

// ============================================================================
// Changelog
// ============================================================================

export interface FluidChangelogEntry {
  id: string;
  fluidReportId: string;
  tab: string;
  changedBy: string;
  changedByName: string | null;
  changedAt: string;
  note: string | null;
  changesJson: Record<string, unknown>;
  createdAt: string;
}
