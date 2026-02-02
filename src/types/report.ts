// Estado del reporte
export type ReportStatus = 'draft' | 'submitted' | 'approved' | 'rejected';

// Turnos
export type ShiftType = 'mañana' | 'tarde' | 'noche';

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
  company?: string;
  supervisor24h?: string;
  status: ReportStatus;
  createdBy: string;
  approvedBy?: string;
  createdAt: string;
  updatedAt: string;
  synced: boolean;
}

// Datos de la Sarta
export interface DrillString {
  id: string;
  reportId: string;
  size?: string;
  weight?: string;
  grade?: string;
  connectionType?: string;
  stringNumber?: string;
  pumpBrand?: string;
  pumpType?: string;
  headerLength?: string;
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
  position: string;
  ci?: string;
  name?: string;
  hours?: number;
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
  drillString?: DrillString;
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
  reportDate: string;
  wellNumber?: string;
  apiNumber?: string;
  contract?: string;
  contractor?: string;
  operator?: string;
  fieldDistrict?: string;
  municipality?: string;
  rigNumber?: string;
  company?: string;
  supervisor24h?: string;
}

// Filtros para listado de reportes
export interface ReportFilters {
  status?: ReportStatus;
  wellNumber?: string;
  dateFrom?: string;
  dateTo?: string;
  createdBy?: string;
}
