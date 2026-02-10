import type { Tab } from '../../../types/';
import type { CompleteReportData } from '../../../schemas';

/**
 * Tab configuration for report sections
 * Defines all available sections in the report form
 */
export const TABS: Tab[] = [
  {
    id: 'crew',
    label: 'Cuadrilla',
    icon: '👥',
    description: 'Personal y turnos de trabajo'
  },
  {
    id: 'time',
    label: 'Distribución de Tiempo',
    icon: '⏱️',
    description: 'Horas por operación y turno'
  },
  {
    id: 'bits',
    label: 'Mechas',
    icon: '🔩',
    description: 'Record de brocas utilizadas'
  },
  {
    id: 'mud',
    label: 'Lodo',
    icon: '🧪',
    description: 'Propiedades y aditivos del lodo'
  },
  {
    id: 'lithology',
    label: 'Litología',
    icon: '⛏️',
    description: 'Parámetros de perforación y desviación'
  },
  {
    id: 'observations',
    label: 'Observaciones',
    icon: '📝',
    description: 'Bitácora de operaciones'
  },
  {
    id: 'drillString',
    label: 'Sarta de Perforación',
    icon: '🔗',
    description: 'Datos de la sarta'
  },
];

/**
 * Default values for a new report
 * Used to initialize the form with empty/default data
 */
export const DEFAULT_VALUES: Partial<CompleteReportData> = {
  header: {
    reportNumber: 1,
    reportDate: new Date().toISOString().split('T')[0],
    wellNumber: '',
    rigNumber: '',
    operator: ''
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
  drillString: {},
};

/**
 * Crew position options
 * Common positions in drilling operations
 */
export const CREW_POSITIONS = [
  'Perforador',
  'Encuellador',
  'Obrero de Piso',
  'Supervisor',
  'Ingeniero',
  'Geólogo',
  'Mecánico',
  'Electricista',
  'Técnico de Lodo',
  'Soldador',
  'Grúa',
  'Ayudante General',
] as const;