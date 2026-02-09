import type { CompleteReportData } from '../schemas';
import type { Report, CrewShift, BitRecord } from '../types/report';

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
