import { useState, useCallback, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { unstable_batchedUpdates } from 'react-dom';
import { useAuthStore } from '../store/';
import { toast } from '../lib/toast';
import { transformFormToReportData } from '../lib/reportHelpers';
import { loadLastReportTemplate, saveLastReportTemplate } from '../lib/lastReportData';
import { reportsApi } from '../lib/api';
import { type CompleteReportData } from '../schemas';
import { 
  loadReport, 
  loadLastCompleteReport, 
  saveAllSectionsWithData 
} from '../services/reportFormService';

interface UseReportPersistenceProps {
  isEditMode: boolean;
  formData: CompleteReportData;
  reportId: string | null;
  methods: any;
  setReportId: (id: string | null) => void;
  setExistingReport: (report: any) => void;
  setIsLoadingReport: (loading: boolean) => void;
}

interface UseReportPersistenceReturn {
  isLoading: boolean;
  loadExistingReport: (reportId: string) => Promise<void>;
  handleSaveDraft: () => Promise<void>;
  handleSubmitReport: (data: CompleteReportData) => Promise<void>;
}

/**
 * Hook para manejar la persistencia de datos (carga, guardado, envío)
 */
export function useReportPersistence({
  isEditMode,
  formData,
  reportId,
  methods,
  setReportId,
  setExistingReport,
  setIsLoadingReport,
}: UseReportPersistenceProps): UseReportPersistenceReturn {
  const navigate = useNavigate();
  const { sessionToken, user } = useAuthStore();
  const [isLoading, setIsLoading] = useState(false);

  // ============================================
  // FUNCIÓN COMÚN PARA GUARDAR/ENVIAR
  // ============================================
  const saveReportCommon = useCallback(async (
    data: CompleteReportData,
    shouldSubmit: boolean
  ): Promise<void> => {
    if (!sessionToken) {
      toast.error('No hay sesión activa');
      return;
    }

    if (!data.header?.reportNumber || !data.header?.reportDate) {
      toast.error('Completa el encabezado antes de ' + (shouldSubmit ? 'enviar' : 'guardar'));
      return;
    }

    setIsLoading(true);
    try {
      let currentReportId = reportId;
      const reportData = transformFormToReportData(data);

      // Crear o actualizar
      if (currentReportId) {
        await reportsApi.update(sessionToken, currentReportId, reportData);
      } else {
        const newReport = await reportsApi.create(sessionToken, reportData);
        currentReportId = newReport.id;
        setReportId(currentReportId);
        saveLastReportTemplate(data.header);
      }

      // Guardar secciones
      await saveAllSectionsWithData(sessionToken, currentReportId, data, isEditMode);

      // Enviar si es submit
      if (shouldSubmit) {
        await reportsApi.submit(sessionToken, currentReportId);
        toast.success('Reporte enviado correctamente');
      } else {
        toast.success(currentReportId !== reportId ? 'Reporte guardado como borrador' : 'Reporte actualizado');
      }

      navigate('/reports');

    } catch (error) {
      console.error('Error saving report:', error);
      toast.error(`Error al ${shouldSubmit ? 'enviar' : 'guardar'}: ${error}`);
    } finally {
      setIsLoading(false);
    }
  }, [sessionToken, reportId, setReportId, isEditMode, navigate]);

  // ============================================
  // CARGAR REPORTE EXISTENTE
  // ============================================
  const loadExistingReport = useCallback(async (reportIdToLoad: string) => {
    if (!sessionToken) return;

    setIsLoadingReport(true);
    try {
      const { report, formData: loadedFormData } = await loadReport(sessionToken, reportIdToLoad);
      
      // ✅ Agrupar updates en un solo re-render
      unstable_batchedUpdates(() => {
        setExistingReport(report);
        methods.reset(loadedFormData);
      });
      
    } catch (error) {
      console.error('Error loading report:', error);
      toast.error('Error al cargar el reporte');
      navigate('/reports');
    } finally {
      setIsLoadingReport(false);
    }
  }, [sessionToken, methods, setExistingReport, navigate, setIsLoadingReport]);

  // ============================================
  // FUNCIONES PÚBLICAS
  // ============================================
  const handleSaveDraft = useCallback(async () => {
    await saveReportCommon(formData, false);
  }, [saveReportCommon, formData]);

  const handleSubmitReport = useCallback(async (data: CompleteReportData) => {
    await saveReportCommon(data, true);
  }, [saveReportCommon]);

  // ============================================
  // CARGAR DATOS INICIALES
  // ============================================
  useEffect(() => {
    const loadInitialData = async () => {
      if (!sessionToken || !user) return;

      if (isEditMode && reportId) {
        await loadExistingReport(reportId);
      } else if (!isEditMode) {
        // Intentar cargar el último reporte completo del usuario
        const lastCompleteReport = await loadLastCompleteReport(sessionToken, user.id);
        
        if (lastCompleteReport) {
          methods.reset(lastCompleteReport);
          toast.success('Datos del último reporte cargados');
        } else {
          // Si no hay reporte completo, cargar plantilla del header
          const lastReportTemplate = loadLastReportTemplate();
          if (lastReportTemplate) {
            methods.reset({
              header: {
                ...lastReportTemplate,
                reportDate: new Date().toISOString().split('T')[0],
              },
            });
            toast.info('Encabezado del último reporte cargado');
          }
        }
      }
    };

    loadInitialData();
  }, [isEditMode, reportId, sessionToken, user, loadExistingReport, methods]);

  return {
    isLoading,
    loadExistingReport,
    handleSaveDraft,
    handleSubmitReport,
  };
}