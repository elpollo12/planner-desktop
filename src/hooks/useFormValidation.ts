import { useCallback, useMemo } from 'react';
import { useAuthStore } from '../store/authStore';
import { type CompleteReportData } from '../schemas';
import { type Report } from '../types/';
import { 
  checkEditPermissions as checkPermissions,
  isHeaderValid as checkHeaderValid,
  getSectionSummary as getSectionSummaryUtil,
} from '../lib/reportFormUtils';

interface UseFormValidationProps {
  formData: CompleteReportData;
  existingReport: Report | null;
}

interface UseFormValidationReturn {
  isHeaderValid: boolean;
  canEdit: boolean;
  getSectionSummary: (tabId: string) => string;
  getSectionsWithData: () => string[];
}

/**
 * Hook para manejar la validación del formulario
 */
export function useFormValidation({
  formData,
  existingReport,
}: UseFormValidationProps): UseFormValidationReturn {
  const { user } = useAuthStore();

  // Validar header
  const isHeaderValid = useMemo(() => {
    return checkHeaderValid(formData.header);
  }, [formData.header]);

  // Verificar permisos de edición
  const canEdit = useMemo(() => {
    return checkPermissions(existingReport, user);
  }, [existingReport, user]);

  // Obtener resumen de sección
  const getSectionSummary = useCallback(
    (tabId: string) => {
      return getSectionSummaryUtil(tabId, formData);
    },
    [formData]
  );

  // Obtener secciones con datos
  const getSectionsWithData = useCallback(() => {
    const sections: string[] = [];
    if (formData.crew?.shifts?.some(s => s.members.length > 0)) sections.push('crew');
    if (formData.timeDistribution?.distributions?.length) sections.push('time');
    if (formData.bitRecords?.records?.length) sections.push('bits');
    if (formData.mudRecords?.records?.length || formData.mudRecords?.additives?.length) sections.push('mud');
    if (formData.lithology?.drillingParameters?.length || formData.lithology?.deviationHistory?.length) sections.push('lithology');
    if (formData.observations?.operations?.length) sections.push('observations');
    if (formData.drillString && Object.keys(formData.drillString).length > 0) sections.push('drillString');
    
    return sections;
  }, [formData]);

  return {
    isHeaderValid,
    canEdit,
    getSectionSummary,
    getSectionsWithData,
  };
}