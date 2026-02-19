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
          return !!(formData.drillString && Object.keys(formData.drillString).length > 0);

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

  const saveDrillString = async (reportId: string) => {
    if (!sessionToken || !formData.drillString) return;
    await drillStringApi.save(sessionToken, reportId, formData.drillString);
  };

  /**
   * Save Crew section
   * Strategy: DELETE ALL + INSERT ALL to avoid duplicates
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
      for (const shift of formData.crew.shifts) {
        if (!shift.shift) {
          console.warn('Skipping shift without shift type:', shift);
          continue;
        }

        if (shift.members && shift.members.length > 0) {
          const validMembers = shift.members.filter(
            (member) => member.position && member.position.trim() !== '',
          );

          if (validMembers.length === 0) continue;

          const cleanShift = {
            shift: shift.shift,
            shiftStart: shift.shiftStart,
            shiftEnd: shift.shiftEnd,
            members: validMembers.map((member) => ({
              personnelId: member.personnelId || undefined,
              position: member.position || '',
              ci: member.personnelId ? undefined : member.ci || undefined,
              name: member.personnelId ? undefined : member.name || undefined,
              hours: member.hours || undefined,
            })),
          };

          await crewApi.createShift(sessionToken, reportId, cleanShift);
        }
      }
    }
  };

  /**
   * Save Bit Records section
   * Strategy: DELETE ALL + INSERT ALL to avoid duplicates
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
      for (const record of formData.bitRecords.records) {
        await bitRecordsApi.create(sessionToken, reportId, record);
      }
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
   * Strategy: DELETE ALL + INSERT ALL to avoid duplicates
   */
  const saveMud = async (reportId: string) => {
    if (!sessionToken) return;

    if (reportId) {
      try {
        await mudApi.deleteAllRecords(sessionToken, reportId);
        await mudApi.deleteAllAdditives(sessionToken, reportId);
      } catch (error) {
        console.warn('Could not delete existing mud data:', error);
      }
    }

    if (formData.mudRecords?.records && formData.mudRecords.records.length > 0) {
      for (const record of formData.mudRecords.records) {
        await mudApi.createRecord(sessionToken, reportId, record);
      }
    }

    if (formData.mudRecords?.additives && formData.mudRecords.additives.length > 0) {
      for (const additive of formData.mudRecords.additives) {
        await mudApi.createAdditive(sessionToken, reportId, additive);
      }
    }
  };

  /**
   * Save Lithology section
   * Strategy: DELETE ALL + INSERT ALL to avoid duplicates
   */
  const saveLithology = async (reportId: string) => {
    if (!sessionToken) return;

    if (reportId) {
      try {
        await drillingParamsApi.deleteAll(sessionToken, reportId);
        await deviationApi.deleteAll(sessionToken, reportId);
      } catch (error) {
        console.warn('Could not delete existing lithology data:', error);
      }
    }

    if (
      formData.lithology?.drillingParameters &&
      formData.lithology.drillingParameters.length > 0
    ) {
      for (const param of formData.lithology.drillingParameters) {
        await drillingParamsApi.create(sessionToken, reportId, param);
      }
    }

    if (formData.lithology?.deviationHistory && formData.lithology.deviationHistory.length > 0) {
      for (const deviation of formData.lithology.deviationHistory) {
        await deviationApi.create(sessionToken, reportId, deviation);
      }
    }
  };

  /**
   * Save Observations section
   * Strategy: DELETE ALL + INSERT ALL to avoid duplicates
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
      for (const operation of formData.observations.operations) {
        await operationsLogApi.create(sessionToken, reportId, operation);
      }
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

      // Process all sections in parallel
      const tasks = sectionsToProcess
        .filter((section) => section.hasData || reportId)
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
