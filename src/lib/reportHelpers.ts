import type { CompleteReportData } from '../schemas';
import type { Report, CrewShift, BitRecord } from '../types/report';
import type { LastReportSnapshot } from '../types';

/**
 * Transform form data to backend format for creating a report
 */
export function transformFormToReportData(formData: CompleteReportData) {
  return {
    reportNumber: formData.header.reportNumber,
    reportDate: formData.header.reportDate,
    wellNumber: formData.header.wellNumber,
    apiNumber: formData.header.apiNumber,
    contract: formData.header.contract,
    contractor: formData.header.contractor,
    operator: formData.header.operator,
    fieldDistrict: formData.header.fieldDistrict,
    municipality: formData.header.municipality,
    rigNumber: formData.header.rigNumber,
    supervisor24h: formData.header.supervisor24h,
  };
}

/**
 * Transform backend report to form format
 */
export function transformReportToForm(
  report: Report,
  relatedData?: {
    crewShifts?: CrewShift[];
    bitRecords?: BitRecord[];
    // Add other related entities as needed
  }
): Partial<CompleteReportData> {
  return {
    header: {
      reportNumber: report.reportNumber,
      reportDate: report.reportDate,
      wellNumber: report.wellNumber ?? '',
      apiNumber: report.apiNumber ?? '',
      contract: report.contract ?? '',
      contractor: report.contractor ?? '',
      operator: report.operator ?? '',
      fieldDistrict: report.fieldDistrict ?? '',
      municipality: report.municipality ?? '',
      rigNumber: report.rigNumber ?? '',
      supervisor24h: report.supervisor24h ?? '',
    },
    crew: {
      shifts: relatedData?.crewShifts || [
        { shift: 'morning', shiftStart: '06:00', shiftEnd: '14:00', members: [] },
        { shift: 'afternoon', shiftStart: '14:00', shiftEnd: '22:00', members: [] },
        { shift: 'night', shiftStart: '22:00', shiftEnd: '06:00', members: [] },
      ],
    },
    timeDistribution: { distributions: [] },
    bitRecords: { 
      records: relatedData?.bitRecords || []
    },
    mudRecords: { records: [], additives: [] },
    lithology: { drillingParameters: [], deviationHistory: [] },
    observations: { operations: [] },
    drillString: {},
  };
}

/**
 * Validate that form has minimum required data
 */
export function validateMinimumData(formData: CompleteReportData): {
  valid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  if (!formData.header.reportDate) {
    errors.push('La fecha del reporte es requerida');
  }

  if (!formData.header.reportNumber || formData.header.reportNumber <= 0) {
    errors.push('El número de reporte es requerido y debe ser positivo');
  }

  // Add more validations as needed

  return {
    valid: errors.length === 0,
    errors,
  };
}

// Default values for empty sections (shared with ReportForm)
const EMPTY_CREW = {
  shifts: [
    { shift: 'morning' as const, shiftStart: '06:00', shiftEnd: '14:00', members: [] },
    { shift: 'afternoon' as const, shiftStart: '14:00', shiftEnd: '22:00', members: [] },
    { shift: 'night' as const, shiftStart: '22:00', shiftEnd: '06:00', members: [] },
  ],
};

/**
 * Safely parse a JSON string, returning fallback on failure
 */
function safeParse<T>(json: string | undefined | null, fallback: T): T {
  if (!json) return fallback;
  try {
    return JSON.parse(json) as T;
  } catch {
    console.warn('Failed to parse snapshot JSON:', json?.substring(0, 100));
    return fallback;
  }
}

/**
 * Build a complete form data object from a LastReportSnapshot.
 * Increments reportNumber by 1 and sets today's date.
 */
export function buildFormFromSnapshot(snapshot: LastReportSnapshot): Partial<CompleteReportData> {
  // Parse crew data — the backend stores CrewShiftWithMembers[] (shift + members nested).
  // We need to transform it into the form's expected shape.
  const rawCrew = safeParse<any[]>(snapshot.crewData, []);
  const crewShifts = rawCrew.length > 0
    ? {
        shifts: rawCrew.map((item: any) => {
          // Backend serializes CrewShiftWithMembers with #[serde(flatten)],
          // so shift fields are at root level: { shift, shiftStart, shiftEnd, members, ... }
          const members = (item.members || [])
            .filter((m: any) => m.personnelId || m.position)
            .map((m: any) => ({
              personnelId: m.personnelId || undefined,
              position: m.position || '',
              hours: m.hours ?? undefined,
            }));
          return {
            shift: item.shift,
            shiftStart: item.shiftStart,
            shiftEnd: item.shiftEnd,
            members,
          };
        }),
      }
    : EMPTY_CREW;

  // Parse time distributions
  const rawTimeDist = safeParse<any[]>(snapshot.timeDistributionData, []);
  const timeDistribution = {
    distributions: rawTimeDist.map((td: any) => ({
      operationCodeId: td.operationCodeId,
      hoursShift1: typeof td.hoursShift1 === 'number' ? td.hoursShift1 : 0,
      hoursShift2: typeof td.hoursShift2 === 'number' ? td.hoursShift2 : 0,
      hoursShift3: typeof td.hoursShift3 === 'number' ? td.hoursShift3 : 0,
    })),
  };

  // Parse simple array sections
  const bitRecords = { records: safeParse<any[]>(snapshot.bitRecordsData, []) };
  const mudRecords = {
    records: safeParse<any[]>(snapshot.mudRecordsData, []),
    additives: safeParse<any[]>(snapshot.mudAdditivesData, []),
  };
  const lithology = {
    drillingParameters: safeParse<any[]>(snapshot.drillingParamsData, []),
    deviationHistory: safeParse<any[]>(snapshot.deviationData, []),
  };
  const observations = {
    operations: safeParse<any[]>(snapshot.operationsLogData, []),
  };
  const drillString = safeParse<any>(snapshot.drillStringData, {});

  return {
    header: {
      reportNumber: snapshot.reportNumber + 1,
      reportDate: new Date().toISOString().split('T')[0],
      wellNumber: snapshot.wellNumber ?? '',
      apiNumber: snapshot.apiNumber ?? '',
      contract: snapshot.contract ?? '',
      contractor: snapshot.contractor ?? '',
      operator: snapshot.operator ?? '',
      fieldDistrict: snapshot.fieldDistrict ?? '',
      municipality: snapshot.municipality ?? '',
      rigNumber: snapshot.rigNumber ?? '',
      supervisor24h: snapshot.supervisor24h ?? '',
    },
    crew: crewShifts,
    timeDistribution,
    bitRecords,
    mudRecords,
    lithology,
    observations,
    drillString,
  };
}
