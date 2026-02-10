import {
  reportsApi,
  drillStringApi,
  crewApi,
  bitRecordsApi,
  timeDistributionApi,
  mudApi,
  drillingParamsApi,
  deviationApi,
  operationsLogApi,
} from '../lib/api';
import { DEFAULT_VALUES } from '../components/reportForm/config/reportFormConfig';
import type { CompleteReportData } from '../schemas';
import type { Report } from '../types/';
import type { TabId } from '../types/';
import { hasSectionData } from '../lib/reportFormUtils';

interface LoadReportResult {
  report: Partial<Report>;
  formData: Partial<CompleteReportData>;
}

/**
 * Save ALL sections that have data
 * This is the MAIN function to use instead of saveActiveSection
 */
export async function saveAllSectionsWithData(
  sessionToken: string,
  reportId: string,
  formData: CompleteReportData,
  isEditMode: boolean
): Promise<void> {
  const sectionsToProcess: Array<{ 
    id: TabId; 
    name: string; 
    saveFn: () => Promise<void>; 
    hasData: boolean 
  }> = [];

  // Detect which sections have data AND which are empty (for deletion in edit mode)
  sectionsToProcess.push({ 
    id: 'drillString', 
    name: 'Sarta de Perforación', 
    saveFn: () => saveDrillString(sessionToken, reportId, formData.drillString),
    hasData: hasSectionData('drillString', formData)
  });
  sectionsToProcess.push({ 
    id: 'crew', 
    name: 'Cuadrilla', 
    saveFn: () => saveCrew(sessionToken, reportId, formData.crew, isEditMode),
    hasData: hasSectionData('crew', formData)
  });
  sectionsToProcess.push({ 
    id: 'bits', 
    name: 'Mechas', 
    saveFn: () => saveBits(sessionToken, reportId, formData.bitRecords, isEditMode),
    hasData: hasSectionData('bits', formData)
  });
  sectionsToProcess.push({ 
    id: 'time', 
    name: 'Distribución de Tiempo', 
    saveFn: () => saveTime(sessionToken, reportId, formData.timeDistribution, isEditMode),
    hasData: hasSectionData('time', formData)
  });
  sectionsToProcess.push({ 
    id: 'mud', 
    name: 'Lodo', 
    saveFn: () => saveMud(sessionToken, reportId, formData.mudRecords, isEditMode),
    hasData: hasSectionData('mud', formData)
  });
  sectionsToProcess.push({ 
    id: 'lithology', 
    name: 'Litología', 
    saveFn: () => saveLithology(sessionToken, reportId, formData.lithology, isEditMode),
    hasData: hasSectionData('lithology', formData)
  });
  sectionsToProcess.push({ 
    id: 'observations', 
    name: 'Observaciones', 
    saveFn: () => saveObservations(sessionToken, reportId, formData.observations, isEditMode),
    hasData: hasSectionData('observations', formData)
  });

  // Process all sections
  const errors: Array<{ section: string; error: any }> = [];
  let savedCount = 0;
  let deletedCount = 0;

  for (const section of sectionsToProcess) {
    try {
      if (section.hasData) {
        // Section has data: save it (will delete old + insert new)
        await section.saveFn();
        savedCount++;
      } else if (isEditMode) {
        // Section is empty in edit mode: just delete (cleanup)
        await section.saveFn(); // The saveFn already handles DELETE ALL
        deletedCount++;
      }
      // If new report and empty: do nothing (no data to save)
    } catch (error) {
      console.error(`✗ Error processing ${section.name}:`, error);
      errors.push({ section: section.name, error });
    }
  }

  // Report results
  if (errors.length > 0) {
    console.error(`Failed to process sections: ${errors.map(e => e.section).join(', ')}`);
    throw new Error(`Failed to process ${errors.length} section${errors.length > 1 ? 's' : ''}`);
  }
}

/**
 * Load an existing report by ID with all its sections
 */
export async function loadReport(
  sessionToken: string,
  reportId: string
): Promise<LoadReportResult> {
  // Load report header
  const report = await reportsApi.get(sessionToken, reportId);

  // Load all sections in parallel
  const [
    drillString,
    crewShifts,
    bitRecords,
    timeDistributions,
    mudRecords,
    mudAdditives,
    drillingParams,
    deviationHistory,
    operationsLog,
  ] = await Promise.all([
    drillStringApi.get(sessionToken, reportId).catch(() => null),
    crewApi.listShifts(sessionToken, reportId).catch(() => []),
    bitRecordsApi.list(sessionToken, reportId).catch(() => []),
    timeDistributionApi.list(sessionToken, reportId).catch(() => []),
    mudApi.listRecords(sessionToken, reportId).catch(() => []),
    mudApi.listAdditives(sessionToken, reportId).catch(() => []),
    drillingParamsApi.list(sessionToken, reportId).catch(() => []),
    deviationApi.list(sessionToken, reportId).catch(() => []),
    operationsLogApi.list(sessionToken, reportId).catch(() => []),
  ]);

  // Build form data
  const formData: Partial<CompleteReportData> = {
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
    drillString: drillString || {},
    crew: {
      shifts: crewShifts.length > 0 ? crewShifts : DEFAULT_VALUES.crew!.shifts,
    },
    bitRecords: {
      records: bitRecords,
    },
    timeDistribution: {
      distributions: (timeDistributions as any[]).map(td => ({
        operationCodeId: td.operationCodeId,
        hoursShift1: td.hoursShift1,
        hoursShift2: td.hoursShift2,
        hoursShift3: td.hoursShift3,
      })),
    },
    mudRecords: {
      records: (mudRecords as any[]) || [],
      additives: (mudAdditives as any[]) || [],
    },
    lithology: {
      drillingParameters: (drillingParams as any[]) || [],
      deviationHistory: (deviationHistory as any[]) || [],
    },
    observations: {
      operations: (operationsLog as any[]) || [],
    },
  };

  return { report, formData };
}

/**
 * Load the last complete report from a specific user
 * Useful for pre-filling a new report with previous data
 */
export async function loadLastCompleteReport(
  sessionToken: string,
  userId: string
): Promise<Partial<CompleteReportData> | null> {
  try {
    // Get all reports from the user
    const reports = await reportsApi.list(sessionToken, {
      dateFrom: undefined,
      dateTo: undefined,
      status: undefined,
      createdBy: userId,
      wellNumber: undefined,
    });

    if (reports.length === 0) {
      console.log('No previous reports found');
      return null;
    }

    // Sort by date descending and get the most recent one
    const sortedReports = [...reports].sort((a, b) => 
      new Date(b.reportDate).getTime() - new Date(a.reportDate).getTime()
    );
    const lastReport = sortedReports[0];

    console.log('Loading last report:', lastReport.id, 'Report #' + lastReport.reportNumber);

    // Load all sections from the last report
    const [
      drillString,
      crewShifts,
      bitRecords,
      timeDistributions,
      mudRecords,
      mudAdditives,
      drillingParams,
      deviationHistory,
      operationsLog,
    ] = await Promise.all([
      drillStringApi.get(sessionToken, lastReport.id).catch(() => null),
      crewApi.listShifts(sessionToken, lastReport.id).catch(() => []),
      bitRecordsApi.list(sessionToken, lastReport.id).catch(() => []),
      timeDistributionApi.list(sessionToken, lastReport.id).catch(() => []),
      mudApi.listRecords(sessionToken, lastReport.id).catch(() => []),
      mudApi.listAdditives(sessionToken, lastReport.id).catch(() => []),
      drillingParamsApi.list(sessionToken, lastReport.id).catch(() => []),
      deviationApi.list(sessionToken, lastReport.id).catch(() => []),
      operationsLogApi.list(sessionToken, lastReport.id).catch(() => []),
    ]);

    // Build form data with incremented report number and current date
    const formData: Partial<CompleteReportData> = {
      header: {
        reportNumber: lastReport.reportNumber + 1, // Increment report number
        reportDate: new Date().toISOString().split('T')[0], // Current date
        wellNumber: lastReport.wellNumber ?? '',
        apiNumber: lastReport.apiNumber ?? '',
        contract: lastReport.contract ?? '',
        contractor: lastReport.contractor ?? '',
        operator: lastReport.operator ?? '',
        fieldDistrict: lastReport.fieldDistrict ?? '',
        municipality: lastReport.municipality ?? '',
        rigNumber: lastReport.rigNumber ?? '',
        supervisor24h: lastReport.supervisor24h ?? '',
      },
      drillString: drillString || {},
      crew: {
        shifts: crewShifts.length > 0 ? crewShifts : DEFAULT_VALUES.crew!.shifts,
      },
      bitRecords: {
        records: bitRecords,
      },
      timeDistribution: {
        distributions: (timeDistributions as any[]).map(td => ({
          operationCodeId: td.operationCodeId,
          hoursShift1: td.hoursShift1,
          hoursShift2: td.hoursShift2,
          hoursShift3: td.hoursShift3,
        })),
      },
      mudRecords: {
        records: (mudRecords as any[]) || [],
        additives: (mudAdditives as any[]) || [],
      },
      lithology: {
        drillingParameters: (drillingParams as any[]) || [],
        deviationHistory: (deviationHistory as any[]) || [],
      },
      observations: {
        operations: (operationsLog as any[]) || [],
      },
    };

    return formData;
  } catch (error) {
    console.error('Error loading last complete report:', error);
    return null;
  }
}

/**
 * Save drill string section
 */
export async function saveDrillString(
  sessionToken: string,
  reportId: string,
  data: any
): Promise<void> {
  if (!data) return;
  await drillStringApi.save(sessionToken, reportId, data);
}

/**
 * Save crew section
 * Strategy: DELETE ALL + INSERT ALL to avoid duplicates
 */
export async function saveCrew(
  sessionToken: string,
  reportId: string,
  data: any,
  isEditMode: boolean
): Promise<void> {
  // STEP 1: Delete all existing shifts (always in edit mode)
  if (isEditMode) {
    try {
      await crewApi.deleteAllShifts(sessionToken, reportId);
      console.log('✓ Deleted all existing crew shifts');
    } catch (error) {
      console.warn('Could not delete existing shifts:', error);
    }
  }
  
  // STEP 2: Insert all shifts from the form (only if there's data)
  if (data?.shifts) {
    for (const shift of data.shifts) {
      if (shift.members.length > 0) {
        await crewApi.createShift(sessionToken, reportId, shift);
      }
    }
  }
}

/**
 * Save bit records section
 * Strategy: DELETE ALL + INSERT ALL to avoid duplicates
 */
export async function saveBits(
  sessionToken: string,
  reportId: string,
  data: any,
  isEditMode: boolean
): Promise<void> {
  // STEP 1: Delete all existing records
  if (isEditMode) {
    try {
      await bitRecordsApi.deleteAll(sessionToken, reportId);
      console.log('✓ Deleted all existing bit records');
    } catch (error) {
      console.warn('Could not delete existing bit records:', error);
    }
  }
  
  // STEP 2: Insert all records from the form (only if there's data)
  if (data?.records && data.records.length > 0) {
    for (const record of data.records) {
      await bitRecordsApi.create(sessionToken, reportId, record);
    }
  }
}

/**
 * Save time distribution section
 * Strategy: DELETE ALL + INSERT ALL to avoid duplicates
 */
export async function saveTime(
  sessionToken: string,
  reportId: string,
  data: any,
  isEditMode: boolean
): Promise<void> {
  // STEP 1: Delete all existing distributions
  if (isEditMode) {
    try {
      await timeDistributionApi.deleteAll(sessionToken, reportId);
      console.log('✓ Deleted all existing time distributions');
    } catch (error) {
      console.warn('Could not delete existing time distributions:', error);
    }
  }
  
  // STEP 2: Insert all distributions from the form (only if there's data)
  if (data?.distributions && data.distributions.length > 0) {
    await timeDistributionApi.saveBulk(
      sessionToken,
      reportId,
      data.distributions
    );
  }
}

/**
 * Save mud records section
 * Strategy: DELETE ALL + INSERT ALL to avoid duplicates
 */
export async function saveMud(
  sessionToken: string,
  reportId: string,
  data: any,
  isEditMode: boolean
): Promise<void> {
  // STEP 1: Delete all existing records and additives
  if (isEditMode) {
    try {
      await mudApi.deleteAllRecords(sessionToken, reportId);
      await mudApi.deleteAllAdditives(sessionToken, reportId);
      console.log('✓ Deleted all existing mud records and additives');
    } catch (error) {
      console.warn('Could not delete existing mud data:', error);
    }
  }
  
  // STEP 2: Insert all records from the form (only if there's data)
  if (data?.records && data.records.length > 0) {
    for (const record of data.records) {
      await mudApi.createRecord(sessionToken, reportId, record);
    }
  }
  
  // STEP 3: Insert all additives from the form (only if there's data)
  if (data?.additives && data.additives.length > 0) {
    for (const additive of data.additives) {
      await mudApi.createAdditive(sessionToken, reportId, additive);
    }
  }
}

/**
 * Save lithology section
 * Strategy: DELETE ALL + INSERT ALL to avoid duplicates
 */
export async function saveLithology(
  sessionToken: string,
  reportId: string,
  data: any,
  isEditMode: boolean
): Promise<void> {
  // STEP 1: Delete all existing params and deviations
  if (isEditMode) {
    try {
      await drillingParamsApi.deleteAll(sessionToken, reportId);
      await deviationApi.deleteAll(sessionToken, reportId);
      console.log('✓ Deleted all existing lithology data');
    } catch (error) {
      console.warn('Could not delete existing lithology data:', error);
    }
  }
  
  // STEP 2: Insert all drilling parameters from the form (only if there's data)
  if (data?.drillingParameters && data.drillingParameters.length > 0) {
    for (const param of data.drillingParameters) {
      await drillingParamsApi.create(sessionToken, reportId, param);
    }
  }
  
  // STEP 3: Insert all deviation history from the form (only if there's data)
  if (data?.deviationHistory && data.deviationHistory.length > 0) {
    for (const deviation of data.deviationHistory) {
      await deviationApi.create(sessionToken, reportId, deviation);
    }
  }
}

/**
 * Save observations section
 * Strategy: DELETE ALL + INSERT ALL to avoid duplicates
 */
export async function saveObservations(
  sessionToken: string,
  reportId: string,
  data: any,
  isEditMode: boolean
): Promise<void> {
  // STEP 1: Delete all existing operations
  if (isEditMode) {
    try {
      await operationsLogApi.deleteAll(sessionToken, reportId);
      console.log('✓ Deleted all existing operations');
    } catch (error) {
      console.warn('Could not delete existing operations:', error);
    }
  }
  
  // STEP 2: Insert all operations from the form (only if there's data)
  if (data?.operations && data.operations.length > 0) {
    for (const operation of data.operations) {
      await operationsLogApi.create(sessionToken, reportId, operation);
    }
  }
}