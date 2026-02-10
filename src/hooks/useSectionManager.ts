import { useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAutoSave } from '../hooks/useAutoSave';
import { toast } from '../lib/toast';
import { type CompleteReportData } from '../schemas';
import { type TabId } from '../types/';
import { hasSectionData as checkHasSectionData } from '../lib/reportFormUtils';

interface UseSectionManagerProps {
  formData: CompleteReportData;
  isEditMode: boolean;
  wizardStep: 'header' | 'sections';
  isDirty: boolean;
  trigger: (field?: any) => Promise<boolean>;
  isHeaderValid: boolean;
  clearAutoSave?: () => void;
}

interface UseSectionManagerReturn {
  autoSaveEnabled: boolean;
  hasSectionData: (sectionId: TabId) => boolean;
  handleContinueToSections: () => Promise<void>;
  handleBackToHeader: () => void;
  handleCancel: () => void;
}

/**
 * Hook para manejar la navegación y gestión de secciones
 */
export function useSectionManager({
  formData,
  isEditMode,
  wizardStep,
  isDirty,
  trigger,
  isHeaderValid,
  clearAutoSave,
}: UseSectionManagerProps): UseSectionManagerReturn {
  const navigate = useNavigate();

  // Auto-save solo para nuevos reportes en paso de secciones
  const autoSaveEnabled = useMemo(
    () => !isEditMode && isDirty && wizardStep === 'sections',
    [isEditMode, isDirty, wizardStep]
  );

  // Configurar auto-save
  const {} = useAutoSave({
    data: formData,
    storageKey: 'report-draft',
    debounceMs: 2000,
    enabled: autoSaveEnabled,
  });

  // Verificar si una sección tiene datos
  const hasSectionData = useCallback(
    (sectionId: TabId): boolean => {
      return checkHasSectionData(sectionId, formData);
    },
    [formData]
  );

  // Continuar de header a secciones
  const handleContinueToSections = useCallback(async () => {
    const isValid = await trigger('header');

    if (!isValid) {
      toast.error('Por favor completa todos los campos obligatorios del encabezado');
      return;
    }

    if (!isHeaderValid) {
      toast.error('Debes completar al menos el número y fecha del reporte');
      return;
    }

    // Éxito - navegar a secciones
    // (el estado wizardStep se maneja en el componente principal)
    toast.success('Encabezado completado. Ahora selecciona una sección para llenar.');
  }, [trigger, isHeaderValid]);

  // Volver a editar el header
  const handleBackToHeader = useCallback(() => {
    toast.info('Ahora puedes modificar el encabezado');
  }, []);

  // Cancelar y salir
  const handleCancel = useCallback(() => {
    if (clearAutoSave) {
      clearAutoSave();
    }
    localStorage.removeItem('report-header-draft');
    navigate('/reports');
  }, [clearAutoSave, navigate]);

  return {
    autoSaveEnabled,
    hasSectionData,
    handleContinueToSections,
    handleBackToHeader,
    handleCancel,
  };
}