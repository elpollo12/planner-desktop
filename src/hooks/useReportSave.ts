import { useCallback } from 'react';
import {
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
import type { CompleteReportData } from '../schemas';
import type { TabId } from '../types/reportForm';

// ============================================================================
// TYPES
// ============================================================================

interface UseReportSaveOptions {
  sessionToken: string | null;
  formData: CompleteReportData;
  /** Sections that failed to load — must be skipped during save to prevent data loss */
  failedSections?: Set<TabId>;
  /** Whether we are editing an existing report (true) or creating a new one (false).
   *  When true, empty sections will be sent to the backend to trigger DELETE ALL. */
  isEditMode?: boolean;
}

interface UseReportSaveReturn {
  /** Save all sections that have data to the backend */
  saveAllSections: (reportId: string) => Promise<void>;
  /** Check if a given section tab has user-entered data */
  hasSectionData: (sectionId: TabId) => boolean;
}

// ============================================================================
// HOOK
// ============================================================================

export function useReportSave({
  sessionToken,
  formData,
  failedSections = new Set(),
  isEditMode = false,
}: UseReportSaveOptions): UseReportSaveReturn {

  // ==========================================================================
  // SECTION DATA DETECTION
  // ==========================================================================

  const hasSectionData = useCallback(
    (sectionId: TabId): boolean => {
      switch (sectionId) {
        case 'drillString':
          return !!(
            formData.drillString?.components &&
            formData.drillString.components.length > 0 &&
            formData.drillString.components.some((c) => c.pieceName && c.pieceName.trim() !== '')
          );

        case 'crew':
          return !!(formData.crew?.shifts?.some((s) => s.members.length > 0));

        case 'bits':
          return !!(formData.bitRecords?.records && formData.bitRecords.records.length > 0);

        case 'time':
          return !!(
            formData.timeDistribution?.distributions &&
            formData.timeDistribution.distributions.length > 0 &&
            formData.timeDistribution.distributions.some(
              (d) => d.operationCodeId && d.operationCodeId.trim() !== '',
            )
          );

        case 'mud':
          return !!(
            (formData.mudRecords?.records && formData.mudRecords.records.length > 0) ||
            (formData.mudRecords?.additives && formData.mudRecords.additives.length > 0)
          );

        case 'lithology':
          return !!(
            (formData.lithology?.drillingParameters &&
              formData.lithology.drillingParameters.length > 0) ||
            (formData.lithology?.deviationHistory &&
              formData.lithology.deviationHistory.length > 0)
          );

        case 'observations':
          return !!(
            formData.observations?.operations && formData.observations.operations.length > 0
          );

        default:
          return false;
      }
    },
    [formData],
  );

  // ==========================================================================
  // INDIVIDUAL SECTION SAVERS
  // ==========================================================================

  /**
   * Save Drill String section
   * Strategy: Single bulk endpoint (DELETE ALL + INSERT ALL on backend)
   */
  const saveDrillString = async (reportId: string) => {
    if (!sessionToken) return;

    const validComponents = (formData.drillString?.components || []).filter(
      (c) => c.pieceName && c.pieceName.trim() !== '',
    );

    await drillStringApi.saveBulk(sessionToken, reportId,
      validComponents.map((comp) => ({
        pieceName: comp.pieceName,
        length: comp.length,
      })),
    );
  };

  /**
   * Save Crew section
   * Strategy: Single bulk endpoint (DELETE ALL + INSERT ALL on backend, CASCADE deletes members)
   */
  const saveCrew = async (reportId: string) => {
    if (!sessionToken) return;

    const validShifts = (formData.crew?.shifts || [])
      .filter((shift) => shift.shift)
      .map((shift) => {
        const validMembers = (shift.members || []).filter(
          (member) =>
            (member.personnelId && member.personnelId.trim() !== '') ||
            (member.position && member.position.trim() !== ''),
        );

        return {
          shift: shift.shift,
          shiftStart: shift.shiftStart,
          shiftEnd: shift.shiftEnd,
          members: validMembers.map((member) => ({
            personnelId: member.personnelId || undefined,
            position: member.position || '',
            hours: member.hours || undefined,
          })),
        };
      })
      .filter((shift) => shift.members.length > 0);

    await crewApi.saveBulk(sessionToken, reportId, validShifts);
  };

  /**
   * Save Bit Records section
   * Strategy: Single bulk endpoint (DELETE ALL + INSERT ALL on backend)
   */
  const saveBits = async (reportId: string) => {
    if (!sessionToken) return;

    const records = formData.bitRecords?.records || [];
    await bitRecordsApi.saveBulk(sessionToken, reportId, records);
  };

  /**
   * Save Time Distribution section
   * Strategy: Single bulk endpoint (DELETE ALL + INSERT ALL on backend)
   */
  const saveTime = async (reportId: string) => {
    if (!sessionToken) return;

    const validDistributions = (formData.timeDistribution?.distributions || [])
      .filter((dist) => dist.operationCodeId && dist.operationCodeId.trim() !== '')
      .map((dist) => ({
        operationCodeId: dist.operationCodeId,
        hoursShift1: typeof dist.hoursShift1 === 'number' ? dist.hoursShift1 : 0,
        hoursShift2: typeof dist.hoursShift2 === 'number' ? dist.hoursShift2 : 0,
        hoursShift3: typeof dist.hoursShift3 === 'number' ? dist.hoursShift3 : 0,
      }));

    await timeDistributionApi.saveBulk(sessionToken, reportId, validDistributions);
  };

  /**
   * Save Mud Records section (records + additives)
   * Strategy: Single bulk endpoint (DELETE ALL + INSERT ALL on backend for both tables)
   */
  const saveMud = async (reportId: string) => {
    if (!sessionToken) return;

    await mudApi.saveBulk(sessionToken, reportId, {
      records: formData.mudRecords?.records || [],
      additives: formData.mudRecords?.additives || [],
    });
  };

  /**
   * Save Lithology section (drilling parameters + deviation history)
   * Strategy: Two bulk endpoints in parallel
   */
  const saveLithology = async (reportId: string) => {
    if (!sessionToken) return;

    const tasks: Promise<unknown>[] = [];

    tasks.push(
      drillingParamsApi.saveBulk(
        sessionToken,
        reportId,
        formData.lithology?.drillingParameters || [],
      ),
    );

    tasks.push(
      deviationApi.saveBulk(
        sessionToken,
        reportId,
        formData.lithology?.deviationHistory || [],
      ),
    );

    await Promise.all(tasks);
  };

  /**
   * Save Observations section
   * Strategy: Single bulk endpoint (DELETE ALL + INSERT ALL on backend)
   */
  const saveObservations = async (reportId: string) => {
    if (!sessionToken) return;

    const operations = formData.observations?.operations || [];
    await operationsLogApi.saveBulk(sessionToken, reportId, operations);
  };

  // ==========================================================================
  // ORCHESTRATOR — Save all sections in parallel
  // ==========================================================================

  const saveAllSections = useCallback(
    async (reportId: string) => {
      if (!sessionToken) return;

      const sectionsToProcess: Array<{
        id: TabId;
        name: string;
        saveFn: () => Promise<void>;
        hasData: boolean;
      }> = [
        {
          id: 'drillString',
          name: 'Sarta de Perforación',
          saveFn: () => saveDrillString(reportId),
          hasData: hasSectionData('drillString'),
        },
        {
          id: 'crew',
          name: 'Cuadrilla',
          saveFn: () => saveCrew(reportId),
          hasData: hasSectionData('crew'),
        },
        {
          id: 'bits',
          name: 'Mechas',
          saveFn: () => saveBits(reportId),
          hasData: hasSectionData('bits'),
        },
        {
          id: 'time',
          name: 'Distribución de Tiempo',
          saveFn: () => saveTime(reportId),
          hasData: hasSectionData('time'),
        },
        {
          id: 'mud',
          name: 'Lodo',
          saveFn: () => saveMud(reportId),
          hasData: hasSectionData('mud'),
        },
        {
          id: 'lithology',
          name: 'Litología',
          saveFn: () => saveLithology(reportId),
          hasData: hasSectionData('lithology'),
        },
        {
          id: 'observations',
          name: 'Observaciones',
          saveFn: () => saveObservations(reportId),
          hasData: hasSectionData('observations'),
        },
      ];

      // Skip sections that:
      // 1. Failed to load — saving would overwrite existing data with empty arrays
      // 2. In CREATE mode: have no data (nothing to save or delete)
      // In EDIT mode: empty sections ARE processed to trigger backend DELETE ALL
      const skippedFailed = sectionsToProcess.filter((s) => failedSections.has(s.id));
      if (skippedFailed.length > 0) {
        console.warn(
          `⚠ Skipping ${skippedFailed.length} section(s) that failed to load:`,
          skippedFailed.map((s) => s.name).join(', '),
        );
      }

      const tasks = sectionsToProcess
        .filter((section) => !failedSections.has(section.id) && (section.hasData || isEditMode))
        .map(async (section) => {
          try {
            await section.saveFn();
            return { section: section.name, hasData: section.hasData, error: null };
          } catch (error) {
            console.error(`✗ Error processing ${section.name}:`, error);
            return { section: section.name, hasData: section.hasData, error };
          }
        });

      const results = await Promise.all(tasks);
      const errors = results.filter((r) => r.error !== null);
      const savedCount = results.filter((r) => r.error === null && r.hasData).length;
      const deletedCount = results.filter((r) => r.error === null && !r.hasData).length;

      if (errors.length === 0) {
        if (savedCount > 0 || deletedCount > 0) {
          const messages = [];
          if (savedCount > 0)
            messages.push(`${savedCount} guardada${savedCount > 1 ? 's' : ''}`);
          if (deletedCount > 0)
            messages.push(`${deletedCount} limpiada${deletedCount > 1 ? 's' : ''}`);
          toast.success(`Secciones: ${messages.join(', ')}`);
        }
      } else {
        toast.error(
          `Error al procesar ${errors.length} sección${errors.length > 1 ? 'es' : ''}`,
        );
        throw new Error(
          `Failed to process sections: ${errors.map((e) => e.section).join(', ')}`,
        );
      }
    },
    [sessionToken, formData],
  );

  // ==========================================================================
  // PUBLIC API
  // ==========================================================================

  return {
    saveAllSections,
    hasSectionData,
  };
}
