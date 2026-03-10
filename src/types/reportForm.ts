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
  labelKey: string;
  icon: string;
  descriptionKey: string;
}

// ============================================================================
// SECTION TABS
// ============================================================================

export const WIZARD_TABS: WizardTab[] = [
  {
    id: 'crew',
    labelKey: 'reports.wizard.crew',
    icon: '👥',
    descriptionKey: 'reports.wizard.crewDesc',
  },
  {
    id: 'time',
    labelKey: 'reports.wizard.time',
    icon: '⏱️',
    descriptionKey: 'reports.wizard.timeDesc',
  },
  {
    id: 'bits',
    labelKey: 'reports.wizard.bits',
    icon: '🔩',
    descriptionKey: 'reports.wizard.bitsDesc',
  },
  {
    id: 'mud',
    labelKey: 'reports.wizard.mud',
    icon: '🧪',
    descriptionKey: 'reports.wizard.mudDesc',
  },
  {
    id: 'lithology',
    labelKey: 'reports.wizard.lithology',
    icon: '⛏️',
    descriptionKey: 'reports.wizard.lithologyDesc',
  },
  {
    id: 'observations',
    labelKey: 'reports.wizard.observations',
    icon: '📝',
    descriptionKey: 'reports.wizard.observationsDesc',
  },
  {
    id: 'drillString',
    labelKey: 'reports.wizard.drillString',
    icon: '🔗',
    descriptionKey: 'reports.wizard.drillStringDesc',
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
    contractor: '',
    fieldDistrict: '',
    supervisor24h: '',
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
