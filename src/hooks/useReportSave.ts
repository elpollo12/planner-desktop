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
   * Strategy: DELETE ALL + INSERT ALL (parallel) to avoid duplicates
   */
  const saveDrillString = async (reportId: string) => {
    if (!sessionToken) return;

    if (reportId) {
      try {
        await drillStringApi.deleteAll(sessionToken, reportId);
      } catch (error) {
        console.warn('Could not delete existing drill string components:', error);
      }
    }

    const validComponents = (formData.drillString?.components || []).filter(
      (c) => c.pieceName && c.pieceName.trim() !== '',
    );

    if (validComponents.length > 0) {
      await Promise.all(
        validComponents.map((comp) =>
          drillStringApi.create(sessionToken, reportId, {
            pieceName: comp.pieceName,
            length: comp.length,
          }),
        ),
      );
    }
  };

  /**
   * Save Crew section
   * Strategy: DELETE ALL + INSERT ALL (parallel) to avoid duplicates
   */
  const saveCrew = async (reportId: string) => {
    if (!sessionToken) return;

    if (reportId) {
      try {
        await crewApi.deleteAllShifts(sessionToken, reportId);
      } catch (error) {
        console.warn('Could not delete existing shifts:', error);
      }
    }

    if (formData.crew?.shifts) {
      const shiftTasks = formData.crew.shifts
        .filter((shift) => shift.shift)
        .map((shift) => {
          // A member is valid if it has personnelId OR a non-empty position.
          // Previously we only checked position, which caused members selected
          // from the personnel dropdown (with personnelId but empty/undefined
          // defaultPosition) to be silently discarded.
          const validMembers = (shift.members || []).filter(
            (member) =>
              (member.personnelId && member.personnelId.trim() !== '') ||
              (member.position && member.position.trim() !== ''),
          );

          if (validMembers.length === 0) return null;

          const cleanShift = {
            shift: shift.shift,
            shiftStart: shift.shiftStart,
            shiftEnd: shift.shiftEnd,
            members: validMembers.map((member) => ({
              personnelId: member.personnelId || undefined,
              position: member.position || '',
              ci: member.personnelId ? undefined : (member as any).ci || undefined,
              name: member.personnelId ? undefined : (member as any).name || undefined,
              hours: member.hours || undefined,
            })),
          };

          return crewApi.createShift(sessionToken, reportId, cleanShift);
        })
        .filter(Boolean);

      await Promise.all(shiftTasks);
    }
  };

  /**
   * Save Bit Records section
   * Strategy: DELETE ALL + INSERT ALL (parallel) to avoid duplicates
   */
  const saveBits = async (reportId: string) => {
    if (!sessionToken) return;

    if (reportId) {
      try {
        await bitRecordsApi.deleteAll(sessionToken, reportId);
      } catch (error) {
        console.warn('Could not delete existing bit records:', error);
      }
    }

    if (formData.bitRecords?.records && formData.bitRecords.records.length > 0) {
      await Promise.all(
        formData.bitRecords.records.map((record) =>
          bitRecordsApi.create(sessionToken, reportId, record),
        ),
      );
    }
  };

  /**
   * Save Time Distribution section
   * Strategy: DELETE ALL + INSERT ALL to avoid duplicates
   */
  const saveTime = async (reportId: string) => {
    if (!sessionToken) return;

    if (reportId) {
      try {
        await timeDistributionApi.deleteAll(sessionToken, reportId);
      } catch (error) {
        console.warn('Could not delete existing time distributions:', error);
      }
    }

    if (
      formData.timeDistribution?.distributions &&
      formData.timeDistribution.distributions.length > 0
    ) {
      const validDistributions = formData.timeDistribution.distributions
        .filter((dist) => dist.operationCodeId && dist.operationCodeId.trim() !== '')
        .map((dist) => ({
          operationCodeId: dist.operationCodeId,
          hoursShift1: typeof dist.hoursShift1 === 'number' ? dist.hoursShift1 : 0,
          hoursShift2: typeof dist.hoursShift2 === 'number' ? dist.hoursShift2 : 0,
          hoursShift3: typeof dist.hoursShift3 === 'number' ? dist.hoursShift3 : 0,
        }));

      if (validDistributions.length > 0) {
        await timeDistributionApi.saveBulk(sessionToken, reportId, validDistributions);
      }
    }
  };

  /**
   * Save Mud Records section
   * Strategy: DELETE ALL + INSERT ALL (parallel) to avoid duplicates
   */
  const saveMud = async (reportId: string) => {
    if (!sessionToken) return;

    if (reportId) {
      try {
        await Promise.all([
          mudApi.deleteAllRecords(sessionToken, reportId),
          mudApi.deleteAllAdditives(sessionToken, reportId),
        ]);
      } catch (error) {
        console.warn('Could not delete existing mud data:', error);
      }
    }

    const tasks: Promise<unknown>[] = [];

    if (formData.mudRecords?.records && formData.mudRecords.records.length > 0) {
      tasks.push(
        ...formData.mudRecords.records.map((record) =>
          mudApi.createRecord(sessionToken, reportId, record),
        ),
      );
    }

    if (formData.mudRecords?.additives && formData.mudRecords.additives.length > 0) {
      tasks.push(
        ...formData.mudRecords.additives.map((additive) =>
          mudApi.createAdditive(sessionToken, reportId, additive),
        ),
      );
    }

    if (tasks.length > 0) {
      await Promise.all(tasks);
    }
  };

  /**
   * Save Lithology section
   * Strategy: DELETE ALL + INSERT ALL (parallel) to avoid duplicates
   */
  const saveLithology = async (reportId: string) => {
    if (!sessionToken) return;

    if (reportId) {
      try {
        await Promise.all([
          drillingParamsApi.deleteAll(sessionToken, reportId),
          deviationApi.deleteAll(sessionToken, reportId),
        ]);
      } catch (error) {
        console.warn('Could not delete existing lithology data:', error);
      }
    }

    const tasks: Promise<unknown>[] = [];

    if (
      formData.lithology?.drillingParameters &&
      formData.lithology.drillingParameters.length > 0
    ) {
      tasks.push(
        ...formData.lithology.drillingParameters.map((param) =>
          drillingParamsApi.create(sessionToken, reportId, param),
        ),
      );
    }

    if (formData.lithology?.deviationHistory && formData.lithology.deviationHistory.length > 0) {
      tasks.push(
        ...formData.lithology.deviationHistory.map((deviation) =>
          deviationApi.create(sessionToken, reportId, deviation),
        ),
      );
    }

    if (tasks.length > 0) {
      await Promise.all(tasks);
    }
  };

  /**
   * Save Observations section
   * Strategy: DELETE ALL + INSERT ALL (parallel) to avoid duplicates
   */
  const saveObservations = async (reportId: string) => {
    if (!sessionToken) return;

    if (reportId) {
      try {
        await operationsLogApi.deleteAll(sessionToken, reportId);
      } catch (error) {
        console.warn('Could not delete existing operations:', error);
      }
    }

    if (formData.observations?.operations && formData.observations.operations.length > 0) {
      await Promise.all(
        formData.observations.operations.map((operation) =>
          operationsLogApi.create(sessionToken, reportId, operation),
        ),
      );
    }
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

      // Process sections that have data in the form.
      // The merge in useReportWizard guarantees that data loaded from the backend
      // is always present in the form state, so hasSectionData will be true for
      // any section that had data at load time OR was edited by the user.
      // Sections that are truly empty (no backend data AND no user edits) are
      // skipped to avoid accidentally deleting backend data if the loader failed
      // silently for that section.
      const tasks = sectionsToProcess
        .filter((section) => section.hasData)
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
