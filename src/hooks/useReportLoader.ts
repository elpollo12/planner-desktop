import { useState, useCallback } from 'react';
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
import { toast } from '../lib/toast';
import { DEFAULT_REPORT_VALUES } from '../types/reportForm';
import type { CompleteReportData } from '../schemas';
import type { Report } from '../types/report';

// ============================================================================
// TYPES
// ============================================================================

interface UseReportLoaderReturn {
  /** The loaded report entity (null until loaded) */
  existingReport: Report | null;
  /** Whether a report is currently being fetched */
  isLoadingReport: boolean;
  /**
   * Fetch a report and all its sub-entities, returning form-ready data.
   * Returns `null` if the fetch fails.
   */
  loadReport: (reportId: string) => Promise<Partial<CompleteReportData> | null>;
}

// ============================================================================
// HOOK
// ============================================================================

export function useReportLoader(
  sessionToken: string | null,
): UseReportLoaderReturn {
  const [existingReport, setExistingReport] = useState<Report | null>(null);
  const [isLoadingReport, setIsLoadingReport] = useState(false);

  const loadReport = useCallback(
    async (reportId: string): Promise<Partial<CompleteReportData> | null> => {
      if (!sessionToken) return null;

      setIsLoadingReport(true);
      try {
        const report = await reportsApi.get(sessionToken, reportId);
        setExistingReport(report);

        // Load all related entities in parallel
        const [
          drillStringComponents,
          crewShifts,
          bitRecords,
          timeDistributions,
          mudRecords,
          mudAdditives,
          drillingParams,
          deviationHistory,
          operationsLog,
        ] = await Promise.all([
          drillStringApi.list(sessionToken, reportId).catch(() => []),
          crewApi.listShifts(sessionToken, reportId).catch(() => []),
          bitRecordsApi.list(sessionToken, reportId).catch(() => []),
          timeDistributionApi.list(sessionToken, reportId).catch(() => []),
          mudApi.listRecords(sessionToken, reportId).catch(() => []),
          mudApi.listAdditives(sessionToken, reportId).catch(() => []),
          drillingParamsApi.list(sessionToken, reportId).catch(() => []),
          deviationApi.list(sessionToken, reportId).catch(() => []),
          operationsLogApi.list(sessionToken, reportId).catch(() => []),
        ]);

        // Transform backend data to form-ready shape
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
          drillString: {
            components: (drillStringComponents as any[] || []).map((c: any) => ({
              pieceName: c.pieceName || '',
              length: c.length ?? undefined,
            })),
          },
          crew: {
            shifts:
              crewShifts.length > 0
                ? crewShifts.map((shift) => ({
                    shift: shift.shift,
                    shiftStart: shift.shiftStart,
                    shiftEnd: shift.shiftEnd,
                    members: shift.members
                      .filter((member) => member.personnelId)
                      .map((member) => ({
                        personnelId: member.personnelId,
                        position: member.position || '',
                        hours: member.hours,
                      })),
                  }))
                : DEFAULT_REPORT_VALUES.crew!.shifts,
          },
          bitRecords: {
            records: bitRecords,
          },
          timeDistribution: {
            distributions: timeDistributions.map((td) => ({
              operationCodeId: td.operationCodeId,
              hoursShift1: typeof td.hoursShift1 === 'number' ? td.hoursShift1 : 0,
              hoursShift2: typeof td.hoursShift2 === 'number' ? td.hoursShift2 : 0,
              hoursShift3: typeof td.hoursShift3 === 'number' ? td.hoursShift3 : 0,
            })),
          },
          mudRecords: {
            records: mudRecords || [],
            additives: (mudAdditives || []).map((a) => ({
              ...a,
              additiveType: a.additiveType ?? '',
            })),
          },
          lithology: {
            drillingParameters: drillingParams || [],
            deviationHistory: deviationHistory || [],
          },
          observations: {
            operations: operationsLog || [],
          },
        };

        return formData;
      } catch (error) {
        console.error('Error loading report:', error);
        toast.error('Error al cargar el reporte');
        return null;
      } finally {
        setIsLoadingReport(false);
      }
    },
    [sessionToken],
  );

  return {
    existingReport,
    isLoadingReport,
    loadReport,
  };
}
