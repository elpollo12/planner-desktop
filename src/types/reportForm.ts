import type { CompleteReportData } from '../schemas';

// ============================================================================
// WIZARD TYPES
// ============================================================================

/** Steps of the report creation/editing wizard */
export type WizardStep = 'rig' | 'header' | 'sections';

/** Identifiers for each fillable section tab. 'none' = no section selected (default landing). */
export type TabId = 'crew' | 'time' | 'bits' | 'mud' | 'lithology' | 'observations' | 'drillString' | 'none';

/** Metadata for a section tab in the wizard UI */
export interface WizardTab {
  id: TabId;
  label: string;
  icon: string;
  description: string;
}

// ============================================================================
// SECTION TABS
// ============================================================================

export const WIZARD_TABS: WizardTab[] = [
  {
    id: 'crew',
    label: 'Cuadrilla',
    icon: '👥',
    description: 'Personal y turnos de trabajo',
  },
  {
    id: 'time',
    label: 'Distribución de Tiempo',
    icon: '⏱️',
    description: 'Horas por operación y turno',
  },
  {
    id: 'bits',
    label: 'Mechas',
    icon: '🔩',
    description: 'Record de brocas utilizadas',
  },
  {
    id: 'mud',
    label: 'Lodo',
    icon: '🧪',
    description: 'Propiedades y aditivos del lodo',
  },
  {
    id: 'lithology',
    label: 'Litología',
    icon: '⛏️',
    description: 'Parámetros de perforación y desviación',
  },
  {
    id: 'observations',
    label: 'Observaciones',
    icon: '📝',
    description: 'Bitácora de operaciones',
  },
  {
    id: 'drillString',
    label: 'Sarta de Perforación',
    icon: '🔗',
    description: 'Datos de la sarta',
  },
];

// ============================================================================
// DEFAULT FORM VALUES
// ============================================================================

export const DEFAULT_REPORT_VALUES: Partial<CompleteReportData> = {
  header: {
    reportNumber: 1,
    reportDate: new Date().toISOString().split('T')[0],
    wellNumber: '',
    rigNumber: '',
    operator: '',
  },
  crew: {
    shifts: [
      { shift: 'morning', shiftStart: '06:00', shiftEnd: '14:00', members: [] },
      { shift: 'afternoon', shiftStart: '14:00', shiftEnd: '22:00', members: [] },
      { shift: 'night', shiftStart: '22:00', shiftEnd: '06:00', members: [] },
    ],
  },
  timeDistribution: {
    distributions: [],
  },
  bitRecords: {
    records: [],
  },
  mudRecords: {
    records: [],
    additives: [],
  },
  lithology: {
    drillingParameters: [],
    deviationHistory: [],
  },
  observations: {
    operations: [],
  },
  drillString: {
    components: [],
  },
};
