// Estado del reporte
export type ReportStatus = 'draft' | 'submitted' | 'approved' | 'rejected';

// Turnos
export type ShiftType = 'morning' | 'afternoon' | 'night';

// Helper para labels de turnos en UI
export const SHIFT_LABELS: Record<ShiftType, string> = {
  morning: 'Mañana',
  afternoon: 'Tarde',
  night: 'Noche',
};

// Reporte principal (Encabezado DDR)
export interface Report {
  id: string;
  reportNumber: number;
  reportDate: string;
  wellNumber?: string;
  apiNumber?: string;
  contract?: string;
  contractor?: string;
  operator?: string;
  fieldDistrict?: string;
  municipality?: string;
  rigNumber?: string;
  supervisor24h?: string;
  status: ReportStatus;
  createdBy: string;
  approvedBy?: string;
  submittedAt?: string;
  approvedAt?: string;
  rejectedAt?: string;
  rejectionReason?: string;
  createdAt: string;
  updatedAt: string;
  synced: boolean;
}

// Componente de la Sarta de Perforación
export interface DrillStringComponent {
  id: string;
  reportId: string;
  entryNumber: number;
  pieceName: string;
  length?: number;
  createdAt: string;
  updatedAt: string;
}

// Turno de cuadrilla
export interface CrewShift {
  id: string;
  reportId: string;
  shift: ShiftType;
  shiftStart?: string;
  shiftEnd?: string;
  members: CrewMember[];
}

// Miembro de cuadrilla
export interface CrewMember {
  id: string;
  crewShiftId: string;
  personnelId?: string;
  position: string;
  ci?: string;
  name?: string;
  hours?: number;
  // Denormalized from rig_personnel via JOIN
  personnelName?: string;
  personnelCi?: string;
}

// Posiciones estándar de cuadrilla
export const CREW_POSITIONS = [
  'Perforador',
  'Encuellador',
  'Cuñero',
  'Cuñero',
  'Arenillero',
  'Arenillero',
  'Mecánico',
  'Soldador',
  'Operador Montacargas',
  'Obrero',
] as const;

// Código de operación (configurable)
export interface OperationCode {
  id: string;
  code: string;
  name: string;
  category?: string;
  sortOrder: number;
  active: boolean;
  createdAt: string;
}

// Distribución de tiempo por operación
export interface TimeDistribution {
  id: string;
  reportId: string;
  operationCodeId: string;
  operationCode?: OperationCode;
  hoursShift1: number;
  hoursShift2: number;
  hoursShift3: number;
}

// Record de mechas/brocas
export interface BitRecord {
  id: string;
  reportId: string;
  shift?: ShiftType;
  size?: string;
  manufacturerCode?: string;
  brand?: string;
  bitType?: string;
  serialNumber?: string;
  jets?: string;
  tfa?: string;
  depthOut?: string;
  depthIn?: string;
  footage?: string;
  hoursTotal?: number;
  dpTubos?: string;
  kelly?: string;
}

// Record de lodo
export interface MudRecord {
  id: string;
  reportId: string;
  shift?: ShiftType;
  hour?: string;
  weight?: string;
  viscosity?: string;
  pvp?: string;
  gels?: string;
  filtrate?: string;
  ph?: string;
  solids?: string;
}

// Aditivos de lodo/barro
export interface MudAdditive {
  id: string;
  reportId: string;
  shift?: ShiftType;
  additiveType?: string;
  quantity?: string;
}

// Parámetros de perforación
export interface DrillingParameters {
  id: string;
  reportId: string;
  shift?: ShiftType;
  depthFrom?: string;
  depthTo?: string;
  coreNumber?: string;
  rotaryRpm?: string;
  bitWeight?: string;
  pumpPressure?: string;
  pumpNumber?: string;
  pumpLiner?: string;
  pumpSpm?: string;
  totalGpm?: string;
  methodUsed?: string;
  lithologyNotes?: string;
}

// Historial de desviación
export interface DeviationHistory {
  id: string;
  reportId: string;
  depth?: string;
  deviation?: string;
  direction?: string;
  tvo?: string;
  horizontalDisplacement?: string;
}

// Log de operaciones
export interface OperationsLog {
  id: string;
  reportId: string;
  shift?: ShiftType;
  timeFrom?: string;
  timeTo?: string;
  duration?: string;
  operationCode?: string;
  details?: string;
}

// Reporte completo con todas las relaciones
export interface FullReport extends Report {
  drillStringComponents: DrillStringComponent[];
  crewShifts: CrewShift[];
  timeDistribution: TimeDistribution[];
  bitRecords: BitRecord[];
  mudRecords: MudRecord[];
  mudAdditives: MudAdditive[];
  drillingParameters: DrillingParameters[];
  deviationHistory: DeviationHistory[];
  operationsLog: OperationsLog[];
}

// Input para crear reporte
export interface CreateReportInput {
  reportNumber: number;
  reportDate: string;
  wellNumber?: string;
  apiNumber?: string;
  contract?: string;
  contractor?: string;
  operator?: string;
  fieldDistrict?: string;
  municipality?: string;
  rigNumber?: string;
  supervisor24h?: string;
}

// Filtros para listado de reportes
export interface ReportFilters {
  status?: ReportStatus;
  wellNumber?: string;
  rigNumber?: string;
  dateFrom?: string;
  dateTo?: string;
  createdBy?: string;
}

// ── Report Reviews (Approval Audit Trail) ──────────────────────────────────

// Acciones posibles en una revisión
export type ReviewAction = 'approved' | 'rejected' | 'revision_requested' | 'comment' | 'resubmitted';

// Labels para UI
export const REVIEW_ACTION_LABELS: Record<ReviewAction, string> = {
  approved: 'Aprobado',
  rejected: 'Rechazado',
  revision_requested: 'Revisión solicitada',
  comment: 'Comentario',
  resubmitted: 'Reenviado',
};

// Colores para UI (matching ReportStatusBadge style)
export const REVIEW_ACTION_COLORS: Record<ReviewAction, string> = {
  approved: 'text-green-600 bg-green-100 dark:bg-green-900/30 dark:text-green-400',
  rejected: 'text-red-600 bg-red-100 dark:bg-red-900/30 dark:text-red-400',
  revision_requested: 'text-yellow-600 bg-yellow-100 dark:bg-yellow-900/30 dark:text-yellow-400',
  comment: 'text-blue-600 bg-blue-100 dark:bg-blue-900/30 dark:text-blue-400',
  resubmitted: 'text-purple-600 bg-purple-100 dark:bg-purple-900/30 dark:text-purple-400',
};

// Entrada individual del historial de revisión
export interface ReportReview {
  id: string;
  reportId: string;
  reviewerId: string;
  action: ReviewAction;
  comment?: string;
  previousStatus?: string;
  newStatus?: string;
  createdAt: string;
  updatedAt: string;
  isDeleted: boolean;
}
