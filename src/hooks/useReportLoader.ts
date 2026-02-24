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
import type { TabId } from '../types/reportForm';

// ============================================================================
// TYPES
// ============================================================================

interface UseReportLoaderReturn {
  /** The loaded report entity (null until loaded) */
  existingReport: Report | null;
  /** Whether a report is currently being fetched */
  isLoadingReport: boolean;
  /** Set of section IDs that failed to load — these must NOT be saved */
  failedSections: Set<TabId>;
  /**
   * Fetch a report and all its sub-entities, returning form-ready data.
   * Returns `null` if the fetch fails.
   */
  loadReport: (reportId: string) => Promise<Partial<CompleteReportData> | null>;
}

// ============================================================================
// HELPERS
// ============================================================================

/** Attempt to load a section, returning the data or a sentinel failure marker. */
const SECTION_FAILED = Symbol('SECTION_FAILED');

async function tryLoad<T>(promise: Promise<T>): Promise<T | typeof SECTION_FAILED> {
  try {
    return await promise;
  } catch {
    return SECTION_FAILED;
  }
}

// ============================================================================
// HOOK
// ============================================================================

export function useReportLoader(
  sessionToken: string | null,
): UseReportLoaderReturn {
  const [existingReport, setExistingReport] = useState<Report | null>(null);
  const [isLoadingReport, setIsLoadingReport] = useState(false);
  const [failedSections, setFailedSections] = useState<Set<TabId>>(new Set());

  const loadReport = useCallback(
    async (reportId: string): Promise<Partial<CompleteReportData> | null> => {
      if (!sessionToken) return null;

      setIsLoadingReport(true);
      setFailedSections(new Set());
      try {
        const report = await reportsApi.get(sessionToken, reportId);
        setExistingReport(report);

        // Load all related entities in parallel — track failures per section
        const [
          drillStringResult,
          crewResult,
          bitRecordsResult,
          timeDistResult,
          mudRecordsResult,
          mudAdditivesResult,
          drillingParamsResult,
          deviationResult,
          operationsLogResult,
        ] = await Promise.all([
          tryLoad(drillStringApi.list(sessionToken, reportId)),
          tryLoad(crewApi.listShifts(sessionToken, reportId)),
          tryLoad(bitRecordsApi.list(sessionToken, reportId)),
          tryLoad(timeDistributionApi.list(sessionToken, reportId)),
          tryLoad(mudApi.listRecords(sessionToken, reportId)),
          tryLoad(mudApi.listAdditives(sessionToken, reportId)),
          tryLoad(drillingParamsApi.list(sessionToken, reportId)),
          tryLoad(deviationApi.list(sessionToken, reportId)),
          tryLoad(operationsLogApi.list(sessionToken, reportId)),
        ]);

        // Identify which sections failed
        const failed = new Set<TabId>();
        if (drillStringResult === SECTION_FAILED) failed.add('drillString');
        if (crewResult === SECTION_FAILED) failed.add('crew');
        if (bitRecordsResult === SECTION_FAILED) failed.add('bits');
        if (timeDistResult === SECTION_FAILED) failed.add('time');
        if (mudRecordsResult === SECTION_FAILED || mudAdditivesResult === SECTION_FAILED) failed.add('mud');
        if (drillingParamsResult === SECTION_FAILED || deviationResult === SECTION_FAILED) failed.add('lithology');
        if (operationsLogResult === SECTION_FAILED) failed.add('observations');

        if (failed.size > 0) {
          setFailedSections(failed);
          toast.warning(
            `${failed.size} sección(es) no se cargaron correctamente. Esas secciones no se guardarán para proteger tus datos.`,
          );
        }

        // Use empty arrays for failed sections (display only — save is blocked)
        const drillStringComponents = drillStringResult === SECTION_FAILED ? [] : drillStringResult;
        const crewShifts = crewResult === SECTION_FAILED ? [] : crewResult;
        const bitRecords = bitRecordsResult === SECTION_FAILED ? [] : bitRecordsResult;
        const timeDistributions = timeDistResult === SECTION_FAILED ? [] : timeDistResult;
        const mudRecords = mudRecordsResult === SECTION_FAILED ? [] : mudRecordsResult;
        const mudAdditives = mudAdditivesResult === SECTION_FAILED ? [] : mudAdditivesResult;
        const drillingParams = drillingParamsResult === SECTION_FAILED ? [] : drillingParamsResult;
        const deviationHistory = deviationResult === SECTION_FAILED ? [] : deviationResult;
        const operationsLog = operationsLogResult === SECTION_FAILED ? [] : operationsLogResult;

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
    failedSections,
    loadReport,
  };
}
