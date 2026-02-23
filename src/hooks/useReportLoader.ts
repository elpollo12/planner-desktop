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
            shifts: (() => {
              // Build a map of loaded shifts keyed by shift type
              const shiftMap = new Map<string, typeof crewShifts[number]>();
              for (const s of crewShifts) {
                shiftMap.set(s.shift, s);
              }

              // Always produce exactly 3 shifts (morning, afternoon, night)
              // so the form structure stays consistent with the schema.
              const defaultShifts = DEFAULT_REPORT_VALUES.crew!.shifts;
              return defaultShifts.map((defaultShift) => {
                const loaded = shiftMap.get(defaultShift.shift);
                if (loaded) {
                  return {
                    shift: loaded.shift,
                    shiftStart: loaded.shiftStart || defaultShift.shiftStart,
                    shiftEnd: loaded.shiftEnd || defaultShift.shiftEnd,
                    members: loaded.members
                      // Accept members that have personnelId OR position
                      .filter((member) => member.personnelId || member.position)
                      .map((member) => ({
                        personnelId: member.personnelId || '',
                        position: member.position || '',
                        hours: member.hours,
                      })),
                  };
                }
                // No data from backend for this shift — use default (empty members)
                return { ...defaultShift };
              });
            })(),
          },
          bitRecords: {
            // Strip backend-only fields (id, reportId, timestamps) so that
            // re-creating records after deleteAll doesn't send stale IDs.
            records: (bitRecords || []).map(({ id, reportId: _rid, createdAt, updatedAt, synced, ...rest }: any) => rest),
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
            records: (mudRecords || []).map(({ id, reportId: _rid, createdAt, updatedAt, synced, ...rest }: any) => rest),
            additives: (mudAdditives || []).map(({ id, reportId: _rid, createdAt, updatedAt, synced, ...rest }: any) => ({
              ...rest,
              additiveType: rest.additiveType ?? '',
            })),
          },
          lithology: {
            drillingParameters: (drillingParams || []).map(({ id, reportId: _rid, createdAt, updatedAt, synced, ...rest }: any) => rest),
            deviationHistory: (deviationHistory || []).map(({ id, reportId: _rid, createdAt, updatedAt, synced, ...rest }: any) => rest),
          },
          observations: {
            operations: (operationsLog || []).map(({ id, reportId: _rid, createdAt, updatedAt, synced, ...rest }: any) => rest),
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
